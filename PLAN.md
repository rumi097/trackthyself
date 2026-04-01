# TrackThyself - Master Architecture & Project Plan

## 1. Product Vision & Scope
A responsive, mobile-first web application designed specifically for Bangladesh Class 11-12 Science students. The app goes beyond standard task management by seamlessly integrating daily/weekly routines with academic syllabus tracking, focus tools (Pomodoro), gamification, and exam analytics. An Admin "God View" provides total visibility into student progress for mentoring and tutoring purposes.

## 2. Recommended Tech Stack
- **Frontend Framework:** Next.js (App Router, React 18)
- **Styling:** Tailwind CSS & `shadcn/ui` (for fast, accessible, responsive components)
- **Database:** PostgreSQL (using Supabase or Neon for easy hosting)
- **ORM:** Prisma (type-safe database access)
- **Authentication:** NextAuth.js (Auth.js) - Credentials Provider (ID & Password)
- **Charts & Analytics:** Recharts (React chart library for growth analytics)
- **State Management:** Zustand (for Pomodoro timer state across the app)
- **Deployment:** Vercel

## 3. Database Schema Design (Prisma Model Idea)

### Users & Roles
- **User:** `id`, `identifier` (e.g., stu101), `passwordHash`, `role` (ADMIN, STUDENT), `name`, `createdAt`
- **StudentProfile:** `id`, `userId`, `targetUniversity`, `currentStreak`, `longestStreak`, `totalFocusMinutes`

### Syllabus Engine
- **Subject:** `id`, `name`, `isDefault` (true for HSC Science subjects)
- **Chapter:** `id`, `subjectId`, `name`, `isDefault`, `order`

### Routine & Tasks
- **Task:** `id`, `studentId`, `title`, `chapterId` (optional), `type` (WEEKLY_RECURRING, SINGLE_DAY), `dayOfWeek` (0-6), `startTime`, `endTime`, `date` (if specific), `isCompleted`, `createdAt`
- **DailyLog:** `id`, `studentId`, `date`, `totalTasks`, `completedTasks`, `completionPercentage`

### Exams & Analytics
- **Exam:** `id`, `studentId`, `title`, `date`, `subjectId`, `totalMarks`, `obtainedMarks`, `notes`

### Productivity
- **FocusSession (Pomodoro):** `id`, `studentId`, `taskId` (optional), `durationMinutes`, `completedAt`
- **Badge:** `id`, `studentId`, `badgeType` (e.g., "7_DAY_STREAK", "PHYSICS_MASTER"), `awardedAt`

## 4. Application Architecture (Core Pages)

### Authentication
- `/login` - Simple ID/Password login

### Student App
- `/student/dashboard` - Today's completion %, active streaks, upcoming exam countdown, current Focus standard.
- `/student/routine` - Weekly grid view and interactive Daily hourly view (Drag/drop or time-block UI).
- `/student/syllabus` - HSC subjects breakdown. Progress bars per subject based on completed chapter tasks. Add custom subjects/chapters (+ button).
- `/student/exams` - Exam entry form. Recharts line/bar graphs showing study hours vs. marks timeline.
- `/student/focus` - Dedicated Pomodoro timer screen (25/5 min cycles) with task selection.

### Admin App
- `/admin/dashboard` - Table of all students. Aggregate stats (average completion %).
- `/admin/student/[id]` - Read-only "God View" of a specific student's full dashboard, routines, and marks.

## 5. Pre-Seeded Data (BD Class 11-12 Science)
The database will be initialized with:
- **Physics 1st Paper:** Physical World & Measurement, Vector, Dynamics, Newtonian Mechanics...
- **Physics 2nd Paper:** Thermodynamics, Static Electricity, Current Electricity...
- **Chemistry 1st Paper:** Safe Use of Laboratory, Qualitative Chemistry...
- **Chemistry 2nd Paper:** Environmental Chemistry, Organic Chemistry...
- **Higher Math 1st & 2nd Papers**
- **Biology 1st (Botany) & 2nd (Zoology) Papers**

## 6. Implementation Phases (Step-by-Step Roadmap)

**Phase 1: Project Initialization & Architecture setup**
- Initialize Next.js, Tailwind, Prisma, and NextAuth.
- Setup PostgreSQL database and generate initial Prisma schema.
- Seed the database with the Admin account, 2 Student accounts (stu101, stu102), and the BD HSC Science Syllabus.

**Phase 2: Authentication & Core Layouts**
- Build `/login` page.
- Setup protected routes (middleware.ts).
- Create responsive layouts (Sidebar for Desktop, Bottom navigation for Mobile). Implement Dark Mode toggle.

**Phase 3: Syllabus & Routine Engine (The Core)**
- Build the Syllabus view (read/add custom chapters).
- Build the Daily/Weekly Routine UI (Time-blocking layout).
- Implement task creation, editing, and completion toggles.
- Calculate and store daily completion percentages.

**Phase 4: Exam Tracker & Analytics**
- Build the Exam management UI (Add/Edit past or future exams).
- Implement Upcoming Exam Countdown widget on the dashboard.
- Integrate Recharts to map Daily/Weekly completion % against Exam Marks.

**Phase 5: Productivity & Gamification**
- Build the Pomodoro Timer component (Zustand state).
- Implement Streak logic (Cron job or on-login check for previous day's >80% completion).
- Design and award basic badges.

**Phase 6: Admin God View**
- Build the Admin dashboard listing all students.
- Re-use Student components (read-only mode) to render the exact student view for the Admin.

---
*Created by AI - April 2026*