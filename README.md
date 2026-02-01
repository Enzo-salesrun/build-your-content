# LinkedIn Content Factory (AI)

Transform raw ideas (meeting transcripts, notes) into viral LinkedIn posts using AI.

## Stack

- **Frontend:** React (Vite) + TypeScript + Shadcn UI + Tailwind CSS
- **Backend:** Supabase (Postgres, Edge Functions, Vector)
- **AI:** OpenAI (GPT-4o, text-embedding-3-small)
- **Scraping:** Unipile (LinkedIn API)

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Environment Setup

```bash
cp .env.example .env
```

Edit `.env`:
```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### 3. Database Setup

Run migrations in Supabase SQL Editor:
- `supabase/migrations/001_initial_schema.sql`
- `supabase/migrations/002_vector_search_function.sql`

### 4. Start Dev Server

```bash
npm run dev
```

## Project Structure

```
src/
├── components/ui/     # Shadcn components
├── pages/             # Dashboard, Studio, Settings
├── lib/               # Supabase client
└── types/             # TypeScript types

supabase/
├── functions/         # Edge Functions (generate-hooks, generate-body)
└── migrations/        # SQL schema

scripts/
└── seeder.py          # Database seeder
```

## License

MIT
