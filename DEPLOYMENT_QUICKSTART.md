# Railway Deployment Quick Start

Quick reference for deploying Ultimate Trivia to Railway.

## 🚀 What You Need

1. Railway account (free): https://railway.app
2. Your code in a Git repository (GitHub/GitLab)
3. Gemini API key: https://aistudio.google.com/app/apikey
4. Node.js 20.9.0+ (auto-detected from `.nvmrc` file)

## 📋 Architecture

Your deployment will have **3 services**:

```
┌─────────────┐
│   Frontend  │ ← Next.js app (Port 3000)
│  (Next.js)  │
└──────┬──────┘
       │ API calls
       ↓
┌─────────────┐
│   Backend   │ ← FastAPI app (Port 8000)
│  (FastAPI)  │
└──────┬──────┘
       │ Redis connection
       ↓
┌─────────────┐
│    Redis    │ ← Database
│  (Database) │
└─────────────┘
```

## ⚡ Quick Deploy Steps

### 1. Add Redis (1 minute)
- New Project → Add Redis
- Railway provisions Redis automatically
- Note: This creates `REDIS_URL` variable

### 2. Deploy Backend (3 minutes)
- New → GitHub Repo → Select your repo
- **Settings:**
  - Root Directory: `backend`
  - Start Command: Auto-detected from `Procfile`
- **Variables:**
  ```
  REDIS_URL=${{Redis.REDIS_URL}}  ← Use "Add Reference"
  GEMINI_API_KEY=your-key-here
  GEMINI_MODEL_NAME=gemini-2.0-flash
  FRONTEND_URL=                   ← Leave empty for now
  ```
- **Generate Domain** → Save URL

### 3. Deploy Frontend (3 minutes)
- New → GitHub Repo → Select your repo
- **Settings:**
  - Root Directory: `/` (root)
  - Build: `npm run build`
  - Start: `npm run start`
- **Variables:**
  ```
  NEXT_PUBLIC_API_URL=https://your-backend-url.up.railway.app
  ```
- **Generate Domain** → Save URL

### 4. Update Backend CORS (1 minute)
- Go back to Backend service
- Update `FRONTEND_URL` variable:
  ```
  FRONTEND_URL=https://your-frontend-url.up.railway.app
  ```
- Backend auto-redeploys

### 5. Test! 🎉
- Visit your frontend URL
- Create a game room
- Join from another device
- Play trivia!

## 📝 Environment Variables Cheat Sheet

### Backend Service
| Variable | Value | Note |
|----------|-------|------|
| `REDIS_URL` | `${{Redis.REDIS_URL}}` | Use "Add Reference" |
| `GEMINI_API_KEY` | Your API key | From Google AI Studio |
| `GEMINI_MODEL_NAME` | `gemini-2.0-flash` | Model name |
| `FRONTEND_URL` | Your frontend URL | For CORS |

### Frontend Service
| Variable | Value | Note |
|----------|-------|------|
| `NEXT_PUBLIC_API_URL` | Your backend URL | Include `https://` |

## 🔧 Files Created

Railway configuration files added to your project:

```
ultimate-trivia/
├── railway.json                    ← Frontend Railway config
├── backend/
│   ├── railway.json                ← Backend Railway config
│   ├── Procfile                    ← Backend start command
│   └── ENV_RAILWAY_EXAMPLE.md      ← Backend env vars reference
├── ENV_RAILWAY_EXAMPLE.md          ← Frontend env vars reference
├── RAILWAY_DEPLOYMENT.md           ← Full deployment guide
└── DEPLOYMENT_QUICKSTART.md        ← This file
```

## 🐛 Troubleshooting

| Problem | Solution |
|---------|----------|
| CORS errors | Update `FRONTEND_URL` in backend with correct frontend domain |
| Backend can't connect to Redis | Use "Add Reference" for `REDIS_URL`, not manual string |
| Frontend can't reach backend | Verify `NEXT_PUBLIC_API_URL` includes `https://` |
| 500 errors from AI | Check `GEMINI_API_KEY` is valid |
| Build fails | Check deployment logs in Railway dashboard |

## 💰 Costs

- **Free trial**: $5 credit (enough for testing)
- **Hobby plan**: $5/month
- **Estimated monthly**: $5-8/month for light usage

## 📚 Full Documentation

For detailed instructions, troubleshooting, and advanced configuration:

👉 **See [RAILWAY_DEPLOYMENT.md](./RAILWAY_DEPLOYMENT.md)**

## ✅ Post-Deployment Checklist

- [ ] All 3 services show "Active" status
- [ ] Backend health check works: `/health`
- [ ] Frontend loads in browser
- [ ] Can create a game room
- [ ] Can join a room from another device
- [ ] Questions generate successfully
- [ ] Real-time updates work (WebSocket)
- [ ] Leaderboard updates correctly
- [ ] (Optional) Custom domain configured

## 🔗 Useful Links

- Railway Dashboard: https://railway.app/dashboard
- Railway Docs: https://docs.railway.app
- Get Gemini API Key: https://aistudio.google.com/app/apikey
- Railway Status: https://status.railway.app

---

**Need help?** Check the full deployment guide or Railway's documentation.

**Ready to deploy?** Push your code to GitHub and follow the steps above! 🚀
