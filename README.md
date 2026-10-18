# EduPilot web app (BFM3130)

EduPilot is an institution-linked education-finance platform for international students in Malaysia and their families. The app shows these features:

* **Real-time payment tracking**: Initiated → Processing → Received by university → Confirmed & matched. Updates appear live on every screen, with timestamps.
* **A simple dashboard** for each role: parent, student and university.
* **Transparent fees**: the full breakdown appears before paying and again on the receipt. The RM129 Semester Plan fee is shown separately from the provider fee.
* **Secure payment verification**: login roles, verified payees, an auto payment reference, a confirm step and a printable receipt.
* Extras: allowance scheduler, payment history, pop-up notifications, and an "enquiries avoided" counter for universities.

No real money moves. The licensed payment provider, its fee and its exchange rate are **sample** values.

---

## Step-by-step guide (no coding experience needed)

You will create 3 free accounts. It is easiest to sign up for Vercel and Supabase **using your GitHub account**.

| Service | What it does | Sign up |
|---|---|---|
| GitHub | Stores your code online | https://github.com/signup |
| Supabase | The database and logins | https://supabase.com (Start your project → Continue with GitHub) |
| Vercel | Turns the code into a website link | https://vercel.com/signup (Continue with GitHub) |

Also install **VS Code** from https://code.visualstudio.com, using the normal installer.

### Step 1: Open the project in VS Code
1. Download `edupilot.zip` and unzip it. On Windows, right-click → Extract All. On Mac, double-click.
2. Open VS Code → **File → Open Folder…** → choose the unzipped `edupilot` folder. If VS Code asks "Do you trust the authors?", click **Yes**.
3. On the left you will see the files. You don't need to change anything.

### Step 2: Upload the code to GitHub (from VS Code)
1. In VS Code, click the **Source Control** icon on the far left. It looks like a branch with 3 dots, and the shortcut is `Ctrl+Shift+G`.
2. Click the blue **Publish to GitHub** button.
   * If you see "Initialize Repository" instead, click it first. Then type a message such as `first version` in the box, click **Commit**, and answer **Yes** if VS Code asks to stage all changes. After that, click **Publish Branch**.
3. VS Code asks you to sign in to GitHub. Click **Allow**, log in in your browser, then return to VS Code.
4. Choose **Publish to GitHub private repository** (or public) and keep the name `edupilot`.
5. If VS Code asks "Would you like Git to install?" or shows a Git error, install Git from https://git-scm.com/downloads, restart VS Code and try again.
6. When it finishes, click **Open on GitHub**. Your code is now online.

> If VS Code doesn't work for you, there is another way. On github.com, click **New repository**, name it `edupilot` and click **Create**. Then click **uploading an existing file** and drag in everything *inside* the `edupilot` folder, but not the `node_modules` folder. Finally, click **Commit changes**.

### Step 3: Set up the database (Supabase)
1. On supabase.com, click **New project**. Name it `edupilot`, make up a database password and save it somewhere, choose Region **Southeast Asia (Singapore)**, then click **Create**. Wait about 2 minutes.
2. In the left menu, open **SQL Editor** and click **+ New query**.
3. In VS Code, open `supabase/schema.sql`, select everything (`Ctrl+A`), copy it (`Ctrl+C`), paste it into Supabase and click **Run**. You should see *"Success. No rows returned"*.
   * If Supabase warns that the query has "destructive operations", that is expected. Click **Run this query**.
4. Click **+ New query** again. Paste all of `supabase/seed.sql` and click **Run**. You should see *"Demo data ready…"*.
5. Turn off email confirmation so new sign-ups work straight away. Go to **Authentication → Sign In / Providers → Email**, switch **Confirm email** OFF and click **Save**.
6. Copy your two keys. Click the **Connect** button at the top of the project, or go to **Project Settings → API Keys** / **Data API**. Copy these two values into Notepad:
   * **Project URL**, which looks like `https://abcdefgh.supabase.co`
   * **anon public key**, a long text starting `eyJ…`. Newer projects may show a **publishable key** starting `sb_publishable_…` instead. Either one works.
   * ⚠️ Never use the **service_role** or **secret** key.

### Step 4: Put the website online (Vercel)
1. On vercel.com, click **Add New… → Project**.
2. Find your `edupilot` GitHub repository and click **Import**. If it isn't listed, click "Adjust GitHub App Permissions" and allow the repo.
3. Vercel detects **Vite** automatically. Leave the build settings as they are.
4. Open **Environment Variables** and add two:
   * Name `VITE_SUPABASE_URL`, Value: your Project URL
   * Name `VITE_SUPABASE_ANON_KEY`, Value: your anon / publishable key
5. Click **Deploy**. After about 1 minute you get a link like `https://edupilot-xxxx.vercel.app`. That is the link for your tutor 🎉
6. If you add or change the variables later, go to **Deployments → ⋯ → Redeploy**, because changes only apply after a redeploy.

### Step 5: Test before presenting
Open your Vercel link and check each step:
- [ ] The yellow "Offline demo mode" bar is **gone**. If you still see it, the Vercel variables are missing, so redo Step 4.4 and then Redeploy.
- [ ] Logging in as **Parent**, **Student** and **University** works, using the one-click buttons on the login page.
- [ ] The live demo works:
  1. **Tab 1:** log in as Parent → **Pay now** on Accommodation → Continue → tick the box → **Pay**. You land on the tracker.
  2. **Tab 2** (or your phone): log in as University. Chen Wei and Emily Tan show as *Processing*. Click **Mark received** on Emily's row.
  3. Tab 1's tracker updates **by itself**. Then click **Confirm & match** in Tab 2, and the tracker turns fully green.
  4. Open the receipt → **Print / Save as PDF**.
- [ ] Each browser tab keeps its own login, so you can have Parent and University side by side on one laptop.
- [ ] To reset the demo before presenting, run `supabase/seed.sql` again in the SQL Editor.

### Changing the app later
1. Edit files in VS Code and save.
2. In **Source Control**, type a message, click **Commit**, then click **Sync Changes**.
3. Vercel redeploys automatically within about a minute.

### (Optional) Run it on your own computer
1. Install **Node.js LTS** from https://nodejs.org.
2. In VS Code, open **Terminal → New Terminal** and type:
   ```
   npm install
   npm run dev
   ```
3. Open the link it shows (http://localhost:5173). Without Supabase keys the app runs in **offline demo mode**: data is saved in that browser only, and live updates still work between tabs of the same browser.
4. To use Supabase locally, copy `.env.example` to a new file named `.env.local` and paste in your two keys.

### Troubleshooting
| Problem | Fix |
|---|---|
| "Incorrect email or password" for demo accounts | Run `seed.sql` again. The demo password is `EduPilot2026!` |
| Tracker doesn't update live | Re-run `schema.sql` then `seed.sql`. Its last part turns on Realtime. |
| Sign-up says "check your email" | Turn **Confirm email** off (Step 3.5) |
| Vercel page shows 404 on refresh | Make sure `vercel.json` was uploaded to GitHub |
| Supabase project "paused" | Free projects pause after 7 days without use. Open Supabase and click **Restore** a day before presenting. |

---

## How it is built (for the report)
* **Frontend:** React + Vite, hosted on Vercel. Styling matches the EduPilot Canva website: navy `#0B2A6B`, blue `#1E4FC2` and Plus Jakarta Sans.
* **Backend:** Supabase Postgres + Auth + Realtime.
* **Security:** Row Level Security is on for every table. Users can only *read* their own rows: the university sees its students' tuition and accommodation, but never living allowances. All changes go through server functions (`make_payment`, `advance_payment`, `schedule_payment`), which check who is asking and calculate the fees themselves, so the browser cannot change an amount or skip a step.
* **Privacy:** the app never records allowance spending, only releases.
* **Files:** `src/pages/` holds one file per screen, `src/lib/rules.js` holds the fees and status rules, `supabase/` holds the database.
