# Stage 7 — проверка cron jobs

## Общая подготовка
1. Убедитесь, что `.env` заполнен (включены `CRON_ENABLED=true`, расписания и TTL как в `.env.example`).
2. В Supabase подготовьте данные:
   - `invite_tokens` с `expires_at` в прошлом и `used_at = null`.
   - `shops` с `subscription_expires_at` через 3 дня и один с истекшей подпиской.
   - Магазин `active` с `generations_used > 0`.

## 1) Проверка `cleanTokens`
1. Запустить cron вручную: `node -e "require('./src/cron').startCronJobs(require('./src/bot').createBot());"` (с ботом, если нужны уведомления).
2. Убедиться: в таблице `invite_tokens` удалены строки, лог показывает `deleted` > 0.

## 2) Проверка `checkSubscriptions`
1. Либо дождаться ежедневного запуска, либо вызвать `runCheckSubscriptionsJob(bot)` вручную.
2. Убедиться:
   - Магазин с `expires_in=3 дня` остался `active` и shop_admin получил сообщение.
   - Истекший магазин переведен в `suspended`, shop_admin и super_admin получили уведомления (см. `notifications.js`).

## 3) Проверка `resetGenerations`
1. Запустите задачу вручную через `runResetGenerationsJob(bot)` (вне cron).
2. Проверьте, что `generations_used` = 0 у активных магазинов и бот отправил уведомления.

## 4) Режим lock
1. Одновременно запустите `runCleanTokensJob` дважды (через `withCronLock`).
2. Убедитесь, что одна из задач пропускается (в логах `lock exists`).

## 5) Быстрый рукописный тест
1. Меняйте значения `CRON_DAILY_SCHEDULE` на `* * * * *` и наблюдайте результаты раз в минуту.
2. По окончании верните расписания в боевые значения.
