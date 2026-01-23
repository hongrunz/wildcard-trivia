# Backend Railway Environment Variables

Copy these variables to your Railway Backend Service → Variables tab

## Required Variables

### Redis Configuration
```
REDIS_URL=${{Redis.REDIS_URL}}
```
**Note:** Use Railway's "Add Reference" feature:
1. Click "+ New Variable"
2. Select "Add Reference"
3. Choose your Redis service
4. Select `REDIS_URL`

### Gemini AI Configuration
```
GEMINI_MODEL_NAME=gemini-2.0-flash
GEMINI_API_KEY=your-gemini-api-key-here
```
**Get your API key from:** https://aistudio.google.com/app/apikey

### Frontend URL (for CORS)
```
FRONTEND_URL=https://your-frontend-url.up.railway.app
```
**Note:** Update this after deploying your frontend service with the actual Railway-generated URL.

Example: `https://ultimate-trivia-production-abc123.up.railway.app`
