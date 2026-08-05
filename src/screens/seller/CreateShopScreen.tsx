import { useState, useEffect } from 'react';
import { StyleSheet, View, Text, ScrollView, Pressable, Alert, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { logger } from '@/lib/logger';
import { colors, typography, spacing, radius } from '@/theme';
import { friendlyMessage } from '@/lib/errorMessages';
import { useAuth } from '@/context/AuthContext';
import { createShop, updateShop, getShopByOwner } from '@/lib/dataService';
import { pickAndCompressImage, uploadImage, deleteStorageObject } from '@/lib/storage';
import { CATEGORIES } from '@/constants/categories';
import { CITY_LIST } from '@/constants/cities';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { ThreadDivider } from '@/components/ui/ThreadDivider';
import { StampBadge } from '@/components/ui/StampBadge';
import { useToast } from '@/context/ToastContext';
import type { ShopOpeningHours, ShopSocialLinks } from '@/types/models';

interface CreateShopScreenProps {
  navigation: { navigate: (screen: string, params?: any) => void; goBack: () => void };
  route?: { params?: { edit?: boolean } };
}

export function CreateShopScreen({ navigation, route }: CreateShopScreenProps) {
  const { profile } = useAuth();
  const toast = useToast();
  const mode: 'create' | 'edit' = route?.params?.edit === true ? 'edit' : 'create';
  const [shopId, setShopId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState(CATEGORIES[0].id);
  const [city, setCity] = useState(CITY_LIST[0]);
  const [orangeNumber, setOrangeNumber] = useState('');
  const [moovNumber, setMoovNumber] = useState('');
  const [corisNumber, setCorisNumber] = useState('');
  const [waveNumber, setWaveNumber] = useState('');
  const [logoUri, setLogoUri] = useState<string | null>(null);
  const [coverUri, setCoverUri] = useState<string | null>(null);
  const [oldLogoUrl, setOldLogoUrl] = useState<string | null>(null);
  const [oldCoverUrl, setOldCoverUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [initLoading, setInitLoading] = useState(mode === 'edit');
  const [picking, setPicking] = useState<'logo' | 'cover' | null>(null);

  const showError = (title: string, message: string) => {
    if (Platform.OS === 'web' && typeof window !== 'undefined' && window.alert) {
      window.alert(`${title}\n\n${message}`);
    } else {
      Alert.alert(title, message);
    }
  };
  const [slogan, setSlogan] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [instagram, setInstagram] = useState('');
  const [tiktok, setTiktok] = useState('');
  const [openTime, setOpenTime] = useState('');
  const [closeTime, setCloseTime] = useState('');
  const [closedSunday, setClosedSunday] = useState(false);

  useEffect(() => {
    if (mode !== 'edit') return;
    (async () => {
      const s = await getShopByOwner(profile?.id ?? 'demo-seller');
      if (s) {
        setShopId(s.id);
        setName(s.name);
        setDescription(s.description ?? '');
        setCategoryId(s.category_id);
        setCity(s.city);
        setOrangeNumber(s.orange_money_number ?? '');
        setMoovNumber(s.moov_money_number ?? '');
        setCorisNumber(s.coris_money_number ?? '');
        setWaveNumber(s.wave_number ?? '');
        setLogoUri(s.logo_url);
        setCoverUri(s.banner_url);
        setOldLogoUrl(s.logo_url);
        setOldCoverUrl(s.banner_url);
        setSlogan(s.slogan ?? '');
        setPhoneNumber(s.phone_number ?? '');
        setWhatsappNumber(s.whatsapp_number ?? '');
        setInstagram(s.social_links?.instagram ?? '');
        setTiktok(s.social_links?.tiktok ?? '');
        const oh = s.opening_hours as ShopOpeningHours | null;
        if (oh?.mon?.open && oh.mon.close) {
          setOpenTime(oh.mon.open);
          setCloseTime(oh.mon.close);
        }
        if (oh?.sun?.closed) setClosedSunday(true);
      }
      setInitLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, profile?.id]);

  const handlePickLogo = async () => {
    setPicking('logo');
    try {
      const result = await pickAndCompressImage(false);
      if (!result) {
        // Différencier une annulation simple d'une erreur/permission refusée n'est pas possible
        // avec l'API actuelle. On logue et on informe l'utilisateur pour éviter le silence.
        logger.warn('[CreateShop] pickAndCompressImage returned null for logo');
        showError('Sélection annulée', 'Aucune image n\'a été choisie. Vérifiez les permissions si le sélecteur ne s\'ouvre pas.');
        return;
      }
      setLogoUri(result.uri);
    } catch (e: any) {
      logger.error('[CreateShop] logo pick error:', e?.message ?? e);
      showError('Logo indisponible', 'Impossible de sélectionner l\'image. Vérifiez les permissions.');
    } finally {
      setPicking(null);
    }
  };

  const handlePickCover = async () => {
    setPicking('cover');
    try {
      const result = await pickAndCompressImage(false);
      if (!result) {
        logger.warn('[CreateShop] pickAndCompressImage returned null for cover');
        showError('Sélection annulée', 'Aucune image n\'a été choisie. Vérifiez les permissions si le sélecteur ne s\'ouvre pas.');
        return;
      }
      setCoverUri(result.uri);
    } catch (e: any) {
      logger.error('[CreateShop] cover pick error:', e?.message ?? e);
      showError('Couverture indisponible', 'Impossible de sélectionner l\'image. Vérifiez les permissions.');
    } finally {
      setPicking(null);
    }
  };

  const handleRemoveLogo = () => {
    setLogoUri(null);
  };

  const handleRemoveCover = () => {
    setCoverUri(null);
  };

  const buildOpeningHours = (): ShopOpeningHours | null => {
    if (!openTime || !closeTime) return null;
    return {
      mon: { open: openTime, close: closeTime },
      tue: { open: openTime, close: closeTime },
      wed: { open: openTime, close: closeTime },
      thu: { open: openTime, close: closeTime },
      fri: { open: openTime, close: closeTime },
      sat: { open: openTime, close: closeTime },
      sun: closedSunday
        ? { open: '00:00', close: '00:00', closed: true }
        : { open: openTime, close: closeTime },
    };
  };

  const buildSocialLinks = (): ShopSocialLinks | null => {
    const links: ShopSocialLinks = {};
    if (instagram) links.instagram = instagram;
    if (tiktok) links.tiktok = tiktok;
    return Object.keys(links).length ? links : null;
  };

  const handleSubmit = async () => {
    if (!name) { toast.warning('Nom requis', 'Donnez un nom à votre boutique'); return; }
    if (!orangeNumber && !moovNumber && !corisNumber && !waveNumber) {
      toast.warning('Mobile Money requis', 'Renseignez au moins un numéro Mobile Money');
      return;
    }
    setLoading(true);

    try {
    // Upload logo — si l'upload échoue (mode démo / offline), on garde l'URI locale (data/file).
    let logoUrl: string | null | undefined = undefined;
    if (logoUri && (logoUri.startsWith('file://') || logoUri.startsWith('data:'))) {
      try {
        const uploaded = await uploadImage('shop-logos', logoUri, `logo_${profile?.id ?? 'demo'}_${Date.now()}`);
        if (uploaded) {
          logoUrl = uploaded.url;
        } else {
          logger.warn('[CreateShop] logo upload returned null, falling back to local URI');
          logoUrl = logoUri;
        }
      } catch (uploadErr: any) {
        logger.warn('[CreateShop] logo upload failed, using local URI', uploadErr?.message);
        logoUrl = logoUri;
      }
    } else if (logoUri !== null) {
      logoUrl = logoUri;
    } else {
      logoUrl = null;
    }

    // Upload cover / bannière — même fallback local si besoin.
    let coverUrl: string | null | undefined = undefined;
    if (coverUri && (coverUri.startsWith('file://') || coverUri.startsWith('data:'))) {
      try {
        const uploaded = await uploadImage('shop-covers', coverUri, `cover_${profile?.id ?? 'demo'}_${Date.now()}`);
        if (uploaded) {
          coverUrl = uploaded.url;
        } else {
          logger.warn('[CreateShop] cover upload returned null, falling back to local URI');
          coverUrl = coverUri;
        }
      } catch (uploadErr: any) {
        logger.warn('[CreateShop] cover upload failed, using local URI', uploadErr?.message);
        coverUrl = coverUri;
      }
    } else if (coverUri !== null) {
      coverUrl = coverUri;
    } else {
      coverUrl = null;
    }

    const openingHours = buildOpeningHours();
    const socialLinks = buildSocialLinks();

    // Nettoyage des anciens fichiers distants si remplacés ou supprimés
    if (mode === 'edit') {
      if (oldLogoUrl && oldLogoUrl !== logoUrl) {
        await deleteStorageObject('shop-logos', oldLogoUrl);
      }
      if (oldCoverUrl && oldCoverUrl !== coverUrl) {
        await deleteStorageObject('shop-covers', oldCoverUrl);
      }
    }

    if (mode === 'edit' && shopId) {
      const { error } = await updateShop(shopId, {
        name,
        description: description || undefined,
        category_id: categoryId,
        city,
        orange_money_number: orangeNumber || null,
        moov_money_number: moovNumber || null,
        coris_money_number: corisNumber || null,
        wave_number: waveNumber || null,
        logo_url: logoUrl,
        cover_url: coverUrl,
        slogan: slogan || null,
        phone_number: phoneNumber || null,
        whatsapp_number: whatsappNumber || null,
        opening_hours: openingHours,
        social_links: socialLinks,
      });
      setLoading(false);
      if (error) { toast.error('Échec de la mise à jour', friendlyMessage(error)); return; }
      toast.success('Boutique mise à jour', 'Vos modifications ont été sauvegardées');
      navigation.navigate('SellerDashboard');
    } else {
      const { error } = await createShop({
        ownerId: profile?.id ?? 'demo-seller',
        name,
        description,
        categoryId,
        city,
        orangeMoneyNumber: orangeNumber || undefined,
        moovMoneyNumber: moovNumber || undefined,
        corisMoneyNumber: corisNumber || undefined,
        waveNumber: waveNumber || undefined,
        logoUrl,
        coverUrl,
        slogan: slogan || undefined,
        phoneNumber: phoneNumber || undefined,
        whatsappNumber: whatsappNumber || undefined,
        socialLinks,
        openingHours,
      });
      setLoading(false);
      if (error) { toast.error('Échec de la création', friendlyMessage(error)); return; }
      toast.success('Boutique créée 🎉', 'Votre boutique est maintenant en ligne');
      navigation.navigate('SellerDashboard');
    }
    } catch (e: any) {
      setLoading(false);
      toast.error('Erreur inattendue', friendlyMessage(e?.message ?? String(e)));
      logger.error('[CreateShop] handleSubmit error', e);
    }
  };

  if (initLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={{ padding: spacing.lg }}>
          <Text style={{ fontFamily: typography.fontFamily, color: colors.textMuted }}>Chargement de votre boutique…</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={navigation.goBack} hitSlop={10}><Feather name="arrow-left" size={24} color={colors.text} /></Pressable>
        <View style={styles.titleRow}>
          <Text style={styles.title}>{mode === 'edit' ? 'Modifier ma boutique' : 'Créer ma boutique'}</Text>
          {mode === 'edit' && <StampBadge label="Édition" color={colors.primaryDeep} size="sm" />}
        </View>
        <View style={{ width: 24 }} />
      </View>
      <ThreadDivider color={colors.stitch} style={styles.titleThread} />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.intro}>
          {mode === 'edit'
            ? 'Personnalisez votre boutique : logo, couverture, horaires & réseaux.'
            : 'Lancez votre business en moins de 3 minutes ! Aucun statut légal requis.'}
        </Text>

        {/* Photo de couverture */}
        <Pressable style={styles.coverPicker} onPress={handlePickCover}>
          {coverUri ? (
            <View style={styles.coverWrap}>
              <Image source={{ uri: coverUri }} style={styles.coverPreview} contentFit="cover" />
              <Pressable style={styles.coverRemoveBtn} onPress={handleRemoveCover}>
                <Feather name="x" size={14} color={colors.textInverse} />
              </Pressable>
              <View style={styles.coverOverlayBadge}>
                <Feather name="edit-2" size={14} color={colors.textInverse} />
                <Text style={styles.coverBadgeText}>Changer la couverture</Text>
              </View>
            </View>
          ) : (
            <View style={styles.coverPlaceholder}>
              <Feather name="image" size={30} color={colors.textMuted} />
              <Text style={styles.coverText}>Photo de couverture</Text>
              <Text style={styles.coverHint}>Ratio 3:1 recommandé · apparait en tête de votre boutique publique</Text>
            </View>
          )}
        </Pressable>

        {/* Logo */}
        <Pressable style={styles.logoPicker} onPress={handlePickLogo}>
          {logoUri ? (
            <View style={styles.logoPreviewWrap}>
              <Image source={{ uri: logoUri }} style={styles.logoPreview} contentFit="cover" />
              <Pressable style={styles.logoRemoveBtn} onPress={handleRemoveLogo}>
                <Feather name="x" size={12} color={colors.textInverse} />
              </Pressable>
              <View style={styles.logoEditBadge}>
                <Feather name="edit-2" size={12} color={colors.textInverse} />
              </View>
            </View>
          ) : (
            <View style={styles.logoPlaceholder}>
              <Feather name="camera" size={28} color={colors.textMuted} />
              <Text style={styles.logoText}>Logo de la boutique</Text>
              <Text style={styles.logoHint}>JPG, PNG · 1:1 recommandé</Text>
            </View>
          )}
        </Pressable>

        <Input label="Nom de la boutique *" value={name} onChangeText={setName} placeholder="Ex: Faso Fashion" icon="briefcase" />
        <Input label="Description" value={description} onChangeText={setDescription} placeholder="Décrivez ce que vous vendez..." multiline numberOfLines={3} />

        <Text style={styles.label}>Catégorie principale</Text>
        <View style={styles.catGrid}>
          {CATEGORIES.map((c) => (
            <Pressable key={c.id} style={[styles.catChip, categoryId === c.id && styles.catChipActive]} onPress={() => setCategoryId(c.id)}>
              <Feather name={c.icon as any} size={16} color={categoryId === c.id ? colors.textInverse : c.color} />
              <Text style={[styles.catChipText, categoryId === c.id && styles.catChipTextActive]}>{c.name}</Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.label}>Ville</Text>
        <View style={styles.catGrid}>
          {CITY_LIST.slice(0, 6).map((c) => (
            <Pressable key={c} style={[styles.catChip, city === c && styles.catChipActive]} onPress={() => setCity(c)}>
              <Text style={[styles.catChipText, city === c && styles.catChipTextActive]}>{c}</Text>
            </Pressable>
          ))}
        </View>

        <Card style={styles.mmCard}>
          <View style={styles.mmHead}>
            <Feather name="credit-card" size={20} color={colors.success} />
            <Text style={styles.mmTitle}>Numéros Mobile Money</Text>
          </View>
          <Text style={styles.mmHint}>Renseignez au moins un numéro pour recevoir les paiements</Text>
          <View style={[styles.mmLogo, { backgroundColor: colors.orangeMoney }]}><Text style={styles.mmLogoText}>OM</Text></View>
          <Input label="Orange Money" value={orangeNumber} onChangeText={setOrangeNumber} placeholder="Ex: 70 12 34 56" keyboardType="phone-pad" icon="phone" />
          <View style={[styles.mmLogo, { backgroundColor: colors.moovMoney }]}><Text style={styles.mmLogoText}>Moov</Text></View>
          <Input label="Moov Money" value={moovNumber} onChangeText={setMoovNumber} placeholder="Ex: 61 98 76 54" keyboardType="phone-pad" icon="phone" />
          <View style={[styles.mmLogo, { backgroundColor: '#C8102E' }]}><Text style={styles.mmLogoText}>Coris</Text></View>
          <Input label="Coris Money" value={corisNumber} onChangeText={setCorisNumber} placeholder="Ex: 50 12 34 56" keyboardType="phone-pad" icon="phone" />
          <View style={[styles.mmLogo, { backgroundColor: '#00B140' }]}><Text style={styles.mmLogoText}>Wave</Text></View>
          <Input label="Wave" value={waveNumber} onChangeText={setWaveNumber} placeholder="Ex: 55 12 34 56" keyboardType="phone-pad" icon="phone" />
        </Card>

        <Card style={styles.mmCard}>
          <View style={styles.mmHead}>
            <Feather name="globe" size={20} color={colors.primary} />
            <Text style={styles.mmTitle}>Ma page boutique</Text>
          </View>
          <Text style={styles.mmHint}>Ces infos apparaissent sur le lien public de votre boutique.</Text>

          <Input label="Slogan" value={slogan} onChangeText={setSlogan} placeholder="Ex: La mode du Faso, portée par les jeunes" icon="message-square" />
          <Input label="Téléphone" value={phoneNumber} onChangeText={setPhoneNumber} placeholder="Ex: 70 12 34 56" keyboardType="phone-pad" icon="phone" />
          <Input label="WhatsApp (international)" value={whatsappNumber} onChangeText={setWhatsappNumber} placeholder="Ex: 22670123456" keyboardType="phone-pad" icon="message-circle" />
          <Input label="Instagram" value={instagram} onChangeText={setInstagram} placeholder="Ex: @ma_boutique" icon="instagram" />
          <Input label="TikTok" value={tiktok} onChangeText={setTiktok} placeholder="Ex: @ma_boutique" icon="video" />

          <Text style={styles.label}>Horaires d'ouverture</Text>
          <View style={styles.timeRow}>
            <View style={{ flex: 1 }}>
              <Input label="Ouverture" value={openTime} onChangeText={setOpenTime} placeholder="08:00" keyboardType="numeric" icon="sunrise" />
            </View>
            <View style={{ flex: 1, marginLeft: spacing.sm }}>
              <Input label="Fermeture" value={closeTime} onChangeText={setCloseTime} placeholder="19:00" keyboardType="numeric" icon="sunset" />
            </View>
          </View>
          <Pressable style={[styles.sundayToggle, closedSunday && styles.sundayToggleActive]} onPress={() => setClosedSunday((v) => !v)}>
            <Feather name={closedSunday ? 'check-square' : 'square'} size={18} color={closedSunday ? colors.primary : colors.textMuted} />
            <Text style={[styles.sundayText, closedSunday && styles.sundayTextActive]}>Fermé le dimanche</Text>
          </Pressable>
        </Card>

        <Button
          label={mode === 'edit' ? 'Enregistrer les modifications' : 'Créer ma boutique'}
          onPress={handleSubmit}
          loading={loading}
          style={{ marginTop: spacing.lg, marginBottom: spacing.xxxl }}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: spacing.lg },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  title: { fontFamily: typography.fontFamily, fontSize: typography.sizes.heading, fontWeight: typography.weights.bold, color: colors.text },
  titleThread: { alignSelf: 'center', marginBottom: spacing.sm },
  scroll: { padding: spacing.lg, paddingTop: 0 },
  intro: { fontFamily: typography.fontFamily, fontSize: typography.sizes.body, color: colors.textMuted, marginBottom: spacing.lg, lineHeight: 22 },

  coverPicker: { marginBottom: spacing.lg },
  coverWrap: { width: '100%', height: 150, position: 'relative', borderRadius: radius.lg, overflow: 'hidden', borderWidth: 1, borderColor: colors.borderLight },
  coverPreview: { width: '100%', height: '100%', backgroundColor: colors.surfaceAlt },
  coverRemoveBtn: { position: 'absolute', top: spacing.sm, right: spacing.sm, width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center' },
  coverOverlayBadge: {
    position: 'absolute', bottom: spacing.sm, right: spacing.sm,
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: colors.primary + 'DD',
    paddingHorizontal: spacing.sm, paddingVertical: 6,
    borderRadius: radius.pill,
  },
  coverBadgeText: {
    fontFamily: typography.fontFamily, fontSize: typography.sizes.caption,
    fontWeight: typography.weights.medium, color: colors.textInverse,
  },
  coverPlaceholder: {
    width: '100%', height: 150,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 2, borderStyle: 'dashed', borderColor: colors.primary + '80',
    alignItems: 'center', justifyContent: 'center',
    gap: 4,
  },
  coverText: { fontFamily: typography.fontFamily, fontSize: typography.sizes.small, color: colors.textMuted, fontWeight: typography.weights.medium },
  coverHint: { fontFamily: typography.fontFamily, fontSize: typography.sizes.caption, color: colors.textMuted },

  logoPicker: { alignItems: 'center', marginBottom: spacing.lg, marginTop: -32 },
  logoPreviewWrap: { position: 'relative', width: 96, height: 96 },
  logoPreview: { width: 96, height: 96, borderRadius: 48, backgroundColor: colors.surfaceAlt, borderWidth: 3, borderColor: colors.surface },
  logoRemoveBtn: { position: 'absolute', top: 0, right: 0, width: 24, height: 24, borderRadius: 12, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center' },
  logoEditBadge: { position: 'absolute', bottom: 0, right: 0, width: 28, height: 28, borderRadius: 14, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: colors.surface },
  logoPlaceholder: { width: 96, height: 96, borderRadius: 48, backgroundColor: colors.surfaceAlt, borderWidth: 2, borderStyle: 'dashed', borderColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  logoText: { fontFamily: typography.fontFamily, fontSize: typography.sizes.caption, color: colors.textMuted, marginTop: spacing.xs },
  logoHint: { fontFamily: typography.fontFamily, fontSize: 10, color: colors.textMuted, marginTop: 2 },

  label: { fontFamily: typography.fontFamily, fontSize: typography.sizes.small, fontWeight: typography.weights.medium, color: colors.text, marginTop: spacing.md, marginBottom: spacing.sm },
  catGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.sm },
  catChip: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, paddingVertical: spacing.sm, paddingHorizontal: spacing.md, borderRadius: radius.pill, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  catChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  catChipText: { fontFamily: typography.fontFamily, fontSize: typography.sizes.small, color: colors.text },
  catChipTextActive: { color: colors.textInverse, fontWeight: typography.weights.semibold },
  mmCard: { marginTop: spacing.lg, padding: spacing.lg },
  mmHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.xs },
  mmTitle: { fontFamily: typography.fontFamily, fontSize: typography.sizes.subtitle, fontWeight: typography.weights.bold, color: colors.text },
  mmHint: { fontFamily: typography.fontFamily, fontSize: typography.sizes.caption, color: colors.textMuted, marginBottom: spacing.md },
  mmLogo: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.sm, alignSelf: 'flex-start' },
  mmLogoText: { fontFamily: typography.fontFamily, fontSize: typography.sizes.caption, fontWeight: typography.weights.bold, color: colors.textInverse },
  timeRow: { flexDirection: 'row', alignItems: 'flex-start' },
  sundayToggle: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.md, paddingVertical: spacing.sm, paddingHorizontal: spacing.md, borderRadius: radius.md, backgroundColor: colors.surfaceAlt, borderWidth: 1, borderColor: colors.borderLight },
  sundayToggleActive: { borderColor: colors.primary, backgroundColor: '#FFF3E8' },
  sundayText: { fontFamily: typography.fontFamily, fontSize: typography.sizes.small, color: colors.textMuted, fontWeight: typography.weights.medium },
  sundayTextActive: { color: colors.primary, fontWeight: typography.weights.semibold },
});
