// ВСЕ ПОРТЫ, ИГРЫ И ПРИЛОЖЕНИЯ — В ОДНОМ МЕСТЕ.
// После правки: cd /root/relight && pm2 startOrReload ecosystem.config.js
//
// Порты:  сайт 3000  |  игры 3001, 3002, 3003...  |  приложения 3101, 3102...
// Новый адрес (url) нужно один раз добавить и в nginx: /root/relight/nginx/relight-locations.conf

module.exports = {
  // name — как сайт называется в админ-панели и на странице обслуживания
  site: { name: 'relighton', port: 3000 },

  // Карточки на странице «Игры» идут в этом же порядке.
  // Логотип: картинка public/logos/<id>.png (или .jpg/.webp), подробнее в public/logos/README.txt
  games: [
    {
      id: 'mafia',
      title: 'Мафия',
      tag: '4+ игроков · Telegram',
      folder: 'games/mafia-app',
      script: 'index.js',
      port: 3001,
      url: '/games/mafia/',
    },
    {
      id: 'wordle',
      title: 'Слово дня',
      tag: '1–8 игроков · Telegram',
      folder: 'games/wordle-app',
      script: 'server.js',
      port: 3002,
      url: '/games/wordle/',
    },
    // Заглушка «Скоро» — просто карточка, без сервера. Удали, когда не нужна.
    { id: 'soon', title: 'Скоро', tag: 'В разработке', soon: true },
  ],

  // Приложения (не игры) — папки в /root/relight/apps/.
  // hidden: true — карточки на сайте нет, приложение открывается только по прямой ссылке.
  apps: [
    {
      id: 'apr',
      title: 'APR',
      tag: 'Админ-панель',
      folder: 'apps/apr-app',
      script: 'server.js',
      port: 3101,
      url: '/apps/apr/',
      hidden: true,   // убери строку, если хочешь видеть карточку в разделе «Приложения»
    },
    // { id: 'stickers', title: 'Стикеры', folder: 'apps/stickers-app', script: 'index.js', port: 3102, url: '/apps/stickers/' },
  ],
};
