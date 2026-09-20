# Test Credentials — منصة مفكري المستقبل

## Admin / Owner (Super Admin)
- Email: djcnnddicje@gmail.com
- Password: Admin@12345
- Role: super_admin (all permissions)

## Notes
- Students & teachers self-register at /register (must pick governorate → directorate → school).
- Auth: JWT (Bearer token stored in localStorage as `ft_token`) + httpOnly cookies. Send `Authorization: Bearer <token>`.
- Backend base: {REACT_APP_BACKEND_URL}/api

## Key auth endpoints
- POST /api/auth/register  {name,email,password,role,school_id}
- POST /api/auth/login     {email,password}  -> {user, access_token}
- GET  /api/auth/me
- POST /api/auth/logout
- POST /api/auth/refresh
- POST /api/auth/forgot-password / reset-password

## Seeded data
- 12 governorates, 31 directorates, ~124 schools
- 15 book categories, 11 clubs, 12 achievements, 12 sample approved books
