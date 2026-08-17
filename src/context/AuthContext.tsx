import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { Session } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import type { Profile, UserRole } from '@/types/models';
import { logger } from '@/lib/logger';
import {
  registerPushToken,
  unregisterPushToken,
} from '@/lib/pushNotificationService';
// Marqueur stéganographique __BTIK_AUTH_STEG__
// Preuve propriété DICKO Christ Steve - voir src/lib/ownership.ts STEG_MARKERS
export const __BTIK_AUTH_STEG__ = '6646256eecd6c1a36d40192effb020cb';

interface AuthContextValue {
  session: Session | null;
  profile: Profile | null;
  profileLoadError: string | null;
  loading: boolean;
  // Indicateur : l'app fonctionne-t-elle en fallback déconnectée (fallback offline).
  // Ce flag est déterminé par la configuration Supabase, pas par un utilisateur.
  isDemoMode: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (params: {
    email: string;
    password: string;
    fullName: string;
    phone: string;
    city: string;
    /** @deprecated Utiliser roles + primaryRole. Conservé compatibilité asc. */
    role?: UserRole;
    /** Rôles multiples (acheteur + vendeur + livreur). Ex: ['buyer','seller','driver'] */
    roles?: UserRole[];
    /** Rôle actif à l'inscription (par défaut : roles[0] ou 'buyer'). */
    primaryRole?: UserRole;
  }) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  /**
   * Bascule le rôle actif (primary_role).
   * - Si le rôle cible n'est pas dans roles[], il est ajouté AUTOMATIQUEMENT
   *   (sauf 'admin' / 'super_admin', qui lèvent une erreur).
   * - Utile pour "Je suis Acheteur et je veux aussi être Livreur".
   * - Appelle RPC public.switch_primary_role(text) puis recharge le profil.
   */
  switchPrimaryRole: (newRole: UserRole) => Promise<{ error: string | null; newRole?: UserRole }>;
  // NOTE: switchToDemo a été supprimé de l'API publique (production).
  // Le mécanisme de fallback est totalement piloté par :
  // — l'absence de variables d'environnement Supabase côté runtime (isSupabaseConfigured === false)
  // — chaque service (dataService, deliveryService, etc.) bascule alors
  //   automatiquement sur des données locales avec useDemo = !isSupabaseConfigured

  /**
   * Dernier écran vers lequel revenir après une connexion/inscription forcée
   * (ex : depuis le Checkout qui demande une auth). Stocké ici pour que le
   * RootNavigator ou le LoginScreen puissent y revenir après succès.
   */
  pendingReturnTo?: { screen: string; params?: any } | null;
  setPendingReturnTo: (rt: { screen: string; params?: any } | null) => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [profileLoadError, setProfileLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [pendingReturnTo, setPendingReturnTo] = useState<
    { screen: string; params?: any } | null
  >(null);

  // Flag lecture seule, dérivée de la configuration. Jamais pilotée par un bouton UI.
  // Si Supabase n'est pas configuré, l'app utilise le fallback démo.
  const isDemoMode = !isSupabaseConfigured;

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }

    let mounted = true;
    // 🔴 Timeout de sécurité : si Supabase ne répond pas en 6s,
    // on force la fin du loading pour éviter l'écran blanc infini.
    const safetyTimer = setTimeout(() => {
      if (mounted) {
        logger.warn('[AuthContext] Safety timeout: forcing loading=false');
        setLoading(false);
      }
    }, 6000);

    supabase.auth.getSession().then(({ data }) => {
      clearTimeout(safetyTimer);
      if (!mounted) return;
      setSession(data.session);
      if (data.session) {
        loadProfile(data.session.user.id);
        // Enregistrement token push dès le démarrage si session existe
        registerPushToken(data.session.user.id).catch(() => {});
      } else setLoading(false);
    }).catch((err) => {
      clearTimeout(safetyTimer);
      logger.error('[AuthContext] getSession failed', err);
      if (mounted) setLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, sess) => {
      setSession(sess);
      if (sess) {
        loadProfile(sess.user.id);
        registerPushToken(sess.user.id).catch(() => {});
      } else {
        setProfile(null);
        setProfileLoadError(null);
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
      clearTimeout(safetyTimer);
      sub.subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadProfile = async (userId: string) => {
    setLoading(true);
    setProfileLoadError(null);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error || !data) {
        logger.error('loadProfile failed', error ?? 'Profil vide');
        setProfile(null);
        setProfileLoadError('Connexion réussie, mais votre profil n’a pas pu être chargé. Réessayez dans quelques instants.');
        return;
      }
      setProfile(data as Profile);
    } catch (e: unknown) {
      // Network errors, schema mismatch, RLS policy violation etc. ne doivent
      // JAMAIS casser le démarrage (évite écran blanc ou crash Silent).
      logger.error('loadProfile unexpected exception (catch top-level)', e);
      setProfile(null);
      setProfileLoadError('Connexion réussie, mais votre profil n’a pas pu être chargé. Vérifiez votre connexion puis réessayez.');
    } finally {
      setLoading(false);
    }
  };

  const refreshProfile = async () => {
    if (isDemoMode || !profile) return;
    await loadProfile(profile.id);
  };

  const signIn = async (email: string, password: string) => {
    if (!isSupabaseConfigured) {
      return { error: 'Supabase non configuré. Voir le fichier .env' };
    }
    try {
      // signInWithPassword retourne déjà la session — pas besoin de refaire
      // un appel getSession() qui déclencherait un second /token?grant_type=password.
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (!error && data.session) {
        // La session est déjà posée par Supabase dans le storage ; onAuthStateChange
        // se chargera de loadProfile + registerPushToken.
        registerPushToken(data.session.user.id).catch(() => {});
      }
      return { error: error?.message ?? null };
    } catch (e: unknown) {
      const msg =
        (e && typeof e === 'object' && 'message' in e && typeof (e as any).message === 'string')
          ? (e as any).message
          : 'Erreur réseau ou serveur indisponible. Réessayez.';
      logger.error('signIn top-level exception', e);
      return { error: msg };
    }
  };

  const signUp = async (params: {
    email: string;
    password: string;
    fullName: string;
    phone: string;
    city: string;
    role?: UserRole;
    roles?: UserRole[];
    primaryRole?: UserRole;
  }) => {
    if (!isSupabaseConfigured) {
      return { error: 'Supabase non configuré. Voir le fichier .env' };
    }
    // Normalisation multi-rôles :
    // - si roles[] vide → utiliser [role || 'buyer']
    // - si primaryRole absent → roles[0]
    // - 🔴 RÈGLE MÉTIER : tout VENDEUR est automatiquement ACHETEUR
    //     (pour accéder au catalogue des autres vendeurs et approvisionner
    //     sa propre boutique). On ajoute 'buyer' si 'seller' est présent.
    let rolesArr: UserRole[] = params.roles && params.roles.length > 0
      ? [...new Set(params.roles)] // dédoublonner
      : [params.role || 'buyer'];
    // Appliquer la règle "vendeur → acheteur automatique"
    if (rolesArr.includes('seller') && !rolesArr.includes('buyer')) {
      rolesArr.push('buyer');
    }
    // Toujours s'assurer que primary_role est dans roles
    let primaryR: UserRole =
      params.primaryRole && rolesArr.includes(params.primaryRole)
        ? params.primaryRole
        : rolesArr[0];
    // Retrodéploiement : old role = primaryR
    const legacyRole: UserRole = primaryR;

    // Les champs du profil sont passés via options.data → stockés dans
    // raw_user_meta_data. Le trigger `handle_new_user` (SECURITY DEFINER,
    // contourne le RLS) crée ensuite la ligne profiles côté serveur.
    // On NE fait PAS d'insertion client : avec la confirmation email activée,
    // signUp() ne crée pas de session, et l'insertion serait bloquée par RLS.
    const { data, error } = await supabase.auth.signUp({
      email: params.email,
      password: params.password,
      options: {
        data: {
          full_name: params.fullName,
          phone: params.phone,
          city: params.city,
          role: legacyRole,            // compatibilité ancienne colonne
          roles: rolesArr,             // nouveau : tableau multi-rôles
          primary_role: primaryR,      // nouveau : rôle actif / principal
        },
      },
    });
    if (error) return { error: error.message };
    // Cas où la confirmation email est DÉSACTIVÉE : signUp retourne une session.
    // On évite un second appel /token?grant_type=password — onAuthStateChange chargera le profil.
    if (data.session) {
      registerPushToken(data.session.user.id).catch(() => {});
    }
    // Le profil est créé automatiquement par le trigger handle_new_user.
    return { error: null };
  };

  const switchPrimaryRole = async (newRole: UserRole): Promise<{ error: string | null; newRole?: UserRole }> => {
    if (isDemoMode) return { error: 'Mode démo : pas de changement de rôle.' };
    if (!profile) return { error: 'Vous devez être connecté.' };
    try {
      // RPC switch_primary_role (SECURITY DEFINER public)
      const { data, error } = await supabase
        .rpc('switch_primary_role', { p_new_role: newRole });
      if (error) return { error: error.message };
      // Recharge le profil (et met à jour `role` rétro-compat via trigger DB)
      await loadProfile(profile.id);
      return { error: null, newRole: (data as UserRole) || newRole };
    } catch (e: unknown) {
      const msg = (e && typeof e === 'object' && 'message' in e && typeof (e as any).message === 'string')
        ? (e as any).message
        : 'Erreur lors du changement de rôle.';
      return { error: msg };
    }
  };

  const signOut = async () => {
    // Désenregistrer le token push AVANT de signOut (on a encore la session).
    if (session?.user?.id) {
      await unregisterPushToken(session.user.id).catch(() => {});
    }
    setProfile(null);
    setProfileLoadError(null);
    if (isSupabaseConfigured) await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider
      value={{
        session,
        profile,
        profileLoadError,
        loading,
        isDemoMode,
        signIn,
        signUp,
        signOut,
        refreshProfile,
        switchPrimaryRole,
        pendingReturnTo,
        setPendingReturnTo,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
