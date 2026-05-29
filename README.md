# JobFlow

JobFlow is a full-stack job tracking project with a Node.js/Express backend and a React/Vite frontend.

## Stack

- Backend: Node.js, Express.js, Prisma ORM, MySQL, JWT, dotenv, cors, bcryptjs
- Frontend: React, Vite, Tailwind CSS, React Router, Axios, FullCalendar

## Project Structure

```text
jobflow/
+-- backend/
`-- frontend/
```

## Backend Setup

```bash
cd backend
npm install
cp .env.example .env
npx prisma validate
npx prisma generate
npx prisma migrate dev
npm run dev
```

Update `.env` with your MySQL connection string before running migrations.

If you are in the project root (`jobflow/`), Prisma commands also work because the root `prisma.config.ts` points to the backend schema:

```bash
npx prisma validate
npx prisma generate
npx prisma migrate dev
```

The API runs on `http://localhost:5000` by default.

For production CORS, set `FRONTEND_URLS` on the backend to every frontend origin that should be allowed:

```env
FRONTEND_URLS=https://www.jobflow.thefuturepower.com,https://jobflow.thefuturepower.com
```

## Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

The frontend runs on the Vite URL shown in the terminal, usually `http://localhost:5173`.

To point the frontend at a different API URL, create `frontend/.env`:

```env
VITE_API_URL=http://localhost:5000/api
```

## API Routes

- `GET /health`
- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/users/me`
- `GET /api/customers`
- `GET /api/customers/:id`
- `POST /api/customers`
- `PUT /api/customers/:id`
- `DELETE /api/customers/:id`
- `POST /api/call-logs`
- `GET /api/customers/:id/call-logs`
- `GET /api/jobs`
- `GET /api/jobs/calendar`
- `POST /api/jobs`
- `PUT /api/jobs/:id`
- `PUT /api/jobs/:id/complete`
- `GET /api/followups/pending`
- `PUT /api/followups/:id/done`
