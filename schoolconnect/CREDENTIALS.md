# SchoolConnect — Demo Credentials

These are the credentials to use after following SETUP.md to seed the database.

## Web App (http://localhost:5173)

| Role    | Email                       | Password    |
|---------|-----------------------------|-------------|
| Admin   | admin@stxaviers.edu.in      | Admin@1234  |
| Teacher | teacher@stxaviers.edu.in    | Teacher@1234|
| Parent  | parent@stxaviers.edu.in     | Parent@1234 |

> Passwords are set by YOU when creating users in Supabase Auth → Users.
> Use the passwords above as a convention, or set your own.

## Mobile Apps (Expo Go — scan QR after `npx expo start`)

### Parent App (`schoolconnect-mobile/`)
- Same email/password as parent above

### Teacher App (`schoolconnect-teacher/`)
- Same email/password as teacher above

## What each role sees

**Admin** → Dashboard stats, manage users (invite teachers/parents), noticeboard, timetable, calendar, fees, settings

**Teacher** → Dashboard, mark attendance, enter marks, view students, analytics, chat with parents

**Parent** → Dashboard, view child's attendance, marks, chat with teacher, analytics showing child's class rank
