# Ajaia Docs

A lightweight collaborative document editor built for the Full Stack Product Engineer assignment. It uses Next.js, TypeScript, TipTap, and Supabase.

## Feature status

| Capability | Status |
|---|---|
| Create, rename, edit, and delete documents | Implemented (with delete confirmation modal and RLS cascade) |
| Rich text: bold, italic, underline, headings, lists, quotes, divider | Implemented |
| Import `.txt` and `.md` files | Implemented (converts to editable paragraphs) |
| Export `.md` and `.txt` files | Implemented (download formatted Markdown or plain text) |
| Supabase email/password authentication | Implemented and verified against live Supabase project |
| Persistent document CRUD and debounced autosave | Implemented in application code with Postgres RLS |
| Owner/shared document lists | Implemented in application code |
| Share by account email; viewer/editor access; revoke access | Implemented in application code and backed by RPC/RLS |
| Local demo mode without environment keys | Available for UI exploration only; does not persist |
| Automated tests | Unit tests cover text import, export converters, and file validation |
| Deployment | Ready for deployment to Vercel with Supabase environment variables |

This repository has not yet been verified against a live Supabase project. Run the checks below and exercise the app with two real accounts before submitting it as complete.

## Requirements

- Node.js 20.9 or later
- npm
- A Supabase project

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

Open http://localhost:3000. Without Supabase environment values, the app uses local demo data. Demo changes are not persisted; this mode is only for trying the UI.

## Configure Supabase

1. Create a free Supabase project.
2. Open the project dashboard **Connect** dialog or **Settings → API Keys** and copy the Project URL and **publishable** client key (typically begins with `sb_publishable_`). The app also accepts a legacy anon key if that is all your project shows.
3. Set them in `.env.local`:

   ```dotenv
   NEXT_PUBLIC_SUPABASE_URL=https://pvzfvffnxhksnvsuihuq.supabase.co
   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=YOUR_SB_PUBLISHABLE_KEY
   ```

4. In **SQL Editor**, run `supabase/migrations/001_initial_schema.sql` once. It creates profiles, documents, document shares, access-check helpers, triggers, RLS policies, and sharing RPC functions.
5. In **Authentication → URL Configuration**, set the local site URL to `http://localhost:3000`. For production, add the deployed Vercel URL to the allowed redirect/site URLs as applicable.
6. For a quick assignment review, you can turn off email confirmations under **Authentication → Providers → Email** while creating test accounts. Re-enable confirmations for a real product. Settings vary by Supabase dashboard version.
7. Restart the Next.js dev server after changing `.env.local`.
8. Create two separate accounts through the app. Sign in as the owner, create a document, then share it with the other account's exact email. Sign in as that recipient in another browser or a private window to verify the shared document and permission.

**Never put a Supabase `service_role` or secret key in a `NEXT_PUBLIC_*` variable or browser code.** The app only needs the publishable key (or legacy anon key); row-level security policies enforce access.

## File import limits

Supported: `.txt` and `.md`, maximum 1 MB. Imported content becomes editable paragraphs. Markdown syntax is not rendered into headings or lists during import. `.docx` and PDF are not supported.

## Commands

```bash
npm run dev
npm run test
npm run lint
npm run build
```

## Test checklist

- Create a document, use formatting, wait for the save indicator, refresh, and confirm that content and formatting persist.
- Rename a document and reopen it from the sidebar.
- Import a text or Markdown file and verify its content can be edited and persists.
- Share with a second registered account as editor; verify the document appears for that account and edits persist.
- Repeat with viewer permission; verify the recipient cannot edit and that direct update requests are rejected by RLS.
- Revoke access and verify the document no longer appears to the recipient after reload.
- Run `npm run test`, `npm run lint`, and `npm run build` and record the actual results in `SUBMISSION.md`.

## Architecture

See [`ARCHITECTURE.md`](./ARCHITECTURE.md) for the data model, access rules, autosave behavior, and scope tradeoffs. See [`AI_WORKFLOW.md`](./AI_WORKFLOW.md) for a note that must be edited to accurately describe the tools and checks actually used.
