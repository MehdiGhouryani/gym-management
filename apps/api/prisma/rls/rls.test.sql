-- تست نشت داده بین دو باشگاه. در یک پایگاه داده‌ی خالی و با سوپریوزر اجرا شود:
--   createdb fulad_rls_test && psql fulad_rls_test -f prisma/rls/rls.test.sql
-- در پایان همه‌چیز برگردانده می‌شود (ROLLBACK).
\set ON_ERROR_STOP on
BEGIN;
CREATE TABLE gyms (id text PRIMARY KEY);
CREATE TABLE members (id text PRIMARY KEY, "gymId" text NOT NULL REFERENCES gyms(id), name text);
CREATE TABLE plans (id text PRIMARY KEY, "gymId" text NOT NULL REFERENCES gyms(id));
CREATE TABLE subscriptions (id text PRIMARY KEY, "gymId" text NOT NULL REFERENCES gyms(id));
CREATE TABLE payments (id text PRIMARY KEY, "gymId" text NOT NULL REFERENCES gyms(id));
CREATE TABLE reminders (id text PRIMARY KEY, "gymId" text NOT NULL REFERENCES gyms(id));
CREATE TABLE requests (id text PRIMARY KEY, "gymId" text NOT NULL REFERENCES gyms(id));
CREATE TABLE audit_logs (id text PRIMARY KEY, "gymId" text REFERENCES gyms(id));
CREATE TABLE idempotency_keys (id text PRIMARY KEY, "gymId" text NOT NULL REFERENCES gyms(id), key text, "requestHash" text);
CREATE TABLE plan_price_histories (id text PRIMARY KEY, "gymId" text NOT NULL REFERENCES gyms(id));
\ir 001_tenant_rls.sql

CREATE ROLE rls_tester NOSUPERUSER NOBYPASSRLS;
GRANT ALL ON ALL TABLES IN SCHEMA public TO rls_tester;

INSERT INTO gyms VALUES ('A'), ('B');
INSERT INTO members VALUES ('m1','A','alef1'), ('m2','A','alef2'), ('m3','B','be1');
INSERT INTO plans VALUES ('p1','A'), ('p2','B');

SET LOCAL ROLE rls_tester;

DO $$ BEGIN
  IF (SELECT count(*) FROM members) <> 0 THEN RAISE EXCEPTION 'نشت: بدون app.gym_id نباید ردیفی دیده شود'; END IF;
END $$;

SELECT set_config('app.gym_id', 'A', true);
DO $$
DECLARE n int;
BEGIN
  IF (SELECT count(*) FROM members) <> 2 THEN RAISE EXCEPTION 'نشت: باشگاه A باید دقیقاً ۲ عضو ببیند'; END IF;
  IF (SELECT count(*) FROM members WHERE "gymId" = 'B') <> 0 THEN RAISE EXCEPTION 'نشت: باشگاه A اعضای B را دید'; END IF;
  IF (SELECT count(*) FROM plans) <> 1 THEN RAISE EXCEPTION 'نشت: پلن‌ها'; END IF;
  UPDATE members SET name = 'hacked' WHERE "gymId" = 'B';
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 0 THEN RAISE EXCEPTION 'نشت: ویرایش عضو باشگاه دیگر'; END IF;
  DELETE FROM members WHERE "gymId" = 'B';
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 0 THEN RAISE EXCEPTION 'نشت: حذف عضو باشگاه دیگر'; END IF;
  BEGIN
    INSERT INTO members VALUES ('x','B','x');
    RAISE EXCEPTION 'نشت: ثبت عضو برای باشگاه دیگر ممکن بود';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
END $$;

SELECT set_config('app.gym_id', 'B', true);
DO $$ BEGIN
  IF (SELECT count(*) FROM members) <> 1 THEN RAISE EXCEPTION 'نشت: باشگاه B باید دقیقاً ۱ عضو ببیند'; END IF;
END $$;

RESET ROLE;
ROLLBACK;
SELECT 'RLS OK' AS result;
