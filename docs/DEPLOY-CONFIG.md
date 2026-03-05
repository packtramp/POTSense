# POTSense - Deploy Configuration

## Quick Deploy (read this before every push)

```bash
cd c:/Claude/Projects/POTSense
git add -A && git commit -m "message" && git push
```

Git push auto-deploys to Vercel via GitHub integration. No manual `vercel --prod` needed.

**Manual deploy (if GitHub integration fails):**
```bash
npx vercel --prod
```

## Project Links

| Item | Value |
|------|-------|
| **Domain** | potsense.org |
| **Vercel Project** | potsense (roby-dorsets-projects) |
| **GitHub Repo** | packtramp/POTSense (private) |
| **Branch** | master |
| **Firebase Project** | potsense-app |
| **Firebase Console** | https://console.firebase.google.com/project/potsense-app |

## Build Configuration

| Setting | Value |
|---------|-------|
| **Build Command** | `npx expo export --platform web` |
| **Output Directory** | `dist` |
| **Framework** | null (custom) |
| **Node Version** | 20.x (Vercel default) |

## vercel.json

- SPA rewrite: all routes → `/` (except `_expo`, `api`, icons, manifest, favicon, sw)
- API routes at `/api/*` are Vercel serverless functions (Node.js)

## Serverless Functions

| Route | Purpose |
|-------|---------|
| `/api/rss` | RSS proxy for news feeds (CORS bypass, domain-allowlisted) |

## .vercelignore

Must exist and exclude `node_modules`. Without it, deploys hang 15+ min uploading 400MB+ and crash Claude Code (exit code 3). **DO NOT DELETE.**

## Environment Variables (Vercel)

None currently. Firebase config is hardcoded in `lib/firebase.ts` (public client-side keys, safe to expose).

Future:
- `RESEND_API_KEY` — for email notifications
- `TWILIO_*` — for SMS notifications
- `REMINDER_SECRET` — for cron job auth

## Firebase

- **Auth:** Email/Password
- **Firestore:** nam5 region
- **Admin:** robdorsett@gmail.com
- **Security rules:** deployed via Firebase CLI

## Verify After Deploy

1. Open https://potsense.org
2. Check favicon shows (heart + ECG line)
3. Log in → Home screen loads with weather
4. Tap LOG EPISODE → modal opens
5. Check News tab → articles load
6. Check Trends tab → cards render (if episodes exist)

## Rollback

```bash
# Find last known good deploy
npx vercel ls

# Promote a previous deploy
npx vercel promote <deployment-url>
```

## Troubleshooting

- **Deploy hangs:** Check `.vercelignore` exists and excludes `node_modules`
- **Domain not resolving:** `npx vercel domains ls` — make sure potsense.org is assigned
- **API routes 404:** Check `vercel.json` rewrite regex excludes `api`
- **Build fails:** Run `npx expo export --platform web` locally first to check for errors
