# Submission checklist

This file details the deliverables, verification results, and reviewer instructions for Ajaia Docs.

- [x] Source code repository: Included in submission directory
- [ ] Live product: [Add your deployed Vercel URL here]
- [x] README with local setup instructions: `README.md`
- [x] Architecture note: `ARCHITECTURE.md`
- [x] AI workflow note: `AI_WORKFLOW.md`
- [x] Automated unit tests: `tests/document-content.test.ts` (4 tests passing)
- [x] Test command results recorded below
- [ ] Walkthrough video: `WALKTHROUGH_URL.txt` [Add your 3-5 min video link]
- [x] Reviewer instructions & test account details provided below

---

## Verification results

- `npm run test`: **Passed** (4/4 tests passed in Vitest: text import, file extension validation, plain text export, and Markdown export)
- `npm run lint`: **Passed** (0 errors, 0 warnings across all TypeScript and React files with ESLint 9)
- `npm run build`: **Passed** (Next.js 15 production build compiled and statically optimized successfully)
- Live Supabase two-account sharing: **Verified** (Authenticated session established, documents load and autosave to PostgreSQL, shares enforced by RLS)
- Document deletion: **Verified** (Confirmed with deletion modal, database deletion cascade, and active document transition)
- File Import / Export: **Verified** (Import `.txt`/`.md` up to 1MB; Export `.md` and `.txt`)

---

## Reviewer Guide & Account Instructions

### Option A: Local Demo Mode (Zero Configuration)
If you wish to test the product immediately without configuring Supabase:
1. Run `npm install` and `npm run dev`
2. Open `http://localhost:3000`
3. The app will launch in **Local Demo Mode** with seeded documents (`Welcome to Ajaia`, `Product brief — Q4`).
4. You can use the **"Switch demo user"** button in the sidebar to toggle between Owner (`Sarang Nair`) and Collaborator (`Aditi Menon`) to inspect owned vs. shared views.

### Option B: Authenticated Mode with Live Supabase
1. Ensure `.env.local` has your Supabase URL and Publishable Key:
   ```dotenv
   NEXT_PUBLIC_SUPABASE_URL=https://pvzfvffnxhksnvsuihuq.supabase.co
   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_2LMFUzfQtnus4O1DhrYn2w_b0QDSRQq
   ```
2. The initial schema migration (`supabase/migrations/001_initial_schema.sql`) sets up profiles, documents, shares, RLS, and secure RPCs.
3. Test accounts:
   - Account 1 (Owner): `sarangsnair1621@gmail.com`
   - Account 2 (Collaborator): Sign up with any email or use a second test account to test sharing by email.
4. When sharing a document, enter the second user's exact email address and select **Viewer** or **Editor** permission.

---

## What is Working

1. **Document Lifecycle & Editing**:
   - Create new document (`⌘ N` or button)
   - Rename document with automatic debounce save
   - Rich-text editor (TipTap): Bold, Italic, Underline, Headings (H1/H2/H3), Bullet/Numbered lists, Blockquotes, Horizontal rules
   - Delete document: Topbar action, sidebar item hover action, and `...` menu, with permanent deletion warning modal and save-timer cleanup
2. **File Handling**:
   - Import `.txt` and `.md` files (up to 1 MB limit enforced with error notices)
   - Export documents as formatted `.md` (Markdown) or `.txt` (Plain text)
3. **Sharing & Access Boundaries**:
   - Explicit distinction between owned and shared documents in sidebar and metadata
   - Share by email with Viewer or Editor permissions via secure database RPC (`share_document_by_email`)
   - Revoke access in real-time
   - Viewer mode locks document editing and prevents updates via RLS
4. **Persistence**:
   - Autosave with debounced timer (650ms)
   - Visual status indicators (`All changes saved`, `Saving…`, `Save failed`, `Demo · not saved`)
   - PostgreSQL RLS enforces user-level data isolation

---

## What Would Be Built Next (With Another 2-4 Hours)

1. **Real-Time Cursor & Presence Indicators**: Use Supabase Realtime broadcast channels to display who is currently viewing or editing the document.
2. **Rich Markdown AST Parser on Import**: Convert Markdown syntax (`#`, `-`, `**`) directly into TipTap heading/list/bold nodes rather than plain text paragraphs.
3. **In-Document Comments & Highlights**: Allow users to highlight phrases and attach discussion comment threads.
4. **Version History Snapshotting**: Store document snapshot revisions on major saves to allow viewing and restoring previous document states.
