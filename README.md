# PPL Lean Bulk — deploy with screenshot auto-fill

This folder is your whole app PLUS the little server function that reads screenshots with Gemini.

## What's inside
- `index.html` — the app (same one you've been using).
- `netlify/functions/extract.js` — the private function that holds your Gemini key and reads screenshots.
- `netlify.toml` — tells Netlify where the function lives.

## One-time deploy (replaces your drag-and-drop single file)

You've been dragging just the HTML onto Netlify. Now drag the **whole folder** instead, so the function deploys with it.

1. Make sure your Gemini key is saved in Netlify:
   **Site configuration → Environment variables → `GEMINI_API_KEY`** = your `AIza...` key. (You did this already.)
2. Go to your site in Netlify → **Deploys** tab.
3. Drag this entire `ppl-app` folder onto the deploy drop zone (not just the HTML).
4. Wait for the deploy to finish. Netlify will detect the function automatically.

That's it. Open your site — the "Upload screenshot" buttons in **Sleep** and in each **History** session's edit panel will now read the numbers for you.

## How to use it
- **Sleep:** tap "Upload Sleep Score screenshot to auto-fill", pick the screenshot, wait a second — the score, hours, bedtime, and vitals fill in. Check them, then "Save night".
- **History:** open a session → "✎ Edit date, time & watch stats" → "Upload Apple Watch screenshot" → it fills Time / Active cal / Avg HR → Save.

## If it doesn't work
- "Server is missing GEMINI_API_KEY" → the env var name is wrong or not saved; it must be exactly `GEMINI_API_KEY`, scoped to include Functions, then redeploy.
- "Could not read numbers from that screenshot" → the image was unclear or it's a different screen; just type the numbers in manually (still works).
- Nothing happens on a phone with no internet → the AI read needs a connection; manual entry works offline.

## Cost / privacy
- Gemini's free tier is plenty for a couple of screenshots a day.
- Keep billing OFF on the Gemini key so there's no card to overcharge — worst case you hit the free daily limit.
- Free-tier images may be used by Google to improve their models. Fine for gym/sleep numbers; if you'd rather keep them private, just type the numbers instead of uploading.

## Pass-code sync (optional — let trusted people use your Supabase)

Add these in Netlify → Site configuration → Environment variables, then redeploy:

- `SYNC_PASSCODE` — FULL-access pass code (read + write). Share only with trusted people/devices.
- `SYNC_PASSCODE_READ` — READ-ONLY pass code. People with this can view the shared data but cannot add, edit, or delete.
- `SHARED_SUPABASE_URL` — your Supabase project URL.
- `SHARED_SUPABASE_KEY` — your Supabase anon / publishable key (the public-safe one).
- `SHARED_SYNC_CODE` — optional. The shared namespace so everyone with the pass code shares one dataset. Defaults to "shared".

Then in the app (Me → Sync across devices): enter the pass code, tap "Sync with pass code". No pass code? Use your own Supabase details below the divider.

Note: anyone with the pass code gets read/write to that shared data, and receives the anon key (which is public-safe by design). Treat the pass code like a key you only give to people you trust. To revoke access, change `SYNC_PASSCODE` and redeploy.
