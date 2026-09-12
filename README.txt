RELIGHT — СТРУКТУРА САЙТА
=========================

/root/relight/
├── index.js              сервер сайта (порт 3000), без зависимостей
├── relight.sh            обновление одной командой (см. ниже)
├── config.js             ВСЕ порты, игры и приложения — в одном месте
├── ecosystem.config.js   PM2 запускает всё сразу
├── public/
│   ├── index.html        главная
│   ├── games.html        страница «Игры» (карточки берутся из config.js)
│   └── logos/            логотипы: просто загрузи картинку, см. README.txt внутри
├── games/
│   ├── mafia-app/        Мафия, порт 3001   -> https://relightapp.online/games/mafia/
│   └── wordle-app/       Слово дня, порт 3002 -> https://relightapp.online/games/wordle/
├── apps/
│   └── apr-app/          APR — админ-панель, порт 3101 -> /apps/apr/ (см. README.txt внутри)
└── nginx/                конфиги nginx (копируются в /etc/nginx)

ГЛАВНЫЕ КОМАНДЫ
  Обновить сайт из архива:           relight update
  Отменить последнее обновление:     relight rollback
  Что работает и сколько онлайн:     relight status
  Запустить / применить config.js:   cd /root/relight && pm2 startOrReload ecosystem.config.js
  Посмотреть процессы:               pm2 list
  Логи игры:                         pm2 logs mafia   (или wordle, site)
  Перезапустить одну игру:           pm2 restart mafia

ОБНОВЛЕНИЕ САЙТА ОДНОЙ КОМАНДОЙ
  Установка (один раз):
    chmod +x /root/relight/relight.sh
    ln -sf /root/relight/relight.sh /usr/local/bin/relight
    mkdir -p /root/updates
  Как обновлять:
    1. Загрузи .zip с новыми файлами в /root/updates (через Termius, папку менять не надо)
    2. relight update
  Что делает update:
    проверяет синтаксис файлов из архива — с ошибкой не ставит НИЧЕГО;
    сохраняет копию заменяемых файлов в /root/relight-backups (хранятся 10 последних);
    перезапускает только затронутые игры (правки в public/ — вообще без перезапуска);
    если перезапущенное не поднялось за 25 секунд — сам возвращает прошлую версию.
  Не трогает никогда: .env, папки data/ игр, node_modules.
  Файл сайта nginx (там SSL от certbot) не трогается — он и не нужен в архиве.

ИДУЩИЕ ПАРТИИ ПЕРЕЖИВАЮТ ПЕРЕЗАПУСК
  Мафия при остановке сохраняет комнаты в games/mafia-app/data/rooms-state.json
  и поднимает их обратно при запуске: таймеры фаз продолжаются с того же места,
  игроки переподключаются сами. Если сервер стоял дольше 10 минут, комнаты не поднимаются.

КАРТОЧКА ИГРЫ НА САЙТЕ
  Игра запущена   -> карточка кликается и ведёт в игру
  Игра не запущена -> карточка тусклая с подписью «Скоро откроется»
  Статус и живые цифры («12 онлайн · 3 игры») обновляются раз в 15 секунд.

КАК ДОБАВИТЬ ИГРУ
  1. Папка /root/relight/games/имя-app
     Порт в коде: const PORT = process.env.PORT || 3003;
     Пути к файлам и запросам без слэша в начале: style.css, api/..., socket.io/...
  2. Объект в массив games в config.js (id, title, tag, folder, script, port, url)
  3. Блок location в nginx/relight-locations.conf (скопируй блок Мафии, поменяй имя и порт)
  4. Логотип: public/logos/<id>.png

АДМИН-ПАНЕЛЬ APR
  Telegram Mini App для управления сайтом: обновления одним нажатием, статистика,
  перезапуск игр и логи, игроки Мафии, рассылка. Настройка — apps/apr-app/README.txt.
  Доступ только по Telegram id из apps/apr-app/.env

ЧТО НЕ ЛЕЖИТ В АРХИВЕ (переносится со старых папок на сервере)
  games/mafia-app/.env           токен бота
  games/mafia-app/data/          статистика и покупки игроков
  games/mafia-app/node_modules/  ставится командой npm install
  games/wordle-app/data/         результаты слова дня
  apps/apr-app/.env              токен админского бота и список админов
  apps/apr-app/data/             журнал действий и лог обновлений
