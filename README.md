# Pitch AI Backend

Production backend for presentation/reel generation on Supabase.

## Run
1. Copy `.env.example` to `.env` and set values.
2. Apply SQL in `db/schema.sql` on Supabase.
3. `npm start`

## Endpoints
- `POST /generate-presentation`
- `POST /generate-reels`
- `POST /slides/update`
- `GET /slides/subscribe?presentationId=`
- `GET /export-ppt?presentationId=`
- `GET /admin/users`
- `GET /admin/usage`
- `GET /admin/revenue`


## Website design preview
Open `web/index.html` in browser to view the initial product website UI before auth wiring.
