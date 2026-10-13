# Submission checklist

This file details the deliverables, verification results, and reviewer instructions for Ajaia Docs.

- [x] Source code repository: Included in submission directory
- [x] Live product: https://ajaia-docs-starter-lime.vercel.app/
- [x] README with local setup instructions: `README.md`
- [x] Architecture note: `ARCHITECTURE.md`
- [x] AI workflow note: `AI_WORKFLOW.md`
- [x] Automated unit tests: `tests/document-content.test.ts` (5 tests passing)
- [x] Test command results recorded below
- [x] Walkthrough video: `WALKTHROUGH_URL.txt`
- [x] Reviewer instructions & test account details provided below

---

## Verification results

- `npm run test`: **Passed** (5/5 tests passed in Vitest: text import, file extension validation, plain text export, Markdown export, and empty document handling)
- `npm run lint`: **Passed** (0 errors, 0 warnings across all TypeScript and React files with ESLint 9)
- `npm run build`: **Passed** (Next.js 15 production build compiled and statically optimized successfully with 0 errors)
- Live Supabase two-account sharing: **Verified** (Authenticated session established, documents load and autosave to PostgreSQL, shares enforced by RLS)
- Document deletion: **Verified** (Confirmed with deletion modal, database deletion cascade, and active document transition)
- User account deletion: **Verified** (Confirmed with warning modal, `delete_user_account` RPC / cascading clean up, session termination, and redirect with confirmation banner)
- Real-time collaboration indicators: **Verified** (Collaborator presence avatar stack, active status dot, live pulsating active count pill backed by Supabase Realtime)
- Commenting and suggestion mode: **Verified** (Slide-over panel, open/resolved filters, comment card threads, resolve/unresolve, delete, and suggestion mode indicator)
- Document version history: **Verified** (Milestone snapshot creation, timeline sidebar, content preview, and one-click rollback/restore)
- Export to PDF or Markdown: **Verified** (Dedicated `@media print` PDF export, plus client-side formatted Markdown `.md` and plain text `.txt` exports)
- Role-based sharing permissions: **Verified** (4 distinct roles: Editor, Commenter, Viewer, Admin with UI badge and editing restrictions)

---

## Reviewer Guide & Account Instructions

### Option A: Local Demo Mode (Zero Configuration)
If you wish to test the product immediately without configuring Supabase:
1. Run `npm install` and `npm run dev`
2. Open `http://localhost:3000`
3. The app will launch in **Local Demo Mode** with seeded documents (`Welcome to Ajaia`, `Product brief — Q4`), pre-populated comments, version snapshots, and live collaborator presence indicators.
4. You can use the **"Switch demo user"** button in the sidebar to toggle between Owner (`Sarang Nair`) and Collaborator (`Aditi Menon`) to inspect owned vs. shared views.

### Option B: Authenticated Mode with Live Supabase
1. Ensure `.env.local` has your Supabase URL and Publishable Key:
   ```dotenv
   NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your_supabase_publishable_key
   ```
2. The initial schema migration (`supabase/migrations/001_initial_schema.sql`) sets up profiles, documents, shares, comments, versions, RLS, and secure RPCs.
3. Test accounts:
   - Account 1 (Owner): Sign in or register with your primary test account
   - Account 2 (Collaborator): Sign up with a second test account in a separate browser/window to verify sharing
4. When sharing a document, enter the second user's exact email address and select **Editor**, **Commenter**, **Viewer**, or **Admin** permission.

---

## What is Working

1. **Document Lifecycle & Editing**:
   - Create new document (`⌘ N` or button)
   - Rename document with automatic debounce save (650ms)
   - Rich-text editor (TipTap): Bold, Italic, Underline, Strikethrough, Headings (H1/H2/H3), Code blocks, Bullet/Numbered lists, Blockquotes, Horizontal rules
   - Delete document: Topbar action, sidebar item hover action, and `...` menu, with permanent deletion warning modal and save-timer cleanup
2. **Real-time Collaboration Indicators**:
   - Live presence avatar stack in topbar with colored border rings and initials
   - Active pulsating badge (`2 active`) showing live participants
   - Status tooltips indicating whether collaborators are currently viewing or editing
   - Powered by Supabase Realtime Presence channel (`presence:doc:<id>`) with demo mode fallback
3. **Commenting & Suggestion Mode**:
   - Dedicated slide-over Comments Panel with unread count badge in topbar
   - Add comments with keyboard shortcut (`⌘ + Enter`)
   - Filter tabs: Open, Resolved, and All comments
   - One-click Resolve/Reopen and Delete comment actions
   - Suggestion mode toggle in topbar with visual mode indicator
4. **Document Version History**:
   - Version history modal with snapshot timeline
   - Author metadata, timestamp, and word count statistics
   - Content preview pane for reviewing past states
   - One-click "Restore this version" to roll back cleanly
   - "Snapshot current milestone" button to save explicit checkpoints
5. **File Handling & Export**:
   - Import `.txt` and `.md` files (up to 1 MB limit enforced with error notices)
   - Export documents as formatted `.md` (Markdown) or `.txt` (Plain text)
   - Export as PDF via high-fidelity print stylesheet (`@media print`) that removes toolbars and renders a clean printable page
6. **Role-based Sharing Permissions**:
   - 4 granular permission roles:
     - **Editor**: Can edit and format document content
     - **Commenter**: Can review and leave comments/suggestions; text editing is disabled with an explanatory banner
     - **Viewer**: Read-only view
     - **Admin**: Full access, including editing and managing collaborator shares
   - Role badges displayed in document metadata (`SHARED · COMMENTER`, `SHARED · EDITOR`, etc.)
   - Enforced by PostgreSQL RLS security helper functions (`can_comment_document`, `can_manage_document`, `can_edit_document`)
7. **Persistence & Account Management**:
   - Autosave with debounced timer (650ms)
   - Visual status indicators (`All changes saved`, `Saving…`, `Save failed`, `Demo · not saved`)
   - PostgreSQL RLS enforces user-level data isolation
   - User account deletion: permanent account deletion via secure RPC (`delete_user_account`), cascading across documents and shares with confirmation modal
