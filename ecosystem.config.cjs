// اجرای production با PM2 (بدون Docker)
module.exports = {
  apps: [
    { name: 'fulad-api', cwd: 'apps/api', script: 'dist/main.js', env: { NODE_ENV: 'production', PORT: 4000 } },
    { name: 'fulad-web', cwd: 'apps/web', script: 'node_modules/next/dist/bin/next', args: 'start -p 3000', env: { NODE_ENV: 'production' } },
  ],
};
