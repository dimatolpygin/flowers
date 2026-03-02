# TELEGRAM-БОТ: ОТКРЫТКИ ДЛЯ ЦВЕТОЧНЫХ
**Стек:** Node.js + Telegraf + Supabase + Redis  
**API:** kie.ai — Nano Banana 2

---

## РОЛИ И ИЕРАРХИЯ

```
SUPER_ADMIN (владелец платформы)
     │  создаёт магазины, управляет тарифами и подписками
     ↓
SHOP_ADMIN (владелец цветочного магазина)
     │  загружает логотип, управляет флористами
     ↓
OPERATOR (флорист)
       только создание открыток (/new)
```

---

## ТАРИФЫ

| Тариф  | Генераций/мес | Операторов | Реген/заказ | Quality |
|--------|---------------|------------|-------------|---------|
| start  | 50            | 1          | 1           | 1K      |
| basic  | 150           | 3          | 2           | 2K      |
| pro    | 500           | 10         | 3           | 4K      |

---

## MIDDLEWARE TELEGRAF
> Выполняется на каждый апдейт, до команды

1. `telegram_id` есть в таблице `users`?  
   НЕТ → _"Нет доступа. Обратитесь к администратору."_ СТОП

2. Роль определена?  
   `super_admin` → пропустить проверки магазина → исполнение  
   `shop_admin / operator` → продолжить ↓

3. `shop.status == active`?  
   `suspended` → _"Подписка истекла. Свяжитесь с администратором."_ СТОП  
   `deleted` → _"Нет доступа."_ СТОП

4. Команда разрешена для роли?  
   НЕТ → _"Нет прав для этой команды."_ СТОП

→ **ИСПОЛНЕНИЕ КОМАНДЫ**

---

## 1. SUPER_ADMIN — КОМАНДЫ

```
/create_shop "Название"
  → shops INSERT (status: pending)
  → invite_tokens INSERT (role: shop_admin, TTL: 7 дней)
  → возвращает: t.me/bot?start=invite_<token>

/shops
  → таблица: Название | Тариф | Статус | Операторов | Генераций

/shop_info <shop_id>
  → карточка: название, @shop_admin, тариф, статус,
              подписка истекает, использовано генераций,
              список операторов, история подписок

/set_plan <shop_id> <start|basic|pro>
  → subscriptions INSERT (новая запись)
  → shops UPDATE (plan, лимиты, resolution, expires_at)
  → уведомляет shop_admin: "Ваш тариф изменён на <план>"

/set_limits <shop_id> <generations> <regen_per_order> <resolution>
  → ручной кастом вне тарифа

/suspend_shop <shop_id>
  → status → suspended
  → уведомляет shop_admin

/resume_shop <shop_id>
  → status → active
  → уведомляет shop_admin

/delete_shop <shop_id>
  → "Введите название магазина для подтверждения"
  → status → deleted, все пользователи заблокированы

/reset_stats <shop_id>
  → generations_used = 0 (ручной сброс)

/global_stats [день|неделя|месяц]
  → магазинов active / suspended / total
  → генераций за период
  → перегенераций за период
  → кредитов kie.ai потрачено
  → выручка (из subscriptions.price)
  → топ-5 магазинов по генерациям
```

---

## 2. SHOP_ADMIN — ОНБОРДИНГ (первый вход по invite-ссылке)

```
t.me/bot?start=invite_<token>
  │
  ├─ [токен не найден / истёк / уже использован]
  │    → "Ссылка недействительна. Запросите новую." СТОП
  │
  └─ [токен валидный]
       → users INSERT (role: shop_admin, shop_id)
       → invite_tokens: used_at = now()
       → shops: status → active
       → уведомляет super_admin: "Магазин «Название» активирован"

Шаг 1: "Загрузите логотип магазина (PNG с прозрачным фоном,
         минимум 500×500 px)"
  → сохраняется в Supabase Storage → shop.logo_template_url

Шаг 2: "Логотип сохранён ✅ Магазин готов к работе!"
  → выводит меню доступных команд
```

---

## 2. SHOP_ADMIN — КОМАНДЫ

```
/add_operator
  → "Введите имя флориста (для справки)"
  ⚠ operators_count >= лимит тарифа → "Достигнут лимит операторов" СТОП
  → invite_tokens INSERT (role: operator, TTL: 7 дней)
  → возвращает: t.me/bot?start=invite_<token>

/operators
  → список: @username | Имя | Добавлен | Открыток сделано

/remove_operator
  → инлайн-список → выбор → подтверждение
  → users DELETE, доступ потерян немедленно

/my_stats [день|неделя|месяц]
  → использовано генераций: 34 / 150
  → перегенераций: 8
  → подписка истекает: дата
  → история тарифов
  → топ операторов по открыткам

/my_template
  → показывает текущий логотип → [Заменить] → флоу загрузки

/my_plan
  → тариф, лимиты, resolution, дата истечения
```

---

## 3. OPERATOR — ОНБОРДИНГ (по ссылке от shop_admin)

```
t.me/bot?start=invite_<token>
  → users INSERT (role: operator, shop_id)
  → invite_tokens: used_at = now()
  → "Добро пожаловать! Используйте /new для создания открытки."
  → уведомляет shop_admin: "Флорист @username подключился"
```

---

## 3. OPERATOR — /new (FSM, состояние в Redis)

```
/new
 ├─ shop.status != active      → "Подписка истекла." СТОП
 ├─ generations_used >= limit  → "Лимит открыток исчерпан." СТОП
 └─ всё ок ↓
```

### ШАГ 1 — ФОТО
```
"Загрузите до 2 референс-фото от клиента. [Пропустить →]"
→ 0–2 фото, file_id сохраняется в сессию Redis
```

### ШАГ 2 — СТИЛЬ
```
[Реализм] [Аниме] [Акварель]
[Иллюстрация] [Мульт] [Комикс]
```

### ШАГ 3 — ОПИСАНИЕ
```
"Опишите что должно быть на открытке:"
→ текстовый ввод
```

### ШАГ 4 — ТЕКСТ ПОЗДРАВЛЕНИЯ
```
"Введите текст поздравления:"
→ текстовый ввод
  ⚠ текст передаётся в промпт — Nano Banana 2 рисует его сам (поддержка кириллицы)
```

### ШАГ 5 — СВОДКА
```
📋 Сводка заказа
Фото: 2 шт.  Стиль: Акварель
Описание: "розы, закат, нежные тона"
Поздравление: "С днём рождения, Анна!"
Логотип магазина: ✅

[✏️ Изменить]        [🚀 Сгенерировать]
 └→ [Фото] [Стиль] [Описание] [Текст]  ← возврат к шагу
```

### ШАГ 6 — ГЕНЕРАЦИЯ
```
Запрос к kie.ai Nano Banana 2:
  image_input: [
    фото_клиента_1,          ← референс от клиента
    фото_клиента_2,          ← референс от клиента (если есть)
    shop.logo_template_url   ← URL логотипа из Supabase Storage
  ]
  prompt:
    "Style: <стиль>. <описание>.
     Place the logo from the last reference image
     in the bottom-right corner, small and unobtrusive.
     Do not distort or reinterpret the logo.
     Write this text beautifully on the card: «<текст поздравления>»"
  aspect_ratio: "3:4"
  resolution: 2K  ← из тарифа магазина
  output_format: "png"

Promise.all([запрос_1, запрос_2])  ← два варианта параллельно
"⏳ Генерация 1/2..." → "⏳ Генерация 2/2..."

[ошибка API] → "Ошибка генерации. [🔄 Повторить]"
               счётчик генераций НЕ списывается
               generation_log НЕ создаётся
```

### ШАГ 7 — ВЫБОР ВАРИАНТА
```
→ бот присылает 2 изображения
[✅ Вариант 1]  [✅ Вариант 2]  [🔄 Перегенерировать]

[🔄 Перегенерировать]:
 regen_count < лимит  → возврат к ШАГ 6, regen_count++
 regen_count >= лимит → "Лимит перегенераций исчерпан."
                         кнопка скрывается
```

### ШАГ 8 — ПОСТ-ОБРАБОТКА (sharp)
```
PNG от kie.ai  (уже содержит логотип и текст поздравления)
  → sharp.resize(1240, 1748)              масштаб точно под A6 300 DPI
  → sharp.withMetadata({ density: 300 }) прописывает 300 DPI в EXIF
  → итог: PNG 1240×1748 px, 300 DPI
  → pdfkit: страница 105×148 мм → embed PNG → PDF
```

### ШАГ 9 — РЕЗУЛЬТАТ
```
[📄 Скачать PDF A6 (Print)]  ← точный масштаб для принтера
[🖼️ Скачать PNG A6]          ← цифровой файл
[🔁 Новый заказ]

→ generations_used++ в shops
→ orders INSERT
→ generation_log INSERT (credits, resolution, is_regen: false)
→ сессия Redis очищается
```

---

## КОЛЛБЭКИ

### Внутри FSM-сцен (scene.action) — живут только в рамках сцены

| Шаг       | callback_data                                              |
|-----------|------------------------------------------------------------|
| step2     | style_realism, style_anime, style_watercolor, style_illustration, style_cartoon, style_comic |
| step5     | edit_photos, edit_style, edit_description, edit_greeting, confirm_generate |
| step7     | variant_1, variant_2, regen                                |
| step9     | download_pdf, download_png, new_order                      |

### Вне сцен (bot.action) — глобальные, в callbacks/index.js

```
confirmDeleteShop
  → confirm_delete_<shop_id>   подтвердить удаление магазина
  → cancel_delete              отмена

confirmRemoveOperator
  → confirm_remove_<user_id>   подтвердить удаление флориста
  → cancel_remove              отмена

replaceTemplate
  → start_replace_template     запустить флоу замены логотипа

cancelAction
  → cancel                     универсальная кнопка отмены
```

---

## ДЕРЕВО ПРОЕКТА

```
flower-card-bot/
│
├── src/
│   │
│   ├── bot/
│   │   ├── index.js                  # Инициализация бота, middleware, сцены
│   │   │
│   │   ├── middleware/
│   │   │   ├── auth.js               # Проверка whitelist
│   │   │   ├── role.js               # Проверка роли для команды
│   │   │   └── shopStatus.js         # Проверка active/suspended/deleted
│   │   │
│   │   ├── scenes/
│   │   │   └── newOrder/
│   │   │       ├── index.js
│   │   │       ├── step1.photos.js
│   │   │       ├── step2.style.js        # scene.action: style_*
│   │   │       ├── step3.description.js
│   │   │       ├── step4.greeting.js
│   │   │       ├── step5.summary.js      # scene.action: edit_*, confirm_generate
│   │   │       ├── step6.generate.js
│   │   │       ├── step7.choose.js       # scene.action: variant_1, variant_2, regen
│   │   │       ├── step8.postprocess.js
│   │   │       └── step9.result.js       # scene.action: download_pdf, download_png, new_order
│   │   │
│   │   ├── commands/
│   │   │   ├── superAdmin/
│   │   │   │   ├── createShop.js
│   │   │   │   ├── shops.js
│   │   │   │   ├── shopInfo.js
│   │   │   │   ├── setPlan.js
│   │   │   │   ├── setLimits.js
│   │   │   │   ├── suspendShop.js
│   │   │   │   ├── resumeShop.js
│   │   │   │   ├── deleteShop.js
│   │   │   │   ├── resetStats.js
│   │   │   │   └── globalStats.js
│   │   │   │
│   │   │   ├── shopAdmin/
│   │   │   │   ├── addOperator.js
│   │   │   │   ├── operators.js
│   │   │   │   ├── removeOperator.js
│   │   │   │   ├── myStats.js
│   │   │   │   ├── myTemplate.js
│   │   │   │   └── myPlan.js
│   │   │   │
│   │   │   └── common/
│   │   │       └── start.js              # /start + invite-токен онбординг
│   │   │
│   │   ├── callbacks/
│   │   │   ├── index.js                  # Регистрация всех bot.action()
│   │   │   ├── superAdmin/
│   │   │   │   ├── confirmDeleteShop.js
│   │   │   │   └── shopListPagination.js
│   │   │   ├── shopAdmin/
│   │   │   │   ├── confirmRemoveOperator.js
│   │   │   │   └── replaceTemplate.js
│   │   │   └── common/
│   │   │       └── cancelAction.js
│   │   │
│   │   └── keyboards/
│   │       ├── styles.js
│   │       ├── variants.js
│   │       ├── editOrder.js
│   │       ├── operators.js
│   │       └── result.js
│   │
│   ├── services/
│   │   ├── generation/
│   │   │   ├── kieai.js              # Запрос к kie.ai API
│   │   │   └── prompts.js            # Сборка промптов (стиль + описание + лого + текст)
│   │   │
│   │   ├── postprocess/
│   │   │   ├── sharp.js              # resize 1240×1748 + 300 DPI (только это)
│   │   │   └── pdf.js                # pdfkit: PNG → PDF A6 (105×148 мм)
│   │   │
│   │   ├── invite.js
│   │   ├── stats.js
│   │   └── notifications.js
│   │
│   ├── db/
│   │   ├── client.js
│   │   ├── shops.js
│   │   ├── users.js
│   │   ├── inviteTokens.js
│   │   ├── orders.js
│   │   ├── subscriptions.js
│   │   ├── generationLog.js
│   │   └── storage.js
│   │
│   ├── cache/
│   │   ├── client.js
│   │   └── session.js
│   │
│   ├── cron/
│   │   ├── index.js
│   │   ├── resetGenerations.js
│   │   ├── checkSubscriptions.js
│   │   └── cleanTokens.js
│   │
│   └── config/
│       ├── index.js
│       └── plans.js                  # Константы тарифов
│
├── .env
├── .env.example
├── .gitignore
├── package.json
└── README.md
```

---

## ФОНОВЫЕ ПРОЦЕССЫ (node-cron)

```
Каждый день 00:00:
  → invite_tokens: удалить истёкшие
  → subscription_expires_at - 3 дня
      → уведомить shop_admin: "Подписка истекает через 3 дня"
  → subscription_expires_at == сегодня
      → status → suspended
      → уведомить shop_admin + super_admin

1-е число месяца:
  → shops (active): generations_used = 0
  → уведомить shop_admin: "Лимит генераций обновлён ✅"
```

---

## СТЕК

| Инструмент          | Назначение                                        |
|---------------------|---------------------------------------------------|
| Node.js + Telegraf  | FSM сцены, middleware, хендлеры, коллбэки         |
| Supabase            | БД + Storage (логотипы, PNG, PDF)                 |
| Redis               | FSM-сессии операторов (TTL 24ч)                   |
| kie.ai Nano Banana 2| Генерация изображений + текст + логотип (1K/2K/4K)|
| sharp               | Только resize 1240×1748 px + 300 DPI в EXIF       |
| pdfkit              | PNG → PDF A6 (105×148 мм)                         |
| node-cron           | Ежедневные и ежемесячные задачи                   |

---

## БАЗА ДАННЫХ (Supabase)

### shops
| Поле                    | Тип / Описание                          |
|-------------------------|-----------------------------------------|
| id                      | uuid                                    |
| name                    | string                                  |
| status                  | pending \| active \| suspended \| deleted |
| plan                    | start \| basic \| pro \| custom          |
| logo_template_url       | Supabase Storage (PNG прозрачный)       |
| generations_limit       | int — снапшот по тарифу                 |
| generations_used        | int — счётчик текущего месяца           |
| regen_limit_per_order   | int                                     |
| resolution              | 1K \| 2K \| 4K                          |
| subscription_expires_at | timestamp                               |
| created_at              | timestamp                               |

### users
| Поле         | Тип / Описание                               |
|--------------|----------------------------------------------|
| telegram_id  | bigint                                       |
| username     | string                                       |
| role         | super_admin \| shop_admin \| operator        |
| shop_id      | FK → shops (null для super_admin)            |
| display_name | string — имя флориста                        |
| created_at   | timestamp                                    |

### invite_tokens
| Поле         | Тип / Описание                     |
|--------------|------------------------------------|
| token        | uuid                               |
| shop_id      | FK → shops                         |
| role         | shop_admin \| operator             |
| created_by   | telegram_id                        |
| display_name | string (опционально)               |
| used_at      | timestamp (null = не активирован)  |
| expires_at   | timestamp (TTL 7 дней)             |

### subscriptions
| Поле              | Тип / Описание                        |
|-------------------|---------------------------------------|
| id                | uuid                                  |
| shop_id           | FK → shops                            |
| plan              | start \| basic \| pro \| custom      |
| price             | numeric — сколько заплатил (₽)        |
| generations_limit | int — снапшот на момент покупки       |
| resolution        | string — снапшот quality              |
| regen_limit       | int — снапшот лимита перегенераций    |
| started_at        | timestamp                             |
| expires_at        | timestamp                             |
| status            | active \| expired \| cancelled       |
| payment_ref       | string — ID транзакции / номер счёта  |
| created_by        | telegram_id суперадмина               |
| note              | string (опционально)                  |

### orders
| Поле            | Тип / Описание                       |
|-----------------|--------------------------------------|
| id              | uuid                                 |
| shop_id         | FK → shops                           |
| operator_id     | FK → users                           |
| photos_input    | array — file_id из Telegram          |
| style           | string                               |
| description     | string                               |
| greeting_text   | string                               |
| variants        | array — URLs двух PNG                |
| chosen_variant  | 1 \| 2                              |
| regen_count     | int                                  |
| created_at      | timestamp                            |

### generation_log
| Поле              | Тип / Описание                       |
|-------------------|--------------------------------------|
| id                | uuid                                 |
| shop_id           | FK → shops                           |
| order_id          | FK → orders                          |
| operator_id       | FK → users                           |
| resolution_used   | 1K \| 2K \| 4K                      |
| is_regen          | boolean                              |
| api_credits_spent | numeric — кредиты kie.ai             |
| created_at        | timestamp                            |

### billing_summary _(VIEW — не таблица)_
| Поле               | Описание                          |
|--------------------|-----------------------------------|
| shop_id            |                                   |
| period             | месяц / день / неделя             |
| generations_total  | всего генераций                   |
| regens_total       | из них перегенераций              |
| credits_spent      | кредитов kie.ai потрачено         |
| active_plan        | текущий тариф                     |

---

### Redis _(только сессии)_
```
session:<telegram_id>
  → FSM-состояние (шаг 1–9)
  → черновик заказа (фото, стиль, описание, текст)
  TTL: 24 часа
```
