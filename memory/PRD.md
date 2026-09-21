# PRD — منصة مفكري المستقبل (Future Thinkers Platform)

## Original problem statement
Build a large, production-ready Arabic RTL national knowledge platform for all students in Jordan.
Real, backend-connected features only (no placeholders/mocks). Modules: auth+RBAC, national hierarchy,
books library + reader + upload/approval, clubs (chess, dialogue forum, +others), chess w/ ELO, discussions,
events, competitions, multi-level leaderboards, gamification, notifications, moderation/reports, admin CMS, search.

## Architecture
- Frontend: React 19, React Router, Tailwind + shadcn/ui, Recharts, chess.js, Arabic RTL, framer-motion utilities.
- Backend: FastAPI modular routers + MongoDB (motor). JWT (Bearer + httpOnly cookie) + RBAC granular permissions.
- Storage: Deployment-neutral local file adapter (env-only secrets). DB = source of truth.

## User personas
Student, Teacher, School Admin, Directorate Admin, Moderator, Admin, Super Admin.

## Core requirements (static)
Kingdom→Governorate→Directorate→School→Student hierarchy; real approval workflows; XP/levels/badges;
server-side authorization; audit logs; dynamic landing stats.

## Implemented (2026-06)
- Auth: register/login/logout/refresh/forgot/reset/change-password, bcrypt, brute-force lockout, RBAC (7 roles + granular perms).
- Geo: 12 governorates, 31 directorates, ~124 schools seeded; school-change request+approval.
- Books: list/filter/sort/paginate, detail, PDF reader (iframe + progress), favorites, reviews/ratings, recommendations (interest-based), upload (multipart) + moderation approve/reject.
- Clubs: 11 clubs, join/leave, members; Dialogue forum: discussions/replies/likes/follow/report/delete.
- Chess: quick-match + direct challenge/accept/decline, real board (chess.js legality), turn validation, ELO, resign, leaderboard, history (polling sync).
- Events: create (perm), register + QR code + waitlist, participants, check-in.
- Competitions: quiz engine w/ questions, register, submit+scoring, leaderboard.
- Leaderboards: student national (all/weekly/monthly/yearly) + schools/directorates/governorates aggregates.
- Gamification: XP/levels/level-titles, badges, achievements (auto-unlock), daily streak checkin, editable points config.
- Notifications center (unread count, mark-all-read), global search, public profiles, student dashboard aggregate.
- Content: news, activities gallery (+approval), reports + moderation resolution.
- Admin: overview + analytics charts, user mgmt (role/status/xp), permissions view, points CMS, landing CMS, audit logs, broadcast.
- Security: pydantic validation, file MIME/size checks, global error handler, audit logging, sole-super_admin demotion guard.

## Testing
31/31 backend pytest passed; frontend smoke of all critical flows passed (iteration_1.json).

## Backlog / remaining (P1/P2)
- P1: WebSocket real-time (currently polling) for chess/notifications; email verification delivery (Resend).
- P1: per-club specialized features (coding judge, debate rounds, innovation project voting) — currently unified forum+competitions.
- P2: Telegram token wiring for file mirroring; recommendation via LLM; SEO sitemap/OG; dark mode; certificates PDF for competitions.

## Next tasks
Wire Telegram credentials when provided; add real-time via WebSockets; expand club-specific mechanics.

## Implemented (2026-06, iteration 2)
- Real-time WebSockets: /api/ws/notifications + /api/ws/chess/{id} (with polling fallback retained).
- Telegram file mirroring wired (TELEGRAM_BOT_TOKEN/GROUP_ID in env) — book uploads mirror to Telegram group, best-effort.
- Green/emerald modern theme across landing, auth, navbar, buttons (primary token → emerald; new ft-hero-gradient).
- نادي البرمجة: real Python code judge (subprocess, sandboxed, timeouts, test cases) + submissions + coding leaderboard (4 seeded problems).
- نادي الابتكار: projects + upvoting (one-time XP per voter). نادي المناظرات: debate topics with two sides, side voting, arguments.
- PDF certificates (reportlab + Amiri Arabic font) for competition participants and event attendees — downloadable from UI.
- Responsive hardening: Admin dashboard (grid minmax(0,1fr) + min-w-0 + overflow-x-auto tables + overflow-x-hidden) fixed mobile/tablet overflow.
- Tested: 10/10 new backend tests + regression; all new UI flows verified.

