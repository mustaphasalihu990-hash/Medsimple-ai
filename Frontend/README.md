# MedEase AI frontend

The frontend uses Supabase for authentication, the public learning catalog, account preferences, bookmarks, quiz attempts, lesson completion, and dashboard activity.

## Configure Supabase

Create `Frontend/.env.local` with the project URL and a **publishable** key from the Supabase dashboard:

```dotenv
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-supabase-publishable-key
VITE_API_URL=http://localhost:5000
```

Do not put a Supabase secret/service-role key in frontend environment variables. Frontend keys are public; access to user data is restricted by the database row-level security policies.

The Q&A and problem-solving assistant uses the backend at `VITE_API_URL`. Configure `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY` in `BackEnd/.env` so it can verify signed-in sessions. Keep `AI_API_KEY` only in the backend environment.

Add `http://localhost:5173/auth/login` and `http://localhost:5173/auth/reset` to the Supabase Auth redirect URL allow-list for email confirmation and password recovery. For production, add the deployed app's equivalent URLs.

## Apply the database schema and content

From the repository root, link the Supabase CLI to the intended project if needed, then apply the migration:

```powershell
npx supabase link --project-ref your-project-ref
npx supabase db push
```

The migration in `../supabase/migrations/` creates the catalog and user-data tables, applies row-level security, and inserts the current learning catalog, courses, lesson, resources, and quiz questions. It is safe to apply to a project with no app tables; it does not delete existing data.

The verified seed contains practice questions, but no videos, handout files, or authenticated past-exam questions. Add reviewed video metadata to `tutorial_videos`, material metadata linked to the private `learning-materials` bucket to `learning_materials`, and only source-verified examination items with `source_type = 'past_exam'`. No sample media URLs or unofficial questions are seeded.

## Run the frontend

```powershell
cd Frontend
npm install
npm run dev
```

Sign-up, login, and password recovery use Supabase Auth. Learning pages require a signed-in user. Learning catalog content is read from Supabase; progress, bookmarks, quiz answers, and preferences are saved to that user's account.

The AI tutor is not yet connected to an AI backend. Demo replies have been removed so it does not present sample answers as real AI responses.
