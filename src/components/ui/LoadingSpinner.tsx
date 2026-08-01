import { StyleSheet, View } from 'react-native';
import { colors } from '@/theme';

export function LoadingSpinner({ size = 28 }: { size?: number }) {
  return (
    <View style={styles.container}>
      <View style={[styles.spinner, { width: size, height: size, borderColor: colors.primary, borderTopColor: 'transparent' }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 },
  spinner: {
    borderRadius: 999,
    borderWidth: 3,
  },
});
