# MapLeads - Full Stack Application

A SaaS platform for agencies to generate and manage local business leads from Google Maps, with FastAPI backend and Next.js frontend, fully containerized with Docker.

## 🏗️ Architecture

- **Backend**: FastAPI (Python) - REST API with JWT authentication
- **Frontend**: Next.js 16 (React) - Modern React framework
- **Database**: PostgreSQL 15
- **Cache/Queue**: Redis 7
- **Worker**: Celery for async tasks
- **Containerization**: Docker & Docker Compose

## 🚀 Quick Start

### Prerequisites

- Docker and Docker Compose installed
- Git

### 1. Clone the Repository

```bash
git clone <repository-url>
cd map-leads
```

### 2. Set Up Environment Variables

#### Backend Environment

```bash
# Copy backend environment file
cp backend/.env.example backend/.env

# Edit backend/.env and add your configuration
# At minimum, you'll need:
# - RESEND_API_KEY (for email functionality)
# - SECRET_KEY (for JWT tokens)
```

#### Frontend Environment

```bash
# Create frontend/.env file
cat > frontend/.env << EOF
API_URL=http://api:8000
API_KEY=your-api-key-here
NODE_ENV=production
EOF
```

### 3. Start All Services

```bash
# From the root directory
docker-compose up -d
```

This will start:
- Backend API (port 8000)
- Frontend (port 3000)
- PostgreSQL database (port 5432)
- Redis (port 6379)
- Celery worker

### 4. Create an API Key

Before the frontend can communicate with the backend, you need to create an API key:

```bash
# Create an API key for the frontend
docker-compose exec api python scripts/create_api_client.py --name "frontend"
```

**Important**: Copy the API key from the output and update `frontend/.env`:

```bash
API_KEY=your-actual-api-key-here
```

Then restart the frontend:

```bash
docker-compose restart frontend
```

### 5. Access the Application

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **API Documentation**: http://localhost:8000/docs
- **Health Check**: http://localhost:8000/api/v1/health

## 📁 Project Structure

```
map-leads/
├── .claude/                 # Agent definitions (planner, implementer, reviewer) for the AI pipeline
├── .github/                 # CI and agent workflows, Slack-notify composite action, issue template
├── backend/                 # FastAPI (Python 3.12) REST API: domain code, Alembic migrations, tests, Celery worker, scripts
├── caddy/                   # Caddyfile for the internal Caddy reverse proxy of the production stack
├── design/                  # Committed design references for UI work (design/refs/<key>/)
├── docs/                    # Project documentation (pipeline, backlog, blog posts)
├── frontend/                # Next.js 16 web app (App Router, React 19, TypeScript, Tailwind 4), managed with pnpm
├── CLAUDE.md                # Conventions for AI agents and contributors
├── docker-compose.yml       # Full local stack (all services)
├── docker-compose.prod.yml  # Production stack
└── README.md                # This file
```

See [CLAUDE.md](CLAUDE.md) for the coding conventions used across this repository.

## 🛠️ Development

### Development Mode

For development with hot-reload:

```bash
# Start in development mode
docker-compose up

# Or rebuild and start
docker-compose up --build
```

The frontend will automatically reload on code changes.

### Running Services Separately

You can also run frontend or backend independently:

**Frontend only:**
```bash
cd frontend
docker-compose up
```

**Backend only:**
```bash
cd backend
docker-compose up
```

See `frontend/README.md` and `backend/README.md` for more details.

### Running Commands

```bash
# View logs
docker-compose logs -f frontend
docker-compose logs -f api

# Execute commands in containers
docker-compose exec frontend pnpm install
docker-compose exec api python scripts/create_api_client.py --name "test"

# Access database
docker-compose exec db psql -U postgres -d map_leads_db

# Run migrations
docker-compose exec api alembic upgrade head
```

### Reset the Local Database

Local Postgres data lives in the named Docker volume `pgdata`, mounted at `/var/lib/postgresql/data` on the `db` service (see `docker-compose.yml`). Wiping the database means removing that volume.

> ⚠️ **This permanently deletes all local database data** (users, API keys and everything else). `-v` also removes the other named volumes in `docker-compose.yml`: `pip_cache`, `caddy_data` and `caddy_config`.

```bash
# Stop the stack and remove containers and named volumes
docker-compose down -v

# Start again with an empty database
docker-compose up -d
```

**Migrations** are re-applied automatically: the `api` service sets `RUN_MIGRATIONS=1` in `docker-compose.yml`, and `backend/entrypoint.sh` runs `alembic upgrade head` when that variable is `1`, so the schema is created each time the `api` container starts. To run or check them by hand:

```bash
# Apply migrations manually
docker-compose exec api alembic upgrade head

# Show the current revision
docker-compose exec api alembic current
```

**Recreate the frontend API key.** API keys are stored in the database (`api_clients` table), so the reset deletes the frontend's key. Create a new one, update `API_KEY` in `frontend/.env`, then restart the frontend (details in [🔐 API Key Setup](#-api-key-setup)):

```bash
docker-compose exec api python scripts/create_api_client.py --name "frontend"
docker-compose restart frontend
```

User accounts are gone too, so users must sign up again.

Optionally, verify the reset:

```bash
# List the tables created by the migrations
docker-compose exec db psql -U postgres -d map_leads_db -c '\dt'

# Check the API is healthy
curl http://localhost:8000/api/v1/health
```

### Stop Services

```bash
# Stop all services
docker-compose down

# Stop and remove volumes (⚠️ deletes database data)
docker-compose down -v
```

## 🔧 Configuration

### Environment Variables

#### Backend (`backend/.env`)

See `backend/README.md` for full configuration options.

Key variables:
- `DATABASE_URL` - PostgreSQL connection string
- `REDIS_URL` - Redis connection string
- `SECRET_KEY` - JWT secret key
- `RESEND_API_KEY` - Email service API key

#### Frontend (`frontend/.env`)

- `API_URL` - Backend API URL (use `http://api:8000` in Docker)
- `API_KEY` - API key for backend authentication. Server-side only: never
  rename it to `NEXT_PUBLIC_*`, which would ship it to every browser
- `NEXT_PUBLIC_APP_URL` - Public origin of this app as the browser reaches it
  (e.g. `http://localhost:3000` locally, `https://mapleads.koalvia.com` in
  prod). Used to build absolute redirect URLs (e.g. the OAuth callback).
- `NODE_ENV` - `production` or `development`

### Ports

Default host ports (override with `FRONTEND_PORT`, `API_PORT`, `DB_PORT`, `REDIS_PORT` in a root-level `.env` next to `docker-compose.yml`; see [Port already in use](#port-already-in-use)):
- Frontend: `3000`
- Backend API: `8000`
- PostgreSQL: `5432`
- Redis: `6379`

## 🐳 Docker Commands

```bash
# Build all services
docker-compose build

# Start services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down

# Rebuild specific service
docker-compose build frontend
docker-compose up -d frontend

# Access container shell
docker-compose exec frontend sh
docker-compose exec api bash
```

## 🔐 API Key Setup

All requests to the backend API require an API key. The frontend automatically includes this in all requests.

1. **Create API key**:
   ```bash
   docker-compose exec api python scripts/create_api_client.py --name "frontend"
   ```

2. **Update frontend/.env**:
   ```bash
   API_KEY=your-api-key-here
   ```

3. **Restart frontend**:
   ```bash
   docker-compose restart frontend
   ```

## 📚 Documentation

- **Backend**: See `backend/README.md` for detailed backend documentation
- **Docker Usage**: See `backend/DOCKER_USAGE.md` for advanced Docker operations
- **API Docs**: Visit http://localhost:8000/docs when backend is running

## 🐛 Troubleshooting

### Frontend can't connect to backend

1. Check that both services are running: `docker-compose ps`
2. Verify API key is set in `frontend/.env`
3. Check network connectivity: `docker-compose exec frontend ping api`
4. Verify backend is healthy: `curl http://localhost:8000/api/v1/health`

### Port already in use

`docker-compose up` fails with `Bind for 0.0.0.0:5432 failed: port is already allocated` or `address already in use`. The port in the message is the host port that failed.

Find what is using the port (replace `<port>`):
```bash
lsof -i :<port>                          # macOS/Linux (or: sudo lsof -iTCP:<port> -sTCP:LISTEN)
ss -ltnp | grep <port>                   # Linux
netstat -ano | findstr :<port>           # Windows, then: tasklist /FI "PID eq <pid>"
docker ps --filter "publish=<port>"      # another container
```

Then either stop the conflicting process or container (e.g. a locally installed Postgres or Redis service), or change the host port MapLeads uses. These Docker Compose variables change only the host side of each mapping:

| Variable | Default | Service |
|----------|---------|---------|
| `FRONTEND_PORT` | `3000` | frontend |
| `API_PORT` | `8000` | api |
| `DB_PORT` | `5432` | db |
| `REDIS_PORT` | `6379` | redis |
| `ADMINER_PORT` | `8080` | adminer (`tools` profile only) |

Set them in a `.env` file in the repository root, next to `docker-compose.yml`, or inline. They are **not** read from `backend/.env` or `frontend/.env`.
```bash
API_PORT=8001 docker-compose up -d       # inline, one-off
echo "DB_PORT=5433" >> .env              # persistent, in the root .env
```

Caveats:
- Containers still talk to each other on the internal ports, so `API_URL=http://api:8000` and the compose `DATABASE_URL` do not change.
- After changing `FRONTEND_PORT` or `API_PORT`, use the new host port in the browser and host-side commands (e.g. `curl http://localhost:<API_PORT>/api/v1/health`), and update `NEXT_PUBLIC_APP_URL` in `frontend/.env` if it points at `localhost:3000`.
- The `production` profile's Caddy binds `80`/`443`; those are not configurable through variables.

### Database connection issues

1. Check database is running: `docker-compose ps db`
2. Verify connection string in `backend/.env`
3. Check database logs: `docker-compose logs db`

### Rebuild everything

This wipes the local database; see [Reset the Local Database](#reset-the-local-database) for the follow-up steps.
```bash
docker-compose down -v
docker-compose build --no-cache
docker-compose up -d
```

## 🚀 Production Deployment

Deployed to a shared Hetzner VPS alongside other projects. `.github/workflows/deploy.yml`
builds the backend and frontend images, pushes them to GHCR, then SSHes into the
VPS to pull and restart the stack defined in `docker-compose.prod.yml`. That
stack does not publish any ports itself — it brings its own internal Caddy
(`map-leads-caddy`, see `caddy/Caddyfile`) that joins the VPS's shared external
`proxy` network, which the entry Caddy (`Koalvia/infra`) forwards
`mapleads.koalvia.com` to.

One-time server setup (not automated, since it touches secrets and shared
VPS state):

1. Create `~/map-leads/backend/.env` and `~/map-leads/frontend/.env` on the
   server with production secrets (`SECRET_KEY`, `POSTGRES_PASSWORD`,
   `DATABASE_URL`, `CORS_ORIGINS`, `FRONTEND_URL`, Stripe/OAuth/Google keys,
   etc.) — these are never committed. `frontend/.env` holds `API_URL`
   (`http://api:8000`) and `API_KEY` (from `scripts/create_api_client.py`):
   the Next.js server reads them at runtime and they never reach the browser.
2. Add `mapleads.koalvia.com { reverse_proxy map-leads-caddy:80 }` to the VPS's
   entry Caddyfile (`Koalvia/infra`) and point DNS at the VPS.
3. In this repo's GitHub settings, create a `PROD` environment with secrets
   `SERVER_IP`, `SSH_USERNAME`, `SSH_PRIVATE_KEY`, `CR_PAT` (GHCR pull token),
   plus the frontend build-time vars `NEXT_PUBLIC_APP_URL` (the public origin, e.g.
   `https://mapleads.koalvia.com` — used to build absolute redirect URLs in
   OAuth routes; must NOT be derived from the request at runtime, since the
   standalone server ignores `Host`/`X-Forwarded-Host`), `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`,
   and `NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID`.

After that, every push to `main` deploys automatically.

## 📝 License

MIT License

---

Happy coding! 🚀
