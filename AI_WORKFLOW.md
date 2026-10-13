# AI workflow note

## Tools used

- Antigravity IDE (powered by Gemini 3.8 Flash) for interactive pair-programming, codebase analysis, debugging, and verification.
- ChatGPT / LLM assistance for architecture planning, RLS policy ideation, and review.

## Where AI helped

- **Rapid Scaffolding & Component Assembly**: Generated cohesive Next.js 15 client components with TipTap integration, auth flows, and styling tokens.
- **Root-Cause Debugging**: Resolved modern ESLint 9 flat config compatibility issues with `eslint-config-next` by setting up `@eslint/eslintrc`'s `FlatCompat`.
- **TypeScript Closure Refinement**: Identified and resolved TypeScript narrowing loss inside asynchronous `setTimeout` callbacks by capturing non-null client references.
- **Feature Completion (Document Deletion & Markdown Export)**: Implemented complete document lifecycle management, including delete confirmation dialogs, debounce timer cancellation, and client-side Markdown/plain-text export downloads.
- **Automated Testing**: Created deterministic unit tests for both import and export transformations without needing mock databases.

## Changes and rejections

- **Structured TipTap JSON over Raw HTML**: Rejected storing raw HTML strings in the database in favor of structured TipTap JSON trees to prevent XSS vulnerabilities and maintain reliable round-trip editing.
- **No Unconfirmed Destructive Actions**: Rejected immediate one-click deletion; required a confirmation dialog with clear warnings to prevent accidental data loss.
- **Strict Database Security Boundaries**: Rejected relying purely on client-side permission checks; enforced security via PostgreSQL Row Level Security (RLS) policies and `SECURITY DEFINER` functions with search path isolation.
- **Explicit Scope Boundaries**: Deferred real-time cursor sync (WebSockets/CRDT) and nested folder hierarchies to keep delivery focused on reliable persistence, sharing permissions, and editing usability.

## Verification

The following checks have been run and verified:

- [x] `npm run test` (4 unit tests passing: text import, file extension validation, plain text export, and Markdown export)
- [x] `npm run lint` (ESLint 9 passing cleanly with 0 errors and 0 warnings)
- [x] `npm run build` (Next.js production build succeeded with static page optimization)
- [x] Authenticated sign-in and document loading verified against live Supabase backend.
- [x] Verified document creation, debounced auto-save, title renaming, and deletion in browser.
- [x] Verified file import (`.txt`, `.md`) and file export (`.md`, `.txt`).
- [x] Verified RLS policy boundaries for owned vs shared documents.
