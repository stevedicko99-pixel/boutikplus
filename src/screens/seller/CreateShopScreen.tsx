import { useState } from 'react';
import { StyleSheet, View, Text, ScrollView, Pressable, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { colors, typography, spacing, radius } from '@/theme';
import { useAuth } from '@/context/AuthContext';
import { createShop } from '@/lib/dataService';
import { pickAndCompressImage, uploadImage } from '@/lib/storage';
import { CATEGORIES } from '@/constants/categories';
import { CITY_LIST } from '@/constants/cities';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';

interface CreateShopScreenProps {
  navigation: { navigate: (screen: string, params?: any) => void; goBack: () => void };
}

export function CreateShopScreen({ navigation }: CreateShopScreenProps) {
  const { profile } = useAuth();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState(CATEGORIES[0].id);
  const [city, setCity] = useState(CITY_LIST[0]);
  const [orangeNumber, setOrangeNumber] = useState('');
  const [moovNumber, setMoovNumber] = useState('');
  const [logoUri, setLogoUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handlePickLogo = async () => {
    const result = await pickAndCompressImage(false);
    if (result) setLogoUri(result.uri);
  };

  const handleCreate = async () => {
    if (!name) { Alert.alert('Erreur', 'Donnez un nom à votre boutique'); return; }
    if (!orangeNumber && !moovNumber) { Alert.alert('Erreur', 'Renseignez au moins un numéro Mobile Money'); return; }
    setLoading(true);
    let logoUrl = logoUri;
    if (logoUri) {
      const uploaded = await uploadImage('shop-logos', logoUri, `logo_${profile?.id}`);
      if (uploaded) logoUrl = uploaded.url;
    }
    const { error } = await createShop({
      ownerId: profile?.id ?? 'demo-seller',
      name,
      description,
      categoryId,
      city,
      orangeMoneyNumber: orangeNumber || undefined,
      moovMoneyNumber: moovNumber || undefined,
      logoUrl: logoUrl && logoUri ? null : null,
    });
    setLoading(false);
    if (error) { Alert.alert('Erreur', error); return; }
    Alert.alert('Succès 🎉', 'Votre boutique a été créée !', [{ text: 'OK', onPress: () => navigation.navigate('SellerDashboard') }]);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={navigation.goBack} hitSlop={10}><Feather name="arrow-left" size={24} color={colors.text} /></Pressable>
        <Text style={styles.title}>Créer ma boutique</Text>
        <View style={{ width: 24 }} />
      </View>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.intro}>Lancez votre business en moins de 3 minutes ! Aucun statut légal requis.</Text>

        {/* Logo */}
        <Pressable style={styles.logoPicker} onPress={handlePickLogo}>
          {logoUri ? (
            <View style={styles.logoPreview} />
          ) : (
            <View style={styles.logoPlaceholder}>
              <Feather name="camera" size={28} color={colors.textMuted} />
              <Text style={styles.logoText}>Logo de la boutique</Text>
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
        </Card>

        <Button label="Créer ma boutique" onPress={handleCreate} loading={loading} style={{ marginTop: spacing.lg, marginBottom: spacing.xxxl }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: spacing.lg },
  title: { fontFamily: typography.fontFamily, fontSize: typography.sizes.heading, fontWeight: typography.weights.bold, color: colors.text },
  scroll: { padding: spacing.lg, paddingTop: 0 },
  intro: { fontFamily: typography.fontFamily, fontSize: typography.sizes.body, color: colors.textMuted, marginBottom: spacing.lg, lineHeight: 22 },
  logoPicker: { alignItems: 'center', marginBottom: spacing.lg },
  logoPreview: { width: 96, height: 96, borderRadius: 48, backgroundColor: colors.primary },
  logoPlaceholder: { width: 96, height: 96, borderRadius: 48, backgroundColor: colors.surfaceAlt, borderWidth: 2, borderStyle: 'dashed', borderColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  logoText: { fontFamily: typography.fontFamily, fontSize: typography.sizes.caption, color: colors.textMuted, marginTop: spacing.xs },
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
});
