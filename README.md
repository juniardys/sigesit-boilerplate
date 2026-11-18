# Boilerplate Monorepo

Bun workspaces monorepo: Hono (backend), Next.js (frontend), Prisma + PostgreSQL (shared package).

```
apps/
  backend/     Hono on Bun        -> http://localhost:3001
  frontend/    Next.js App Router -> http://localhost:3000
packages/
  database/    Prisma 7 + PostgreSQL (@repo/database)
scripts/
  osv-scan.mjs Scan bun.lock ke osv.dev
```

## Stack

| Package | Version |
|---|---|
| bun | 1.3.14 |
| hono | 4.13.19 |
| next | 16.4.6 |
| react / react-dom | 19.3.1 |
| prisma / @prisma/client / @prisma/adapter-pg | 7.10.1 |
| typescript | 6.0.3 |

## Setup

```bash
cp .env.example .env        # isi DATABASE_URL
bun install                 # otomatis prisma generate
bun run db:migrate          # buat migration + apply ke DB
```

## Commands (dari root)

| Command | Fungsi |
|---|---|
| `bun run dev` | Jalankan backend + frontend (watch mode) |
| `bun run build` | Generate Prisma client, build backend + frontend |
| `bun run start` | Jalankan hasil build (production) |
| `bun run test` | Jalankan test tiap workspace (proses terpisah) |
| `bun run typecheck` | Type-check semua workspace |
| `bun run db:migrate` | `prisma migrate dev` |
| `bun run db:deploy` | `prisma migrate deploy` (production) |
| `bun run db:studio` | Prisma Studio |
| `bun run security:osv` | Scan semua dependency di `bun.lock` ke osv.dev |
| `bun audit` | Audit dependency via npm advisory DB |

## Pakai database di backend

```ts
import { prisma } from "@repo/database";

const users = await prisma.user.findMany();
```

Schema ada di `packages/database/prisma/schema.prisma`. Setelah ubah schema, jalankan `bun run db:migrate`.

## Environment

Satu file `.env` di root dipakai oleh `packages/database` (Prisma CLI) dan `apps/backend`.
Frontend membaca `API_URL` (default `http://localhost:3001`); untuk override, set env saat run atau buat `apps/frontend/.env.local`.
