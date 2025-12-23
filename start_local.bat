@echo off
echo 🚀 Starting Intelligent Knowledge Retrieval System (Local Mode)
echo.

REM Check if Python is installed
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Python not found! Please install Python 3.11+ from https://python.org
    pause
    exit /b 1
)

REM Check if Node.js is installed
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js not found! Please install Node.js 18+ from https://nodejs.org
    pause
    exit /b 1
)

echo ✅ Prerequisites found
echo.

REM Create data directories
echo 📁 Creating data directories...
if not exist data mkdir data
if not exist data\chroma mkdir data\chroma
if not exist data\documents mkdir data\documents
if not exist data\uploads mkdir data\uploads
if not exist data\backups mkdir data\backups
echo ✅ Data directories created
echo.

REM Install backend dependencies
echo 🐍 Installing Python dependencies...
cd backend
python -m pip install -r requirements.txt >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Failed to install Python dependencies
    pause
    exit /b 1
)
echo ✅ Backend dependencies installed
cd ..

REM Install frontend dependencies
echo ⚛️ Installing Frontend dependencies...
cd frontend
call npm install >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Failed to install Frontend dependencies
    pause
    exit /b 1
)
echo ✅ Frontend dependencies installed
cd ..

REM Install admin dashboard dependencies
echo 🛠️ Installing Admin dependencies...
cd admin-dashboard
call npm install >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Failed to install Admin dependencies
    pause
    exit /b 1
)
echo ✅ Admin dependencies installed
cd ..

echo.
echo 🚀 Starting all services...
echo 📝 Services will open in separate windows

REM Start backend in new window
start "Backend API" /MIN cmd /c "cd backend && python main.py"

REM Wait a moment
timeout /t 3 /nobreak >nul

REM Start frontend in new window  
start "React Frontend" /MIN cmd /c "cd frontend && npm start"

REM Start admin dashboard in new window
start "Admin Dashboard" /MIN cmd /c "cd admin-dashboard && npm start"

echo.
echo ⏳ Waiting for services to start...
timeout /t 30 /nobreak >nul

echo.
echo 🎉 System started!
echo.
echo 📍 Access Points:
echo    👥 Knowledge Interface: http://localhost:3000
echo    ⚙️  Admin Dashboard:    http://localhost:3001
echo    📚 API Documentation:  http://localhost:8000/docs
echo    🔍 Health Check:       http://localhost:8000/health
echo.
echo 📋 Next Steps:
echo 1. Visit Admin Dashboard to upload documents
echo 2. Go to Knowledge Interface to test suggestions  
echo 3. Enter case details and watch AI magic happen!
echo.
echo 🔧 Console Windows:
echo    - Backend API (Python) - Running in background
echo    - Frontend (React) - Running in background
echo    - Admin Dashboard - Running in background
echo.
echo 🛑 To Stop: Close all console windows
echo.
echo 🚀 Opening Knowledge Interface...
start http://localhost:3000

pause