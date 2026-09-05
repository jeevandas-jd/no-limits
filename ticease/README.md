# TicEase — drop-in feature for your Next.js app

This is a self-contained TicEase MVP: a support/self-management flow for
tic-disorder users, built for App Router + plain CSS, no backend (all data
lives in the browser's `localStorage`).

## What's included

```
app/ticease/          — the feature's routes (Home, Track, Practice, Reset, Help Now, Insights, Support)
components/ticease/   — NavBar, floating Help Now button, Slider
lib/ticease/           — localStorage data layer + insight-generation logic
```

## How to install it

1. Copy the three folders (`app/ticease`, `components/ticease`, `lib/ticease`)
   into your existing project so they land at:
   - `<your-app>/app/ticease/...`
   - `<your-app>/components/ticease/...`
   - `<your-app>/lib/ticease/...`

   If your project uses a `src/` directory, copy them into `src/app/ticease`,
   `src/components/ticease`, `src/lib/ticease` instead.

2. Make sure your `tsconfig.json` has the `@/*` path alias (default in most
   `create-next-app` projects):
   ```json
   "paths": { "@/*": ["./*"] }
   ```
   If your alias points at `src/*` instead, no change needed — the imports
   (`@/lib/ticease/...`, `@/components/ticease/...`) will resolve automatically.

3. That's it — no extra npm packages, no env vars, no backend. Run your app
   and visit `/ticease`.

## Nesting it under a different path (e.g. `/no-limit/ticease`)

If you want the feature reachable at `/no-limit/ticease` instead of `/ticease`
(e.g. to namespace it under your hackathon project name), just move the folder:

```
app/no-limit/ticease/...
```

Then update the internal links in two files to match the new base path:
- `components/ticease/NavBar.tsx` (the `ITEMS` array hrefs)
- `components/ticease/HelpNowButton.tsx` (the `href="/ticease/help"`)

Everything else (imports, storage keys) is path-independent and needs no changes.

## What's implemented (MVP scope, per the design doc's own "Version 1" list)

- **Home** — mood check-in, quick actions, today snapshot, weekly practice goal.
- **Track** — tic type / urge / stress / situation logging, once-a-day sleep prompt.
- **Practice** — the 5-step CBIT flow (awareness → identify → strategy → timed
  practice → reflection), saved as practice sessions.
- **Reset** — duration picker + exercise library + an animated breathing timer
  (4s in / 2s hold / 6s out).
- **Help Now** — persistent floating button from any screen; 5-step de-escalation
  flow ending in support/emergency options.
- **Insights** — same-day correlation observations computed from local entries
  (e.g. sleep vs. tic impact), phrased carefully — never causal, never diagnostic.
- **Support** — tic-friendly explainer cards (teacher/friend/family/workplace/
  public/travel) with a full-screen "show" mode and copy-to-clipboard.

## Deliberately out of scope for the hackathon build

- Clinician portal / real clinician-assigned strategies (a single default
  strategy stands in — see `lib/ticease/storage.ts`, `getActiveStrategy()`).
- Real backend/auth — everything is per-browser `localStorage`. Swapping in a
  real DB later just means replacing the functions in `lib/ticease/storage.ts`
  with API calls; every page already reads/writes through that one module.
- Localized emergency numbers on the Help Now screen — currently a placeholder
  `tel:911` link (see the note in `app/ticease/help/page.tsx`).

## Design tokens

Colors and type are scoped under `.tic-root` in `app/ticease/ticease.css`, so
they won't leak into or clash with your host app's existing styles:

| Role       | Hex       |
|------------|-----------|
| Primary    | `#5B6EE1` |
| Secondary  | `#7BC8A4` |
| Background | `#F7F8FC` |
| Text       | `#202338` |
| Emergency  | `#D9534F` |

Verified: `npm run build` compiles cleanly with Next.js App Router + TypeScript,
all 6 routes prerender as static pages.
