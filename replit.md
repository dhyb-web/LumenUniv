# LumenUniv

LumenUniv is a global academic social network where students, educators, researchers, universities, and communities connect around learning and research.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/lumenuniv/src/` — React/Vite application and product UI
- `artifacts/api-server/src/routes/lumenuniv.ts` — LumenUniv API handlers
- `lib/api-spec/openapi.yaml` — source of truth for API contracts
- `lib/db/src/schema/lumenuniv.ts` — Drizzle schema for profiles, posts, universities, communities, and likes
- `lib/api-client-react/src/generated/` — generated React Query client; regenerate from OpenAPI rather than editing by hand
- `attached_assets/` — original LumenUniv product brief
- Visual direction follows the LumenUniv design brief: Midnight / Deep Navy surfaces with Lumen Blue, Lumen Violet, and Cyan Glow accents; Light, Dark, and Midnight themes are supported.

## Architecture decisions

- API contracts are defined in OpenAPI first, then generated into React Query and Zod clients.
- The first build uses the project PostgreSQL database through Drizzle so the demo feed and mutations persist across reloads.
- The current profile is a seeded demo identity; authentication and institution-scoped permissions remain the next backend boundary.
- Secondary product surfaces use honest empty/coming-soon states until their API contracts exist.
- The design system uses semantic CSS variables and Lucide icons; avoid introducing one-off colors or emoji UI labels.

## Product

- Global academic feed with persistent posts and likes
- Academic profile and dashboard summary
- University and community discovery
- Search across people, universities, communities, and posts
- Responsive navigation for home, explore, shorts, campus, library, chat, profile, and settings

## User preferences

- No project-specific preferences recorded yet.

## Gotchas

- Regenerate API clients after every OpenAPI change.
- The frontend Vite workflow supplies `PORT` and `BASE_PATH`; use the managed workflow instead of starting Vite directly.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
