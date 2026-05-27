# PushDesk 🟠
**Weekly Push Command Center — Jumia MA**

---

## What it does
PushDesk connects live to your PMO Google Sheet and gives you a fast, visual dashboard to manage your weekly homepage pushes. No more scrolling through 40 columns.

- **This Week** — all proposals for the current week, filtered by prio / category / KAM
- **Homepage Planner** — drag proposals into Slider and Product Floor slots, track category balance, copy a clean summary for your CP call

---

## Deploy in 3 steps

### Step 1 — Set up the Google Apps Script

1. Open your Google Sheet: `https://docs.google.com/spreadsheets/d/1_cR32Owor2_at23OvNnL9ETlPlJDbfKM7ispp9VvmWs`
2. Click **Extensions → Apps Script**
3. Delete any existing code and paste the contents of `AppsScript.gs`
4. Click **Deploy → New deployment**
   - Type: **Web App**
   - Execute as: **Me**
   - Who has access: **Anyone** (or "Anyone within Jumia" if your org allows it)
5. Click **Authorize** and approve the permissions
6. **Copy the Web App URL** — it looks like:
   `https://script.google.com/macros/s/AKfycb.../exec`

> ⚠️ Each time you edit the script, create a **New deployment** — don't update the existing one, or the URL won't reflect your changes.

---

### Step 2 — Deploy to Vercel

**Option A: Via GitHub (recommended)**

1. Push this project to a GitHub repo:
   ```bash
   git init
   git add .
   git commit -m "Initial PushDesk"
   git remote add origin https://github.com/YOUR_USERNAME/pushdesk.git
   git push -u origin main
   ```
2. Go to [vercel.com](https://vercel.com) → **Add New Project** → import your GitHub repo
3. Vercel auto-detects Vite — click **Deploy**
4. Once deployed, go to your project → **Settings → Environment Variables**
5. Add:
   - **Name:** `VITE_APPS_SCRIPT_URL`
   - **Value:** paste your Apps Script URL from Step 1
6. Go to **Deployments → Redeploy** (so the env variable takes effect)
7. Done — share the Vercel URL with your team 🎉

**Option B: Via Vercel CLI**

```bash
npm install -g vercel
cd pushdesk
vercel
# Follow the prompts, then:
vercel env add VITE_APPS_SCRIPT_URL
# Paste your Apps Script URL
vercel --prod
```

---

### Step 3 — Local development

```bash
cd pushdesk
npm install

# Create a local env file
echo "VITE_APPS_SCRIPT_URL=https://script.google.com/macros/s/YOUR_ID/exec" > .env

npm run dev
# Opens at http://localhost:5173
```

---

## How the data flows

```
Google Sheet (private)
       ↓
Apps Script Web App (runs as you, returns JSON)
       ↓
PushDesk React App (fetches on load + Refresh button)
```

The sheet stays private — the Apps Script runs with your credentials server-side and returns the data. No API keys, no OAuth login for users.

---

## Updating the sheet connection

If the sheet moves or the GID changes, update these two lines in `AppsScript.gs`:
```javascript
var SPREADSHEET_ID = "YOUR_SHEET_ID";
var SHEET_GID      = YOUR_GID_NUMBER;
```
Then create a new deployment in Apps Script.

---

## Tech stack
- React 18 + Vite
- No external UI libraries
- Google Apps Script (backend proxy for private sheet)
- Vercel (hosting)
