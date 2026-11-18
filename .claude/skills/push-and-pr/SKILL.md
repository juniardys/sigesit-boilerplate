---
name: push-and-pr
description: Test, review, branch, commit, push, and open a GitHub PR for the current changes in this monorepo. Use when the user says "push and pr", "push-and-pr", "bikin PR", "push ke branch baru", or asks to ship/submit current work as a pull request.
---

# Push and PR

Ship current working-tree changes as a PR. Run steps in order. Stop and report to user if any gate fails — never skip a gate silently.

## 0. Preflight

```bash
git rev-parse --is-inside-work-tree   # must be a git repo
gh auth status                        # gh must be logged in
git remote -v                         # must have a remote (usually origin)
git status --short                    # must have changes or unpushed commits
```

- Not a git repo / no remote / `gh` not logged in: stop, tell user what to run (e.g. `! gh auth login`).
- Detect default branch: `gh repo view --json defaultBranchRef -q .defaultBranchRef.name` (fallback `main`).
- Collect changed files: `git status --short` plus `git diff <default>...HEAD --name-only` if already on a feature branch.

## 1. Write tests for changed code

Test runner: `bun test` per workspace (files `*.test.ts` / `*.test.tsx`, placed next to the source file). Root `bun run test` runs each workspace's `test` script in a separate process — required because `mock.module` in one file leaks into other files of the same `bun test` process. Every new workspace needs its own `"test": "bun test"` script.

For every changed source file with logic, add or update tests:

| Changed area | How to test |
|---|---|
| `apps/backend/src/**` (Hono routes) | Import `app`, call `app.request("/path")`, assert status + JSON. Export `app` from the module if not exported yet. Mock `@repo/database` with `mock.module` so tests do not need a live DB. |
| `packages/database/src/**` | Test pure helpers only. Do not hit a real DB unless `DATABASE_URL` points to a test DB. |
| `apps/frontend/**` | Test pure functions / data fetching helpers. Component rendering tests need a DOM setup (happy-dom) — ask user before adding that dependency. |
| Config, docs, schema-only changes | No new test needed; say so in PR. |

Rules:
- Cover happy path + at least one failure/edge case per changed behavior.
- No snapshot-only tests, no tests that just assert mocks were called.
- New dev dependency needed: check version on osv.dev first (`bun run security:osv` after install), pin exact version.

## 2. Run verification gates (from repo root)

```bash
bun run test
bun run typecheck
bun run build
bun run security:osv
bun audit
```

All must pass. On failure: fix the cause, rerun. If not fixable within scope, stop and report exact failing line to user. Record a short result for each command — it goes into the PR body.

## 3. Review changed code

Review the full diff (`git diff` + untracked files) before committing. Use the `code-review` skill if available, otherwise review manually for:

- Correctness bugs, unhandled errors, wrong types
- Security: secrets/`.env` staged, unvalidated input, SQL built from strings, CORS/headers loosened, sensitive error details returned to client
- Leftover debug code (`console.log`, commented-out code, `TODO` without context)
- Naming convention violations (see section 4)

Fix real findings. List anything deliberately left unfixed under "Catatan untuk next development".

## 4. Naming conventions

### Branch
Format: `<type>/<short-kebab-description>` — lowercase, kebab-case, max ~50 chars, no ticket-less vague names like `fix/update` or `feat/changes`.

| type | When |
|---|---|
| `feat` | New feature |
| `fix` | Bug fix |
| `refactor` | Code change with no behavior change |
| `chore` | Tooling, deps, config |
| `docs` | Docs only |
| `test` | Tests only |
| `perf` | Performance |
| `ci` | CI/CD |

With ticket ID: `feat/SC-123-user-login`.

### Commit
Conventional Commits: `<type>(<scope>): <imperative summary>`

- scope = workspace: `backend`, `frontend`, `database`, or `root`
- summary lowercase, no trailing period, max 72 chars
- Examples: `feat(backend): add user list pagination`, `fix(database): handle missing DATABASE_URL`
- Add commit attribution trailer if the harness/system instructions require one.

### Code
- Files: kebab-case (`user-service.ts`); React components in `app/` follow Next.js file conventions (`page.tsx`, `layout.tsx`); component files PascalCase allowed (`UserCard.tsx`)
- Variables/functions: camelCase; types/interfaces/classes: PascalCase; constants: UPPER_SNAKE_CASE
- Prisma models: PascalCase singular (`User`); fields camelCase
- Workspace packages: `@repo/<name>`

## 5. Always use a new branch

```bash
current=$(git branch --show-current)
```

- If `current` is the default branch (`main`/`master`/`develop`): create new branch with `git switch -c <type>/<description>`. Uncommitted changes carry over.
- If on an existing feature branch that already has a merged/closed PR, or unrelated to this change: create a new branch from it the same way.
- If on a fresh feature branch for this exact work with a correct name: keep it.
- Branch name already exists locally or on remote (`git ls-remote --heads origin <name>`): pick a different name, never overwrite.
- Never push directly to the default branch. Never force-push.

## 6. Commit and push

```bash
git add <specific files>     # never `git add -A` blindly; never stage .env, dist, .next, node_modules
git status --short           # confirm staged set
git commit -m "<type>(<scope>): <summary>"
git push -u origin <branch>
```

Split into multiple commits if changes are logically separate. If a pre-commit hook fails, fix the cause — never `--no-verify`.

## 7. Create PR with gh

Write body to a temp file (scratchpad), then:

```bash
gh pr create --base <default-branch> --head <branch> --title "<type>(<scope>): <summary>" --body-file <tmp-body.md>
```

Body template — keep these headings exactly, fill every section, use `-` bullets. Write content in Bahasa Indonesia:

```
Fitur tambahan:
- <new capability visible to users/API; "Tidak ada" if none>

Perubahan yang dilakukan:
- <file/area>: <what changed and why>

Hasil test result:
- bun run test: <N pass, 0 fail>
- bun run typecheck: <pass/fail>
- bun run build: <pass/fail>
- bun run security:osv: <N packages scanned, 0 vulnerable>
- bun audit: <result>

Catatan untuk next development:
- <follow-ups, known limitations, unfixed review findings, untested paths>
```

Append PR attribution line after the template if the harness/system instructions require one.

## 8. Report

Tell user: branch name, commit(s), PR URL, test summary, and anything left in "Catatan untuk next development".
