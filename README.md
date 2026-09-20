# Smart Campus Hub

Automate & Secure Attendance: Reduce attendance marking timeto under 30 seconds while eliminating proxy attendance usingDynamic QR + Geofencing + Face Match. ​

Structure Free Time: Convert idle student hours into targetedlearning opportunities using dynamic timetable parsing. ​

Gamify Learning: Improve student consistency and engagementthrough XP points, milestone badges, and performance rewards. ​

Provide Instant Academic Help: Offer context-sensitive AIassistance (powered by Gemini) directly within the dashboard. ​

Deliver Institutional Intelligence: Equip faculties and administrationwith real-time analytics on attendance trends, learning habits, andtool usage. ​

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/95e88477-b76a-480c-ac4f-c78451fa1a70).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```

## Supabase foundation

Phase 1 uses Supabase Auth with cookie-backed SSR sessions and PostgreSQL with
Row Level Security. Copy `.env.example` to `.env.local` and set the Supabase
project URL and publishable key before running the app.

Apply `supabase/migrations/20260919000000_phase1_foundation.sql` to the project
before registering users. Public registration creates student accounts only;
faculty accounts must be provisioned in Supabase and assigned the `FACULTY`
role in `public.user_accounts` with a matching `faculty_profiles` row.

The browser never receives a service-role key. All application mutations run
through TanStack Start server functions and are checked against the authenticated
Supabase user as well as PostgreSQL RLS policies.
