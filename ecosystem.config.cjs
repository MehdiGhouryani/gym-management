// اجرای production با PM2 (بدون Docker)
module.exports = {
  apps: [
    {
      name: 'fulad-api',
      cwd: 'apps/api',
      script: 'dist/main.js',
      env: { NODE_ENV: 'production', PORT: 4000, TZ: 'Asia/Tehran' },
    },
    {
      name: 'fulad-web',
      cwd: 'apps/web',
      script: 'node_modules/next/dist/bin/next',
      args: 'start -p 3000',
      env: { NODE_ENV: 'production', TZ: 'Asia/Tehran' },
    },
    {
      // ورکر یادآوری: روزی یک‌بار ۰۹:۰۰ تهران اجرا و تمام می‌شود
      name: 'fulad-reminders',
      cwd: 'apps/api',
      script: 'dist/scripts/reminders-worker.js',
      autorestart: false,
      cron_restart: '0 9 * * *',
      env: { NODE_ENV: 'production', TZ: 'Asia/Tehran' },
    },
  ],
};
