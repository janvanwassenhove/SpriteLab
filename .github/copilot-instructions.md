# SpriteLab — Copilot Instructions

These instructions guide AI-assisted development on the SpriteLab codebase. They apply to all future feature work, bug fixes, and refactoring.

---

## Project Overview

SpriteLab is a browser-based pixel-art sprite editor with AI-powered generation, built for 2D game characters. It runs as a Next.js 16 app with React 19, Tailwind CSS 4, and Zustand for state management.

### Core Domains

| Domain | Location | Purpose |
|---|---|---|
| **Canvas engine** | `src/lib/canvas/` | Pixel manipulation, drawing tools, layer compositing, undo/redo |
| **Animation** | `src/components/animation/`, `src/stores/editor-store.ts` | Frame-based timeline, playback, onion skin |
| **AI generation** | `src/lib/ai/`, `src/components/ai/`, `src/stores/ai-store.ts` | Text-to-sprite via OpenAI / Gemini |
| **Fighter packs** | `src/lib/fighter-pack/`, `src/components/fighter-pack/` | Batch animation generation with style consistency |
| **Export** | `src/lib/export/`, `src/components/export/` | PNG, GIF, sprite sheet export |
| **Wizard** | `src/components/wizard/`, `src/stores/wizard-store.ts` | 6-step character creation workflow |
| **Editor UI** | `src/components/editor/` | Canvas, toolbar, panels, status bar |
| **Storage** | `src/lib/storage/local-db.ts` | IndexedDB via Dexie for local project persistence |
| **Auth** | `src/lib/auth.ts`, `src/app/api/auth/` | NextAuth v5 with credentials + OAuth |
| **Database** | `prisma/schema.prisma` | PostgreSQL via Prisma 7 |

---

## Architecture Conventions

### State Management

- Use **Zustand** stores in `src/stores/`. Do not use React Context or Redux.
- The **editor store** (`editor-store.ts`) is the central state hub for the canvas, layers, frames, tools, and zoom.
- The **project store** manages project CRUD and persistence.
- The **AI store** manages generation state, provider selection, and cost estimation.
- The **wizard store** manages the 6-step character wizard flow.
- Keep stores focused — avoid putting unrelated state in the same store.

### Component Structure

- Components live in `src/components/`, organized by feature domain.
- UI primitives (button, dialog, input, etc.) are in `src/components/ui/` — use these instead of creating new base components.
- Page components are in `src/app/` following Next.js App Router conventions.
- Use `"use client"` directive only on components that need client-side interactivity.

### Canvas & Drawing

- All pixel manipulation goes through `src/lib/canvas/engine.ts`.
- Tools are pure functions in `src/lib/canvas/tools.ts` that receive pixel data and return modified pixel data.
- Layer compositing happens in `src/lib/canvas/layer.ts`.
- History (undo/redo) is managed by `src/lib/canvas/history.ts`.
- Pixel data is stored as `Uint8ClampedArray` (RGBA flat arrays).

### AI Integration

- Each AI provider has its own service file in `src/lib/ai/`.
- `openai-service.ts` — OpenAI (GPT-4o + DALL-E)
- `gemini-service.ts` — Google Gemini
- `prompt-builder.ts` — constructs prompts for sprite generation
- `cost-estimator.ts` — calculates cost estimates per quality tier
- `pixelizer.ts` — post-processes AI output into clean pixel art
- When adding a new AI provider, follow the same interface pattern as existing services.

### API Routes

- API routes are in `src/app/api/` following Next.js Route Handlers.
- AI endpoints: `api/ai/generate`, `api/ai/edit`, `api/ai/wizard`, `api/ai/fighter-pack`, `api/ai/usage`
- Auth: `api/auth/[...nextauth]`
- Export: `api/export`
- Projects: `api/projects`, `api/projects/[id]`

### Database

- Schema is defined in `prisma/schema.prisma`.
- Generated Prisma client lives in `src/generated/prisma/` — never edit these files manually.
- Run `npx prisma generate` after schema changes.
- Run `npx prisma db push` to apply schema changes to the database.
- Database is used for auth, server-side project storage, AI usage tracking, and fighter packs.

### Local Storage

- Client-side project data is stored in IndexedDB via Dexie (`src/lib/storage/local-db.ts`).
- This enables offline-first usage — users can create and edit sprites without a database connection.

---

## Code Style

- **TypeScript** everywhere. Avoid `any` — use proper types from `src/types/index.ts`.
- **Tailwind CSS 4** for all styling. No CSS modules, no inline styles.
- **Functional components** with hooks. No class components.
- **kebab-case** for file names (`color-panel.tsx`), **PascalCase** for component names (`ColorPanel`).
- Import UI primitives from `@/components/ui/` — e.g., `import { Button } from "@/components/ui/button"`.
- Import types from `@/types` — e.g., `import type { Layer, Frame, Tool } from "@/types"`.
- Use `@/` path aliases for all imports (configured in `tsconfig.json`).

---

## Adding New Features — Checklist

When implementing a new feature:

1. **Types first** — add or update types in `src/types/index.ts`
2. **Logic** — implement core logic in `src/lib/` (canvas, AI, export, etc.)
3. **Store** — add state to the appropriate Zustand store in `src/stores/`
4. **Components** — build UI in `src/components/<domain>/`
5. **API route** — add server-side endpoint in `src/app/api/` if needed
6. **Schema** — update `prisma/schema.prisma` if new data models are required, then run `npx prisma generate`
7. **Verify** — run `npx tsc --noEmit` and `npm run lint` before committing

---

## Patterns to Follow

### Adding a Drawing Tool

```
1. Add tool name to the `Tool` union type in src/types/index.ts
2. Implement tool logic in src/lib/canvas/tools.ts
3. Add toolbar button in src/components/editor/Toolbar.tsx
4. Handle tool events in src/lib/canvas/engine.ts
```

### Adding an AI Provider

```
1. Create src/lib/ai/<provider>-service.ts matching existing service interfaces
2. Add provider option to src/stores/ai-store.ts
3. Update src/components/ai/GenerationPanel.tsx with provider selector
4. Add API key env var to .env.example and docker-compose.yml
```

### Adding an Export Format

```
1. Create src/lib/export/<format>.ts with an export function (frames → Blob)
2. Add format option to src/components/export/ExportDialog.tsx
3. Update src/app/api/export/route.ts if server processing is needed
```

### Adding a Wizard Step

```
1. Create src/components/wizard/Step<Name>.tsx
2. Update step flow in src/stores/wizard-store.ts
3. Wire into src/components/wizard/CharacterWizard.tsx
```

---

## Common Commands

```bash
npm run dev          # Start development server (Turbopack)
npm run build        # Production build
npm run lint         # Run ESLint
npx tsc --noEmit     # TypeScript type checking
npx prisma generate  # Regenerate Prisma client after schema changes
npx prisma db push   # Push schema changes to database
npx prisma studio    # Open Prisma Studio (visual DB browser)
```

---

## Environment Variables

| Variable | Required | Purpose |
|---|---|---|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `AUTH_SECRET` | Yes | NextAuth session encryption secret |
| `AUTH_URL` | No | Public app URL (defaults to localhost) |
| `OPENAI_API_KEY` | No | OpenAI API key for AI generation |
| `GEMINI_API_KEY` | No | Google Gemini API key for AI generation |

---

## Testing & Screenshots

- **Unit tests:** Not yet configured. When adding tests, prefer Vitest.
- **E2E tests:** Playwright is installed for screenshot automation and can be extended for E2E tests.
- At minimum, verify changes with `npx tsc --noEmit`, `npm run lint`, and manual testing in the browser.

### Automated Screenshots

Screenshots in `docs/screenshots/` are captured by Playwright and embedded in `README.md` and `RELEASE_NOTES.md`. They are regenerated automatically:

- **On every release** — the GitHub Actions workflow (`.github/workflows/screenshots.yml`) runs when a release is published
- **On pushes to `main`** — when `src/components/` or `src/app/` files change
- **Manually** — trigger via GitHub Actions → Screenshots → "Run workflow"
- **Locally during release** — `release.ps1` captures screenshots as part of the release workflow

**How it works:**

- Screenshot specs: `e2e/screenshots.spec.ts`
- Playwright config: `playwright.config.ts` (viewport 1280×800, Chromium)
- Output: `docs/screenshots/`
- The release script (`release.ps1`) includes a screenshot step that captures fresh screenshots before tagging

**Adding a new screenshot (when adding a new feature/screen):**

1. Add a new test case in `e2e/screenshots.spec.ts`
2. Add the `<img>` tag in the appropriate section of `README.md`
3. Screenshots will be captured automatically on the next release

---

## Security Notes

- Never commit API keys or secrets. Use `.env` files (gitignored).
- AI API keys are server-side only — they never reach the client bundle.
- Auth uses NextAuth v5 with bcrypt password hashing.
- Database queries go through Prisma (parameterized, SQL-injection-safe).
- Validate all user input in API routes before processing.
