# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Quick Start

```bash
npm run setup  # Install deps, generate Prisma client, run migrations
npm run dev    # Start dev server with Turbopack (http://localhost:3000)
```

**Testing & Validation:**
```bash
npm run test                    # Run all tests with Vitest
npm run lint                    # Run ESLint
npm test -- src/lib/__tests__/file-system.test.ts  # Run single test file
npm run db:reset                # Reset SQLite database to clean state
```

> Do not run `npm audit fix` — dependencies are pinned to specific compatible versions.

## Architecture

UIGen is an AI-powered React component generator. Users describe components in chat, Claude AI generates them into a virtual file system, and users see live preview + editable code.

### Core Systems

**1. Virtual File System** (`src/lib/file-system.ts`)
- In-memory tree of `FileNode` objects — files are never written to disk
- Serializable to JSON for Prisma persistence
- Used by PreviewFrame to render components and by the chat API to persist state after each generation

**2. AI Chat Route** (`src/app/api/chat/route.ts`)
- POST endpoint streaming Vercel AI SDK responses via `streamText`
- Reconstructs `VirtualFileSystem` from project JSON before calling the model
- Claude has two tools: `str_replace_editor` (edit file content) and `file_manager` (rename/delete)
- System prompt (with ephemeral prompt caching) lives in `src/lib/prompts/generation.tsx`:
  - Requires `/App.jsx` as the root component entry point
  - Use Tailwind CSS only (no hardcoded styles)
  - Use `@/` import alias for non-library files
- Saves updated file system + messages to Prisma after stream completion (authenticated users only)

**3. Provider & Model Selection** (`src/lib/provider.ts`)
- `getLanguageModel()` checks `ANTHROPIC_API_KEY` env var
- Returns real Anthropic model (`claude-haiku-4-5`) or `MockLanguageModel`
- `MockLanguageModel` returns canned demo components — development works without an API key

**4. Preview & Code Editing**
- **PreviewFrame** (`src/components/preview/PreviewFrame.tsx`): Renders `App.jsx` in an iframe using Babel standalone + import maps
- **JSX Transformer** (`src/lib/transform/jsx-transformer.ts`): Converts JSX to browser-runnable code
- **CodeEditor** (`src/components/editor/CodeEditor.tsx`): Monaco editor, language detected by file extension
- **FileTree** (`src/components/editor/FileTree.tsx`): Navigates the virtual file system

**5. Project & User Persistence**
- Prisma schema: `User` (email, bcrypt password) and `Project` (name, messages JSON, data JSON for VFS)
- Server actions in `src/actions/`: auth (sign-up/in/out/get-user) and project CRUD
- JWT session management in `src/lib/auth.ts`; anonymous users are fully supported

**6. Context Providers** (`src/lib/contexts/`)
- **FileSystemProvider**: Manages `VirtualFileSystem` state; exposes `updateFile()`, `getFileContent()`, and a `refreshTrigger` that fires on file changes to update the preview
- **ChatProvider**: Wraps Vercel AI SDK `useAIChat`, serializes the VFS to JSON on each send, and handles incoming tool calls by delegating to `FileSystemProvider`

### Main UI Layout (`src/app/main-content.tsx`)
- Left panel (35%): `ChatInterface` — user prompt input and message history
- Right panel (65%):
  - Tab toggle between **Preview** (iframe via PreviewFrame) and **Code** (FileTree 30% + Monaco 70%)
- All panels are resizable via `react-resizable-panels`

### Routing & Page Flow
- `/` — Redirects authenticated users to their latest project (creates one if none exist); renders `MainContent` for anonymous users
- `/:projectId` — Loads project from Prisma, renders `MainContent` with persisted chat history and file system state

### Key Configuration
- **TypeScript paths**: `@/*` → `src/*`
- **Prisma output**: `src/generated/prisma` (auto-generated, do not edit)
- **Vitest**: jsdom environment, test files in `__tests__` directories alongside source
- **Tailwind v4** with PostCSS (`postcss.config.mjs`)
