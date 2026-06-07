# Canopy Focus

A minimalist jungle focus timer with editable records, local browser storage, and optional Supabase sync with Google accounts.

## Run Locally

Open `index.html` in a browser, or serve the folder:

```bash
python3 -m http.server 4173
```

Then visit `http://localhost:4173`.

## What Works Now

- Focus timer with one Finish action; finishing early records an abandoned session.
- Separate rest stopwatch that does not create records.
- Growing plant visual during a session.
- Weekly forest visualizer with one tree per completed session.
- Remembered session name between visits.
- Stable tree species based on session name.
- Editable and deletable focus history.
- Today and total stats.
- Local browser storage without setup.
- Optional Supabase auth/database sync with Google login.
- Cross-device active focus timer sync for signed-in users.
- PWA shell for installable browser use after deployment.

## Supabase Setup

GitHub Pages hosts static files. It does not run a database. For cross-device records and active focus timers, use Supabase as the database and auth provider.

1. Create a Supabase project.
2. In Supabase, open SQL Editor.
3. Open `docs/supabase-schema.sql`.
4. Run the SQL.
5. Go to Project Settings, then API.
6. Copy the Project URL and anon/public key.
7. Edit `src/supabase-config.js`:

```js
window.CANOPY_FOCUS_SUPABASE = {
  url: "https://your-project.supabase.co",
  anonKey: "your-anon-public-key",
};
```

The anon key is safe to place in a browser app when row-level security is configured correctly. The SQL file restricts each signed-in user to their own focus records and active timer.

## Google Login

The app uses Google OAuth only. New users are created by signing in with Google; there is no email/password form.

1. In Supabase, go to Authentication, then Providers.
2. Enable Google.
3. Disable the Email provider if you want Google to be the only backend login method.
4. Create a Google OAuth web client in Google Cloud.
5. In Google Cloud, add your app origin under Authorized JavaScript origins.
6. In Google Cloud, add the Supabase callback URL shown on Supabase's Google provider page under Authorized redirect URIs.
7. Put the Google Client ID and Client Secret into the Supabase Google provider settings.
8. In Supabase Authentication URL Configuration, set Site URL to your deployed app URL and add `http://localhost:4173/**` plus your GitHub Pages URL to Redirect URLs.

Each signed-in Google user only reads and writes their own records because the SQL policies check `auth.uid() = user_id`.

## Deploy on GitHub Pages

1. Create a GitHub repository.
2. Upload this folder to the repository root.
3. Commit and push.
4. In GitHub, go to Settings, then Pages.
5. Set Source to "Deploy from a branch".
6. Choose `main` and `/root`.
7. Save.

Your app will be available at:

```text
https://YOUR_USERNAME.github.io/YOUR_REPOSITORY/
```

In Supabase Authentication URL settings, add that URL as an allowed site/redirect URL.

## Files

- `index.html`: app shell.
- `src/app.js`: timer, records, local storage, Supabase integration.
- `src/styles.css`: responsive jungle UI.
- `src/supabase-config.js`: Supabase connection settings.
- `docs/supabase-schema.sql`: database table and per-user RLS policies.
- `service-worker.js`: local PWA cache.
- `assets/jungle-focus-bg.webp`: generated jungle background used by the app.
