# PayPulse Production Deployment Guide (Vercel & Cloud)

This guide covers deploying the **PayPulse Advanced Digital Payment Web Application** to production.

---

## Architecture Overview

* **Frontend:** React 19 + Vite + Tailwind CSS -> **Vercel** (Global Edge CDN, SSL, Instant Deploys)
* **Backend:** Python + Django REST Framework + SimpleJWT -> **Render / Railway / VPS / Vercel Serverless**
* **Database:** PostgreSQL (Cloud instance e.g., Neon.tech, Supabase, or Render Managed PostgreSQL)

---

## 🚀 Option 1: Deploy Frontend to Vercel (Recommended & Fastest)

Vercel provides native, optimized hosting for Vite Single Page Applications (SPAs).

### Step 1: Push Project to GitHub
```bash
git add .
git commit -m "chore(deploy): prepare project for Vercel deployment"
git push origin master
```

### Step 2: Import into Vercel Dashboard
1. Log into your [Vercel Dashboard](https://vercel.com/dashboard).
2. Click **Add New...** > **Project**.
3. Select your GitHub repository: `Payment app` (or your repo name).
4. Configure the Project Settings:
   * **Framework Preset:** `Vite`
   * **Root Directory:** Click `Edit` and select `frontend`
   * **Build Command:** `npm run build`
   * **Output Directory:** `dist`
5. **Environment Variables:**
   * `VITE_API_URL`: Your live backend API URL (e.g., `https://your-backend-api.onrender.com` or backend domain)
6. Click **Deploy**.

> **Note on SPA Routing:**  
> The file [`frontend/vercel.json`](file:///d:/Payment%20app/frontend/vercel.json) is already created with standard SPA rewrites (`"destination": "/index.html"`), ensuring routes like `/dashboard`, `/login`, `/send`, and `/admin-login` work seamlessly without 404 errors.

---

## ⚡ Option 2: Deploy Frontend using Vercel CLI

If you have Node.js installed on your machine:

1. Open PowerShell / Command Prompt and navigate to the frontend folder:
   ```bash
   cd "d:\Payment app\frontend"
   ```
2. Run the Vercel deployment tool:
   ```bash
   npx vercel
   ```
3. Follow the CLI prompts:
   * **Set up and deploy?** `Y`
   * **Which scope?** (Select your personal/team account)
   * **Link to existing project?** `N`
   * **What's your project's name?** `paypulse-wallet`
   * **In which directory is your code located?** `./`
4. To deploy to **Production**:
   ```bash
   npx vercel --prod
   ```

---

## 🐘 Option 3: Deploy Backend (Render / Railway / Free Cloud PostgreSQL)

Since Django uses relational databases and JWT tokens, running the backend with a managed PostgreSQL database is recommended:

### Deploying Django to Render.com (Free Tier):
1. Create a free account on [Render.com](https://render.com/).
2. Click **New +** > **PostgreSQL**.
   * Name: `paypulse-db`
   * Copy the **Internal Database URL** (or External URL).
3. Click **New +** > **Web Service**.
   * Connect your GitHub repository.
   * **Root Directory:** `backend`
   * **Runtime:** `Python 3`
   * **Build Command:**
     ```bash
     pip install -r requirements.txt && python manage.py migrate && python manage.py collectstatic --noinput
     ```
   * **Start Command:**
     ```bash
     gunicorn config.wsgi:application
     ```
   * **Environment Variables:**
     * `DATABASE_URL`: (Paste your PostgreSQL connection string)
     * `SECRET_KEY`: (A strong random secret string)
     * `DEBUG`: `False`
     * `ALLOWED_HOSTS`: `*` (or your Render service domain)
     * `CORS_ALLOW_ALL_ORIGINS`: `True` (or add your Vercel URL)
4. Click **Create Web Service**.

---

## 🛠️ How to Fix "Network Error" on Vercel

If you deploy your frontend to Vercel and see a red **"Network Error"** notification on login:

### Why this happens:
1. **Frontend is in Cloud (HTTPS):** Your Vercel web app runs at `https://paypulse-...vercel.app`.
2. **Backend is Local or Missing:** By default, your Django backend was running on `http://127.0.0.1:8000` on your laptop. Modern web browsers block `https://` websites from calling `http://` URLs (Mixed Content security policy).
3. **Missing `VITE_API_URL`:** Vercel was not told where your live backend API server is located.

---

### Solution 1: Instant 1-Minute HTTPS Tunnel (Test with your local DB right now)

You can instantly expose your local Django server over a secure HTTPS URL without cloud setup:

1. Keep your Django server running on port 8000:
   ```bash
   python backend/manage.py runserver 0.0.0.0:8000
   ```
2. Open a new PowerShell terminal and run:
   ```bash
   npx localtunnel --port 8000
   ```
   *(or run `ssh -p 443 -R0:localhost:8000 a.pinggy.io`)*
3. Copy the generated HTTPS URL (e.g., `https://cold-foxes-jump.loca.lt` or `https://xyz.a.pinggy.link`).
4. On your Vercel website:
   - Click the **"Settings"** link next to `Server:` at the bottom of the Login card.
   - Paste your tunnel URL.
   - Click **"Test Connection"** (verifies with `/api/health/`), then click **"Save & Apply"**.
5. You can now immediately sign in from Vercel!

---

### Solution 2: Permanent 24/7 Cloud Backend on Render.com (100% Free)

To keep your backend online 24/7 even when your laptop is turned off:

1. Go to [Render.com](https://render.com) and create a free account.
2. Click **New +** > **Web Service**.
3. Select your GitHub repository: `amaansk45/paypulse`.
4. Configure:
   - **Root Directory:** `backend`
   - **Environment:** `Python 3`
   - **Build Command:** `pip install -r requirements.txt && python manage.py migrate`
   - **Start Command:** `gunicorn config.wsgi:application`
5. Copy your Render service URL (e.g., `https://paypulse-api.onrender.com`).
6. In **Vercel Dashboard**:
   - Go to your Project > **Settings** > **Environment Variables**.
   - Add variable:
     - **Key:** `VITE_API_URL`
     - **Value:** `https://paypulse-api.onrender.com`
   - Go to **Deployments** tab and click **Redeploy** on your latest build.

---

## Configuration Files Added to Project

* [**`frontend/vercel.json`**](file:///d:/Payment%20app/frontend/vercel.json): SPA rewrite rules and HTTP caching headers.
* [**`Procfile`**](file:///d:/Payment%20app/Procfile): WSGI production server start command for Gunicorn.
* [**`backend/requirements.txt`**](file:///d:/Payment%20app/backend/requirements.txt): Updated with `gunicorn`, `whitenoise`, and `dj-database-url`.
* [**`backend/config/wsgi.py`**](file:///d:/Payment%20app/backend/config/wsgi.py): Configured with `app = application` WSGI entry point.
* [**`frontend/src/components/common/ServerConfigModal.jsx`**](file:///d:/Payment%20app/frontend/src/components/common/ServerConfigModal.jsx): In-app UI server connector for testing & setting custom API endpoints.
