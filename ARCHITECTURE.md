# Architecture and tradeoffs

## Product slice

Ajaia Docs focuses on a usable document workflow: workspace navigation, ownership/shared states, title editing, rich-text formatting, text/Markdown import, debounced saves, and explicit sharing permissions. Real-time cursors, comments, version history, `.docx` parsing, PDF export, and complex organization-level roles are deferred.

## Stack

- **Next.js App Router + TypeScript:** one deployable web application with typed UI and server-friendly routing.
- **TipTap:** structured JSON content that preserves headings, text marks, and list nodes.
- **Supabase Auth + PostgreSQL:** authenticated identities and durable document data.
- **Postgres Row Level Security:** an access boundary below the UI, so knowing a document ID does not grant access.
- **Vitest:** fast tests for deterministic text-import and file-validation logic.

## Data model

- `profiles` mirrors the authenticated Supabase user's ID, email, and display name.
- `documents` stores the title, TipTap JSONB content, owner, and timestamps.
- `document_shares` grants a specific `viewer` or `editor` permission to another profile.

A trigger creates a profile when a Supabase Auth user is created. Foreign keys cascade when a user or document is removed.

## Authorization

A user can read a document only if they own it or have a share row. Owners and editors can update a document; only owners can delete documents, grant access, or revoke access. A database trigger prevents ownership changes by ordinary updates. Sharing by email and listing/revoking access uses narrowly scoped `SECURITY DEFINER` RPC functions, so the browser does not need directory-wide profile access. RLS policies remain the primary data boundary.

The local demo mode is deliberately not authentication. In a configured project, the user must sign in through Supabase. Verify the migration and RLS behavior against two real accounts before treating the deployment as production-ready.

## Save behavior

TipTap JSON is the canonical content format. Title/content changes use a short debounce before writing to Postgres, and the interface displays saving, saved, and failed states. This is a single-writer/last-write-wins approach appropriate to the timebox. There is no merge protocol for simultaneous edits; real-time collaboration and conflict resolution are deferred.

## File handling

Only `.txt` and `.md` files up to 1 MB are accepted for import. Each line is turned into an editable paragraph node. For export, users can download the document directly as formatted Markdown (`.md`) or plain text (`.txt`), providing a seamless round-trip for file-based workflows. Converting complex Markdown syntax directly into nested TipTap AST nodes on import is a useful next enhancement.

## Deliberate cuts

No real-time collaboration, comments, version history, PDF/DOCX import, or rich organization/role management. These were deferred to prioritize persistence, permission enforcement, simple sharing, and a coherent editing surface.

## Database permission notes

The migration grants only the table operations needed by authenticated users, enables RLS, sets a pinned empty search path for `SECURITY DEFINER` helpers, revokes their default `PUBLIC`/`anon` execution grant, and re-grants execution to authenticated users. Verify the migration succeeds in the target Supabase project before relying on these controls.
