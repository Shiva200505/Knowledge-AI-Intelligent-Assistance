# Intelligent Knowledge Retrieval System - Local Development Startup
Write-Host "🚀 Starting Intelligent Knowledge Retrieval System (Local Mode)..." -ForegroundColor Green
Write-Host ""

# Check if required software is installed
Write-Host "🔍 Checking prerequisites..." -ForegroundColor Yellow

# Check Python
try {
    $pythonVersion = python --version 2>$null
    $versionParts = $pythonVersion.Split(' ')[1].Split('.')
    $majorVersion = [int]$versionParts[0]
    $minorVersion = [int]$versionParts[1]
    if ($majorVersion -eq 3 -and $minorVersion -ge 11) {
        Write-Host "✅ Python: $pythonVersion" -ForegroundColor Green
    } else {
        throw "Python version not compatible"
    }
} catch {
    Write-Host "❌ Python 3.11+ not found!" -ForegroundColor Red
    Write-Host "   Download from: https://python.org/downloads/" -ForegroundColor White
    Read-Host "Press Enter to exit"
    exit 1
}

# Check Node.js
try {
    $nodeVersion = node --version 2>$null
    $majorVersion = [int]($nodeVersion.Substring(1).Split('.')[0])
    if ($majorVersion -ge 18) {
        Write-Host "✅ Node.js: $nodeVersion" -ForegroundColor Green
    } else {
        throw "Node.js version not compatible"
    }
} catch {
    Write-Host "❌ Node.js 18+ not found!" -ForegroundColor Red
    Write-Host "   Download from: https://nodejs.org/" -ForegroundColor White
    Read-Host "Press Enter to exit"
    exit 1
}

# Check if ports are available
Write-Host ""
Write-Host "🔍 Checking ports availability..." -ForegroundColor Yellow

$ports = @(3000, 3001, 8000)
$portsInUse = @()

foreach ($port in $ports) {
    $connection = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
    if ($connection) {
        $portsInUse += $port
    }
}

if ($portsInUse.Count -gt 0) {
    Write-Host "⚠️  Ports in use: $($portsInUse -join ', ')" -ForegroundColor Yellow
    $response = Read-Host "Kill these processes? (y/N)"
    if ($response -eq "y" -or $response -eq "Y") {
        foreach ($port in $portsInUse) {
            $processes = Get-NetTCPConnection -LocalPort $port | Select-Object -ExpandProperty OwningProcess -Unique
            foreach ($processId in $processes) {
                try {
                    Stop-Process -Id $processId -Force
                    Write-Host "✅ Killed process on port $port" -ForegroundColor Green
                } catch {
                    Write-Host "❌ Failed to kill process on port $port" -ForegroundColor Red
                }
            }
        }
    }
}

# Install dependencies and start services
Write-Host ""
Write-Host "🏗️  Setting up and starting all services..." -ForegroundColor Green
Write-Host "This may take 2-5 minutes on first run..." -ForegroundColor Yellow
Write-Host ""

# Setup Backend
Write-Host "🐍 Setting up Python backend..." -ForegroundColor Yellow
Push-Location backend
try {
    Write-Host "   Installing Python dependencies..." -ForegroundColor White
    $pipResult = python -m pip install -r requirements.txt 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "   ✅ Backend dependencies installed" -ForegroundColor Green
    } else {
        Write-Host "   ❌ Failed to install Python dependencies" -ForegroundColor Red
        Write-Host "   Error: $pipResult" -ForegroundColor Red
        Pop-Location
        Read-Host "Press Enter to exit"
        exit 1
    }
} catch {
    Write-Host "   ❌ Failed to install backend dependencies" -ForegroundColor Red
    Pop-Location
    Read-Host "Press Enter to exit"
    exit 1
}
Pop-Location

# Setup Frontend
Write-Host "⚛️  Setting up React frontend..." -ForegroundColor Yellow
Push-Location frontend
try {
    Write-Host "   Installing Node dependencies..." -ForegroundColor White
    npm install --silent *>$null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "   ✅ Frontend dependencies installed" -ForegroundColor Green
    } else {
        throw "Failed to install Node dependencies"
    }
} catch {
    Write-Host "   ❌ Failed to install frontend dependencies" -ForegroundColor Red
    Pop-Location
    Read-Host "Press Enter to exit"
    exit 1
}
Pop-Location

# Setup Admin Dashboard
Write-Host "🛠️  Setting up Admin dashboard..." -ForegroundColor Yellow
Push-Location admin-dashboard
try {
    Write-Host "   Installing Node dependencies..." -ForegroundColor White
    npm install --silent *>$null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "   ✅ Admin dashboard dependencies installed" -ForegroundColor Green
    } else {
        throw "Failed to install admin dependencies"
    }
} catch {
    Write-Host "   ❌ Failed to install admin dependencies" -ForegroundColor Red
    Pop-Location
    Read-Host "Press Enter to exit"
    exit 1
}
Pop-Location

# Start all services in separate windows
Write-Host ""
Write-Host "🚀 Starting all services..." -ForegroundColor Green

# Start Backend API
Write-Host "   Starting Python API server..." -ForegroundColor White
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd backend; python main.py" -WindowStyle Minimized

# Start Frontend
Write-Host "   Starting React frontend..." -ForegroundColor White
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd frontend; npm start" -WindowStyle Minimized

# Start Admin Dashboard
Write-Host "   Starting Admin dashboard..." -ForegroundColor White
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd admin-dashboard; npm start" -WindowStyle Minimized

# Wait for services to initialize
Write-Host ""
Write-Host "⏳ Waiting for services to start..." -ForegroundColor Yellow
Write-Host "   This may take 30-60 seconds..." -ForegroundColor White
Start-Sleep -Seconds 45

# Check service health
Write-Host ""
Write-Host "🔍 Checking service health..." -ForegroundColor Yellow

try {
    $healthCheck = Invoke-RestMethod -Uri "http://localhost:8000/health" -Method Get -TimeoutSec 10
    if ($healthCheck.status -eq "healthy") {
        Write-Host "✅ API is healthy!" -ForegroundColor Green
    }
} catch {
    Write-Host "⚠️  API starting up (check backend console window)" -ForegroundColor Yellow
}

try {
    $frontendCheck = Invoke-WebRequest -Uri "http://localhost:3000" -Method Head -TimeoutSec 5 -ErrorAction SilentlyContinue
    if ($frontendCheck.StatusCode -eq 200) {
        Write-Host "✅ Frontend is ready!" -ForegroundColor Green
    }
} catch {
    Write-Host "⚠️  Frontend starting up (check frontend console window)" -ForegroundColor Yellow
}

try {
    $adminCheck = Invoke-WebRequest -Uri "http://localhost:3001" -Method Head -TimeoutSec 5 -ErrorAction SilentlyContinue
    if ($adminCheck.StatusCode -eq 200) {
        Write-Host "✅ Admin Dashboard is ready!" -ForegroundColor Green
    }
} catch {
    Write-Host "⚠️  Admin Dashboard starting up (check admin console window)" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "🎉 SYSTEM STARTED!" -ForegroundColor Green
Write-Host ""
Write-Host "📍 Access Points:" -ForegroundColor Cyan
Write-Host "   👥 Knowledge Interface: http://localhost:3000" -ForegroundColor White
Write-Host "   ⚙️  Admin Dashboard:    http://localhost:3001" -ForegroundColor White
Write-Host "   📚 API Documentation:  http://localhost:8000/docs" -ForegroundColor White
Write-Host "   🔍 Health Check:       http://localhost:8000/health" -ForegroundColor White
Write-Host ""
Write-Host "📋 Next Steps:" -ForegroundColor Yellow
Write-Host "1. Visit Admin Dashboard to upload documents" -ForegroundColor White
Write-Host "2. Go to Knowledge Interface to test suggestions" -ForegroundColor White
Write-Host "3. Enter case details and watch AI magic happen!" -ForegroundColor White
Write-Host ""
Write-Host "🔧 Console Windows:" -ForegroundColor Cyan
Write-Host "   - Backend API (Python) - Running in background" -ForegroundColor White
Write-Host "   - Frontend (React) - Running in background" -ForegroundColor White  
Write-Host "   - Admin Dashboard - Running in background" -ForegroundColor White
Write-Host "   - Check these windows for logs and errors" -ForegroundColor White
Write-Host ""
Write-Host "🛑 To Stop System:" -ForegroundColor Yellow
Write-Host "   Close all console windows or press Ctrl+C in each" -ForegroundColor White
Write-Host ""
Write-Host "🚀 Open http://localhost:3000 to get started!" -ForegroundColor Cyan

Write-Host ""
Read-Host "Press Enter to continue"