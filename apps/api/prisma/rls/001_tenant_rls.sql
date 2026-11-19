-- جداسازی باشگاه‌ها در سطح پایگاه داده. با نقش مالک اجرا شود.
-- سیاست: فقط ردیف‌هایی دیده یا نوشته می‌شوند که "gymId" برابر app.gym_id همان تراکنش باشد.
-- اگر app.gym_id تنظیم نشده باشد، هیچ ردیفی دیده نمی‌شود (امن در برابر فراموشی).
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['members','plans','subscriptions','payments','reminders','requests','audit_logs','idempotency_keys','plan_price_histories','refunds'] LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS tenant_isolation ON %I', t);
    EXECUTE format(
      $p$CREATE POLICY tenant_isolation ON %I
         USING ("gymId" = current_setting('app.gym_id', true))
         WITH CHECK ("gymId" = current_setting('app.gym_id', true))$p$, t);
  END LOOP;
END $$;
