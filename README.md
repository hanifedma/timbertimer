# 🌲 TimberTimer

**Grow a forest while you focus.** A free, minimalist focus timer that plants a tree for every focus session, keeps a to‑do list, and (optionally) syncs across your devices with Google.

Live: **https://hanifedma.github.io/timbertimer/**

No build step — it's a static site (HTML/CSS/vanilla JS) that also works offline as an installable PWA.

## Features

- **Countdown & stopwatch** focus modes; finishing a countdown early records an abandoned session.
- **Grow a tree per session** — pick from several species; the name remembers your choice, and past sessions keep the tree they were planted with.
- **Forest visualizer** — today / weekly / monthly views of the trees you've grown.
- **Separate rest stopwatch** that doesn't create records.
- **To‑do list** with drag‑to‑reorder, synced when signed in.
- **Editable, searchable focus history** with today/total stats.
- **Sound cues** with an adjustable volume, and remaining time shown in the browser tab.
- **Light / dark themes** (dark by default), remembered per device.
- **Works offline**, installable, cross‑device active‑timer + records sync for signed‑in users.

## Run locally

Open `index.html` in a browser, or serve the folder:

```bash
python3 -m http.server 4173
# then visit http://localhost:4173
```

Local storage works with zero setup. Google sync is optional (see below).

## Supabase setup (optional — for cross‑device sync)

GitHub Pages serves static files only, so cross‑device sync uses Supabase for the database and auth.

1. Create a Supabase project.
2. Open **SQL Editor**, paste all of `docs/supabase-schema.sql`, and **Run** it (creates the tables + per‑user row‑level security).
3. **Project Settings → API**: copy the Project URL and the anon/publishable key.
4. Put them in `src/supabase-config.js`:

```js
window.TIMBERTIMER_SUPABASE = {
  url: "https://your-project.supabase.co",
  anonKey: "your-anon-or-publishable-key",
};
```

The anon/publishable key is safe in a browser app: the SQL policies check `auth.uid() = user_id`, so each signed‑in user can only read and write their own rows.

## Google login

Google OAuth is the only sign‑in method (no email/password form).

1. Supabase → **Authentication → Providers** → enable **Google**; note the callback URL it shows.
2. Google Cloud Console → create an **OAuth web client**:
   - **Authorized JavaScript origins**: your app origin (e.g. `https://hanifedma.github.io`, and `http://localhost:4173` for local).
   - **Authorized redirect URI**: the Supabase callback URL from step 1.
3. Paste the Google Client ID + Secret into Supabase's Google provider settings.
4. Supabase → **Authentication → URL Configuration**: set **Site URL** to your deployed URL and add `<your-url>/**` (plus `http://localhost:4173/**`) to **Redirect URLs**.

## Deploy on GitHub Pages

1. Push this folder to a repository's `main` branch.
2. **Settings → Pages** → Source: *Deploy from a branch* → `main` / `/ (root)` → Save.
3. Your app is served at `https://YOUR_USERNAME.github.io/YOUR_REPOSITORY/`.
4. Add that URL to Supabase's allowed Site/Redirect URLs.

> Note: canonical/Open Graph URLs in `index.html`, `robots.txt`, and `sitemap.xml` point at `https://hanifedma.github.io/timbertimer/`. If you deploy elsewhere (e.g. a custom domain), update those URLs.

## Project layout

- `index.html` — app shell + SEO/Open Graph metadata.
- `404.html` — themed not‑found page.
- `src/app.js` — timer, records, notes, themes, local storage, Supabase integration.
- `src/styles.css` — responsive light/dark UI.
- `src/supabase-config.js` — Supabase connection settings.
- `docs/supabase-schema.sql` — database tables + per‑user RLS policies.
- `service-worker.js` — offline PWA cache.
- `manifest.webmanifest` — install metadata.
- `robots.txt`, `sitemap.xml` — SEO.
- `assets/` — app icons and the Open Graph share image.
