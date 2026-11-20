# کتاب عملیات فولاد — Runbook

چک‌لیست استقرار و نگهداری روی سرور (Node ۲۰+، pnpm، PostgreSQL ۱۶+، PM2، Nginx).

## اولین استقرار

1. کد را بگیرید (`git pull`) و `cp apps/api/.env.example apps/api/.env` — مقادیر:
   - `DATABASE_URL` با نقش `fulad_app` و `MIGRATE_DATABASE_URL` با نقش مالک
   - `JWT_SECRET` (۳۲+ نویسه) و `OTP_PEPPER` (۱۶+ نویسه)
   - `WEB_ORIGIN` دقیق (مثل `https://gym.example.com`) — سیاست Origin به آن تکیه دارد
   - `SMS_PROVIDER=kavenegar` و `SMS_API_KEY=…` (در production حالت console ممنوع است)
   - `ENABLE_DOCS=false`
2. `./scripts/deploy.sh` — نصب، build، مهاجرت، PM2 reload.
3. SQLهای نقش و RLS یک‌بار با نقش مالک: `000_app_role.sql` → `001_tenant_rls.sql` → `002_integrity.sql`.
4. ساخت اولین باشگاه و مدیر آن در پایگاه داده (تا پنل ادمین پلتفرم، دستی).
5. Nginx طبق `deploy/nginx.conf.example` + certbot برای TLS.

## بکاپ روزانه (cron)

```bash
# /etc/cron.d/fulad-backup — ۰۲:۳۰ هر شب، نگهداری ۱۴ روز
30 2 * * * postgres pg_dump -Fc fulad -f /var/backups/fulad-$(date +\%F).dump && find /var/backups -name 'fulad-*.dump' -mtime +14 -delete
```

**تست بازیابی (ماهانه، اجباری):**

```bash
createdb fulad_restore_test && pg_restore -d fulad_restore_test /var/backups/fulad-YYYY-MM-DD.dump
psql fulad_restore_test -f apps/api/prisma/rls/balance_check.sql   # باید خالی باشد
dropdb fulad_restore_test
```

## سلامت

- `GET /api/v1/health` — UptimeRobot یا cron هر ۵ دقیقه.
- `pm2 monit` / `pm2 logs fulad-api` برای مصرف حافظه و خطا.
- ورکر یادآوری: `pm2 logs fulad-reminders` — هر روز ۰۹:۰۰ تهران اجرا و تمام می‌شود؛ اگر FAILEDها بالا رفت، وضعیت ارائه‌دهنده‌ی پیامک را چک کنید.

## وضعیت اعلان‌ها

- مدیر در وب: `GET /reminders` (صف/ارسال‌شده/ناموفق) — نمایشگر در فاز ۲۱+.

## چرخش secret

- `JWT_SECRET` تازه فقط با پذیرش ابطال همه‌ی access tokenها (نشست‌ها تا ۱۵ دقیقه بیرون می‌مانند).
- `OTP_PEPPER` هرگز عوض نشود (کدهای در-flight نامعتبر می‌شوند) — بگردی امن کافی است.

## نگهداری دوره‌ای

- `balance_check.sql` ماهانه روی production (باید خالی باشد) — انحراف بدهی را زودتر از مشتری می‌بیند.
- به‌روزرسانی وابستگی‌ها هر فصل با `pnpm outdated` و CI سبز.
