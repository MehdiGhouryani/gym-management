-- با نقش مالک اجرا شود، بعد از اولین مهاجرت:
--   psql "$MIGRATE_DATABASE_URL" -v app_password='رمز-قوی' -f prisma/rls/000_app_role.sql
CREATE ROLE fulad_app LOGIN PASSWORD :'app_password' NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE;
GRANT CONNECT ON DATABASE fulad TO fulad_app;
GRANT USAGE ON SCHEMA public TO fulad_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO fulad_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO fulad_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO fulad_app;
-- لاگ ممیزی فقط افزودنی است
REVOKE UPDATE, DELETE ON audit_logs FROM fulad_app;
