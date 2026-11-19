'use client';

import { useState } from 'react';
import { Badge, Button, Dialog, EmptyState, Field, Input, Pagination, Select, Skeleton, StatCard, Tabs, Textarea, ToastProvider, useToast } from './index';

function Interactive() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [tab, setTab] = useState('a');
  const [page, setPage] = useState(2);
  const toast = useToast();

  return (
    <section style={{ display: 'grid', gap: 24 }}>
      <div>
        <h2 style={{ fontSize: 16 }}>دکمه‌ها — همه‌ی حالت‌ها</h2>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
          <Button variant="primary">اصلی</Button>
          <Button variant="tint">ملایم</Button>
          <Button variant="ghost">حاشیه‌ای</Button>
          <Button variant="danger">خطر</Button>
          <Button variant="primary" size="sm">کوچک</Button>
          <Button variant="primary" loading>در حال ذخیره</Button>
          <Button variant="primary" disabled>غیرفعال</Button>
          <Button variant="primary" accent="error">خطا</Button>
          <Button variant="primary" accent="success">موفق</Button>
        </div>
      </div>

      <div>
        <h2 style={{ fontSize: 16 }}>فیلدها — default/error/success</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 8 }}>
          <Field label="نام عضو" htmlFor="f1">
            <Input id="f1" placeholder="مثلاً رضا نیک‌خو" />
          </Field>
          <Field label="موبایل" htmlFor="f2" state="error" hint="شماره باید با ۰۹ شروع شود">
            <Input id="f2" state="error" defaultValue="12345" />
          </Field>
          <Field label="یادداشت" htmlFor="f3" state="success" hint="ذخیره شد">
            <Textarea id="f3" state="success" placeholder="…"/>
          </Field>
          <Field label="پلن" htmlFor="f4">
            <Select id="f4">
              <option>یک‌ماهه</option>
              <option>سه‌ماهه</option>
            </Select>
          </Field>
        </div>
      </div>

      <div>
        <h2 style={{ fontSize: 16 }}>نشان‌ها</h2>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          <Badge kind="ok">فعال</Badge>
          <Badge kind="wn">نزدیک انقضا</Badge>
          <Badge kind="bad">منقضی</Badge>
          <Badge kind="debt">بدهکار</Badge>
          <Badge kind="tint">مدیر</Badge>
          <Badge kind="neutral">بدون اشتراک</Badge>
        </div>
      </div>

      <div>
        <h2 style={{ fontSize: 16 }}>کارت آمار</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 8 }}>
          <StatCard label="اعضای فعال" value="۱۲۸" hint="امروز" delta={8} />
          <StatCard label="درآمد ماه" value="۴۸٫۵ م" delta={-3} />
          <StatCard label="مطالبات" value="۳٫۹ م" hint="۹ بدهکار" />
        </div>
      </div>

      <div>
        <h2 style={{ fontSize: 16 }}>تب و صفحه‌بندی</h2>
        <Tabs items={[{ key: 'a', label: 'همه', count: 128 }, { key: 'b', label: 'نزدیک انقضا', count: 12 }, { key: 'c', label: 'بدهکار', count: 9 }]} active={tab} onChange={setTab} />
        <Pagination page={page} pages={9} onChange={setPage} />
      </div>

      <div>
        <h2 style={{ fontSize: 16 }}>اسکلت و حالت خالی</h2>
        <Skeleton height={20} width="60%" />
        <div style={{ marginTop: 8 }}>
          <EmptyState title="هنوز عضوی ثبت نشده" hint="اولین عضو را اضافه کنید." />
        </div>
      </div>

      <div>
        <h2 style={{ fontSize: 16 }}>دیالوگ، کشو و توست</h2>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          <Button variant="tint" onClick={() => setDialogOpen(true)}>دیالوگ</Button>
          <Button variant="tint" onClick={() => setDrawerOpen(true)}>کشو</Button>
          <Button variant="primary" onClick={() => toast.push('ok', 'ذخیره شد')}>توست موفق</Button>
          <Button variant="danger" onClick={() => toast.push('bad', 'خطای سرور')}>توست خطا</Button>
          <Button variant="ghost" onClick={() => toast.push('wn', 'هشدار: مبلغ صفر است')}>توست هشدار</Button>
        </div>
        <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} title="تأیید عملیات">
          <p style={{ color: 'var(--mut)' }}>این یک دیالوگ نمونه است. با Esc یا کلیک بیرون بسته می‌شود.</p>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-start' }}>
            <Button variant="primary" onClick={() => setDialogOpen(false)}>تأیید</Button>
            <Button variant="ghost" onClick={() => setDialogOpen(false)}>انصراف</Button>
          </div>
        </Dialog>
        <Dialog open={drawerOpen} onClose={() => setDrawerOpen(false)} title="تمدید اشتراک" side="end">
          <Field label="پلن" htmlFor="d1">
            <Select id="d1">
              <option>یک‌ماهه — ۴۵۰٫۰۰۰ تومان</option>
            </Select>
          </Field>
          <Button variant="primary" full>ثبت تمدید</Button>
        </Dialog>
      </div>
    </section>
  );
}

export function KitDemo() {
  return (
    <ToastProvider>
      <Interactive />
    </ToastProvider>
  );
}
