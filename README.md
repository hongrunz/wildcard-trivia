# Ultimate Trivia Game

A real-time trivia game application built with Next.js (frontend) and FastAPI (backend). Create game rooms, join with friends, and test your knowledge!

## Project Structure

```
ultimate-trivia/
├── frontend/          # Frontend React components and utilities
│   ├── components/    # React components
│   └── lib/          # Frontend utilities (API client)
├── app/              # Next.js routes (App Router)
├── backend/          # Python FastAPI backend
│   ├── db/          # Database models, store, and client
│   └── apis/        # API endpoints and business logic
```

## Prerequisites

- **Node.js** 18+ and npm/yarn/pnpm
- **Python** 3.14+
- **Supabase account** (for database)

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

#### c. Configure Supabase

1. Create a [Supabase account](https://supabase.com) and project
2. Get your credentials from **Settings → API**:
   - Project URL
   - `anon` public key
3. Create a `.env` file in the `backend` directory:

```bash
cd backend
touch .env
```

Add your credentials to `.env`:

```
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_ANON_KEY=your-anon-key-here
```

#### d. Set Up Database

1. In Supabase dashboard, go to **SQL Editor**
2. Create a new query and paste the contents of `backend/db/schema.sql`
3. Run the query to create the required tables

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

- **Backend Setup Details**: See `backend/SETUP.md` for detailed Supabase setup instructions
- **Backend API Docs**: See `backend/README.md` for API endpoint documentation

## Learn More

- [Next.js Documentation](https://nextjs.org/docs)
- [FastAPI Documentation](https://fastapi.tiangolo.com)
- [Supabase Documentation](https://supabase.com/docs)
