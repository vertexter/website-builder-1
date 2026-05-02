# Hosting Pitch AI Backend

## Option A: Render (fastest)
1. Push repo to GitHub.
2. In Render, create **New Web Service** and connect repo.
3. Use `deploy.render.yaml` or set manually:
   - Build: `npm install --omit=dev`
   - Start: `npm start`
4. Add env vars from `.env.example`.
5. Deploy and verify `GET /health`.

## Option B: Docker
```bash
docker build -t pitch-ai-backend .
docker run -p 3000:3000 --env-file .env pitch-ai-backend
```
Then check: `curl http://localhost:3000/health`

## Required Supabase setup
- Run `db/schema.sql` in Supabase SQL editor.
- Enable Google OAuth in Supabase Auth.
- Set your frontend callback URLs.
