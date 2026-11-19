import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { router } from 'expo-router';
import { isIranMobile, normalizePhone } from '@fulad/shared';
import { api } from '../../src/lib/api/instance';
import { firstIssue, messageOf } from '../../src/lib/errors';
import { Button } from '../../src/ui/Button';
import { Screen } from '../../src/ui/Screen';
import { T } from '../../src/ui/Text';
import { TextField } from '../../src/ui/TextField';
import { useTheme } from '../../src/ui/theme';

export default function Login() {
  const { c } = useTheme();
  const [phone, setPhone] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    const normalized = normalizePhone(phone);
    if (!isIranMobile(normalized)) return setError('شماره‌ی موبایل را درست وارد کنید (مثلاً ۰۹۱۲۳۴۵۶۷۸۹)');
    setBusy(true);
    setError(null);
    try {
      const r = await api.requestOtp(normalized);
      router.push({ pathname: '/(auth)/verify', params: { phone: normalized, retry: String(r.retryAfterSec) } });
    } catch (e) {
      setError(firstIssue(e) ?? messageOf(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={{ padding: 22, gap: 20, flexGrow: 1 }} keyboardShouldPersistTaps="handled">
          <View style={{ gap: 8, marginTop: 40 }}>
            <T size={28} weight="bold">
              ورود به فولاد
            </T>
            <T size={15} color={c.muted}>
              شماره‌ای را وارد کنید که باشگاه برای شما ثبت کرده است. کد ورود پیامک می‌شود.
            </T>
          </View>
          <TextField
            label="شماره موبایل"
            value={phone}
            onChangeText={(t) => {
              setPhone(t);
              setError(null);
            }}
            error={error}
            placeholder="۰۹۱۲ ۳۴۵ ۶۷۸۹"
            keyboardType="phone-pad"
            textContentType="telephoneNumber"
            autoComplete="tel"
            autoFocus
            returnKeyType="done"
            onSubmitEditing={submit}
          />
          <Button label="دریافت کد" onPress={submit} loading={busy} disabled={phone.trim().length < 10} />
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}
