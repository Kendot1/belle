import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';
import { usePalette } from '../theme';

type Props = {
  label: string; onPress: () => void; variant?: 'primary' | 'secondary' | 'quiet' | 'danger';
  disabled?: boolean; accessibilityLabel?: string; accessibilityHint?: string;
  accessibilityState?: PressableProps['accessibilityState']; testID?: string;
  style?: StyleProp<ViewStyle>; children?: ReactNode; compact?: boolean;
};

export function ActionButton({ label, onPress, variant = 'secondary', disabled = false, accessibilityLabel, accessibilityHint, accessibilityState, testID, style, children, compact = false }: Props) {
  const colors = usePalette();
  const backgroundColor = variant === 'primary' ? colors.action : variant === 'danger' ? colors.danger : variant === 'quiet' ? 'transparent' : colors.subtle;
  const color = variant === 'primary' ? colors.actionText : variant === 'danger' ? '#FFFFFF' : colors.text;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ ...accessibilityState, disabled: disabled || accessibilityState?.disabled }}
      testID={testID}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [styles.button, { backgroundColor, opacity: disabled ? 0.45 : pressed ? 0.78 : 1 }, compact && styles.compact, style]}
    >
      {children}<Text style={[styles.label, { color }, compact && styles.compactLabel]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: { minHeight: 48, minWidth: 48, paddingHorizontal: 16, borderRadius: 24, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 7 },
  compact: { minHeight: 44, minWidth: 44, paddingHorizontal: 12 },
  label: { fontSize: 15, fontWeight: '600' }, compactLabel: { fontSize: 14 },
});
