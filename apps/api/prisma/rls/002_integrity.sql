-- قیدهای یکپارچگی مالی و تاریخی در سطح پایگاه داده. با نقش مالک و بعد از مهاجرت‌ها اجرا شود.
-- اجرای دوباره بی‌خطر است.
CREATE EXTENSION IF NOT EXISTS btree_gist;

DO $$
DECLARE c record;
BEGIN
  FOR c IN SELECT * FROM (VALUES
    ('members',       'members_balance_nonneg',   'CHECK (balance >= 0)'),
    ('payments',      'payments_amount_positive', 'CHECK (amount > 0)'),
    ('subscriptions', 'subscriptions_price_nonneg', 'CHECK (price >= 0)'),
    ('subscriptions', 'subscriptions_dates_order',  'CHECK ("endsOn" >= "startsOn")'),
    ('plans',         'plans_days_positive',      'CHECK (days > 0 AND price >= 0)'),
    -- هیچ عضوی دو اشتراک هم‌پوشان ندارد (حتی با دو درخواست هم‌زمان)
    ('subscriptions', 'subscriptions_no_overlap',
       'EXCLUDE USING gist ("memberId" WITH =, daterange("startsOn", "endsOn", ''[]'') WITH &&)')
  ) AS t(tbl, name, def)
  LOOP
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = c.name) THEN
      EXECUTE format('ALTER TABLE %I ADD CONSTRAINT %I %s', c.tbl, c.name, c.def);
    END IF;
  END LOOP;
END $$;
