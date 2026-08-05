// Input — champ signature « Fil de Faso ».
// Au focus, un ThreadDivider vertical apparaît à gauche (le "fil" qui traverse
// le champ), bordure passe de border → stitch, et coins pincés légers.
// État error : bordure danger + fil danger.
import { useState, memo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  Pressable,
  type KeyboardTypeOptions,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { colors, typography, radius, spacing } from '@/theme';
import { ThreadDivider } from './ThreadDivider';

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
  /** Si true, masque complètement l'espace réservé au label (sans margin-bottom 0). Pour intégration dans une rangée. */
  hideTopLabel?: boolean;
}

function InputComponent({
  label,
  value,
  onChangeText,
  placeholder,
  secureTextEntry,
  keyboardType = 'default',
  error,
  multiline = false,
  numberOfLines = 1,
  icon,
  rightElement,
  autoCapitalize,
  autoCorrect,
  accessibilityLabel,
  style,
  hideTopLabel = false,
}: InputProps) {
  const [focused, setFocused] = useState(false);
  const [show, setShow] = useState(false);
  const isSecure = secureTextEntry;

  const showThread = focused && !error;

  return (
    <View style={[styles.wrapper, hideTopLabel && { marginBottom: 0 }]}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View
        style={[
          styles.container,
          focused && styles.focused,
          error && styles.errorBorder,
          multiline && styles.multiline,
          style,
        ]}
      >
        {showThread ? <ThreadDivider variant="vertical" color={colors.stitchDeep} style={styles.thread} /> : null}
        {icon ? (
          <Feather name={icon} size={18} color={focused ? colors.primaryDeep : colors.textMuted} style={styles.icon} />
        ) : null}
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.textMuted}
          secureTextEntry={isSecure ? !show : false}
          keyboardType={keyboardType}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          multiline={multiline}
          numberOfLines={multiline ? numberOfLines : 1}
          autoCapitalize={autoCapitalize}
          autoCorrect={autoCorrect}
          accessibilityLabel={accessibilityLabel ?? label ?? placeholder}
          style={styles.input}
        />
        {isSecure ? (
          <Pressable onPress={() => setShow((s) => !s)} hitSlop={8}>
            <Feather name={show ? 'eye-off' : 'eye'} size={18} color={colors.textMuted} />
          </Pressable>
        ) : null}
        {rightElement}
      </View>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { marginBottom: spacing.md },
  label: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.small,
    fontWeight: typography.weights.medium,
    color: colors.text,
    marginBottom: spacing.xs,
    letterSpacing: typography.letterSpacings.wide,
  },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
    // Coins pincés légers
    borderTopLeftRadius: radius.md + 4,
    borderTopRightRadius: radius.md,
    borderBottomLeftRadius: radius.md,
    borderBottomRightRadius: radius.md + 4,
    paddingHorizontal: spacing.md,
    minHeight: 52,
  },
  focused: {
    borderColor: colors.stitch,
    backgroundColor: colors.surface,
  },
  errorBorder: { borderColor: colors.danger },
  multiline: { alignItems: 'flex-start', paddingVertical: spacing.sm },
  thread: {
    marginLeft: -spacing.xs,
    marginRight: spacing.xs - 2,
  },
  icon: { marginRight: spacing.sm },
  input: {
    flex: 1,
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.body,
    color: colors.text,
    paddingVertical: spacing.sm,
  },
  errorText: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.caption,
    color: colors.danger,
    marginTop: spacing.xs,
    marginLeft: spacing.xs,
  },
});

export const Input = memo(InputComponent);
