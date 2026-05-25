# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Web app (run from schoolconnect/)
npm install
npm run dev       # http://localhost:5173
npm run build
npm run preview

# No tests, no linter configured.
```

There are no mobile apps currently present in this working directory — only the web app under `schoolconnect/`.

## Architecture

SchoolConnect is a school management SaaS. One Supabase project serves as the backend for everything.

### Three roles, one web app

All three roles (Admin, Teacher, Parent) share the same React app at `schoolconnect/`. Routing is role-gated in `src/App.jsx` via `<ProtectedRoute role="...">`. On login, `profile.role` determines which path the user lands on: `/admin`, `/teacher`, or `/parent`.

```
/admin    → AdminLayout   → pages/admin/*
/teacher  → TeacherLayout → pages/teacher/*
/parent   → ParentLayout  → pages/parent/*
```

### Auth flow

`AuthContext` (`src/context/AuthContext.jsx`) is the auth layer:
1. On mount: restores the Supabase session via `getSession()`, then calls `getProfile(userId)` to fetch the `profiles` row (which includes `role`, `school_id`, and `teacher_classes`).
2. `onAuthStateChange` is kept synchronous — do not make it async; this causes `signInWithPassword` to hang in supabase-js v2.
3. Exposes `{ user, profile, login, logout, loading }`. Pages never call `supabase.auth` directly.

### Data layer — single source of truth

`DataContext` (`src/context/DataContext.jsx`) loads all app data on mount, gated by `profile.role`:
- **Teacher**: students in their class, homework, announcements, timetable.
- **Parent**: their linked student(s) via `parent_students`, then attendance, marks, homework, announcements, timetable for the first student.
- **Admin**: all students, notices, event albums.

**Critical rule**: pages and components never import from `src/lib/supabase.js` directly. All reads come from context values; all writes go through context actions (`markAttendance`, `addHomework`, etc.) which also update local state optimistically. The one exception is `TeacherMarks.jsx` which calls `upsertMarks`/`publishMarks`/`getMarksByClass` directly because mark entry is not part of DataContext.

### Database write rules (marks publish/draft pattern)

Marks have a `published` boolean. Teachers can save drafts (`published: false`) — invisible to parents. `publishMarks()` flips `published: true` for a whole class+subject+exam_type combination. `getMarksByStudent` (used by parent DataContext) always filters `published = true`.

### Admin provisioning flow

Admin creates users via the `invite-user` Supabase Edge Function (never directly via SQL). The flow for adding a student:
1. INSERT into `students` table (creates the student record with `class_id`).
2. Call `invite-user` Edge Function with `role: 'parent'` + `student_id` → function creates the auth user, triggers the profile insert via DB trigger, then inserts into `parent_students`.

For teachers: call `invite-user` with `role: 'teacher'` + `class_id` + `subject` → function inserts into `teacher_classes`.

Bulk import (CSV) works by iterating rows and calling `inviteUser()` sequentially to stay within Edge Function rate limits.

### Supabase Edge Functions (`supabase/functions/`)

| Function | Trigger | Purpose |
|---|---|---|
| `invite-user` | Admin UI | Creates auth user + links to class or student |
| `send-notification` | Called inline | Sends FCM push to school users |
| `daily-report` | Cron (weekdays 10am) | Generates attendance summaries |
| `absence-alert` | DB webhook on attendance INSERT/UPDATE | Alerts parents on absence |

### Styling

No CSS framework. Inline styles throughout, using CSS custom properties defined in `src/index.css`:
- Design tokens: `--brand`, `--surface`, `--surface-2`, `--border`, `--text`, `--text-muted`, `--text-secondary`, `--accent-green`, `--accent-red`, `--accent-green-light`, `--accent-red-light`
- Utility classes: `.card`, `.card-lg`, `.btn`, `.btn-primary`, `.btn-ghost`, `.btn-sm`, `.btn-lg`, `.btn-full`, `.badge`, `.form-input`, `.form-select`, `.form-label`, `.form-group`, `.avatar`, `.avatar-sm`, `.tabs`, `.tab`, `.animate-fade-in`

### Key database tables

`schools` → `profiles` (auth users with `role`, `school_id`) → `classes` → `teacher_classes` (links teacher to class with subject + `is_class_teacher`) → `students` → `parent_students` (links parent to student).

Data tables: `attendance`, `marks`, `homework`, `announcements`, `behaviour_logs`, `timetable`, `calendar_events`, `notices`, `message_threads`, `messages`, `fee_structures`, `student_fees`.

Migrations live in `supabase/migrations/` — run 001→004 in order in the Supabase SQL Editor for a fresh project.

### Environment

Firebase env vars in `.env` are optional (push notifications silently disabled without them). Supabase vars are required:
```
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

### Demo credentials (seeded project)

| Role | Email | Password |
|---|---|---|
| Admin | admin@stxaviers.edu.in | Admin@1234 |
| Teacher | teacher@stxaviers.edu.in | Teacher@1234 |
| Parent | parent@stxaviers.edu.in | Parent@1234 |

Seeded data: Class 10-A, students Arjun Sharma (linked to parent) and Neha Patil.
