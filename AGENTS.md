# AGENTS.md

## Project workflow
- Main development branch: `dev`
- Stable branch: `main`
- All work goes to `dev` (feature/fix branches -> `dev`)
- Push/merge to `main` only by explicit owner command

## Current roadmap

- [x] Stage 1: Database migrations and db-layer
- [x] Stage 2: Telegraf middleware (auth/role/shopStatus)
- [x] Stage 3: `/start` + invite onboarding
- [x] Stage 4: SUPER_ADMIN commands
- [x] Stage 5: SHOP_ADMIN commands
- [x] Stage 6: OPERATOR `/new` FSM (steps 1-9)
- [x] Stage 7: Cron jobs
- [ ] Stage 8: Hardening and cleanup


## Done
- [x] Initial project scaffold
- [x] `.env.example` minimal template
- [x] Kie.ai API docs moved to `kie_ai_api.txt`
- [x] Git initialized, `origin` linked
- [x] First commit created
- [x] Pushed to `origin/dev`
- [x] Initial Supabase migration added (`0001_init_schema.sql`)
- [x] Base db-layer modules added (`src/db/*`)
