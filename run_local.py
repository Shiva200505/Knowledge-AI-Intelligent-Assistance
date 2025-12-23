#!/usr/bin/env python3
"""
Simple script to run the knowledge retrieval system locally
"""
import subprocess
import sys
import time
import threading
import os
from pathlib import Path

def run_command(command, cwd=None, name="Service"):
    """Run a command in a separate thread"""
    def target():
        try:
            print(f"🚀 Starting {name}...")
            if cwd:
                os.chdir(cwd)
            subprocess.run(command, shell=True, check=True)
        except subprocess.CalledProcessError as e:
            print(f"❌ {name} failed: {e}")
        except KeyboardInterrupt:
            print(f"🛑 {name} stopped")
    
    thread = threading.Thread(target=target, daemon=True)
    thread.start()
    return thread

def check_prerequisites():
    """Check if required software is installed"""
    print("🔍 Checking prerequisites...")
    
    # Check Python
    try:
        result = subprocess.run(['python', '--version'], capture_output=True, text=True)
        version = result.stdout.strip()
        print(f"✅ {version}")
        if not any(v in version for v in ['3.11', '3.12', '3.13']):
            print("⚠️  Python 3.11+ recommended")
    except FileNotFoundError:
        print("❌ Python not found! Install from https://python.org")
        return False
    
    # Check Node.js
    try:
        result = subprocess.run(['node', '--version'], capture_output=True, text=True)
        version = result.stdout.strip()
        print(f"✅ Node.js {version}")
        if not version.startswith('v18') and not version.startswith('v19') and not version.startswith('v20'):
            print("⚠️  Node.js 18+ recommended")
    except FileNotFoundError:
        print("❌ Node.js not found! Install from https://nodejs.org")
        return False
    
    return True

def setup_dependencies():
    """Install dependencies for all components"""
    print("\n📦 Installing dependencies...")
    
    # Setup backend
    print("🐍 Setting up Python backend...")
    os.chdir('backend')
    try:
        subprocess.run([sys.executable, '-m', 'pip', 'install', '-r', 'requirements.txt'], check=True)
        print("✅ Backend dependencies installed")
    except subprocess.CalledProcessError:
        print("❌ Failed to install backend dependencies")
        return False
    finally:
        os.chdir('..')
    
    # Setup frontend
    print("⚛️  Setting up React frontend...")
    os.chdir('frontend')
    try:
        subprocess.run(['npm', 'install'], check=True)
        print("✅ Frontend dependencies installed")
    except subprocess.CalledProcessError:
        print("❌ Failed to install frontend dependencies")
        return False
    finally:
        os.chdir('..')
    
    # Setup admin dashboard
    print("🛠️  Setting up Admin dashboard...")
    os.chdir('admin-dashboard')
    try:
        subprocess.run(['npm', 'install'], check=True)
        print("✅ Admin dashboard dependencies installed")
    except subprocess.CalledProcessError:
        print("❌ Failed to install admin dashboard dependencies")
        return False
    finally:
        os.chdir('..')
    
    return True

def create_directories():
    """Create required data directories"""
    print("\n📁 Creating data directories...")
    
    directories = [
        'data',
        'data/chroma',
        'data/documents', 
        'data/uploads',
        'data/backups'
    ]
    
    for directory in directories:
        Path(directory).mkdir(parents=True, exist_ok=True)
    
    print("✅ Data directories created")

def main():
    """Main function to start the system"""
    print("🎉 Intelligent Knowledge Retrieval System - Local Setup")
    print("=" * 60)
    
    # Check prerequisites
    if not check_prerequisites():
        print("\n❌ Prerequisites not met. Please install required software.")
        return
    
    # Create directories
    create_directories()
    
    # Setup dependencies
    if not setup_dependencies():
        print("\n❌ Failed to setup dependencies.")
        return
    
    print("\n🚀 Starting all services...")
    print("📝 Note: Services will start in separate console windows")
    
    # Start backend
    backend_thread = run_command(
        "python main.py",
        cwd="backend",
        name="Backend API"
    )
    
    # Wait a bit for backend to start
    time.sleep(5)
    
    # Start frontend
    frontend_thread = run_command(
        "npm start",
        cwd="frontend", 
        name="Frontend"
    )
    
    # Start admin dashboard
    admin_thread = run_command(
        "npm start",
        cwd="admin-dashboard",
        name="Admin Dashboard"
    )
    
    print("\n⏳ Waiting for services to initialize...")
    time.sleep(10)
    
    print("\n🎉 System started!")
    print("📍 Access Points:")
    print("   👥 Knowledge Interface: http://localhost:3000")
    print("   ⚙️  Admin Dashboard:    http://localhost:3001") 
    print("   📚 API Documentation:  http://localhost:8000/docs")
    print("   🔍 Health Check:       http://localhost:8000/health")
    print("\n📋 Next Steps:")
    print("1. Visit Admin Dashboard to upload documents")
    print("2. Go to Knowledge Interface to test suggestions")
    print("3. Enter case details and watch AI magic happen!")
    print("\n🛑 To stop: Press Ctrl+C")
    
    try:
        # Keep main thread alive
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        print("\n🛑 Stopping services...")
        print("✅ All services stopped")

if __name__ == "__main__":
    main()