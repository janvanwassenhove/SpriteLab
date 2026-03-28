# Contributing to SpriteLab

Thanks for your interest in contributing to SpriteLab! Whether you're fixing a bug, adding a feature, or improving documentation — every contribution helps make sprite creation better for game developers everywhere.

---

## Getting Started

1. **Fork** the repository on GitHub
2. **Clone** your fork locally:
   ```bash
   git clone https://github.com/<your-username>/SpriteLab.git
   cd SpriteLab
   ```
3. **Install dependencies:**
   ```bash
   npm install
   ```
4. **Set up your environment:**
   ```bash
   cp .env.example .env
   # Edit .env with your DATABASE_URL and AUTH_SECRET
   npx prisma generate
   npx prisma db push
   ```
5. **Start the dev server:**
   ```bash
   npm run dev
   ```

---

## Development Workflow

### Branch Naming

Create a branch from `main` using one of these prefixes:

| Prefix | Use for |
|---|---|
| `feature/` | New features (`feature/sprite-import`) |
| `fix/` | Bug fixes (`fix/timeline-frame-delay`) |
| `refactor/` | Code refactoring without behavior changes |
| `docs/` | Documentation updates |
| `chore/` | Tooling, CI, dependency updates |

### Before You Commit

Run these checks locally — they must pass before your PR can be merged:

```bash
# TypeScript type checking
npx tsc --noEmit

# Linting
npm run lint

# Build verification
npm run build
```

### Commit Messages

Use clear, imperative-mood messages:

```
feat: add sprite import from PNG files
fix: correct frame delay calculation in timeline
docs: update Docker setup instructions
refactor: simplify layer compositing logic
```

---

## Project Structure

```
src/
├── app/            # Next.js App Router pages and API routes
│   ├── api/        # Server-side endpoints (AI, auth, export, projects)
│   ├── editor/     # Main sprite editor page
│   └── wizard/     # Character wizard page
├── components/     # React components, organized by feature
│   ├── ai/         # AI generation panel
│   ├── animation/  # Timeline component
│   ├── editor/     # Canvas, toolbar, panels
│   ├── export/     # Export dialog
│   ├── fighter-pack/ # Fighter pack batch generator
│   ├── settings/   # Settings dialog
│   ├── ui/         # Reusable UI primitives (button, dialog, etc.)
│   └── wizard/     # Character wizard step components
├── hooks/          # Custom React hooks
├── lib/            # Core logic (canvas engine, AI services, export)
│   ├── ai/         # AI provider integrations (OpenAI, Gemini)
│   ├── canvas/     # Drawing engine, tools, history, layers
│   ├── export/     # GIF, sprite sheet, bundle generation
│   ├── fighter-pack/ # Consistency, templates, batch generation
│   └── storage/    # IndexedDB (Dexie) local storage
├── stores/         # Zustand state stores
├── types/          # TypeScript type definitions
└── utils/          # Shared utility functions
prisma/
└── schema.prisma   # Database schema (PostgreSQL)
docker/
├── Dockerfile      # Multi-stage production build
└── docker-compose.yml
```

### Key Architectural Decisions

- **State management:** Zustand stores in `src/stores/`. The editor store is the largest — it manages canvas state, tool selection, zoom, layers, and animation frames.
- **Canvas rendering:** The drawing engine in `src/lib/canvas/engine.ts` handles all pixel manipulation. Tools are defined in `tools.ts` as pure functions that operate on pixel data.
- **AI abstraction:** Both OpenAI and Gemini are wrapped behind a common interface. Adding a new provider means implementing the same contract in `src/lib/ai/`.
- **Local-first storage:** Projects are stored in IndexedDB via Dexie (`src/lib/storage/local-db.ts`). PostgreSQL is used for auth and server-side features.
- **Export pipeline:** Each export format (PNG, GIF, sprite sheet) is a separate module in `src/lib/export/`.

---

## Adding a New Feature

Here's a typical workflow for adding a feature:

1. **Open an issue** describing the feature — this helps avoid duplicate work
2. **Create a branch** from `main`: `git checkout -b feature/my-feature`
3. **Implement the feature** — add components in `src/components/`, logic in `src/lib/`, types in `src/types/`
4. **Update the store** if the feature needs new state (add to the relevant Zustand store in `src/stores/`)
5. **Test locally** — verify the feature works in the editor, check for regressions
6. **Run checks:** `npx tsc --noEmit && npm run lint && npm run build`
7. **Open a PR** against `main` with a clear description of what changed and why

### Adding a New AI Provider

1. Create a new service file in `src/lib/ai/` (e.g., `anthropic-service.ts`)
2. Implement the same interface as `openai-service.ts` and `gemini-service.ts`
3. Add the provider option to the AI store in `src/stores/ai-store.ts`
4. Update the generation panel UI in `src/components/ai/GenerationPanel.tsx`
5. Add any new environment variables to `.env.example` and document them in the README

### Adding a New Export Format

1. Create a new module in `src/lib/export/` (e.g., `apng.ts`)
2. Implement the export function that takes frames and returns a blob
3. Add the format option to `src/components/export/ExportDialog.tsx`
4. Update the export API route if server-side processing is needed

### Adding a New Drawing Tool

1. Add the tool name to the `Tool` type in `src/types/index.ts`
2. Implement the tool logic in `src/lib/canvas/tools.ts`
3. Add the tool button to `src/components/editor/Toolbar.tsx`
4. Handle the tool in the canvas engine's event handlers in `src/lib/canvas/engine.ts`

---

## Pull Request Guidelines

- Keep PRs focused — one feature or fix per PR
- Include a clear description of **what** changed and **why**
- Reference the related issue if one exists (`Closes #123`)
- Add screenshots or GIFs for UI changes
- Ensure all checks pass before requesting review

---

## Reporting Bugs

Open an issue with:

1. **What you expected** to happen
2. **What actually happened** (include screenshots if visual)
3. **Steps to reproduce** the issue
4. **Browser and OS** information
5. **Console errors** if any (open DevTools → Console tab)

---

## Code Style

- **TypeScript** for all source files — no `any` types unless absolutely necessary
- **Tailwind CSS** for styling — avoid inline styles or CSS modules
- **Functional components** with hooks — no class components
- **Zustand** for state — avoid prop drilling or React context for shared state
- Name files in **kebab-case** (`color-panel.tsx`), components in **PascalCase** (`ColorPanel`)

---

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
