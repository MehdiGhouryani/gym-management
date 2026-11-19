import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { invalidateMember } from '../../src/features/invalidate';
import { ApiError } from '../../src/lib/api/client';
import { api } from '../../src/lib/api/instance';
import { firstIssue, messageOf } from '../../src/lib/errors';
import { buildMemberUpdate } from '../../src/lib/forms';
import { Button } from '../../src/ui/Button';
import { Screen } from '../../src/ui/Screen';
import { ErrorState, Loading } from '../../src/ui/States';
import { T } from '../../src/ui/Text';
import { TextField } from '../../src/ui/TextField';
import { useToast } from '../../src/ui/Toast';
import { useTheme } from '../../src/ui/theme';

export default function EditMember() {
  const { c, radius } = useTheme();
  const qc = useQueryClient();
  const toast = useToast();
  const { id } = useLocalSearchParams<{ id: string }>();
  const member = useQuery({ queryKey: ['member', id], queryFn: () => api.member(id) });
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [note, setNote] = useState('');
  const [errors, setErrors] = useState<{ name?: string; phone?: string }>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [dupId, setDupId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [filled, setFilled] = useState(false);

  // فرم فقط یک‌بار با اطلاعات فعلی پر می‌شود تا بازخوانی پس‌زمینه تایپ کاربر را پاک نکند
  useEffect(() => {
    if (member.data && !filled) {
      setName(member.data.name);
      setPhone(member.data.phone);
      setNote(member.data.note ?? '');
      setFilled(true);
    }
  }, [member.data, filled]);

  const back = <Button small variant="text" label="بازگشت" onPress={() => router.back()} style={{ alignSelf: 'flex-end' }} />;
  if (member.isPending) return <Screen>{back}<Loading /></Screen>;
  if (member.isError || !member.data) return <Screen>{back}<ErrorState message={messageOf(member.error)} onRetry={() => void member.refetch()} /></Screen>;
  const m = member.data;

  const save = async () => {
    const r = buildMemberUpdate(m, { name, phone, note });
    setErrors(r.errors);
    setFormError(null);
    setDupId(null);
    if (!r.ok) return;
    if (!r.body) return router.back();
    setBusy(true);
    try {
      await api.updateMember(m.id, r.body);
      invalidateMember(qc, m.id);
      toast('تغییرات ذخیره شد');
      router.back();
    } catch (e) {
      if (e instanceof ApiError && e.status === 409) {
        const b = e.body as { existingMemberId?: string } | null;
        setFormError(e.message);
        setDupId(b?.existingMemberId ?? null);
      } else {
        const issue = firstIssue(e);
        if (issue) setErrors({ phone: issue });
        else setFormError(messageOf(e));
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={{ padding: 18, gap: 16 }} keyboardShouldPersistTaps="handled">
          {back}
          <T size={26} weight="bold">
            ویرایش عضو
          </T>
          <TextField label="نام و نام خانوادگی" value={name} onChangeText={setName} error={errors.name} />
          <TextField label="شماره موبایل" value={phone} onChangeText={setPhone} error={errors.phone} keyboardType="phone-pad" />
          <TextField label="یادداشت" value={note} onChangeText={setNote} multiline inputStyle={{ minHeight: 84, paddingTop: 12, textAlignVertical: 'top' }} />
          {formError ? (
            <View style={{ backgroundColor: c.warnTint, borderRadius: radius.md, padding: 14, gap: 10 }}>
              <T weight="bold" color={c.warn} accessibilityLiveRegion="polite">
                {formError}
              </T>
              {dupId ? <Button small variant="ghost" label="باز کردن آن عضو" onPress={() => router.replace({ pathname: '/member/[id]', params: { id: dupId } })} /> : null}
            </View>
          ) : null}
          <Button label="ذخیره" onPress={save} loading={busy} />
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}
