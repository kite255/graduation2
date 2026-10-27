# Graduation2 Phase 3 — PostgreSQL + local gallery API

This patch is intended for the local **graduation2** Vite project, not the older repository.

## Install patch
Copy the patch files into the project root. Preserve your existing homepage styles and other files. The `src/App.tsx` in this patch is based on the homepage ZIP provided earlier.

## Database
Copy `.env.example` to `.env` in the project root, then choose a local password. Copy `backend/.env.example` to `backend/.env` and use the *same* database password in DATABASE_URL (URL-encode special characters).

`docker compose up -d postgres`

## API
`cd backend && npm install && npm run db:migrate && npm run dev`

Check `http://localhost:3001/api/health` → `{"status":"ok"}`.

## React frontend
In a second terminal: `npm run dev`. Website: http://localhost:6001

## Test an image upload
Use a private local terminal (never paste your real token into a screenshot):
`curl -X POST http://localhost:3001/api/admin/gallery -H "Authorization: Bearer YOUR_TOKEN" -F "image=@/path/to/photo.jpg" -F "alt=Graduation celebration"`

The image is written to the `uploads/gallery/` folder on disk and its metadata is saved in PostgreSQL.

## Safety and limits
- The admin token is only a local bootstrap API authentication method, not a finished admin login UI. Never put it into browser-facing `VITE_` variables.
- Database volume persists while Docker volume exists; back up both DB and uploads off-server in production.
- `.env` and `backend/.env` must be gitignored.
- The project's existing image placeholders stay visible if the API has no gallery images.
- A real production migration system and robust authorization are still needed before Coolify deployment.
