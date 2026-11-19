import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { router } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { invalidateMember } from '../../src/features/invalidate';
import { ApiError } from '../../src/lib/api/client';
import { api } from '../../src/lib/api/instance';
import { firstIssue, messageOf } from '../../src/lib/errors';
import { validateMemberForm } from '../../src/lib/forms';
import { Button } from '../../src/ui/Button';
import { Screen } from '../../src/ui/Screen';
import { T } from '../../src/ui/Text';
import { TextField } from '../../src/ui/TextField';
import { useToast } from '../../src/ui/Toast';
import { useTheme } from '../../src/ui/theme';

export default function NewMember() {
  const { c, radius } = useTheme();
  const qc = useQueryClient();
  const toast = useToast();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [note, setNote] = useState('');
  const [errors, setErrors] = useState<{ name?: string; phone?: string }>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [dup, setDup] = useState<{ code?: string; id?: string; message: string } | null>(null);
  const [busy, setBusy] = useState<'save' | 'subscribe' | null>(null);

  const save = async (then: 'save' | 'subscribe') => {
    const v = validateMemberForm({ name, phone, note });
    setErrors(v.errors);
    setFormError(null);
    setDup(null);
    if (!v.ok) return;
    setBusy(then);
    try {
      const m = await api.createMember({ name: v.name, phone: v.phone, note: v.note });
      invalidateMember(qc, m.id);
      if (then === 'subscribe') router.replace({ pathname: '/member/[id]', params: { id: m.id, renew: '1' } });
      else {
        toast('عضو ثبت شد');
        router.back();
      }
    } catch (e) {
      if (e instanceof ApiError && e.status === 409) {
        const b = e.body as { code?: string; existingMemberId?: string } | null;
        setDup({ code: b?.code, id: b?.existingMemberId, message: e.message });
      } else {
        const issue = firstIssue(e);
        if (issue) setErrors({ phone: issue });
        else setFormError(messageOf(e));
      }
    } finally {
      setBusy(null);
    }
  };

  return (
    <Screen>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={{ padding: 18, gap: 16 }} keyboardShouldPersistTaps="handled">
          <Button small variant="text" label="بازگشت" onPress={() => router.back()} style={{ alignSelf: 'flex-end' }} />
          <T size={26} weight="bold">
            عضو جدید
          </T>
          <TextField label="نام و نام خانوادگی" value={name} onChangeText={setName} error={errors.name} autoFocus returnKeyType="next" />
          <TextField
            label="شماره موبایل"
            value={phone}
            onChangeText={setPhone}
            error={errors.phone}
            keyboardType="phone-pad"
            textContentType="telephoneNumber"
            placeholder="۰۹۱۲ ۳۴۵ ۶۷۸۹"
          />
          <TextField label="یادداشت (اختیاری)" value={note} onChangeText={setNote} multiline inputStyle={{ minHeight: 84, paddingTop: 12, textAlignVertical: 'top' }} />

          {dup ? (
            <View style={{ backgroundColor: c.warnTint, borderRadius: radius.md, padding: 14, gap: 10 }}>
              <T weight="bold" color={c.warn}>
                {dup.message}
              </T>
              {dup.code === 'MEMBER_EXISTS' && dup.id ? (
                <Button small variant="ghost" label="باز کردن پروفایل" onPress={() => router.replace({ pathname: '/member/[id]', params: { id: dup.id as string } })} />
              ) : null}
            </View>
          ) : null}
          {formError ? (
            <T weight="bold" color={c.bad} accessibilityLiveRegion="polite">
              {formError}
            </T>
          ) : null}

          <Button label="ذخیره و ثبت اشتراک" onPress={() => save('subscribe')} loading={busy === 'subscribe'} disabled={busy !== null} />
          <Button label="ذخیره" variant="ghost" onPress={() => save('save')} loading={busy === 'save'} disabled={busy !== null} />
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}
