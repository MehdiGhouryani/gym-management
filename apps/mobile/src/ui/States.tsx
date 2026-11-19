import { ActivityIndicator, View } from 'react-native';
import { Button } from './Button';
import { T } from './Text';
import { useTheme } from './theme';

export function Loading() {
  const { c } = useTheme();
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 }}>
      <ActivityIndicator color={c.primary} size="large" />
    </View>
  );
}

export function EmptyState({ title, hint, actionLabel, onAction }: { title: string; hint?: string; actionLabel?: string; onAction?: () => void }) {
  const { c, radius } = useTheme();
  return (
    <View style={{ margin: 22, padding: 24, gap: 8, alignItems: 'center', backgroundColor: c.card, borderRadius: radius.lg, borderWidth: 1, borderColor: c.line }}>
      <T weight="bold" size={17} align="center">
        {title}
      </T>
      {hint ? (
        <T size={14} color={c.muted} align="center">
          {hint}
        </T>
      ) : null}
      {actionLabel && onAction ? <Button label={actionLabel} onPress={onAction} style={{ marginTop: 10 }} /> : null}
    </View>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return <EmptyState title="مشکلی پیش آمد" hint={message} actionLabel="تلاش دوباره" onAction={onRetry} />;
}
