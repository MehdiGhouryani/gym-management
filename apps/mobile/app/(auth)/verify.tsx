import { useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { normalizeDigits } from '@fulad/shared';
import { useAuth } from '../../src/auth/AuthProvider';
import { useCountdown } from '../../src/hooks/useCountdown';
import { api } from '../../src/lib/api/instance';
import { faDigits, formatPhone } from '../../src/lib/format';
import { messageOf } from '../../src/lib/errors';
import { Button } from '../../src/ui/Button';
import { Screen } from '../../src/ui/Screen';
import { T } from '../../src/ui/Text';
import { TextField } from '../../src/ui/TextField';
import { useTheme } from '../../src/ui/theme';

export default function Verify() {
  const { c } = useTheme();
  const { signIn } = useAuth();
  const { phone, retry } = useLocalSearchParams<{ phone: string; retry?: string }>();
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [left, restart] = useCountdown(Number(retry) || 60);
  const submitting = useRef(false);

  const submit = async (value: string) => {
    if (submitting.current || !phone) return;
    submitting.current = true;
    setBusy(true);
    setError(null);
    try {
      await signIn(phone, value);
      // بعد از ورود، چیدمان (auth) خودش به صفحه‌ی اصلی هدایت می‌کند
    } catch (e) {
      setError(messageOf(e));
      setCode('');
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  };

  const resend = async () => {
    if (!phone) return;
    setError(null);
    try {
      const r = await api.requestOtp(phone);
      restart(r.retryAfterSec);
    } catch (e) {
      setError(messageOf(e));
    }
  };

  return (
    <Screen>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={{ padding: 22, gap: 20, flexGrow: 1 }} keyboardShouldPersistTaps="handled">
          <View style={{ gap: 8, marginTop: 40 }}>
            <T size={28} weight="bold">
              کد تأیید را وارد کنید
            </T>
            <T size={15} color={c.muted}>
              کد ۵ رقمی به {formatPhone(phone ?? '')} پیامک شد.
            </T>
          </View>
          <TextField
            value={code}
            onChangeText={(t) => {
              const v = normalizeDigits(t).replace(/\D/g, '').slice(0, 5);
              setCode(v);
              if (v.length === 5) void submit(v); // با کامل‌شدن ۵ رقم خودکار وارد می‌شود
            }}
            error={error}
            keyboardType="number-pad"
            maxLength={5}
            textContentType="oneTimeCode"
            autoComplete="sms-otp"
            autoFocus
            editable={!busy}
            inputStyle={{ fontSize: 28, letterSpacing: 10, textAlign: 'center', minHeight: 64 }}
            accessibilityLabel="کد تأیید"
          />
          <Button label="ورود" onPress={() => submit(code)} loading={busy} disabled={code.length < 5} />
          {left > 0 ? (
            <T size={14} color={c.muted} align="center">
              ارسال دوباره‌ی کد تا {faDigits(left)} ثانیه
            </T>
          ) : (
            <Button label="ارسال دوباره‌ی کد" variant="text" onPress={resend} />
          )}
          <T size={13} color={c.muted} align="center">
            اگر کدی نرسید، مطمئن شوید این شماره در باشگاه به‌عنوان مدیر یا پذیرش ثبت شده است.
          </T>
          <Button label="تغییر شماره" variant="text" onPress={() => router.back()} />
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}
