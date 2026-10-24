# ReqHub

A **reverse marketplace** where buyers post what they need and local providers compete with quotes, instead of buyers searching through listings.

**Live demo:** https://req-hub.vercel.app
**API docs (Swagger):** https://reqhub-api.onrender.com/docs


> The backend runs on a free hosting tier and sleeps after 15 minutes of inactivity. The first request after a break can take about a minute while it wakes up.

---

## The problem

Most online marketplaces are seller-driven: sellers list, buyers search. That works when you know exactly what to search for, but it breaks down for needs that are urgent, location-based or highly specific, such as "AC repair in Kakkanad today" or "100 chairs for an event this evening".

## The idea

ReqHub reverses the flow:

> Buyer posts a need → providers send competing quotes → buyer accepts one.

## Features

**Requesters**
- Register and log in (JWT authentication)
- Post a need with category, location and an expiry time
- Compare quotes, sorted by price, with each provider's rating
- Accept one quote (all other quotes on that request are rejected automatically)
- Chat with the chosen provider
- Mark the job complete and rate the provider

**Providers**
- Browse open requests, filtered by category and location
- Send one quote per request (price, arrival time, message)
- Track quote status in "My Jobs"
- Chat with the requester once the quote is accepted
- Rate the requester after completion

**System behaviour**
- Requests expire automatically once their time passes
- Chat opens only after a quote is accepted, and only the two people involved can read it
- Ratings open only after the job is completed, one per person per job, and each user's average rating is recalculated from all their ratings

- Location picker with an interactive map: search a place, click the map or drag a pin; coordinates are saved with each request
- Email notification to the requester when a provider sends a quote (HTTP email API)
- Ratings are one-way: requesters rate providers, and provider profiles show reviews
- Complaint box: requesters file complaints that only the admin can read and resolve

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | React (Vite), React Router, Axios |
| Backend | Python, FastAPI, Pydantic |
| Database | PostgreSQL, SQLAlchemy ORM |
| Auth | JWT, bcrypt password hashing |
| Hosting | Vercel (frontend), Render (backend), Neon (database) |

## Architecture

```
React (Vercel)  --HTTPS/JSON-->  FastAPI (Render)  --SQLAlchemy-->  PostgreSQL (Neon)
```

## Database design

Five tables: `users`, `requests`, `quotes`, `messages`, `ratings`.

![ER diagram](docs/03_ER_Diagram.png)

Key decisions:
- Status fields are `VARCHAR` with `CHECK` constraints, so the database rejects invalid values but new statuses are easy to add.
- Foreign keys use `ON DELETE CASCADE`, so no orphaned quotes or messages are left behind.
- Location is stored as text (for example "Kakkanad, Kochi") and matched with a case-insensitive search. Coordinates were left for a later version.
- Indexes on `email`, `category` and `location`, the fields used most in lookups.

## Notable engineering details

- **Accepting a quote is one transaction.** The chosen quote becomes `accepted`, the other pending quotes become `rejected`, and the request becomes `accepted`. The request row is locked (`SELECT ... FOR UPDATE`) so two simultaneous accepts cannot both succeed.
- **Authorization is enforced on the server.** Ownership and participation are checked on every route (for example only the requester can accept a quote or mark a job complete). The frontend hides buttons for convenience, but the backend is what protects the data.
- **Least exposure.** Providers see only the data they need: quote lists return a public provider profile with no email or phone, and password hashes never appear in any response.
- **Input validation** with Pydantic on every request body: allowed categories, positive prices, star range 1 to 5, expiry times in the future.
- **Secrets stay out of Git.** Database URL and signing key are environment variables.

## API overview

Interactive docs are available at `/docs` on the deployed backend.

| Method | Route | Purpose |
|---|---|---|
| POST | `/auth/register` | Create an account |
| POST | `/auth/login` | Get a JWT |
| GET | `/auth/me` | Current user |
| POST | `/requests/` | Post a need |
| GET | `/requests/` | List open requests (`category`, `location`, `skip`, `limit`) |
| GET | `/requests/mine` | My posted requests |
| GET | `/requests/{id}` | Request details |
| PATCH | `/requests/{id}/cancel` | Cancel own request |
| POST | `/requests/{id}/quotes` | Provider sends a quote |
| GET | `/requests/{id}/quotes` | Requester views quotes |
| GET | `/quotes/mine` | My quotes |
| PATCH | `/quotes/{id}/accept` | Accept a quote |
| GET / POST | `/requests/{id}/messages` | Read or send chat messages |
| PATCH | `/requests/{id}/complete` | Mark job complete |
| POST | `/requests/{id}/rate` | Rate the other party |

## Run it locally

**Prerequisites:** Python 3.12+, Node.js 20+, PostgreSQL

**Backend**
```bash
cd backend
python -m venv venv
venv\Scripts\activate          # Windows (use: source venv/bin/activate on Mac/Linux)
pip install -r requirements.txt
```
Create `backend/.env`:
```
DATABASE_URL=postgresql+psycopg2://USER:PASSWORD@localhost:5432/reqhub
SECRET_KEY=generate-a-long-random-string
```
Create the tables and start the server:
```bash
python create_tables.py
uvicorn app.main:app --reload
```

**Frontend**
```bash
cd frontend
npm install
npm run dev
```
Open `http://localhost:5173`. By default the frontend calls `http://127.0.0.1:8000`; set `VITE_API_URL` to point somewhere else.

## Screenshots

_Add screenshots here: login, request feed, request detail with quotes, chat, rating._

## Known limitations

- The chat uses polling (every 4 seconds), not WebSockets.
- Location is text matching, not distance-based.
- Tables are created with `create_all`; there are no migrations yet.
- No automated tests yet.
- Expired requests are updated when requests are read, not by a background job.
- Free-tier hosting means a slow first request after idle time.
- Map search uses OpenStreetMap's free search service, so heavy use needs a different geocoder
- Notification emails come from an unverified sender domain and can land in spam
- The admin is identified by an environment variable; a production system would use a role column

## Future improvements

- WebSocket chat and real-time "new request near you" notifications
- Distance-based search using coordinates
- Alembic database migrations
- Automated tests and CI
- Provider verification and an admin dashboard
- Background job for request expiry
- Image uploads on requests

## Author

Asalakshmi — built as a full-stack learning project.