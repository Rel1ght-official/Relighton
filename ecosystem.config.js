// PM2 запускает сайт, игры и приложения из config.js.
// Команда: cd /root/relight && pm2 startOrReload ecosystem.config.js
// Папки, где ещё нет файла запуска, просто пропускаются.
const fs = require('fs');
const path = require('path');
const config = require('./config');

const apps = [{
  name: config.site.name,
  cwd: __dirname,
  script: 'index.js',
  env: { PORT: String(config.site.port) },
}];

for (const item of [...config.games, ...config.apps]) {
  if (!item.folder || !item.script) continue;
  const cwd = path.join(__dirname, item.folder);
  if (!fs.existsSync(path.join(cwd, item.script))) {
    console.log(`[пропуск] ${item.id}: нет файла ${item.folder}/${item.script}`);
    continue;
  }
  apps.push({ name: item.id, cwd, script: item.script, env: { PORT: String(item.port) } });
}

module.exports = { apps };
