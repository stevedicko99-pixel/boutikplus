import { memo, useId, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View, type KeyboardTypeOptions, type StyleProp, type ViewStyle } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { colors, layout, radius, shadows, spacing, typography } from '@/theme';

interface InputProps {
  label?: string | null;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  secureTextEntry?: boolean;
  keyboardType?: KeyboardTypeOptions;
  error?: string | null;
  multiline?: boolean;
  numberOfLines?: number;
  icon?: keyof typeof Feather.glyphMap;
  rightElement?: React.ReactNode;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  autoCorrect?: boolean;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
  hideTopLabel?: boolean;
}

function InputComponent({ label, value, onChangeText, placeholder, secureTextEntry, keyboardType = 'default', error, multiline = false, numberOfLines = 1, icon, rightElement, autoCapitalize, autoCorrect, accessibilityLabel, style, hideTopLabel = false }: InputProps) {
  const [focused, setFocused] = useState(false);
  const [show, setShow] = useState(false);
  const errorId = useId();

  return (
    <View style={[styles.wrapper, hideTopLabel && styles.noMargin]}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View style={[styles.container, focused && styles.focused, error && styles.errorBorder, multiline && styles.multiline, style]}>
        {icon ? <Feather name={icon} size={18} color={focused ? colors.focusRing : colors.textMuted} style={styles.icon} /> : null}
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.textMuted}
          secureTextEntry={secureTextEntry ? !show : false}
          keyboardType={keyboardType}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          multiline={multiline}
          numberOfLines={multiline ? numberOfLines : 1}
          autoCapitalize={autoCapitalize}
          autoCorrect={autoCorrect}
          accessibilityLabel={accessibilityLabel ?? label ?? placeholder}
          accessibilityState={{ disabled: false }}
          accessibilityHint={error || undefined}
          style={styles.input}
        />
        {secureTextEntry ? (
          <Pressable accessibilityRole="button" accessibilityLabel={show ? 'Masquer le mot de passe' : 'Afficher le mot de passe'} onPress={() => setShow((current) => !current)} hitSlop={8} style={styles.eyeButton}>
            <Feather name={show ? 'eye-off' : 'eye'} size={18} color={colors.textMuted} />
          </Pressable>
        ) : null}
        {rightElement}
      </View>
      {error ? <Text nativeID={errorId} accessibilityRole="alert" style={styles.errorText}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { marginBottom: spacing.md },
  noMargin: { marginBottom: 0 },
  label: { fontFamily: typography.fontFamily, fontSize: typography.sizes.small, lineHeight: typography.lineHeightPx.small, fontWeight: typography.weights.semibold, color: colors.text, marginBottom: spacing.xs },
  container: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surfaceElevated, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: spacing.md, minHeight: 52 },
  focused: { borderColor: colors.focusRing, ...shadows.focus },
  errorBorder: { borderColor: colors.danger },
  multiline: { alignItems: 'flex-start', paddingVertical: spacing.sm },
  icon: { marginRight: spacing.sm },
  input: { flex: 1, minHeight: layout.minTouchTarget, fontFamily: typography.fontFamily, fontSize: typography.sizes.body, lineHeight: typography.lineHeightPx.body, color: colors.text, paddingVertical: spacing.sm, outlineStyle: 'none' } as any,
  eyeButton: { width: layout.minTouchTarget, height: layout.minTouchTarget, alignItems: 'center', justifyContent: 'center', borderRadius: radius.sm },
  eyeFocused: { borderWidth: 2, borderColor: colors.focusRing },
  errorText: { fontFamily: typography.fontFamily, fontSize: typography.sizes.caption, lineHeight: typography.lineHeightPx.caption, color: colors.dangerText, marginTop: spacing.xs, marginLeft: spacing.xs },
});

export const Input = memo(InputComponent);
