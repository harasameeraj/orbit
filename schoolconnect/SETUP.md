# SchoolConnect — Complete Setup Guide

## Project structure

```
schoolconnect/
├── src/                          ← React web app (Vite)
├── schoolconnect-mobile/         ← Parent mobile app (Expo)
├── schoolconnect-teacher/        ← Teacher mobile app (Expo) ← NEW
├── supabase/
│   ├── migrations/               ← Run these in order in Supabase SQL Editor
│   └── functions/                ← Edge Functions (deploy via Supabase CLI)
├── public/firebase-messaging-sw.js
├── CREDENTIALS.md                ← Demo login credentials
└── SETUP.md                      ← This file
```

---

## Step 1 — Supabase setup

1. Go to https://supabase.com → New project
2. Copy **Project URL** and **anon key** → you'll need these in .env files
3. Go to **SQL Editor** → run these migration files IN ORDER:
   - `supabase/migrations/001_initial_schema.sql`
   - `supabase/migrations/002_storage_buckets.sql`
   - `supabase/migrations/003_timetable_and_calendar_fixes.sql`
   - `supabase/migrations/004_fee_management.sql`

4. Seed a school:
```sql
INSERT INTO schools (name, address, academic_year)
VALUES ('St. Xavier''s International Academy',
        'Plot No. 42, Knowledge Park III, Mumbai 400001',
        '2024-2025')
RETURNING id;
```
Save the returned UUID as `YOUR_SCHOOL_UUID`.

---

## Step 2 — Create demo users

Go to Supabase Dashboard → **Authentication → Users → Add user**

Create 3 users. For each, set the **User metadata** JSON:

**Admin**
- Email: `admin@stxaviers.edu.in` / Password: `Admin@1234`
- Metadata: `{ "role": "admin", "school_id": "YOUR_SCHOOL_UUID", "name": "Sarah Johnson" }`

**Teacher**
- Email: `teacher@stxaviers.edu.in` / Password: `Teacher@1234`
- Metadata: `{ "role": "teacher", "school_id": "YOUR_SCHOOL_UUID", "name": "Mr. Rajesh Iyer" }`

**Parent**
- Email: `parent@stxaviers.edu.in` / Password: `Parent@1234`
- Metadata: `{ "role": "parent", "school_id": "YOUR_SCHOOL_UUID", "name": "Mr. Sunil Sharma" }`

Then run in SQL Editor (replace UUIDs with your actual values):
```sql
-- Create a class
INSERT INTO classes (school_id, name, grade, section)
VALUES ('YOUR_SCHOOL_UUID', '10-A', '10', 'A')
RETURNING id;   -- save as CLASS_UUID

-- Link teacher to class
INSERT INTO teacher_classes (teacher_id, class_id, school_id, subject, is_class_teacher)
VALUES ('TEACHER_USER_UUID', 'CLASS_UUID', 'YOUR_SCHOOL_UUID', 'Mathematics', true);

-- Add a student
INSERT INTO students (school_id, class_id, name, roll_no, father_name)
VALUES ('YOUR_SCHOOL_UUID', 'CLASS_UUID', 'Arjun Sharma', '10A01', 'Mr. Sunil Sharma')
RETURNING id;   -- save as STUDENT_UUID

-- Link student to parent
INSERT INTO parent_students (parent_id, student_id, school_id)
VALUES ('PARENT_USER_UUID', 'STUDENT_UUID', 'YOUR_SCHOOL_UUID');
```

---

## Step 3 — Firebase setup

1. Go to https://console.firebase.google.com → New project
2. Add a **Web app** → copy config values
3. Project Settings → Cloud Messaging → Web Push certificates → Generate → copy VAPID key
4. **Important:** Open `public/firebase-messaging-sw.js` and hardcode your Firebase config directly (service workers can't read env vars)
5. For mobile apps: add Android app (`com.schoolconnect.app`) and iOS app, download `google-services.json` and `GoogleService-Info.plist`

---

## Step 4 — Environment files

**Web app** — copy `src/.env.example` to `src/.env` and fill in:
```
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
VITE_FIREBASE_VAPID_KEY=...
```

**Parent mobile** (`schoolconnect-mobile/.env`):
```
EXPO_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

**Teacher mobile** (`schoolconnect-teacher/.env`):
```
EXPO_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

---

## Step 5 — Deploy Edge Functions

```bash
npm install -g supabase
supabase login
supabase link --project-ref YOUR_PROJECT_REF

supabase secrets set FCM_SERVER_KEY=your_fcm_server_key
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
supabase secrets set SUPABASE_ANON_KEY=your_anon_key
supabase secrets set SITE_URL=https://your-domain.com

supabase functions deploy daily-report
supabase functions deploy absence-alert
supabase functions deploy send-notification
supabase functions deploy invite-user
```

**Cron job** — Supabase Dashboard → Edge Functions → daily-report → Add Schedule:
`0 10 * * 1-5`

**Absence webhook** — Database → Webhooks → Create:
- Table: `attendance`, Events: INSERT + UPDATE
- URL: `https://YOUR_PROJECT.supabase.co/functions/v1/absence-alert`

---

## Step 6 — Run everything

```bash
# Web app
cd schoolconnect
npm install
npm run dev
# → http://localhost:5173

# Parent mobile app
cd schoolconnect-mobile
npm install
npx expo start   # scan QR with Expo Go

# Teacher mobile app
cd schoolconnect-teacher
npm install
npx expo start   # scan QR with Expo Go
```

---

## Three apps — one Supabase project

All three apps share the **same database**, same auth, same real-time chat. No duplication.

| App | Who uses it | How to run |
|-----|------------|------------|
| Web (`/`) | Admin, Teacher, Parent | `npm run dev` |
| `schoolconnect-mobile/` | Parents | `npx expo start` |
| `schoolconnect-teacher/` | Teachers | `npx expo start` |

See `CREDENTIALS.md` for login details.
