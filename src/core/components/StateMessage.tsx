import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { usePalette } from '../theme';
import { ActionButton } from './ActionButton';

type Props = { title: string; message: string; loading?: boolean; actionLabel?: string; onAction?: () => void };

export function StateMessage({ title, message, loading = false, actionLabel, onAction }: Props) {
  const colors = usePalette();
  return (
    <View style={[styles.wrap, { backgroundColor: colors.background }]}>
      {loading ? <ActivityIndicator color={colors.action} size="large" accessibilityLabel="Loading" /> : null}
      <Text accessibilityRole="header" style={[styles.title, { color: colors.text }]}>{title}</Text>
      <Text style={[styles.message, { color: colors.secondary }]}>{message}</Text>
      {actionLabel && onAction ? <ActionButton label={actionLabel} onPress={onAction} variant="primary" /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, minHeight: 260, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 14 },
  title: { fontSize: 22, fontWeight: '700', textAlign: 'center' },
  message: { fontSize: 16, lineHeight: 23, textAlign: 'center', maxWidth: 340 },
});
