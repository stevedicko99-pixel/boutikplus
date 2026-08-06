import { useState, useEffect, useCallback } from 'react';
import * as Location from 'expo-location';
import { StyleSheet, View, Text, FlatList, Pressable, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { colors, typography, spacing, radius } from '@/theme';
import { useAuth } from '@/context/AuthContext';
import { getAddresses, saveAddress, deleteAddress } from '@/lib/dataService';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { CITY_LIST, getZoneById, getZonesForCity } from '@/constants/cities';
import type { DeliveryAddress } from '@/types/models';

interface AddressesScreenProps {
  navigation: { goBack: () => void };
}

export function AddressesScreen({ navigation }: AddressesScreenProps) {
  const { profile } = useAuth();
  const [addresses, setAddresses] = useState<DeliveryAddress[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<DeliveryAddress | null>(null);
  const [showForm, setShowForm] = useState(false);
  const emptyForm = () => ({ city: CITY_LIST[0], zoneId: '', district: '', landmark: '', instructions: '', phone: profile?.phone ?? '', latitude: null as number | null, longitude: null as number | null });
  const [form, setForm] = useState(emptyForm);

  const load = useCallback(async () => {
    const data = await getAddresses(profile?.id ?? 'demo-buyer');
    setAddresses(data);
    setLoading(false);
  }, [profile]);

  useEffect(() => { load(); }, [load]);

  const useCurrentLocation = async () => {
    const permission = await Location.requestForegroundPermissionsAsync();
    if (permission.status !== 'granted') {
      Alert.alert('Localisation refusée', 'Autorisez la localisation pour utiliser votre position.');
      return;
    }
    const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    setForm((current) => ({ ...current, latitude: location.coords.latitude, longitude: location.coords.longitude }));
  };

  const handleSave = async () => {
    if (!form.zoneId || !form.landmark.trim() || !form.phone) {
      Alert.alert('Erreur', 'Zone, repère et téléphone obligatoires');
      return;
    }
    const selectedZone = getZoneById(form.zoneId);
    await saveAddress({
      city: form.city,
      zone_id: form.zoneId,
      latitude: form.latitude,
      longitude: form.longitude,
      landmark: form.landmark.trim(),
      district: form.district.trim() || selectedZone?.name || form.landmark.trim(),
      instructions: form.instructions || form.landmark.trim(),
      contact_phone: form.phone,
      id: editing?.id,
      user_id: profile?.id ?? 'demo-buyer',
      is_default: editing?.is_default ?? addresses.length === 0,
    });
    setShowForm(false);
    setEditing(null);
    setForm(emptyForm());
    await load();
  };

  const handleEdit = (addr: DeliveryAddress) => {
    setEditing(addr);
    setForm({ city: addr.city, zoneId: addr.zone_id ?? '', district: addr.district, landmark: addr.landmark ?? addr.instructions ?? '', instructions: addr.instructions ?? '', phone: addr.contact_phone, latitude: addr.latitude, longitude: addr.longitude });
    setShowForm(true);
  };

  const handleDelete = (addr: DeliveryAddress) => {
    Alert.alert('Supprimer', 'Supprimer cette adresse ?', [
      { text: 'Annuler' },
      { text: 'Supprimer', style: 'destructive', onPress: async () => { await deleteAddress(addr.id); await load(); } },
    ]);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={navigation.goBack} hitSlop={10}>
          <Feather name="arrow-left" size={24} color={colors.text} />
        </Pressable>
        <Text style={styles.title}>Mes adresses</Text>
        <View style={{ width: 24 }} />
      </View>

      {showForm ? (
        <Card style={styles.formCard}>
          <Text style={styles.formTitle}>{editing ? 'Modifier l\'adresse' : 'Nouvelle adresse'}</Text>
          <Text style={styles.label}>Ville</Text>
          <ChoiceChips options={CITY_LIST} value={form.city} onChange={(city) => setForm({ ...form, city, zoneId: '' })} />
          <Text style={styles.label}>Zone *</Text>
          <ChoiceChips options={getZonesForCity(form.city).map((zone) => ({ id: zone.id, label: zone.name }))} value={form.zoneId} onChange={(zoneId) => setForm({ ...form, zoneId })} />
          <Input label="Repère *" value={form.landmark} onChangeText={(v) => setForm({ ...form, landmark: v })} placeholder="Ex: portail bleu près de la pharmacie" icon="map-pin" />
          <Input label="Quartier (compatibilité)" value={form.district} onChangeText={(v) => setForm({ ...form, district: v })} placeholder="Renseigné depuis la zone si vide" icon="home" />
          <Input label="Indications" value={form.instructions} onChangeText={(v) => setForm({ ...form, instructions: v })} placeholder="Instructions complémentaires" multiline numberOfLines={2} />
          <Pressable style={styles.locationButton} onPress={useCurrentLocation}><Feather name="crosshair" size={16} color={colors.primary} /><Text style={styles.locationButtonText}>{form.latitude != null ? 'Position GPS enregistrée' : 'Utiliser ma position'}</Text></Pressable>
          <Input label="Téléphone *" value={form.phone} onChangeText={(v) => setForm({ ...form, phone: v })} keyboardType="phone-pad" icon="phone" />
          <View style={styles.formActions}>
            <Button label="Annuler" variant="ghost" onPress={() => { setShowForm(false); setEditing(null); }} style={{ flex: 1 }} />
            <Button label="Enregistrer" onPress={handleSave} style={{ flex: 1, marginLeft: spacing.md }} />
          </View>
        </Card>
      ) : null}

      {loading ? (
        <LoadingSpinner />
      ) : addresses.length === 0 && !showForm ? (
        <EmptyState icon="map-pin" title="Aucune adresse" message="Ajoutez une adresse de livraison" action={<Button label="Ajouter" onPress={() => setShowForm(true)} style={{ marginTop: spacing.lg }} />} />
      ) : (
        <FlatList
          data={addresses}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          ListFooterComponent={!showForm ? (
            <Pressable style={styles.addBtn} onPress={() => { setEditing(null); setForm(emptyForm()); setShowForm(true); }}>
              <Feather name="plus" size={18} color={colors.primary} />
              <Text style={styles.addBtnText}>Ajouter une adresse</Text>
            </Pressable>
          ) : null}
          renderItem={({ item }) => (
            <Card style={styles.addrCard}>
              <View style={styles.addrHead}>
                <View style={styles.addrIcon}><Feather name="map-pin" size={18} color={colors.primary} /></View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.addrCity}>{item.city} — {item.district}</Text>
                  {item.is_default ? <View style={styles.defaultTag}><Text style={styles.defaultText}>Par défaut</Text></View> : null}
                </View>
              </View>
              {item.instructions ? <Text style={styles.addrInfo}>{item.instructions}</Text> : null}
              <Text style={styles.addrPhone}>📞 {item.contact_phone}</Text>
              <View style={styles.addrActions}>
                <Pressable style={styles.actionBtn} onPress={() => handleEdit(item)}>
                  <Feather name="edit-2" size={15} color={colors.secondary} />
                  <Text style={[styles.actionText, { color: colors.secondary }]}>Modifier</Text>
                </Pressable>
                <Pressable style={styles.actionBtn} onPress={() => handleDelete(item)}>
                  <Feather name="trash-2" size={15} color={colors.danger} />
                  <Text style={[styles.actionText, { color: colors.danger }]}>Supprimer</Text>
                </Pressable>
              </View>
            </Card>
          )}
        />
      )}
    </SafeAreaView>
  );
}

function ChoiceChips({ options, value, onChange }: { options: readonly (string | { id: string; label: string })[]; value: string; onChange: (value: string) => void }) {
  return <View style={styles.cityGrid}>{options.map((option) => {
    const id = typeof option === 'string' ? option : option.id;
    const label = typeof option === 'string' ? option : option.label;
    return <Pressable key={id} style={[styles.cityChip, value === id && styles.cityChipActive]} onPress={() => onChange(id)}><Text style={[styles.cityChipText, value === id && styles.cityChipTextActive]}>{label}</Text></Pressable>;
  })}</View>;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: spacing.lg },
  title: { fontFamily: typography.fontFamily, fontSize: typography.sizes.heading, fontWeight: typography.weights.bold, color: colors.text },
  formCard: { margin: spacing.lg, padding: spacing.lg },
  formTitle: { fontFamily: typography.fontFamily, fontSize: typography.sizes.subtitle, fontWeight: typography.weights.bold, color: colors.text, marginBottom: spacing.md },
  label: { fontFamily: typography.fontFamily, fontSize: typography.sizes.small, fontWeight: typography.weights.medium, color: colors.text, marginTop: spacing.sm, marginBottom: spacing.sm },
  cityGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.sm },
  cityChip: { paddingVertical: spacing.sm, paddingHorizontal: spacing.md, borderRadius: radius.pill, backgroundColor: colors.surfaceAlt, borderWidth: 1, borderColor: colors.border },
  cityChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  cityChipText: { fontFamily: typography.fontFamily, fontSize: typography.sizes.small, color: colors.text },
  cityChipTextActive: { color: colors.textInverse, fontWeight: typography.weights.semibold },
  locationButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, paddingVertical: spacing.sm, borderWidth: 1, borderColor: colors.primary, borderRadius: radius.md, marginBottom: spacing.md },
  locationButtonText: { fontFamily: typography.fontFamily, fontSize: typography.sizes.small, color: colors.primary, fontWeight: typography.weights.semibold },
  formActions: { flexDirection: 'row', marginTop: spacing.md },
  list: { padding: spacing.lg, paddingTop: 0 },
  addBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, paddingVertical: spacing.md, borderWidth: 1.5, borderColor: colors.primary, borderStyle: 'dashed', borderRadius: radius.lg, marginTop: spacing.sm },
  addBtnText: { fontFamily: typography.fontFamily, fontSize: typography.sizes.body, color: colors.primary, fontWeight: typography.weights.semibold },
  addrCard: { marginBottom: spacing.md },
  addrHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.sm },
  addrIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#FFF0E0', alignItems: 'center', justifyContent: 'center' },
  addrCity: { fontFamily: typography.fontFamily, fontSize: typography.sizes.body, fontWeight: typography.weights.semibold, color: colors.text },
  defaultTag: { alignSelf: 'flex-start', backgroundColor: '#FFF0E0', borderRadius: radius.sm, paddingHorizontal: spacing.sm, paddingVertical: 2, marginTop: 4 },
  defaultText: { fontFamily: typography.fontFamily, fontSize: typography.sizes.caption, color: colors.primary, fontWeight: typography.weights.semibold },
  addrInfo: { fontFamily: typography.fontFamily, fontSize: typography.sizes.small, color: colors.textMuted, marginBottom: spacing.xs },
  addrPhone: { fontFamily: typography.fontFamily, fontSize: typography.sizes.small, color: colors.text, marginBottom: spacing.md },
  addrActions: { flexDirection: 'row', gap: spacing.xl, paddingTop: spacing.sm, borderTopWidth: 1, borderTopColor: colors.borderLight },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  actionText: { fontFamily: typography.fontFamily, fontSize: typography.sizes.small, fontWeight: typography.weights.semibold },
});
