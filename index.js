// Сайт relight: главная (index.html), страница игр (games.html) и логотипы.
// Зависимостей нет — npm install не нужен. Порт — в config.js.
const http = require('http');
const fs = require('fs');
const path = require('path');
const config = require('./config');

const PORT = Number(process.env.PORT) || config.site.port;
// Общая папка с настройками, которые меняются на ходу из админ-панели APR:
// data/maintenance.json — режим обслуживания, data/cards.json — названия и подписи карточек.
const DATA = path.join(__dirname, 'data');
const PUBLIC = path.join(__dirname, 'public');
const LOGOS = path.join(PUBLIC, 'logos');
const LOGO_EXT = ['.png', '.jpg', '.jpeg', '.webp', '.gif', '.avif', '.svg'];
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp',
  '.gif': 'image/gif', '.avif': 'image/avif', '.svg': 'image/svg+xml', '.ico': 'image/x-icon',
  '.woff2': 'font/woff2', '.mp4': 'video/mp4', '.webm': 'video/webm',
};

/* ---------- какие игры запущены и сколько в них людей ---------- */
// Каждые 15 секунд спрашиваем у каждой игры /api/stats.
// Любой ответ = сервер жив. Если игра умеет отдавать цифры
// ({ online: 12, extra: "3 игры" }) — показываем их на карточке.
// Игра без /api/stats тоже работает: карточка просто без живых цифр.
const online = {};
const live = {};
async function checkAll() {
  const list = [...config.games, ...config.apps].filter(g => g.port);
  await Promise.all(list.map(async g => {
    try {
      const r = await fetch(`http://127.0.0.1:${g.port}/api/stats`, { signal: AbortSignal.timeout(1500) });
      online[g.id] = true;
      live[g.id] = null;
      if (r.ok) {
        const d = await r.json().catch(() => null);
        if (d && Number.isFinite(d.online)) {
          live[g.id] = {
            online: Math.max(0, Math.round(d.online)),
            extra: typeof d.extra === 'string' ? d.extra.slice(0, 40) : null,
          };
        }
      }
    } catch {
      online[g.id] = false;
      live[g.id] = null;
    }
  }));
}
setInterval(checkAll, 15000);

/* ---------- логотипы ---------- */
// Ищем public/logos/<id>.png|jpg|webp|...  Если файлов несколько — берём самый свежий.
// Нет своего — берём public/logos/default/<id>.svg, а если и его нет — default/game.svg.
function findLogo(id) {
  let best = null;
  let names = [];
  try { names = fs.readdirSync(LOGOS); } catch {}
  for (const name of names) {
    const ext = path.extname(name).toLowerCase();
    if (path.basename(name, path.extname(name)).toLowerCase() !== id || !LOGO_EXT.includes(ext)) continue;
    const file = path.join(LOGOS, name);
    const st = fs.statSync(file);
    if (st.isFile() && (!best || st.mtimeMs > best.st.mtimeMs)) best = { file, st };
  }
  if (best) return best;
  for (const file of [path.join(LOGOS, 'default', id + '.svg'), path.join(LOGOS, 'default', 'game.svg')]) {
    try { return { file, st: fs.statSync(file) }; } catch {}
  }
  return null;
}

function sendLogo(req, res, id) {
  const logo = findLogo(id);
  if (!logo) return send(res, 404, 'нет логотипа', TYPES['.txt']);
  // no-cache + ETag: браузер и Telegram каждый раз спрашивают «не поменялось ли?»,
  // поэтому новая картинка видна сразу после загрузки
  const etag = `"${Math.round(logo.st.mtimeMs)}-${logo.st.size}"`;
  const headers = { 'Content-Type': TYPES[path.extname(logo.file).toLowerCase()], 'Cache-Control': 'no-cache', ETag: etag };
  if (req.headers['if-none-match'] === etag) { res.writeHead(304, headers); return res.end(); }
  res.writeHead(200, headers);
  fs.createReadStream(logo.file).pipe(res);
}

/* ---------- настройки из админ-панели ---------- */
// Файлы читаем не чаще раза в 2 секунды: правка из панели видна почти сразу,
// но на каждый запрос страницы диск не дёргаем.
function jsonFile(name, ttl) {
  const st = jsonFile.cache = jsonFile.cache || {};
  const now = Date.now();
  const c = st[name];
  if (c && now - c.at < (ttl || 2000)) return c.value;
  let value = {};
  try { value = JSON.parse(fs.readFileSync(path.join(DATA, name), 'utf8')); } catch (e) { value = {}; }
  st[name] = { at: now, value };
  return value;
}

const maintenance = () => {
  const m = jsonFile('maintenance.json');
  return m && m.on ? m : null;
};

// Название, подпись, порядок, метку «Скоро» и скрытие карточки задаёт админ-панель.
// config.js при этом не меняется — в нём остаются порты и папки.
function card(g) {
  const over = (jsonFile('cards.json') || {})[g.id] || {};
  return Object.assign({}, g, {
    title: over.title || g.title,
    tag: over.tag || g.tag,
    soon: over.soon === undefined ? g.soon : !!over.soon,
    hidden: over.hidden === undefined ? !!g.hidden : !!over.hidden,
    order: over.order,
  });
}

// Карточки в том порядке, который выставлен в панели; без порядка — как в config.js
function visibleCards(list) {
  return list.map((g, i) => Object.assign(card(g), { _i: i }))
    .filter(g => !g.hidden)
    .sort((a, b) => {
      const ao = Number.isFinite(a.order) ? a.order : 1000 + a._i;
      const bo = Number.isFinite(b.order) ? b.order : 1000 + b._i;
      return ao - bo;
    });
}

/* ---------- карточки игр ---------- */
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// Строка «● 12 онлайн · 3 игры». Пока никого нет — строка пустая (скрыта),
// чтобы карточка не выглядела заброшенной.
function liveText(id) {
  const s = live[id];
  if (!s || !s.online) return '';
  return s.online + ' онлайн' + (s.extra ? ' · ' + s.extra : '');
}

function gameCard(g0) {
  const g = g0.order === undefined && g0._i === undefined ? card(g0) : g0;
  const logo = `<img class="icon" src="/logo/${esc(g.id)}" alt="">`;
  const inner = `\n      ${logo}\n      <div class="name">${esc(g.title)}</div>\n`;
  if (!g.soon && online[g.id]) {
    const lt = liveText(g.id);
    return `    <a href="${esc(g.url)}" class="game-card">${inner}      <div class="tag">${esc(g.tag)}</div>\n` +
      `      <div class="live" data-live="${esc(g.id)}"${lt ? '' : ' hidden'}><i></i><span>${esc(lt)}</span></div>\n    </a>\n`;
  }
  const tag = g.soon ? g.tag : 'Скоро откроется';
  return `    <div class="game-card soon">${inner}      <div class="tag">${esc(tag)}</div>\n    </div>\n`;
}

/* ---------- страница обслуживания ---------- */
function maintenancePage(m) {
  const text = esc(m.text || 'Скоро вернёмся. Идут работы на сервере.');
  return `<!DOCTYPE html><html lang="ru"><head><meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>${esc(config.site.name || 'relight')} — идут работы</title>
<style>
body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;
background:#0D0E12;color:#EDEAE4;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;padding:24px;}
.box{max-width:420px;text-align:center;}
h1{font-family:Georgia,serif;font-size:26px;margin:0 0 12px;}
p{color:#83858C;font-size:16px;line-height:1.55;margin:0;white-space:pre-line;}
.dot{width:10px;height:10px;border-radius:50%;background:#D9A34A;display:inline-block;margin-bottom:18px;
animation:b 1.4s infinite ease-in-out;}
@keyframes b{0%,100%{opacity:.25;}50%{opacity:1;}}
</style></head><body><div class="box"><span class="dot"></span>
<h1>Идут работы</h1><p>${text}</p></div></body></html>`;
}

/* ---------- сервер ---------- */
function send(res, code, body, type, cache) {
  res.writeHead(code, { 'Content-Type': type, 'Cache-Control': cache || 'no-store' });
  res.end(body);
}

function sendPage(res, name, fill) {
  fs.readFile(path.join(PUBLIC, name), 'utf8', (err, html) => {
    if (err) return send(res, 500, name + ' не найден', TYPES['.txt']);
    send(res, 200, fill ? fill(html) : html, TYPES['.html'], 'no-cache');
  });
}

const server = http.createServer((req, res) => {
  let p;
  try { p = decodeURIComponent(new URL(req.url, 'http://x').pathname); }
  catch { return send(res, 400, 'bad request', TYPES['.txt']); }

  if (p === '/healthz') return send(res, 200, 'ok', TYPES['.txt']);

  // Режим обслуживания: вместо страниц показываем заглушку.
  // Картинки, стили и /healthz продолжают работать, чтобы заглушка выглядела прилично
  // и админ-панель видела, что сайт жив.
  const mnt = maintenance();
  if (mnt && (p === '/' || p.endsWith('.html') || p === '/games' || p === '/games/')) {
    const html = maintenancePage(mnt);
    res.writeHead(503, { 'Content-Type': TYPES['.html'], 'Cache-Control': 'no-store', 'Retry-After': '600' });
    return res.end(html);
  }
  if (p === '/' || p === '/index.html') return sendPage(res, 'index.html');
  if (p === '/games' || p === '/games/') { res.writeHead(302, { Location: '/games.html' }); return res.end(); }
  if (p === '/games.html') {
    const apps = visibleCards(config.apps || []);
    return sendPage(res, 'games.html', html => html
      .replace('<!--GAMES-->', visibleCards(config.games).map(gameCard).join('\n'))
      .replace('<!--APPS-->', apps.length
        ? '  <h2 class="sect2">Приложения</h2>\n  <div class="grid">\n' + apps.map(gameCard).join('\n') + '  </div>\n'
        : ''));
  }
  if (p === '/api/maintenance') {
    const m = maintenance();
    return send(res, 200, JSON.stringify({ on: !!m, text: m ? m.text || '' : '' }), TYPES['.json']);
  }
  if (p === '/api/games') {
    return send(res, 200, JSON.stringify([...visibleCards(config.games), ...visibleCards(config.apps || [])].map(g => ({
      id: g.id, title: g.title, url: g.url || null, soon: !!g.soon, online: !!online[g.id],
      live: liveText(g.id) || null,
    }))), TYPES['.json']);
  }

  const m = p.match(/^\/logo\/([a-z0-9_-]{1,40})$/i);
  if (m) return sendLogo(req, res, m[1].toLowerCase());
  if (p === '/relight.png') return sendLogo(req, res, 'relight'); // старый адрес картинки

  // остальные файлы из public/
  const file = path.join(PUBLIC, path.normalize(p));
  if (!file.startsWith(PUBLIC + path.sep)) return send(res, 403, 'forbidden', TYPES['.txt']);
  fs.stat(file, (err, st) => {
    if (err || !st.isFile()) return send(res, 404, 'Страница не найдена', TYPES['.txt']);
    res.writeHead(200, {
      'Content-Type': TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream',
      'Cache-Control': 'public, max-age=3600',
    });
    fs.createReadStream(file).pipe(res);
  });
});

checkAll().finally(() => server.listen(PORT, () => console.log('relight site on ' + PORT)));
