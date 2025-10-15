# 🚀 Quick Start - Development Mode

## TL;DR
```bash
# Start with hot-reload (no rebuilds needed!)
docker-compose up

# OR use helper scripts:
./dev.sh up        # Linux/Mac
dev.bat up         # Windows
```

Code changes now reload automatically! 🎉

---

## What You Get

✅ **Backend (FastAPI)**
- Hot-reload on file changes
- Changes reflect in 1-2 seconds
- No rebuild needed

✅ **Frontend (Next.js)**  
- Instant refresh with Fast Refresh
- Changes appear immediately
- No rebuild needed

✅ **When to Rebuild**
Only when you change:
- `requirements.txt` (Python dependencies)
- `package.json` (Node dependencies)
- Dockerfile itself

```bash
docker-compose up --build
```

---

## Development Workflow

### Normal Development
```bash
# 1. Start services
docker-compose up

# 2. Edit code in your IDE
#    - Backend: ./backend/app/**/*.py
#    - Frontend: ./frontend/src/**/*

# 3. See changes instantly!
#    - Backend auto-reloads
#    - Frontend hot-refreshes

# 4. View logs
docker-compose logs -f backend
docker-compose logs -f frontend
```

### After Installing Packages
```bash
# Backend: After pip install or requirements.txt change
docker-compose up --build backend

# Frontend: After npm install or package.json change  
docker-compose up --build frontend

# Or rebuild everything
docker-compose up --build
```

### Troubleshooting
```bash
# Restart specific service
docker-compose restart backend

# Restart everything
docker-compose restart

# Clean slate (removes volumes too)
docker-compose down -v
docker-compose up --build
```

---

## Helper Scripts

### Linux/Mac: `./dev.sh`
```bash
./dev.sh up         # Start dev environment
./dev.sh logs       # View all logs
./dev.sh logs backend  # View backend logs only
./dev.sh build      # Rebuild containers
./dev.sh down       # Stop services
./dev.sh clean      # Remove everything
./dev.sh prod       # Switch to production mode
./dev.sh status     # Check running containers
```

### Windows: `dev.bat`
```cmd
dev.bat up          # Start dev environment
dev.bat logs        # View all logs
dev.bat logs backend   # View backend logs only
dev.bat build       # Rebuild containers
dev.bat down        # Stop services
dev.bat clean       # Remove everything
dev.bat prod        # Switch to production mode
dev.bat status      # Check running containers
```

---

## URLs

| Service | URL | Description |
|---------|-----|-------------|
| Frontend | <http://localhost:4000> | Next.js app |
| Backend | <http://localhost:8000> | FastAPI app |
| API Docs | <http://localhost:8000/docs> | Swagger UI |
| Health Check | <http://localhost:8000/health> | Backend health |
| MinIO Console | <http://localhost:9001> | Storage admin |

**Note for Windows users**: If `curl http://localhost:8000/health` shows "Empty reply from server", don't worry! This is a known Docker Desktop networking issue. The API is still working - test it by opening <http://localhost:8000/health> in your browser instead.

---

## How It Works

**docker-compose.override.yml** is automatically loaded by Docker Compose and:
- Mounts your source code as volumes
- Enables hot-reload for backend (gunicorn --reload)
- Runs frontend in dev mode (npm run dev)
- Optimizes file watching for Docker

**To disable development mode:**
```bash
# Run without the override file
docker-compose -f docker-compose.yml up

# Or use helper script
./dev.sh prod  # Linux/Mac
dev.bat prod   # Windows
```

---

## Tips

💡 **Performance on Windows**
- Use WSL2 with Docker Desktop for best performance
- Store code in WSL filesystem, not Windows drives
- If slow, increase Docker Desktop resources

💡 **File Changes Not Detected?**
- Check logs: `docker-compose logs -f backend`
- Restart service: `docker-compose restart backend`
- On Windows, file watching might have 1-2s delay

💡 **Permission Issues on Linux**
- Might need to match UID/GID in containers
- Or use `sudo chown -R $USER:$USER .` after container runs

💡 **Save Build Time**
- `.dockerignore` files exclude unnecessary files
- Volumes preserve node_modules and venv
- Only rebuild when dependencies change

---

## See Also

- **DEVELOPMENT.md** - Full development guide
- **README.md** - Project overview
- **docker-compose.yml** - Production configuration
- **docker-compose.override.yml** - Development overrides
