# Add PostgreSQL on Render (persistent user data)

SQLite on a Render **Web Service** lives on an **ephemeral disk**: redeploys or restarts can wipe it. For **accounts and saved trips** that survive deploys, attach Render Postgres.

## Steps in the Render dashboard

1. Open [dashboard.render.com](https://dashboard.render.com) and select your workspace.
2. Click **New +** (top right) → **PostgreSQL**.
3. Pick a **name** (e.g. `wanderlust-db`), **region** (same region as your Django service helps latency), database **name** / **user** (defaults are fine), then **instance type** (choose what fits your billing plan).
4. Click **Create Database**.
5. After it provisions, open the database → **Connections**.
6. Copy **Internal Database URL** (preferred if Django runs on Render in the same region) or **External Database URL**.

## Wire Django to Postgres

1. Open your **`wanderlust-backend`** web service → **Environment**.
2. Add **`DATABASE_URL`** = paste the URL you copied (Render often names the variable suggestion `DATABASE_URL`).
3. Click **Save Changes**. Render will redeploy the backend.
4. Confirm logs show **`Applying planner...`** migrations (your `buildCommand` already runs `migrate`).

The app’s `settings.py` uses **`dj-database-url`**: when **`DATABASE_URL`** is set, Django uses Postgres; otherwise it uses local SQLite.

## Trouble finding “PostgreSQL”?

- It is under **New +**, not inside the Blueprint screen.
- You can also go **Dashboard → New → PostgreSQL** from any page.

## Optional: link DB in a Blueprint later

You can add a `databases:` block to `render.yaml` once you’re comfortable with Render’s current Postgres pricing and naming—until then, creating the DB in the UI and setting **`DATABASE_URL`** manually is the most straightforward.
