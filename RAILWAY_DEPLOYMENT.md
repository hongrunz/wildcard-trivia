# Deploying Wildcard Trivia to Railway

This guide will walk you through deploying your Wildcard Trivia application to Railway. The app consists of two services: a FastAPI backend and a Next.js frontend, plus a Redis database.

## Prerequisites

1. A [Railway account](https://railway.app/) (sign up for free)
2. [Railway CLI](https://docs.railway.app/guides/cli) (optional, but recommended)
3. Your code pushed to a Git repository (GitHub, GitLab, or Bitbucket)
4. A Gemini API key from [Google AI Studio](https://aistudio.google.com/app/apikey)
5. Node.js 20.9.0+ (Railway will automatically use the version specified in `.nvmrc`)

## Overview

You'll deploy three components:
1. **Redis** - Database (Railway Plugin)
2. **Backend** - FastAPI Python app
3. **Frontend** - Next.js app

## Step-by-Step Deployment

### Step 1: Create a New Railway Project

1. Go to [railway.app](https://railway.app/) and log in
2. Click **"New Project"**
3. Select **"Deploy from GitHub repo"**
4. Authorize Railway to access your GitHub account if needed
5. Select your `wildcard-trivia` repository
6. Railway will create a project, but DON'T deploy yet - we need to configure it properly

### Step 2: Set Up Redis Database

1. In your Railway project dashboard, click **"+ New"**
2. Select **"Database"** → **"Add Redis"**
3. Railway will provision a Redis instance
4. Click on the Redis service to view its details
5. Note the **Variables** tab - Railway automatically creates `REDIS_URL` variable

### Step 3: Deploy the Backend Service

#### 3.1 Create Backend Service

1. In your Railway project, click **"+ New"**
2. Select **"GitHub Repo"** (if not already connected)
3. Choose your repository again
4. Railway will detect it as a monorepo

#### 3.2 Configure Backend Service

1. Click on the newly created service
2. Go to **"Settings"**
3. Under **"Root Directory"**, set it to: `backend`
4. Under **"Start Command"**, it should auto-detect from `Procfile`, but you can manually set:
   ```
   uvicorn apis.main:app --host 0.0.0.0 --port $PORT
   ```

#### 3.3 Set Backend Environment Variables

1. Click on the **"Variables"** tab
2. Click **"+ New Variable"** and add each of these:

```bash
# Redis Configuration (Reference from Redis service)
REDIS_URL=${{Redis.REDIS_URL}}

# Gemini AI Configuration
GEMINI_MODEL_NAME=gemini-2.0-flash
GEMINI_API_KEY=your-gemini-api-key-here

# Frontend URL (we'll update this after deploying frontend)
FRONTEND_URL=
```

**Important Notes:**
- For `REDIS_URL`: Click **"+ New Variable"** → **"Add Reference"** → Select your Redis service → Choose `REDIS_URL`
- Replace `your-gemini-api-key-here` with your actual Gemini API key
- Leave `FRONTEND_URL` empty for now - we'll add it in Step 4.4

#### 3.4 Generate Backend Domain

1. In the backend service, go to **"Settings"**
2. Scroll down to **"Networking"**
3. Click **"Generate Domain"**
4. Copy the generated URL (something like `https://backend-production-xxxx.up.railway.app`)
5. **Save this URL** - you'll need it for the frontend configuration

### Step 4: Deploy the Frontend Service

#### 4.1 Create Frontend Service

1. In your Railway project dashboard, click **"+ New"**
2. Select **"GitHub Repo"** → Choose your repository
3. Railway will create another service

#### 4.2 Configure Frontend Service

1. Click on the frontend service
2. Go to **"Settings"**
3. Under **"Root Directory"**, leave it as `/` (root)
4. The build command should auto-detect as `npm run build`
5. The start command should be `npm run start`

#### 4.3 Set Frontend Environment Variables

1. Click on the **"Variables"** tab
2. Add this variable:

```bash
NEXT_PUBLIC_API_URL=https://your-backend-url.up.railway.app
```

Replace `https://your-backend-url.up.railway.app` with the backend URL you copied in Step 3.4.

**Important:** Railway will automatically provide `PORT` variable, which Next.js will use.

#### 4.4 Generate Frontend Domain & Update Backend

1. In the frontend service, go to **"Settings"**
2. Scroll to **"Networking"** → Click **"Generate Domain"**
3. Copy the generated frontend URL (e.g., `https://wildcard-trivia-production.up.railway.app`)
4. **Go back to your Backend service**
5. Click **"Variables"** tab
6. Find the `FRONTEND_URL` variable and update it with your frontend URL:
   ```
   FRONTEND_URL=https://your-frontend-url.up.railway.app
   ```
7. The backend will automatically redeploy with the new CORS settings

### Step 5: Deploy All Services

Railway will automatically deploy your services when you push to GitHub. To trigger initial deployment:

1. Push your code changes (including the Railway config files) to GitHub:
   ```bash
   git add .
   git commit -m "Add Railway deployment configuration"
   git push
   ```

2. Railway will automatically detect the changes and start deploying

3. Monitor the deployment in the Railway dashboard:
   - Click on each service to see build logs
   - Look for any errors in the **"Deployments"** tab

### Step 6: Verify Deployment

Once all services show "Active" status:

1. **Test the Backend:**
   - Open `https://your-backend-url.up.railway.app/health`
   - You should see: `{"status": "healthy"}`
   - Visit `https://your-backend-url.up.railway.app/docs` to see the API documentation

2. **Test the Frontend:**
   - Open `https://your-frontend-url.up.railway.app`
   - Try creating a game room
   - Test joining a game
   - Verify real-time updates work

## Environment Variables Summary

### Backend Service
```bash
REDIS_URL=${{Redis.REDIS_URL}}              # Reference to Redis service
GEMINI_MODEL_NAME=gemini-2.0-flash          # AI model name
GEMINI_API_KEY=your-api-key                 # Your Gemini API key
FRONTEND_URL=https://your-frontend-url.up.railway.app  # Frontend URL for CORS
```

### Frontend Service
```bash
NEXT_PUBLIC_API_URL=https://your-backend-url.up.railway.app  # Backend API URL
```

### Redis Service
No configuration needed - Railway manages this automatically.

## Troubleshooting

### Backend Issues

**Problem:** Backend fails to connect to Redis
- **Solution:** Verify `REDIS_URL` is correctly referenced from the Redis service
- Go to Backend Variables → Ensure `REDIS_URL` shows as a reference (purple tag)

**Problem:** CORS errors in browser console
- **Solution:** Ensure `FRONTEND_URL` in backend matches your actual frontend domain
- Check that the frontend URL includes `https://` protocol

**Problem:** 500 errors from Gemini API
- **Solution:** Verify your `GEMINI_API_KEY` is correct and has API access enabled
- Check the backend logs in Railway for detailed error messages

### Frontend Issues

**Problem:** Frontend can't connect to backend
- **Solution:** Verify `NEXT_PUBLIC_API_URL` in frontend matches backend domain
- Ensure the URL includes `https://` protocol

**Problem:** WebSocket connection fails
- **Solution:** Railway supports WebSockets by default, but check:
  - Backend is running and healthy
  - No firewall or proxy blocking WS connections
  - WebSocket URL uses `wss://` (secure WebSocket)

### General Issues

**Problem:** Build failures
- **Solution:** Check the deployment logs in Railway dashboard
- Common issues:
  - Missing dependencies in `requirements.txt` or `package.json`
  - Python version mismatch (Railway uses Python 3.11+ by default)
  - Node.js version issues

**Problem:** Services not communicating
- **Solution:** 
  - Verify all environment variables are set correctly
  - Check each service is in "Active" state
  - Review logs for connection errors

## Monitoring and Logs

### View Logs
1. Click on a service in Railway dashboard
2. Click **"Deployments"** tab
3. Click on the latest deployment
4. View **"Build Logs"** and **"Deploy Logs"**

### View Metrics
1. Click on a service
2. Click **"Metrics"** tab
3. Monitor CPU, Memory, and Network usage

## Updating Your App

When you push changes to GitHub:
1. Railway automatically detects the changes
2. Rebuilds and redeploys affected services
3. Zero-downtime deployment (Railway handles this)

To manually trigger a redeploy:
1. Go to service in Railway dashboard
2. Click **"Deployments"**
3. Click "..." menu on latest deployment
4. Select **"Redeploy"**

## Custom Domains (Optional)

To use your own domain:

1. In Railway dashboard, click on a service (Frontend or Backend)
2. Go to **"Settings"** → **"Networking"**
3. Click **"Custom Domain"**
4. Enter your domain (e.g., `trivia.yourdomain.com`)
5. Add the provided CNAME record to your DNS provider
6. Wait for DNS propagation (can take up to 48 hours)
7. **Important:** Update environment variables if you use custom domains:
   - Update `NEXT_PUBLIC_API_URL` in Frontend
   - Update `FRONTEND_URL` in Backend

## Cost Considerations

Railway offers:
- **Free Trial**: $5 credit (no credit card required)
- **Hobby Plan**: $5/month (includes $5 usage credit)
- **Pay-as-you-go** for additional usage

Estimated costs for this app (light usage):
- Redis: ~$1-2/month
- Backend: ~$2-3/month
- Frontend: ~$2-3/month
- **Total: ~$5-8/month**

Tip: Railway charges based on resource usage. The free trial credit is usually enough for testing and light production use.

## Security Best Practices

1. **Never commit sensitive data:**
   - Add `.env` files to `.gitignore`
   - Use Railway's environment variables for secrets

2. **Rotate API keys regularly:**
   - Update `GEMINI_API_KEY` periodically
   - Use Railway dashboard to update without redeploying code

3. **Enable HTTPS only:**
   - Railway provides HTTPS by default
   - Never use HTTP URLs in production

4. **Monitor Redis access:**
   - Railway Redis is private by default (only accessible to your services)
   - Don't expose Redis URL publicly

## Support and Resources

- [Railway Documentation](https://docs.railway.app/)
- [Railway Discord Community](https://discord.gg/railway)
- [Railway Status Page](https://status.railway.app/)
- [FastAPI Deployment Guide](https://fastapi.tiangolo.com/deployment/)
- [Next.js Deployment Guide](https://nextjs.org/docs/deployment)

## Quick Reference

### Railway CLI Commands

Install:
```bash
npm i -g @railway/cli
```

Login:
```bash
railway login
```

Link project:
```bash
railway link
```

View logs:
```bash
railway logs
```

Open project:
```bash
railway open
```

### Service URLs Structure

- Frontend: `https://<project-name>-production-xxxx.up.railway.app`
- Backend: `https://<project-name>-production-yyyy.up.railway.app`
- Redis: Internal only (not publicly accessible)

---

## Next Steps After Deployment

1. ✅ Test all game features thoroughly
2. ✅ Share the frontend URL with friends to test multiplayer
3. ✅ Monitor logs for any errors
4. ✅ Set up custom domain (optional)
5. ✅ Enable Railway notifications for deployment status

Congratulations! Your Wildcard Trivia game is now live! 🎉

---

**Need help?** Check the troubleshooting section above or reach out to Railway support.
