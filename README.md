# flower-card-bot

Telegram bot backend for flower-shop postcard generation.

## Local run

1. Install dependencies:

```bash
npm install
```

2. Ensure `.env` is filled.
3. Start bot:

```bash
npm run start
```

## Current baseline

- Telegraf bot bootstrap
- Redis session store (24h ttl)
- Supabase client setup
- Kie.ai client (`createTask`, `queryTask`)
- Prompt builder helper

## Branch workflow

- Main development branch: `dev`
- Stable branch: `main`
- Work flow: feature branch from `dev` -> merge to `dev`
- Merge/push to `main` only by explicit release command
