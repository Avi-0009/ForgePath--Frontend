# ForgePath Frontend

React and TypeScript client for ForgePath, a privately hosted AI-assisted software engineering application. Users can select local project folders, preview and upload permitted source snapshots, investigate a codebase, review findings, approve plans and patch proposals, and export verified diffs.

Built with React 19, TypeScript, Vite 8, Tailwind CSS 4, Zustand, Ky, and React Router.

## What is implemented

- Signup, login, refresh-token recovery, server-revoked logout, full-name/username updates, email verification, and password reset.
- Protected routes with account-isolated client state.
- Local folder selection through the File System Access API.
- Bounded local snapshot preview before source upload.
- User-owned project activation and snapshot status.
- Persistent previous-project library with account-scoped session reopening.
- Initial review progress and finding-to-task promotion.
- Code search, reference checks, semantic indexing, investigations, and conversations.
- Snapshot-pinned task plans and patch proposals.
- Explicit decisions with verified `.diff` downloads and confirmed browser-local application.
- Current-snapshot tasks separated from historical records.
- Applied-patch feedback after a changed folder is uploaded again.
- Encrypted personal AI-provider configuration through Settings.
- Responsive UI, accessible native controls, and consistent dropdown alignment.

## Requirements

- Node.js `^20.19.0` or `>=22.12.0` (required by the locked Vite version).
- npm.
- A running `ForgePath--Backend` API.
- A Chromium-based browser for local folder selection in a secure context.

## Local setup

### 1. Install locked dependencies

```powershell
npm ci
```

`npm ci` uses `package-lock.json` and fails instead of silently rewriting the dependency graph.

### 2. Start the backend

Start `ForgePath--Backend` on `http://127.0.0.1:8000` and apply its Alembic migrations first. Its README covers PostgreSQL, secrets, snapshot storage, and mail configuration.

### 3. Start Vite

```powershell
npm run dev
```

Open the HTTPS URL printed by Vite, normally `https://localhost:5173`.

The default API base is `/api/v1`. Vite proxies `/api` to `http://127.0.0.1:8000`, so the standard local setup needs no frontend environment file.

## API configuration

To call a separately hosted backend, create a local `.env`:

```dotenv
VITE_API_BASE_URL=https://forgepath-api.example.com/api/v1
```

Only `VITE_` variables are exposed to browser code. Never put provider keys, database credentials, JWT secrets, encryption keys, or other private values in a frontend environment file.

For a direct API URL, configure the backend's `CORS_ORIGINS` for the exact frontend origin and serve both applications over HTTPS.

## Commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the HTTPS development server on port `5173`. |
| `npm run build` | Type-check and create optimized assets. |
| `npm run lint` | Run ESLint across TypeScript and React files. |
| `npm test` | Run session/privacy regression tests. |
| `npm run preview` | Preview the production build. |

Run all frontend checks before handing off changes:

```powershell
npm run build
npm run lint
npm test
```

## Application routes

Public-only routes redirect authenticated users into the application. Every other page is wrapped by `RequireAuth` and requires an authenticated user, access token, and user record.

| Route | Purpose |
| --- | --- |
| `/auth` | Signup and login. |
| `/forgot-password` | Password reset and OTP flow. |
| `/` | Authenticated dashboard. |
| `/repositories` | Reopen saved project sessions, reconnect folders, preview snapshots, and activate projects. |
| `/tasks` | Current tasks, history, plans, proposals, exports. |
| `/runs` | Agent workflow history. |
| `/intel` | Code Intelligence and semantic indexing. |
| `/investigation` | Findings and context-aware investigation. |
| `/patch-review` | Patch review workspace. |
| `/test-lab` | Test execution for supported local workflows. |
| `/approvals` | Agent approval checkpoints. |
| `/settings` | Runtime and encrypted personal-provider settings. |
| `/workspace` | Legacy server-local workspace browser. |
| `/profile` | Update full name and username, verify email, and sign out. |

## Browser-project workflow

```text
Open local folder
  -> scan permitted files in the browser
  -> preview counts and skipped files
  -> confirm upload
  -> store immutable private snapshot
  -> queue initial review
  -> save finding as task
  -> approve and generate plan
  -> generate and review patch proposal
  -> approve the proposal
  -> explicitly confirm local application
  -> verify the exact connected folder and source version
  -> write one existing file
  -> upload a new snapshot and mark the exact proposal applied
```

Folder selection does not grant the backend arbitrary disk access. The browser reads only the selected directory after a user gesture, filters locally, and uploads permitted text files. Remembered folder handles are stored in IndexedDB and still require browser permission when reopened.

## Client state and privacy

- Authentication and private workspace state are scoped to the current user.
- React Query caches are recreated per authenticated account and cleared when that account scope unmounts.
- Private workspace results are not persisted to local storage.
- Logout and direct account switches clear private state and invalidate outstanding requests.
- Every user-facing sign-out action asks the backend to revoke its HTTP-only refresh session before clearing local authentication state.
- Late responses from a previous session cannot restore cleared data.
- Local storage contains only the current user's active project identifier.
- Backend-owned project sessions remain discoverable across browsers; browser folder handles remain device-local in IndexedDB.
- IndexedDB may contain browser folder handles, not source contents or API keys.
- Remembered folder records must match both the authenticated user ID and the user/project ownership key before they are displayed.
- Provider keys exist only in the password input until submission; the frontend never persists them and the backend never returns them.
- Authenticated API calls perform at most one account-safe token refresh and never retry under a different account.
- Profile updates are normalized and validated by the backend; email changes are intentionally excluded so verification cannot be bypassed.

## Personal AI providers

Settings supports:

- NVIDIA
- OpenAI
- Hugging Face

The backend encrypts saved keys. The UI receives only provider/model metadata and `has_api_key`. Changing providers requires a new key. Connection testing requires confirmation because it sends a small request that may be billable.

Selecting ForgePath AI while a personal key exists asks for confirmation and removes the personal configuration, ensuring the displayed mode matches backend runtime behavior.

## Project structure

```text
src/
  Api/                   typed HTTP clients and token-refresh wrapper
  components/            project, review, layout, and shared UI
  layouts/               authenticated shell and dashboard
  pages/                 route-level screens
  store/                 Zustand auth/workspace state and project selection
  index.css              Tailwind theme and shared controls
tests/
  workspace-session.test.mjs
```

### API conventions

- Use `apiClient` from `src/Api/Auth.ts`.
- Wrap authenticated calls with `requestWithTokenRefresh`.
- Encode dynamic path identifiers.
- Keep response types aligned with backend Pydantic models.
- Never log or persist tokens, source contents, provider keys, or credential-bearing errors.
- Treat `409` as an authoritative stale snapshot/version conflict and refresh state.

### UI conventions

- Reuse tokens and component classes from `src/index.css`.
- Keep native controls semantic and keyboard accessible.
- Disable consequential controls while loading or submitting.
- Require confirmation before paid calls, credential deletion, and consequential actions.
- Guard asynchronous updates against logout, account changes, project changes, and stale generations.

## Security model

The browser is not an authorization boundary. The backend revalidates ownership, snapshots, hashes, task state, and approvals for every consequential operation.

Frontend safeguards include:

- Public/protected route separation.
- Bearer tokens attached through authenticated helpers.
- Refresh cookies sent with `credentials: include`.
- No automatic Ky retries for state-changing requests.
- Snapshot preview and limits before upload.
- Clear warnings for potentially paid provider calls.
- Browser-project patches require approval, a second explicit confirmation, write permission, full-snapshot matching, and exact source/proposal hashes before one existing file is replaced.

Never embed secrets in a Vite build, expose development servers to untrusted networks, or treat hidden UI controls as authorization.

## Browser compatibility

Local folder selection uses `window.showDirectoryPicker`. Use a Chromium-based browser in a secure context (`https://` or a recognized local-development context). If unsupported, ForgePath shows an availability message instead of attempting a server-filesystem fallback.

Other pages may work without this API, but complete project activation will not.

## Troubleshooting

### API calls return 404 during development

Leave `VITE_API_BASE_URL` unset when using the included proxy. Confirm the backend listens on `127.0.0.1:8000` and routes begin with `/api/v1`.

### Login succeeds but refresh fails

Trusted local HTTP backend development may require `REFRESH_COOKIE_SECURE=false`. Restore secure cookies for HTTPS deployment.

### Folder selection is unavailable

Use a Chromium-based browser, open the HTTPS Vite URL, and select the folder from a direct button click. Browser permission prompts require a user gesture.

### An old task has no action buttons

Tasks are pinned to their source snapshot. `Show history` displays older tasks, but historical actions are intentionally disabled. Create new work from the current review.

### A saved provider cannot be tested

Save provider/model/key changes first. Testing uses the backend's saved encrypted configuration, not unsaved form values.

### Build reports a large chunk warning

The current production build succeeds but reports a bundle-size warning. Route-level code splitting is a future optimization; do not suppress the warning without measuring the bundle.

## Deployment

1. Run `npm ci` and `npm run build` in CI.
2. Serve `dist/` from an HTTPS static host or reverse proxy.
3. Route the API base to ForgePath Backend.
4. Configure SPA fallback to `index.html`.
5. Apply a restrictive Content Security Policy compatible with deployed assets and the API origin.
6. Keep source maps and logs free of tokens, private source, and provider credentials.

## Related repository

FastAPI services, migrations, storage rules, and security tests live in `ForgePath--Backend`.
