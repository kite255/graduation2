# Docker deployment patch — Graduation Website 2.0

Copy Dockerfile, docker-compose.yml, nginx.conf, .dockerignore and backend/Dockerfile + backend/.dockerignore into the **existing** graduation2 folder. Do not delete the existing source, database, uploads, or Docker volumes.

1. Replace `backend/src/db.js` with the contents of `backend/src-db-replacement.js` from this ZIP (file is intentionally named differently to avoid overwriting your original without inspection).
2. In `backend/src/server.js`, replace its `app.listen(port, '127.0.0.1',` with `app.listen(port, process.env.HOST || '127.0.0.1',` so Docker can reach Express on the internal network.
3. Edit your root `.env` (never commit it) to include both:
   - `POSTGRES_PASSWORD=<your existing database password>` (changing password in `.env` does NOT reset the password of an existing PostgreSQL volume)
   - `ADMIN_API_TOKEN=<long random secret>`
4. Check `.gitignore` includes `.env`, `backend/.env`, `uploads/` and `node_modules/`.
5. `docker compose config` then `docker compose up -d --build`
6. `docker compose exec backend node src/migrate.js` to create the gallery table if it was not previously created.
7. `curl http://localhost:8080/api/health` and `curl http://localhost:8080/api/gallery`.
8. Visit http://localhost:8080. Local Vite dev may still run separately at port 6001.

Important: existing uploads in `./uploads` are NOT migrated into the Docker named volume automatically. If there are actual uploads, copy them into `graduation2_uploads` using a one-off container before switching and verify both file paths and metadata. Do not remove the original directory until checked.

On Coolify, publish frontend's port 80 through its proxy, not the localhost-only 8080 mapping. Remove local-only `ports:` from frontend and postgres for deployment via the Coolify proxy and configure the frontend service's domain. Never publish port 5432 or the backend port publicly. Ensure Coolify retains both named volumes and schedule off-server backups.
