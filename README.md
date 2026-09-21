# منصة مفكري المستقبل — Future Thinkers Platform

منصة معرفية وطنية أردنية لجميع الطلاب: كتب، حوار، شطرنج، برمجة، علوم، قراءة، ابتكار، مناظرات، أدب، ريادة أعمال، فعاليات، مسابقات، وقوائم صدارة وطنية.

## Architecture
- **Frontend:** React 19 + React Router + TailwindCSS + shadcn/ui + Recharts + chess.js (Arabic RTL).
- **Backend:** FastAPI (modular routers) + MongoDB (motor). JWT auth + RBAC permissions.
- **Storage:** Deployment-neutral local file adapter (`storage.py`); DB is source of truth.

### Backend modules (`backend/routes/`)
auth, geo (Kingdom→Governorate→Directorate→School), books (+reader/reviews/approval),
community (clubs+dialogue forum), chess (challenges/games/ELO), events+competitions,
leaderboard+gamification (XP/levels/badges/achievements/streak), social (notifications/search/profile/dashboard),
content (news/activities/reports moderation), admin (users/RBAC/analytics/CMS/points/audit/broadcast).

## Setup
```
cd backend && pip install -r requirements.txt
cd frontend && yarn install
```
Services run via supervisor (backend :8001, frontend :3000). Data auto-seeds on startup.

## Environment variables (backend/.env)
See `.env.example`. Never commit real secrets.
MONGO_URL, DB_NAME, JWT_SECRET, ADMIN_EMAIL, ADMIN_PASSWORD, TELEGRAM_BOT_TOKEN, TELEGRAM_GROUP_ID.

## Roles & Permissions
student, teacher, school_admin, directorate_admin, moderator, admin, super_admin — granular permissions enforced server-side via `require_permission`.

## Security
bcrypt hashing, JWT access+refresh, brute-force lockout, pydantic validation, file MIME/size checks, server-side authorization, global error handler, audit logs.

## API docs
FastAPI OpenAPI docs at `/docs`.
