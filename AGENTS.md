<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Cursor Cloud specific instructions

### Project overview
Single Next.js 16.2.4 app (App Router, Turbopack) — a Japanese MMA fight prediction platform ("MATCHDAY ENHANCED OS"). Uses Supabase (cloud-hosted at `nongzgmpqhjsdptjgdgi.supabase.co`) for PostgreSQL + Auth, Tailwind CSS v4, React 19, TypeScript 5.

### Standard commands
See `package.json` scripts: `npm run dev`, `npm run build`, `npm run lint`, `npm start`.

### Key caveats
- **Supabase anon key is misconfigured**: `.env.local` sets `NEXT_PUBLIC_SUPABASE_ANON_KEY` to the Supabase URL instead of the actual anon key. The app renders but all Supabase queries fail at runtime. A valid anon key must be provided via the `NEXT_PUBLIC_SUPABASE_ANON_KEY` secret to enable full functionality (login, data fetching, voting).
- **Pre-existing lint errors**: `npm run lint` exits non-zero due to `@typescript-eslint/no-explicit-any` and `react-hooks/immutability` violations already present in the codebase. This is expected baseline behavior.
- **Orphan file**: `/workspace/page.tsx` (root-level) is an older prototype page not used by the App Router — ignore it.
- **No local database**: All data comes from the hosted Supabase instance; no Docker/database provisioning needed.
- **Dev server port**: Defaults to 3000 (`npm run dev`).
