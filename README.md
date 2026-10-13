# Ajaia Docs

A lightweight collaborative document editor built for the Full Stack Product Engineer assignment. It uses Next.js 15, TypeScript, TipTap, and Supabase PostgreSQL with Row Level Security.

## Feature status

| Capability | Status | Details |
|---|---|---|
| Create, rename, edit, and delete documents | Implemented | Includes delete confirmation modal, debounce cleanup, and database cascade |
| Rich text editing | Implemented | Bold, italic, underline, strikethrough, headings (H1/H2/H3), lists, blockquotes, code blocks, dividers |
| Import `.txt` and `.md` files | Implemented | Converts plain text and Markdown into editable document paragraphs with 1 MB limit |
| Export to PDF or Markdown | Implemented | Dedicated `@media print` PDF export, plus client-side formatted Markdown (`.md`) and plain text (`.txt`) downloads |
| Real-time collaboration indicators | Implemented | Active presence avatar stack with colored border rings, status dots, and live pulsating active count pill |
| Commenting or suggestion mode | Implemented | Slide-over panel with unread badge, Open/Resolved/All filters, resolve/reopen/delete actions, and Suggestion mode toggle |
| Document version history | Implemented | Milestone snapshots, timeline list with word count & timestamps, content preview, and one-click restore/rollback |
| Role-based sharing permissions | Implemented | 4 granular roles: **Viewer**, **Commenter**, **Editor**, and **Admin**; enforced via Postgres RLS and UI guards |
| User account deletion | Implemented | Confirmation dialog, secure `delete_user_account` RPC cascading across data, and session cleanup |
| Supabase authentication | Implemented & manually verified | Email/password sign-in, sign-up, and session persistence tested against the configured live Supabase project |
| Persistent document CRUD & autosave | Implemented | Debounced save (650ms) to Supabase PostgreSQL with RLS isolation |
| Local demo mode | Implemented | Zero-configuration offline mode with switchable demo users and seeded collaborative data |
| Automated tests | Implemented | 5 Vitest unit tests covering text import, file extension validation, plain text export, Markdown export, and empty documents |
| Linting & Build verification | Implemented | ESLint 9 (0 warnings/errors) and Next.js 15 production build passing cleanly |

## Requirements

- Node.js 20.9 or later
- npm
- A Supabase project (optional for exploring; local demo mode runs with zero configuration)

## Run locally

```bash
npm install
cp .env.example .env.local
npm run dev
```

On Windows PowerShell, replace the copy command with:

```powershell
Copy-Item .env.example .env.local
```

Open http://localhost:3000. Without Supabase environment values, the app uses **Local Demo Mode** with seeded documents, pre-populated comments, version snapshots, and switchable user profiles.

## Configure Supabase

1. Create a free Supabase project at [supabase.com](https://supabase.com).
2. Open the project dashboard **Connect** dialog or **Settings → API Keys** and copy the Project URL and **publishable** client key (typically begins with `sb_publishable_`).
3. Set them in `.env.local`:

   ```dotenv
   NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=YOUR_SB_PUBLISHABLE_KEY
   ```

4. In **SQL Editor**, run `supabase/migrations/001_initial_schema.sql` once. It creates:
   - `profiles`, `documents`, `document_shares`, `document_comments`, and `document_versions` tables
   - Row Level Security (RLS) policies enforcing read/comment/edit/admin isolation
   - Helper functions: `can_edit_document`, `can_comment_document`, `can_manage_document`
   - Secure `SECURITY DEFINER` RPCs: `share_document_by_email`, `revoke_document_share`, `get_document_collaborators`, and `delete_user_account`
5. In **Authentication → URL Configuration**, set the local site URL to `http://localhost:3000`. For production, add your deployed Vercel URL to the allowed redirect/site URLs.
6. For testing, you can disable email confirmations under **Authentication → Providers → Email** while creating test accounts.
7. Restart the Next.js dev server after editing `.env.local`.
8. To independently verify a separately configured instance, create two accounts through the app and test multi-user collaboration and permission boundaries. This setup step is for reviewer testing and does not mean live Supabase verification for this submission is pending.

> **Security Note:** Never place a Supabase `service_role` key in client code or `NEXT_PUBLIC_*` variables. The application uses only the publishable key and relies entirely on PostgreSQL Row Level Security.

## File handling limits

- **Import:** Supports `.txt` and `.md` files up to 1 MB. Imported content is converted into editable paragraphs.
- **Export:** Instant downloads for formatted Markdown (`.md`), plain text (`.txt`), and vector PDF via print dialog.

## Available commands

```bash
npm run dev    # Start Next.js development server
npm run test   # Run Vitest unit tests (5 passing tests)
npm run lint   # Run ESLint 9 check (0 errors, 0 warnings)
npm run build  # Compile and optimize production build
```

## Reviewer test checklist

- [x] **Autosave & Persistence:** Create a document, format text, wait for "All changes saved", reload, and confirm state persists.
- [x] **Document Deletion:** Delete a document via topbar or sidebar; confirm the deletion warning modal and that active document transitions smoothly.
- [x] **Collaboration Presence:** Open a document and view the presence avatar stack and live active badge in the topbar.
- [x] **Comments & Suggestions:** Open the Comments panel via the topbar button, create comments (`⌘ + Enter`), filter by Open/Resolved, resolve/reopen, and toggle Suggestion mode.
- [x] **Version History:** Open Version History (`History` button), inspect snapshots and word count stats, preview previous versions, and restore an earlier milestone.
- [x] **Export:** Test Export as PDF (triggers print styles without UI chrome), Export as Markdown (`.md`), and Export as Text (`.txt`).
- [x] **Role-Based Sharing:** Share a document with another email and select **Commenter** or **Viewer**; verify editing is locked with an explanatory banner while commenters can still post comments.
- [x] **Account Deletion:** Open the user menu, select "Delete account", confirm through the modal, and verify session cleanup and redirect.

## Architecture and workflow

- See [`ARCHITECTURE.md`](./ARCHITECTURE.md) for the data model, security boundary, real-time presence architecture, and engineering tradeoffs.
- See [`AI_WORKFLOW.md`](./AI_WORKFLOW.md) for notes on how AI tooling was applied, critical design rejections, and verification steps.
