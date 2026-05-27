# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Web app (from schoolconnect/)
npm install
npm run dev       # http://localhost:5173
npm run build
npm run preview

# There are no tests and no linter configured.
```

## Architecture

SchoolConnect is a school management platform with three separate apps sharing one Supabase backend:

| App | Directory | Users |
|-----|-----------|-------|
| Web (React + Vite) | `schoolconnect/` | Admin, Teacher, Parent |
| Parent mobile (Expo) | `schoolconnect-mobile/` | Parents |
| Teacher mobile (Expo) | `schoolconnect-teacher/` | Teachers |

### Web app structure

```
src/
  context/
    AuthContext.jsx   ← Supabase auth, session restore, FCM setup
    DataContext.jsx   ← All app data + write actions, role-aware loading
  lib/
    supabase.js       ← All Supabase queries (the single data layer)
    firebase.js       ← FCM push notifications (optional; gracefully disabled if unconfigured)
  pages/
    auth/LoginPage    ← Single login page with role-based redirect on success
    admin/            ← Admin-only pages
    teacher/          ← Teacher-only pages
    parent/           ← Parent-only pages
  components/
    layout/           ← Role-specific layouts (AdminLayout, TeacherLayout, ParentLayout) + shared Sidebar
    shared/           ← NotificationToast
```

### Auth & routing flow

- `AuthProvider` (wraps entire app) restores the Supabase session on mount, fetches the user's `profiles` row (which includes `role`, `school_id`, and `teacher_classes`), and exposes `{ user, profile, login, logout, loading }`.
- `ProtectedRoute` in `App.jsx` gates each route section by `profile.role`. While `loading` is true it shows a spinner — this prevents flash-redirects to `/login` on page refresh.
- On login success, the app reads `user.user_metadata.role` to navigate to `/admin`, `/teacher`, or `/parent`.

### Data layer

`DataContext` is the single source of truth for all app data. It loads everything on mount based on `profile.role`:

- **Teacher**: loads students, homework, announcements, timetable for their primary class (`teacher_classes` join, preferring `is_class_teacher=true`).
- **Parent**: loads their linked students via `parent_students`, then loads attendance, marks, homework, announcements, behaviour logs, timetable for the first student.
- **Admin**: loads all students, notices, event albums for the school.

All Supabase queries live exclusively in `src/lib/supabase.js`. Pages and components call context actions (`markAttendance`, `addHomework`, etc.) — they never import from `supabase.js` directly. The one intentional exception is `TeacherMarks.jsx`, which calls `upsertMarks`, `publishMarks`, and `getMarksByClass` directly because mark entry/publishing is not managed by DataContext.

### Styling

No CSS framework. All styles use inline styles + a global utility class system defined in `src/index.css`. CSS custom properties (`--brand`, `--surface`, `--border`, etc.) are the design tokens — use these instead of hardcoded colours. Common utility classes: `.card`, `.btn`, `.btn-primary`, `.badge`, `.form-input`, `.avatar`, `.stat-card`, `.skeleton`.

### Database schema

Migrations live in `supabase/migrations/` — run them in order (001→004) in the Supabase SQL Editor for a fresh project. Key tables: `schools`, `profiles` (auth users), `classes`, `teacher_classes`, `students`, `parent_students`, `attendance`, `marks`, `homework`, `announcements`, `behaviour_logs`, `notices`, `message_threads`, `messages`, `timetable`, `calendar_events`, `fee_structures`, `student_fees`.

### Admin provisioning flow

New users are never created via direct SQL. The flow:
- **Adding a student**: INSERT into `students` first (get `student_id`), then call `invite-user` Edge Function with `role: 'parent'` + `student_id`. The function creates the auth user and links them via `parent_students`.
- **Adding a teacher**: call `invite-user` with `role: 'teacher'` + `class_id` + `subject`. The function creates the auth user and inserts into `teacher_classes`.
- **Bulk CSV import**: `AdminUsers.jsx` iterates rows sequentially (not in parallel) and calls `inviteUser()` per row to respect Edge Function rate limits.
- **Teacher multi-class assignment**: use `getTeacherAssignments`, `addTeacherAssignment`, `removeTeacherAssignment` from `supabase.js` — these operate directly on `teacher_classes`.

### Marks publish/draft pattern

`marks` rows have a `published` boolean. Teachers save drafts (`published: false`, invisible to parents). `publishMarks(classId, subject, examType)` flips all matching rows to `published: true`. `getMarksByStudent` always filters `eq('published', true)` — parents only ever see published marks.

### Edge Functions

Four Supabase Edge Functions in `supabase/functions/`:
- `invite-user` — called by admin to create new auth users (validates caller is admin of the same school)
- `send-notification` — sends FCM push to school users
- `daily-report` — cron job (weekdays 10am) generating attendance summaries
- `absence-alert` — database webhook triggered on attendance INSERT/UPDATE

### Environment variables

Firebase values in `.env` are optional placeholders — the app works without them (push notifications silently disabled). Supabase values are required.
