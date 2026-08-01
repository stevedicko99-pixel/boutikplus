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

interface AuthContextValue {
  session: Session | null;
  profile: Profile | null;
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
    role: UserRole;
  }) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  // NOTE: switchToDemo a été supprimé de l'API publique (production).
  // Le mécanisme de fallback est totalement piloté par :
  // — l'absence de variables d'environnement Supabase côté runtime (isSupabaseConfigured === false)
  // — chaque service (dataService, deliveryService, etc.) bascule alors
  //   automatiquement sur des données locales avec useDemo = !isSupabaseConfigured
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  // Flag lecture seule, dérivée de la configuration. Jamais pilotée par un bouton UI.
  // Si Supabase n'est pas configuré, l'app utilise le fallback démo.
  const isDemoMode = !isSupabaseConfigured;

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }

    let mounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSession(data.session);
      if (data.session) loadProfile(data.session.user.id);
      else setLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, sess) => {
      setSession(sess);
      if (sess) loadProfile(sess.user.id);
      else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadProfile = async (userId: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      logger.error('loadProfile failed', error);
    }
    setProfile(data as Profile | null);
    setLoading(false);
  };

  const refreshProfile = async () => {
    if (isDemoMode || !profile) return;
    await loadProfile(profile.id);
  };

  const signIn = async (email: string, password: string) => {
    if (!isSupabaseConfigured) {
      return { error: 'Supabase non configuré. Voir le fichier .env' };
    }
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error: error?.message ?? null };
  };

  const signUp = async (params: {
    email: string;
    password: string;
    fullName: string;
    phone: string;
    city: string;
    role: UserRole;
  }) => {
    if (!isSupabaseConfigured) {
      return { error: 'Supabase non configuré. Voir le fichier .env' };
    }
    const { data, error } = await supabase.auth.signUp({
      email: params.email,
      password: params.password,
    });
    if (error) return { error: error.message };

    if (data.user) {
      const { error: profileError } = await supabase.from('profiles').insert({
      id: data.user.id,
      full_name: params.fullName,
      phone: params.phone,
      city: params.city,
      role: params.role,
    });
      if (profileError) return { error: profileError.message };
    }
    return { error: null };
  };

  const signOut = async () => {
    setProfile(null);
    if (isSupabaseConfigured) await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider
      value={{
        session,
        profile,
        loading,
        isDemoMode,
        signIn,
        signUp,
        signOut,
        refreshProfile,
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
