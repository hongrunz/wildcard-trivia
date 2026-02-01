# Wildcard Trivia Game

A real-time trivia game application built with Next.js (frontend) and FastAPI (backend). Create game rooms, join with friends, and test your knowledge!

## Problem Statement
Trivia, a popular and engaging American pastime, often proves challenging and exclusive for individuals from foreign cultures. Feedback from non-native participants highlights this difficulty:
- "I don’t know any of the things they are asking…”
- “This is like taking an exam I have never studied for…”
- “As a non-American, how would I know things like this?”


According to a friend, an experiment was conducted that demonstrated the impact of tailoring trivia topics to the audience. For example, when regular questions about American football and cars were replaced with questions about cricket and Asian geography for a group of international students at MIT, the audience displayed significantly more enthusiasm. This is compared to a control group answering standard trivia.

## Project Summary
This project is a multiplayer, web-based trivia game designed for global accessibility. AI features are there to help bring users together, whether it is an ice-breaker event or a workplace bonding event.
Users can create and join custom game rooms via shareable URLs. The core feature is the ability to generate questions on user-selected topics using AI. The application supports real-time gameplay, allowing multiple participants to answer simultaneously from their mobile devices.
Product Overview

## Core Value Proposition
- Customizable Content: Users define trivia topics, ensuring relevant and engaging content for any group. AI will also suggest topics, e.g. “Things only cat owners understand”, “San Francisco Tech Scene” when user suggests an initial keyword, e.g. “cat”, “startup”
- Fun round recaps: Fun summaries like “Player A and Player B share interest in cricket!”
- AI-Powered Features: Get help with coming up fun and creative team names
- Instant Setup: No registration required: create a room and share a link
- Mobile-First: Designed for players joining from their phones

## Target Users
- Social gatherings (parties, team building events)
- Educational groups (workplace, networking event for particular interest groups)
- Remote teams looking for engagement activities
- Trivia enthusiasts wanting custom content


## Project Structure

```
wildcard-trivia/
├── frontend/          # Frontend React components and utilities
│   ├── components/    # React components
│   └── lib/          # Frontend utilities (API client)
├── app/              # Next.js routes (App Router)
├── backend/          # Python FastAPI backend
│   ├── storage/       # Redis database models, store, and client
│   └── apis/          # API endpoints and business logic
```

## Prerequisites

- **Node.js** 20.9.0+ and npm/yarn/pnpm
- **Python** 3.14+
- **Redis** (for database - can use local Redis or cloud service like Redis Cloud, Upstash)

## Getting Started

### 1. Frontend Setup

Install dependencies:

```bash
npm install
# or
yarn install
# or
pnpm install
```

Run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### 2. Backend Setup

#### a. Create Virtual Environment

```bash
cd backend
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

#### b. Install Dependencies

```bash
pip install -r requirements.txt
```

#### c. Install and Configure Redis

**Option 1: Local Redis (Recommended for Development)**

Install Redis on your system:

- **macOS**: `brew install redis` then `brew services start redis`
- **Linux**: `sudo apt-get install redis-server` (Ubuntu/Debian) or `sudo yum install redis` (CentOS/RHEL)
- **Windows**: Download from [Redis for Windows](https://github.com/microsoftarchive/redis/releases) or use WSL

Start Redis:
```bash
redis-server
```

**Option 2: Redis Cloud (For Production)**

1. Sign up for [Redis Cloud](https://redis.com/try-free/) or [Upstash](https://upstash.com/)
2. Create a database and get your connection URL

#### d. Configure Environment Variables

Create a `.env` file in the `backend` directory:

```bash
cd backend
touch .env
```

**For Local Redis:**
```
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_DB=0
# REDIS_PASSWORD=  # Leave empty for local Redis without password
```

**For Redis Cloud/Upstash:**
```
REDIS_URL=redis://default:your-password@your-redis-host:6379
# Or for Redis Cloud:
# REDIS_URL=rediss://default:your-password@your-redis-host:6379
```

**Additional Required Variables:**
```
GEMINI_MODEL_NAME=gemini-3
GEMINI_API_KEY=your-gemini-api-key-here
```
Get a Gemini API key at [Google AI Studio](https://aistudio.google.com/app/apikey) and set it in your environment or `backend/.env`. Do not commit real API keys.

#### e. Run the Backend Server

```bash
cd backend
source venv/bin/activate  # If not already activated
uvicorn apis.main:app --reload --port 8000
```

The API will be available at [http://localhost:8000](http://localhost:8000)

### 3. Environment Variables

Make sure the frontend knows where the backend is:

Create a `.env.local` file in the root directory:

```
NEXT_PUBLIC_API_URL=http://localhost:8000
```

## Running the Full Application

You need to run both frontend and backend:

**Terminal 1 - Frontend:**
```bash
npm run dev
```

**Terminal 2 - Backend:**
```bash
cd backend
source venv/bin/activate
uvicorn apis.main:app --reload --port 8000
```

## API Documentation

Once the backend is running, you can access:

- **Swagger UI**: [http://localhost:8000/docs](http://localhost:8000/docs)
- **ReDoc**: [http://localhost:8000/redoc](http://localhost:8000/redoc)

## Additional Documentation

- **Backend API Docs**: See `backend/README.md` for API endpoint documentation

## Working with Redis

### Redis Data Structure

The application uses the following Redis data structures:

- **Rooms**: Stored as Redis hashes (`room:{room_id}`)
- **Players**: Stored as Redis hashes (`player:{player_id}`)
- **Room Players**: Sets tracking players in each room (`room:{room_id}:players`)
- **Questions**: Lists stored as JSON strings (`room:{room_id}:questions`)
- **Leaderboard**: Sorted sets (ZSET) for automatic score sorting (`room:{room_id}:scores`)
- **Token Mappings**: String keys for fast lookups (`host_token:{token}`, `player_token:{token}`)

### Viewing Redis Data

#### Option 1: Redis CLI

Connect to Redis:
```bash
redis-cli
```

Useful commands:
```bash
# List all keys
KEYS *

# View a specific room
HGETALL room:<room-id>

# View a specific player
HGETALL player:<player-id>

# View leaderboard (sorted by score)
ZREVRANGE room:<room-id>:scores 0 -1 WITHSCORES

# View questions for a room
LRANGE room:<room-id>:questions 0 -1

# Count total keys
DBSIZE

# Get key type
TYPE room:<room-id>
```

#### Option 2: Redis GUI Tools

Recommended GUI tools for better visualization:

**RedisInsight** (Official Redis GUI - Recommended):
```bash
brew install --cask redisinsight
```
Download: https://redis.io/docs/latest/integrate/redisinsight/

**Another Redis Desktop Manager**:
```bash
brew install --cask another-redis-desktop-manager
```

**Tiny RDM** (Lightweight):
```bash
brew install --cask tiny-rdm
```

After installing, connect using:
- **Host**: `localhost`
- **Port**: `6379`
- **Database**: `0` (or your configured `REDIS_DB` value)

#### Using RedisInsight

**Step 1: Install RedisInsight**
```bash
brew install --cask redisinsight
```

**Step 2: Launch RedisInsight**
Open RedisInsight from Applications or run:
```bash
open -a RedisInsight
```

**Step 3: Add Redis Database Connection**
1. Click **"Add Redis Database"** or **"+"** button
2. Enter connection details:
   - **Host**: `localhost` (or your Redis host)
   - **Port**: `6379` (or your configured port)
   - **Database Alias**: `Wildcard Trivia` (optional, for identification)
   - **Username**: Leave empty (for local Redis)
   - **Password**: Leave empty (for local Redis without password)
   - **Database Index**: `0` (or your `REDIS_DB` value from `.env`)
3. Click **"Add Redis Database"**

**Step 4: Browse Your Data**

Once connected, you can:

1. **View All Keys**:
   - Click on your database connection
   - Browse keys in the left sidebar
   - Keys are organized by type and pattern

2. **Explore Room Data**:
   - Look for keys starting with `room:`
   - Click on a room key (e.g., `room:abc-123-def`)
   - View all fields in the hash (name, host_name, status, topics, etc.)

3. **View Players**:
   - Look for keys starting with `player:`
   - Click on a player key to see their data (name, score, token, etc.)

4. **Check Leaderboard**:
   - Look for keys like `room:{room-id}:scores`
   - These are sorted sets (ZSET)
   - View members and scores, sorted automatically

5. **See Questions**:
   - Look for keys like `room:{room-id}:questions`
   - These are lists - click to expand and see all questions
   - Questions are stored as JSON strings

**Step 5: Using RedisInsight Features**

- **Search/Filter**: Use the search bar to filter keys by pattern (e.g., `room:*`)
- **JSON Viewer**: For JSON data, RedisInsight automatically formats and highlights JSON
- **Edit Values**: Right-click on keys/fields to edit values directly
- **Delete Keys**: Right-click to delete keys (be careful!)
- **Refresh**: Click the refresh button to update the view
- **CLI Tab**: Use the built-in CLI tab to run Redis commands directly
- **Browser Tab**: Visual key browser with tree view
- **Profiler**: Monitor Redis commands in real-time

**Step 6: Viewing Sorted Sets (Leaderboards)**

To see leaderboard data:
1. Find a key like `room:{room-id}:scores`
2. Click on it - RedisInsight will show it as a ZSET
3. You'll see player IDs and scores, already sorted by score (descending)
4. The interface shows both member (player_id) and score values

**Tips:**
- Use the **filter/search** to quickly find specific rooms or players
- The **Browser** tab provides a tree view of all your keys
- The **CLI** tab lets you run Redis commands directly
- Use **Refresh** after creating new data in your app

### Redis Management Commands

```bash
# Start Redis server (macOS with Homebrew)
brew services start redis

# Stop Redis server
brew services stop redis

# Check if Redis is running
redis-cli ping
# Should return: PONG

# Flush all data (⚠️ WARNING: Deletes all data)
redis-cli FLUSHALL

# Flush current database only
redis-cli FLUSHDB

# Monitor Redis commands in real-time
redis-cli MONITOR
```

### Troubleshooting Redis

**Connection Issues:**
```bash
# Test Redis connection
redis-cli ping

# Check Redis is running
brew services list  # macOS
# or
ps aux | grep redis
```

**Common Issues:**
- **Connection refused**: Make sure Redis server is running (`brew services start redis` on macOS)
- **Wrong port**: Check your `.env` file matches your Redis configuration
- **Password required**: If using Redis Cloud, ensure `REDIS_URL` includes the password

## Deployment

### Deploy to Railway

For production deployment on Railway, see the comprehensive deployment guide:

📚 **[Railway Deployment Guide](./RAILWAY_DEPLOYMENT.md)**

The guide includes:
- Step-by-step deployment instructions
- Environment variable configuration
- Troubleshooting tips
- Cost estimates
- Custom domain setup

Quick setup files:
- Backend: `backend/railway.json`, `backend/Procfile`
- Frontend: `railway.json`
- Environment examples: `ENV_RAILWAY_EXAMPLE.md`, `backend/ENV_RAILWAY_EXAMPLE.md`

## Learn More

- [Next.js Documentation](https://nextjs.org/docs)
- [FastAPI Documentation](https://fastapi.tiangolo.com)
- [Redis Documentation](https://redis.io/docs)
- [Redis CLI Commands](https://redis.io/docs/latest/commands/)
- [Railway Documentation](https://docs.railway.app/)