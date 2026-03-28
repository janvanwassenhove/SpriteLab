<p align="center">
  <img src="docs/screenshots/editor.png" alt="SpriteLab Editor" width="720" />
</p>

<h1 align="center">SpriteLab</h1>

<p align="center">
  <strong>The pixel-art sprite editor that turns ideas into game-ready characters — powered by AI.</strong>
</p>

<p align="center">
  <a href="#-getting-started">Getting Started</a> ·
  <a href="#-features">Features</a> ·
  <a href="#-installation">Installation</a> ·
  <a href="#-docker">Docker</a> ·
  <a href="#-configuration">Configuration</a> ·
  <a href="#-contributing">Contributing</a> ·
  <a href="#-license">License</a>
</p>

---

## The Problem

You're building a 2D fighting game. You need idle animations, walk cycles, attack sequences, jump arcs — and every frame needs to be pixel-perfect, consistent in style, and annotated with hitboxes. Traditionally, that means weeks of sprite work before you can even test a punch.

**SpriteLab changes that.**

It's a browser-based sprite editor that combines a full-featured pixel-art canvas with AI-powered generation. Describe your character, pick your animations, and SpriteLab produces a complete, editable sprite pack — then lets you refine every pixel, adjust every hitbox, and export everything your game engine needs.

No installs. No asset store hunting. Just open a tab and start creating.

---

## ✨ Features

### Draw — A Real Pixel-Art Editor

SpriteLab isn't a toy preview tool. It's a proper multi-layer editor with the tools you'd expect:

- **Pencil, eraser, flood fill, line, rectangle, ellipse**, and an eyedropper
- **Multi-layer support** with blend modes (normal, multiply, screen, overlay, darken, lighten)
- **Zoom, pan, grid overlay**, and **mirror mode** for symmetrical characters
- Sprite sizes from **16×16** all the way to **256×256**
- Built-in **color palettes** and a full color picker

<p align="center">
  <img src="docs/screenshots/editor.png" alt="Pixel-art editor with canvas, layers, and color palette" width="720" />
</p>

### Animate — Frame-Based Timeline

Every fighting game character needs fluid motion. The animation timeline gives you:

- **Frame-by-frame editing**, each frame with its own independent layer stack
- **Play/pause preview** with per-frame delay control
- **Loop and ping-pong** playback modes
- **Onion skin** overlay to see adjacent frames while you draw

<p align="center">
  <img src="docs/screenshots/timeline.png" alt="Animation timeline with multiple frames" width="720" />
</p>

### Hit — Hitbox Editor

Competitive games need precise collision data. SpriteLab supports three hitbox types drawn directly on the canvas:

- 🔴 **Hitbox** — attack collision area
- 🟢 **Hurtbox** — vulnerable area
- 🔵 **Pushbox** — body collision area

Propagate hitboxes to the next frame or all frames at once — no tedious re-drawing.

<p align="center">
  <img src="docs/screenshots/hitboxes.png" alt="Hitbox, hurtbox, and pushbox overlays" width="720" />
</p>

### Generate — AI-Powered Sprite Creation

This is where SpriteLab sets itself apart. Describe what you want in plain language:

- Generate sprites via **OpenAI** or **Google Gemini**
- Choose between **low / medium / high** quality tiers with **live cost estimates**
- Provide a **reference image** for guided generation
- Every generated sprite lands on your canvas, fully editable

<p align="center">
  <img src="docs/screenshots/ai-generation.png" alt="AI generation panel with prompt and quality selector" width="720" />
</p>

### Wizard — From Concept to Complete Character

The **Character Wizard** walks you through six steps:

1. **Concept** — describe your character's personality and style
2. **Appearance** — define colors, proportions, and details
3. **Animations** — pick which movements to generate
4. **Settings** — choose AI provider, quality, and sprite size
5. **Generate** — watch your character come to life
6. **Complete** — review, edit, and export

One description in, a full animated sprite pack out.

<p align="center">
  <img src="docs/screenshots/wizard.png" alt="Character wizard step-by-step workflow" width="720" />
</p>

### Fighter Pack — Batch Generation for Full Rosters

Building a roster? The **Fighter Pack Generator** batch-produces complete animation sets:

- Idle, walk, run, attack, jump, crouch, block, hit, death — and more
- **Consistent style** across all animations for the same character
- **Streaming progress** so you can watch frames arrive in real time
- Customizable **frame counts per animation**

<p align="center">
  <img src="docs/screenshots/fighter-pack.png" alt="Fighter pack batch generation panel" width="720" />
</p>

### Export — Game-Engine Ready

When you're done, export exactly what your engine needs:

- **PNG frames** — individual frame images
- **Animated GIF** — with configurable delay and scale
- **Sprite sheets** — horizontal, vertical, or auto-packed layout
- **Batch export** with progress tracking via JSZip

<p align="center">
  <img src="docs/screenshots/export.png" alt="Export dialog with PNG, GIF, and sprite sheet options" width="720" />
</p>

### Projects — Saved in Your Browser

Projects live in your browser's IndexedDB — no account required to start creating. Each project card shows a thumbnail preview. Import and export projects as files to share or back up your work.

<p align="center">
  <img src="docs/screenshots/home.png" alt="Project management home screen" width="720" />
</p>

---

## 🚀 Getting Started

### Prerequisites

| Tool       | Version  | Why                        |
|-----------|----------|----------------------------|
| **Node.js** | 20+     | Runtime                    |
| **npm**    | 9+       | Package manager            |
| **PostgreSQL** | 16+ | Server-side project storage (optional for local-only use) |

> **No AI key?** SpriteLab works perfectly fine as a standalone pixel-art editor and animator. AI features activate only when you provide an API key.

### Quick Start (3 minutes)

```bash
# 1. Clone the repository
git clone https://github.com/janvanwassenhove/SpriteLab.git
cd SpriteLab

# 2. Install dependencies
npm install

# 3. Set up environment
cp .env.example .env
# Edit .env — at minimum, set DATABASE_URL and AUTH_SECRET

# 4. Generate the Prisma client
npx prisma generate

# 5. Run database migrations (if using PostgreSQL)
npx prisma db push

# 6. Start the dev server
npm run dev
```

Open **http://localhost:3000** and create your first project.

#### Windows Quick Start

Double-click `start.bat` — it installs dependencies, generates Prisma, and launches the dev server in one step.

---

## 📦 Installation

### From Source

```bash
git clone https://github.com/janvanwassenhove/SpriteLab.git
cd SpriteLab
npm install
```

### Build for Production

```bash
npm run build
npm start          # serves the production build on port 3000
```

### Lint & Type Check

```bash
npm run lint       # ESLint
npx tsc --noEmit   # TypeScript type checking
```

---

## 🐳 Docker

The fastest way to run SpriteLab with zero local setup:

```bash
cd docker
docker-compose up --build
```

This spins up:

- **SpriteLab** on `http://localhost:3000`
- **PostgreSQL 16** on `localhost:5432` (user: `postgres`, password: `postgres`, db: `spritelab`)

To supply API keys, create a `.env` file in the project root:

```env
AUTH_SECRET=your-random-secret-here
OPENAI_API_KEY=sk-...
GEMINI_API_KEY=AI...
```

Docker Compose reads these automatically.

---

## ⚙️ Configuration

### Environment Variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `DATABASE_URL` | Yes | — | PostgreSQL connection string, e.g. `postgresql://user:pass@localhost:5432/spritelab` |
| `AUTH_SECRET` | Yes | — | Random secret for NextAuth session encryption. Generate with `openssl rand -base64 32` |
| `AUTH_URL` | No | `http://localhost:3000` | The public URL of your deployment |
| `OPENAI_API_KEY` | No | — | Enables AI sprite generation via OpenAI (GPT-4o / DALL-E) |
| `GEMINI_API_KEY` | No | — | Enables AI sprite generation via Google Gemini |

### AI Providers

SpriteLab supports two AI providers. You can configure one, both, or neither:

- **OpenAI** — uses GPT-4o for prompt refinement and DALL-E for image generation
- **Google Gemini** — uses Gemini models for both prompt and image generation

The generation panel lets you switch between providers at any time. Cost estimates are shown before every generation so there are no surprises.

---

## 🏗️ Tech Stack

| Layer | Technology |
|---|---|
| **Framework** | Next.js 16 (App Router, Turbopack) |
| **UI** | React 19, Tailwind CSS 4, Lucide icons |
| **State** | Zustand |
| **Local Storage** | Dexie (IndexedDB) |
| **Auth** | NextAuth v5 (credentials + OAuth) |
| **Database** | PostgreSQL + Prisma 7 |
| **AI** | OpenAI API, Google Gemini API |
| **Export** | gif.js, JSZip, maxrects-packer |
| **Deployment** | Docker (multi-stage build) + docker-compose |

---

## 🤝 Contributing

Contributions are welcome! See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines on how to get started.

Before opening a PR:

1. Fork the repository and create a feature branch (`git checkout -b feature/my-feature`)
2. Make your changes, ensuring `npm run lint` and `npx tsc --noEmit` pass
3. Test your changes locally with `npm run dev`
4. Open a pull request against `main` with a clear description

---

## 📋 Release

See [RELEASE_NOTES.md](RELEASE_NOTES.md) for the current version and changelog.

To create a new release:

```powershell
.\release.ps1           # full workflow: lint → build → docker → tag → push
.\release.ps1 -Help     # show all options
```



<p align="center">
  Built for game developers who think in pixels.<br>
  <a href="https://github.com/janvanwassenhove/SpriteLab/issues">Report a Bug</a> ·
  <a href="https://github.com/janvanwassenhove/SpriteLab/issues">Request a Feature</a>
</p>
