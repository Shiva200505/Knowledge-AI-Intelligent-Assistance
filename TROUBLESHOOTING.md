# 🚨 Troubleshooting Guide - System Deployment Issues

## Current Issue: Docker Desktop Not Running

**Error:** `The system cannot find the file specified` when running docker-compose

**Solution:** 
1. **Start Docker Desktop**:
   - Press `Windows + R`, type `Docker Desktop` and press Enter
   - Or find Docker Desktop in Start Menu and launch it
   - Wait for Docker Desktop to fully start (whale icon in system tray)

2. **Verify Docker is Running**:
   ```powershell
   docker ps
   ```
   Should return a list (can be empty) without errors

3. **Then retry deployment**:
   ```powershell
   docker-compose up -d --build
   ```

---

## Alternative: Development Mode (No Docker Required)

If Docker issues persist, you can run in development mode:

### 1. Backend Setup
```powershell
# Install Python 3.11+ first from python.org
cd backend
pip install -r requirements.txt

# Install Redis (Windows)
# Download from: https://github.com/microsoftarchive/redis/releases
# Or use Chocolatey: choco install redis-64

# Start Redis
redis-server

# In new terminal, start backend
python main.py
```

### 2. Frontend Setup
```powershell
# Install Node.js 18+ first from nodejs.org
cd frontend
npm install
npm start
```

### 3. Admin Dashboard Setup
```powershell
cd admin-dashboard
npm install  
npm start
```

**Access Points:**
- Frontend: http://localhost:3000
- Admin: http://localhost:3001 
- API: http://localhost:8000

---

## Common Docker Issues & Fixes

### Issue 1: Port Already in Use
```
Error: Port 3000 is already in use
```

**Fix:** Kill processes using ports
```powershell
netstat -ano | findstr :3000
taskkill /PID <process_id> /F

# Or change ports in docker-compose.yml:
ports:
  - "3001:3000"  # Changed from 3000:3000
```

### Issue 2: Out of Disk Space
```
Error: no space left on device
```

**Fix:** Clean Docker
```powershell
docker system prune -af
docker volume prune -f
```

### Issue 3: Memory Issues
```
Error: container killed due to memory limit
```

**Fix:** Increase Docker memory in Docker Desktop Settings > Resources

### Issue 4: Build Failures
```
Error: failed to build
```

**Fix:** Clear build cache
```powershell
docker-compose build --no-cache
docker-compose up -d
```

---

## Quick System Test (Without Full Deployment)

### Test Backend API
```powershell
cd backend
pip install fastapi uvicorn
python -c "
from main import app
import uvicorn
print('Starting API server on http://localhost:8000')
uvicorn.run(app, host='0.0.0.0', port=8000)
"
```

Then test: http://localhost:8000/docs

### Test Frontend
```powershell
cd frontend
npm install --legacy-peer-deps
npm start
```

Then test: http://localhost:3000

---

## Manual Installation Steps

### 1. Install Prerequisites
- **Docker Desktop**: https://www.docker.com/products/docker-desktop
- **Node.js 18+**: https://nodejs.org/
- **Python 3.11+**: https://python.org/downloads/

### 2. System Requirements Check
```powershell
# Check versions
node --version    # Should be 18+
npm --version
python --version  # Should be 3.11+
docker --version
docker-compose --version
```

### 3. Environment Setup
```powershell
# Create .env file with correct paths
echo "ENVIRONMENT=development
DATABASE_URL=sqlite:///./data/metadata.db
VECTOR_DB_PATH=./data/chroma
DOCUMENTS_PATH=./data/documents" > .env
```

---

## Production Deployment Checklist

### Before Deployment
- [ ] Docker Desktop running
- [ ] Minimum 8GB RAM available
- [ ] 50GB+ free disk space
- [ ] No processes using ports 3000, 3001, 8000, 6379

### After Deployment
- [ ] All containers running: `docker-compose ps`
- [ ] API accessible: http://localhost:8000/health
- [ ] Frontend accessible: http://localhost:3000
- [ ] Admin accessible: http://localhost:3001

### Health Check Commands
```powershell
# Check all services
docker-compose ps

# Check logs
docker-compose logs api
docker-compose logs frontend
docker-compose logs admin

# Test endpoints
curl http://localhost:8000/health
curl http://localhost:8000/docs
```

---

## Emergency Recovery

### If System Becomes Unresponsive
```powershell
# Stop everything
docker-compose down

# Clean up
docker system prune -f

# Restart fresh
docker-compose up -d --build
```

### If Data Corruption
```powershell
# Backup current data
cp -r data/ backup_$(Get-Date -Format "yyyyMMdd")/

# Reset vector database
rm -rf data/chroma/*

# Restart system
docker-compose restart
```

---

## Success Indicators

✅ **System Working Properly When:**
- All containers show "Up" status
- API health check returns "healthy"
- Frontend loads without errors
- Admin dashboard accessible
- Document upload works
- Search returns results

❌ **System Needs Attention When:**
- Containers showing "Exit" status
- API health check fails
- 500/404 errors on frontend
- Document processing stuck
- Search timeouts

---

## Next Steps After Fixing Docker

1. **Start Docker Desktop** (most important!)
2. **Run deployment**: `docker-compose up -d --build`
3. **Wait 2-3 minutes** for all services to initialize
4. **Test access**: Visit http://localhost:3000
5. **Upload documents**: Use admin at http://localhost:3001
6. **Test suggestions**: Enter case data and see AI magic!

---

**💡 Pro Tip**: Always start Docker Desktop first and wait for it to fully load before running any docker commands!