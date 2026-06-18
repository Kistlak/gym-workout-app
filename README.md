# Kist Workout

A mobile-first Push / Pull / Legs workout tracker built as a single-file progressive web app. It logs your training, sleep, and bodyweight, syncs across devices through Supabase, and uses Google Gemini to read screenshots and give honest, range-based coaching insights. It also includes an AI-assisted plan builder that picks exercises for you from a curated, image-verified library.

> Built for a lean-bulk goal and a hotel / small-gym setup, but the plan builder adapts to other goals and equipment levels.

---

## Features

**Train**
- Push / Pull / Legs days with real animated exercise demos.
- Tap any demo image to open a large, animated preview of the movement.
- Per-set weight logging with a per-exercise kg/lb toggle and "last time" hints.
- Sticky session timer with pause, and a timestamp-based rest timer (survives backgrounding, with a beep and vibration).
- "View body parts" muscle map for each exercise.

**History**
- Every session saved with date, times, duration, sets, and optional Apple Watch stats.
- Edit any session, or upload an Apple Watch screenshot to auto-fill stats (via Gemini).

**Sleep**
- Log nights manually or upload a sleep-score screenshot to auto-fill (via Gemini).
- Score ring, quality rating, and a trend sparkline.

**Insight**
- Day / Week / Month views, navigable to any period.
- Day view gives a recovery plan for the next day: sleep range, what to eat and drink, and protein/carb direction.
- Week and Month views give a review of what you did plus recommendations for the next period.
- Summaries auto-generate, cache to your data, and can be regenerated on demand.

**Me**
- Sync across devices (see below), with passcode or manual setup.
- Height, goal, and default weight unit.
- BMI card with category, healthy range, and a target, framed honestly around a lean-bulk goal.
- Bodyweight log and trend.
- **My Plan**: set your goal, days per week, and equipment level, then let the AI star recommended exercises from the library. Keep its picks or add your own; your plan then replaces the default program in the Train tab. Clear it anytime to return to the default Push / Pull / Legs.
- Local JSON backup (export / import).

---

## Tech stack

- **Frontend:** a single `index.html` — vanilla HTML, CSS, and JavaScript. No build step.
- **Backend:** two [Netlify Functions](https://docs.netlify.com/functions/overview/) (Node.js).
- **Sync:** [Supabase](https://supabase.com/) (a single key-value table).
- **AI:** [Google Gemini](https://ai.google.dev/) (`gemini-2.5-flash`) for screenshot reading, insights, recovery, and plan building.
- **Exercise media:** images from the open-source [free-exercise-db](https://github.com/yuhonas/free-exercise-db).
- **Libraries (loaded lazily from CDNs):** Supabase JS and SweetAlert2.

---

## Project structure

```
.
├── index.html                    # the entire app
├── netlify.toml                  # Netlify build/functions config
├── og.png                        # social share image
├── README.md
└── netlify/
    └── functions/
        ├── extract.js            # Gemini: screenshot OCR, insight, recovery, plan
        └── syncauth.js           # exchanges a passcode for Supabase details
```

---

## Setup and deployment

### 1. Supabase

Create a free Supabase project, then run this SQL (SQL Editor) to create the sync table and allow anonymous access:

```sql
create table if not exists ppl_kv (
  user_key text not null,
  k        text not null,
  v        jsonb,
  updated_at timestamptz default now(),
  primary key (user_key, k)
);

alter table ppl_kv enable row level security;

create policy "anon read/write" on ppl_kv
  for all to anon using (true) with check (true);
```

Note your project **URL** and **anon / publishable key** (the public-safe key).

### 2. Google Gemini

Create an API key in [Google AI Studio](https://aistudio.google.com/). The free tier is generous and needs no card. Keep billing off unless you specifically need it.

### 3. Deploy to Netlify

Deploy this folder to Netlify (drag-and-drop the zip, or connect the repo). The functions live in `netlify/functions/` and are picked up automatically.

### 4. Environment variables

In Netlify, go to **Site configuration → Environment variables** and add:

| Variable | Required | Purpose |
|---|---|---|
| `GEMINI_API_KEY` | Yes | Your Gemini API key (used by the function only). |
| `SHARED_SUPABASE_URL` | For passcode sync | Your Supabase project URL. |
| `SHARED_SUPABASE_KEY` | For passcode sync | Your Supabase anon / publishable key. |
| `SYNC_PASSCODE` | For passcode sync | Full-access passcode (read + write). You choose this. |
| `SYNC_PASSCODE_READ` | Optional | Read-only passcode (view only). You choose this. |
| `SHARED_SYNC_CODE` | Optional | Shared data namespace. Defaults to `shared`. |

Redeploy after changing environment variables.

---

## Syncing across devices

There are two ways to connect, both in **Me → Sync across devices**:

- **Passcode:** enter a passcode and tap sync. The app exchanges it (via the `syncauth` function) for the Supabase connection details. The full passcode allows read and write; the read-only passcode allows viewing only.
- **Your own Supabase:** enter your own URL, key, and a sync code. The sync code is the namespace — use the same one on every device you want to share.

Passcodes are values **you invent** and set in Netlify, not values provided by the app. Share them only with people you trust.

---

## Honest notes

A few things worth being upfront about:

- **Read-only is enforced in the app, not the database.** Both passcodes use the same public anon key, so read-only mode hides editing controls and blocks writes through the app — which protects shared data from normal use — but it is not bulletproof against someone technical with the key. To revoke access, change the passcode in Netlify and redeploy.
- **The anon key is public-safe by design.** It only does what your Row-Level-Security policy allows. The Gemini key, by contrast, lives only in the Netlify function and is never sent to the browser.
- **AI output is guidance, not medical advice.** Coaching and recovery tips use ranges and food types rather than exact calories or grams, avoid diagnosis, and remind you to trust how your body feels.
- **Gemini free tier may use submitted images to improve Google's models.** Keep that in mind for screenshots, and keep billing off to avoid key-theft risk.
- **The plan builder picks from a fixed library.** The AI only selects and stars exercises from the curated catalog (returning IDs), so demo images are always valid and nothing is invented.

---

## License

This project uses exercise images from [free-exercise-db](https://github.com/yuhonas/free-exercise-db) (public domain). Add your own license here for the rest of the code.
