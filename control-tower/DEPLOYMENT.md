# ColdChainX Control Tower | Deployment Guide

This guide explains how to deploy the ColdChainX prototype to a live, publicly accessible URL for demonstrations and evaluations.

---

## ⚡ Option 1: Vercel (Fastest & Simplest - 60 Seconds)

Vercel is the easiest platform for React + Vite single-page applications.

### Steps:
1. Initialize git (if not already done) and commit:
   ```bash
   git add .
   git commit -m "ColdChainX Control Tower production build"
   ```
2. Push your repository to **GitHub** or **GitLab**.
3. Open [Vercel](https://vercel.com/new) and click **"Add New Project"** ➔ Import your repository.
4. Set the **Root Directory** to `control-tower`.
5. Under **Environment Variables**, add:
   - `GEMINI_API_KEY`: *(Your Google AI Studio API key)*
6. Click **Deploy**.
7. In ~45 seconds, your live public URL will be ready:  
   👉 `https://coldchainx-control-tower.vercel.app`

---

## ☁️ Option 2: Google Cloud Run (Recommended for Google Buildathon)

Because ColdChainX was built for the Google ecosystem, deploying to **Google Cloud Run** demonstrates native GCP containerization.

A production-ready [`Dockerfile`](./Dockerfile) and [`server.mjs`](./server.mjs) are already included.

### Steps:
1. Make sure you have the [Google Cloud CLI (`gcloud`)](https://cloud.google.com/sdk/docs/install) installed and logged in:
   ```bash
   gcloud auth login
   gcloud config set project YOUR_GCP_PROJECT_ID
   ```
2. Deploy directly from the `control-tower` directory:
   ```bash
   cd control-tower
   gcloud run deploy coldchainx-control-tower \
     --source . \
     --region asia-south1 \
     --allow-unauthenticated \
     --set-env-vars GEMINI_API_KEY="YOUR_GEMINI_KEY"
   ```
3. Cloud Run automatically builds the container, deploys it, and provides a secure HTTPS URL:  
   👉 `https://coldchainx-control-tower-xxxxx-el.a.run.app`

---

## 🚀 Option 3: Render.com or Railway (Free 24/7 Web Service)

Render runs the full production Node.js server [`server.mjs`](./server.mjs) for free.

### Steps:
1. Push your code to GitHub.
2. Sign in to [Render.com](https://dashboard.render.com/) and click **New + ➔ Web Service**.
3. Connect your GitHub repository.
4. Configure service settings:
   - **Root Directory:** `control-tower`
   - **Build Command:** `npm install && npm run build`
   - **Start Command:** `npm start`
   - **Environment Variables:** `GEMINI_API_KEY`
5. Click **Create Web Service**.
6. Render deploys the app at:  
   👉 `https://coldchainx-control-tower.onrender.com`

---

## 🌐 Option 4: Instant Public Tunnel (Zero Setup - 10 Seconds)

If you need a public URL immediately to share on your phone or with a judge without pushing to Git:

1. Ensure the dev server is running on port 5173:
   ```bash
   cd control-tower
   npm run dev
   ```
2. In a second terminal, run **localtunnel** or **Cloudflare Tunnel**:
   ```bash
   npx localtunnel --port 5173
   ```
   *or with Cloudflare:*
   ```bash
   npx cloudflared tunnel --url http://localhost:5173
   ```
3. Copy the generated `https://...` link and open it on any mobile device or browser anywhere in the world!
