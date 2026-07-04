# AbrajTex — Textile Import Management

Full-stack inventory and sales management for **ABRAJE TEX**, a textile import wholesaler (containers from China, fabric roll sales to clients).

## Stack

| Layer | Technology |
|-------|------------|
| Backend API | Laravel 12 + Sanctum |
| Frontend | React 19 + Vite + TypeScript + Tailwind CSS 4 |
| Database | MySQL 8 |

## Features

- Container arrival & stock by fabric type
- Roll-based sales with manual m² quantities
- Invoices (PDF) with HT / TVA / TTC breakdown
- Clients, payments, dashboard, activity log

## Local development

### 1. MySQL (Docker)

```bash
docker compose --env-file .env.docker up -d
```

### 2. Backend

```bash
cd backend
composer install
cp .env.example .env
php artisan key:generate
```

Set in `.env`:

```env
DB_PASSWORD=secret
ADMIN_PASSWORD=password
FRONTEND_URL=http://localhost:5173
```

Then:

```bash
php artisan migrate --seed
php artisan serve
```

API: **http://localhost:8000**

### 3. Frontend

```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

App: **http://localhost:5173**

## Production deployment

### Backend

1. Copy `backend/.env.example` → `backend/.env`
2. Set at minimum:

```env
APP_ENV=production
APP_DEBUG=false
APP_URL=https://your-api-domain.com

DB_*=...
FRONTEND_URL=https://your-app-domain.com

ADMIN_EMAIL=admin@your-domain.com
ADMIN_PASSWORD=your-strong-password
```

3. Run:

```bash
cd backend
composer install --no-dev --optimize-autoloader
php artisan key:generate
php artisan migrate --force
php artisan db:seed --force
php artisan config:cache
php artisan route:cache
php artisan view:cache
php artisan storage:link
```

4. Point the web server document root to `backend/public`.

5. Place the company logo at `backend/public/images/logo.png` (used on invoice PDFs).

### Frontend

```bash
cd frontend
cp .env.example .env
```

Set `VITE_API_URL` to your API URL (e.g. `https://api.example.com/api`), then:

```bash
npm ci
npm run build
```

Serve the `frontend/dist` folder with your web server (or copy it behind the same domain as the API with a reverse proxy).

### After deploy

- Log in with `ADMIN_EMAIL` / `ADMIN_PASSWORD`
- Create additional users from the admin panel if needed
- **Do not** run seeders again in production unless you intend to reset the admin password

## Project structure

```
AbrajTex/
├── backend/          Laravel API
├── frontend/         React SPA
├── docker-compose.yml
├── .env.docker       MySQL credentials for Docker
└── README.md
```

## Repository

https://github.com/Pandox03/AbrajTex
