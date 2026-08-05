import { StyleSheet, View, Text, Pressable, ScrollView, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { colors, typography, spacing, radius } from '@/theme';
import { useAuth } from '@/context/AuthContext';
import { useAccessibility } from '@/context/AccessibilityContext';
import { isDemoMode } from '@/lib/dataService';

interface SettingsScreenProps {
  navigation: { navigate: (screen: string, params?: any) => void; goBack: () => void };
}

export function SettingsScreen({ navigation }: SettingsScreenProps) {
  const { signOut } = useAuth();
  const {
    largeIcons,
    toggleLargeIcons,
    audioMode,
    toggleAudioMode,
    lowDataMode,
    toggleLowDataMode,
  } = useAccessibility();

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={navigation.goBack} hitSlop={10}>
          <Feather name="arrow-left" size={24} color={colors.text} />
        </Pressable>
        <Text style={styles.title}>Paramètres</Text>
        <View style={{ width: 24 }} />
      </View>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.sectionTitle}>Préférences</Text>
        <View style={styles.group}>
          <SettingRow icon="bell" label="Notifications" color={colors.primary} value="Activées" />
          <SettingRow icon="globe" label="Langue" color={colors.secondary} value="Français" />
          <SettingRow icon="moon" label="Thème" color={colors.text} value="Clair" />
        </View>

        <Text style={styles.sectionTitle}>Accessibilité</Text>
        <View style={styles.group}>
          <ToggleRow
            icon="maximize"
            label="Grandes icônes"
            description="Agrandit les boutons et icônes pour une utilisation plus facile"
            color={colors.primary}
            value={largeIcons}
            onToggle={toggleLargeIcons}
          />
          <ToggleRow
            icon="volume-2"
            label="Mode audio"
            description="Lit les prix, descriptions et statuts à voix haute"
            color={colors.secondary}
            value={audioMode}
            onToggle={toggleAudioMode}
          />
          <ToggleRow
            icon="wifi-off"
            label="Mode économie de données"
            description="Compresse les images et désactive les animations pour le réseau lent"
            color={colors.warning}
            value={lowDataMode}
            onToggle={toggleLowDataMode}
          />
        </View>
        <View style={styles.group}>
          <SettingRow icon="info" label="Version" color={colors.info} value="1.0.0" />
          <SettingRow
            icon="award"
            label="Propriété Boutikplus"
            color={colors.primary}
            chevron
            onPress={() => navigation.navigate('About')}
          />
          <SettingRow icon="help-circle" label="Aide & support" color={colors.success} chevron onPress={() => navigation.navigate('HelpCenter')} />
          <SettingRow icon="file-text" label="Conditions d'utilisation" color={colors.textMuted} chevron onPress={() => navigation.navigate('Terms')} />
          <SettingRow icon="shield" label="Confidentialité" color={colors.secondary} chevron onPress={() => navigation.navigate('Privacy')} />
        </View>
        {/* Marqueur stéganographique BTIK : identifiant invisible de propriété.
            Voir src/lib/ownership.ts -> STEG_MARKERS pour la correspondance.
            __BTIK_SETTINGS_VER__ = d31b882e7d713385-322b2991bedbac05-337bc219-OWNER */}
        <SettingRow icon="hidden" label="" color="#00000000" />

        {isDemoMode ? (
          <View style={styles.demoBanner}>
            <Feather name="zap" size={20} color={colors.warning} />
            <View style={{ flex: 1 }}>
              <Text style={styles.demoTitle}>Mode démonstration</Text>
              <Text style={styles.demoText}>L'app fonctionne avec des données de démo. Configurez Supabase (.env) pour activer toutes les fonctionnalités.</Text>
            </View>
          </View>
        ) : null}

        <Pressable style={styles.logoutBtn} onPress={signOut}>
          <Feather name="log-out" size={20} color={colors.danger} />
          <Text style={styles.logoutText}>Se déconnecter</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

function SettingRow({ icon, label, color, value, chevron, onPress }: { icon: string; label: string; color: string; value?: string; chevron?: boolean; onPress?: () => void }) {
  const content = (
    <>
      <View style={[styles.rowIcon, { backgroundColor: color + '18' }]}>
        <Feather name={icon as any} size={18} color={color} />
      </View>
      <Text style={styles.rowLabel}>{label}</Text>
      {value ? <Text style={styles.rowValue}>{value}</Text> : null}
      {chevron ? <Feather name="chevron-right" size={18} color={colors.textMuted} /> : null}
    </>
  );
  if (onPress) {
    return (
      <Pressable style={({ pressed }) => [styles.row, pressed && { opacity: 0.6 }]} onPress={onPress}>
        {content}
      </Pressable>
    );
  }
  return <View style={styles.row}>{content}</View>;
}

function ToggleRow({ icon, label, description, color, value, onToggle }: {
  icon: string;
  label: string;
  description: string;
  color: string;
  value: boolean;
  onToggle: () => void;
}) {
  return (
    <View style={styles.toggleRow}>
      <View style={[styles.rowIcon, { backgroundColor: color + '18' }]}>
        <Feather name={icon as any} size={18} color={color} />
      </View>
      <View style={styles.toggleContent}>
        <Text style={styles.toggleLabel}>{label}</Text>
        <Text style={styles.toggleDesc}>{description}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onToggle}
        trackColor={{ false: colors.border, true: color + '60' }}
        thumbColor={value ? color : colors.textMuted}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: spacing.lg },
  title: { fontFamily: typography.fontFamily, fontSize: typography.sizes.heading, fontWeight: typography.weights.bold, color: colors.text },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  titleThread: { alignSelf: 'center', marginBottom: spacing.sm },
  scroll: { padding: spacing.lg, paddingTop: 0 },
  sectionTitle: { fontFamily: typography.fontFamily, fontSize: typography.sizes.small, fontWeight: typography.weights.semibold, color: colors.textMuted, marginTop: spacing.lg, marginBottom: spacing.sm, marginLeft: spacing.xs },
  group: { backgroundColor: colors.surface, borderRadius: radius.lg, overflow: 'hidden', borderWidth: 1, borderColor: colors.borderLight },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.borderLight },
  rowIcon: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  rowLabel: { flex: 1, fontFamily: typography.fontFamily, fontSize: typography.sizes.body, color: colors.text },
  rowValue: { fontFamily: typography.fontFamily, fontSize: typography.sizes.small, color: colors.textMuted, marginRight: spacing.sm },
  demoBanner: { flexDirection: 'row', gap: spacing.md, backgroundColor: '#FFF8E1', borderRadius: radius.lg, padding: spacing.lg, marginTop: spacing.xl },
  demoTitle: { fontFamily: typography.fontFamily, fontSize: typography.sizes.body, fontWeight: typography.weights.bold, color: colors.warning },
  demoText: { fontFamily: typography.fontFamily, fontSize: typography.sizes.small, color: colors.textMuted, lineHeight: 20, marginTop: 2 },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, paddingVertical: spacing.md, borderRadius: radius.lg, borderWidth: 1.5, borderColor: colors.danger, marginTop: spacing.xl, marginBottom: spacing.xxl },
  logoutText: { fontFamily: typography.fontFamily, fontSize: typography.sizes.body, fontWeight: typography.weights.semibold, color: colors.danger },
  toggleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.borderLight },
  toggleContent: { flex: 1 },
  toggleLabel: { fontFamily: typography.fontFamily, fontSize: typography.sizes.body, color: colors.text, fontWeight: typography.weights.medium },
  toggleDesc: { fontFamily: typography.fontFamily, fontSize: typography.sizes.caption, color: colors.textMuted, marginTop: 2 },
});
