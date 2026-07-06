# Hostinger deployment — abrajtex.com

## Database (.env)

Hostinger MySQL names are **lowercase**. Use exactly what hPanel shows:

```env
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_DATABASE=u692458824_abrajetex
DB_USERNAME=u692458824_abrajetex
DB_PASSWORD="Abraje@123"
```

Quote `DB_PASSWORD` if it contains special characters (`@`, `#`, `>`, etc.).

After any `.env` change:

```bash
cd ~/domains/abrajtex.com/abrajtex/backend
php artisan config:clear
php artisan cache:clear
php artisan config:cache
```

## App URLs

```env
APP_ENV=production
APP_DEBUG=false
APP_URL=https://abrajtex.com
FRONTEND_URL=https://abrajtex.com
```

## Website login (not MySQL)

| Email | Password |
|-------|----------|
| `admin@abrajetex.com` | `AbrajTex2026!` |

## Frontend → API

The React app uses `VITE_API_URL=/api` (same domain). Requests go to `public_html/api.php` → Laravel.

## Common errors

| Error | Cause | Fix |
|-------|-------|-----|
| `Access denied for user 'u692458824_AbrajTex'` | Wrong username case in `.env` or stale config cache | Use `u692458824_abrajetex`, run `config:clear` + `config:cache` |
| `Identifiants incorrects` | Wrong **app** password (not MySQL) | Use `AbrajTex2026!` or run `php fix-admin.php` |
| `Server Error` on login | DB not connected | Fix `DB_*` in `.env`, clear config cache |

## Reset admin password (SSH)

```bash
php ~/domains/abrajtex.com/abrajtex/fix-admin.php
```

(Copy `deploy/fix-admin.php` to the server first if needed.)
