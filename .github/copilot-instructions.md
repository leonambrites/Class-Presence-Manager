### Copilot instructions for Class-Presence-Manager

Keep suggestions focused and actionable for this repo (a small React/Vite frontend with an optional Express+SQLite backend). When you make code changes, prefer minimal, targeted edits and preserve UI behavior.

Quick architecture summary
- Frontend: React + Vite. Entrypoints: `index.tsx`, `App.tsx`. UI components live in `components/` (e.g. `Attendance.tsx`, `Students.tsx`, `Dashboard.tsx`). Static initial data lives in `constants.ts` and `data/*.json`.
- Backend (optional): `backend/` contains an Express server scaffold and a small SQLite helper at `backend/src/db.ts`. Currently `backend/src/server.ts` and `backend/src/routes/*.ts` are stubs or sometimes empty — treat backend work as WIP and avoid breaking frontend-only flows.

Important patterns & conventions
- Data model: see `types.ts`. Student records use string `id`, `class` (one of `CLASS_NAMES` in `constants.ts`), `type` is `StudentType` ("Membro" or "Visitante"), and `attendance` is an array of objects { date: string (YYYY-MM-DD), present: boolean, dismissedBy?: string, day?: 'Sunday'|'Wednesday' }.
- Business rule: classes only happen on Sundays (day 0) and Wednesdays (day 3). Many UI flows validate dates against these days (see `getDayOfWeek` / `getDayFromDate` patterns in `App.tsx` / `Attendance.tsx`). Preserve or explicitly update this rule when editing attendance logic.
- IDs: frontend currently uses string timestamps (String(Date.now())) for new students. If you add backend persistence (SQLite), convert IDs to numbers or map appropriately but keep compatibility with existing fixtures in `constants.ts`.
- Local data source: `constants.ts` contains authoritative initial data used by the UI. When changing shape/field names, update both `types.ts` and `constants.ts` (and any components that access those fields).

Developer workflows (how to run & debug)
- Frontend (Vite):
  - Install: `npm install` (root)
  - Run dev server: `npm run dev` (project uses Vite; `vite.config.ts` loads env variables like `GEMINI_API_KEY`)
  - Build: `npm run build` or check `package.json` script (root project currently uses Parcel scripts; confirm before changing)
- Backend (Express + SQLite): located in `backend/`.
  - Install and run: `cd backend && npm install` then `npm run dev` (uses `ts-node-dev --respawn` to run `src/server.ts`).
  - DB helper: `backend/src/db.ts` exports `initDb()` which opens `./database.sqlite` and creates a `students` table. `server.ts` and route files are currently empty—if you implement routes, wire them under `backend/src/server.ts` and reuse `initDb()`.

Files to inspect when working on features
- UI / state & flows: `App.tsx`, `components/Attendance.tsx`, `components/Students.tsx`, `components/StudentForm.tsx`, `components/Modal.tsx`.
- Data shapes & initial fixtures: `types.ts`, `constants.ts`, `data/*.json`.
- Backend entrypoints: `backend/src/db.ts`, `backend/src/server.ts`, `backend/src/routes/*`.

Suggested agent behavior
- When editing UI components, keep changes small and run the dev server locally to verify behaviour.
- Prefer to update `types.ts` first when adding fields; then update fixtures in `constants.ts` and usages in components.
- When adding backend endpoints, add matching fetch calls or a small API client in the frontend only if you can run the backend locally. Keep fallback to in-memory `constants.ts` fixtures so the UI still works without the backend.

Examples from the codebase
- Date validation: `getDayOfWeek(dateString)` in `App.tsx` — returns only 'Sunday' or 'Wednesday'.
- Marking presence: `handleMarkPresence(studentId, date)` (in `App.tsx`) updates student attendance in-place and shows a notification.
- Initial data: `INITIAL_STUDENTS` in `constants.ts` contains the canonical sample dataset and is used by `App.tsx` as the starting state.

When committing changes
- Keep commits focused and include which area was affected (UI, types, backend). E.g. `feat(attendance): allow dismissal reason in attendance records`.

If something is unclear
- Ask for which environment the change should target (frontend-only vs full-stack). Note that backend endpoints are not fully implemented; confirm whether to implement them or keep using the in-memory fixtures.

If you have feedback on this guidance, I'll update the file.
