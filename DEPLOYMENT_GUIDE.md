# 🚀 Deployment Guide - Intelligent Knowledge Retrieval System

## Overview
Complete deployment guide for the context-aware document suggestion system for Appian case management.

## 📋 Prerequisites

### System Requirements
- **Operating System**: Linux (Ubuntu 20.04+), macOS, or Windows 10+
- **Docker**: Version 20.10+
- **Docker Compose**: Version 2.0+
- **Memory**: Minimum 8GB RAM (16GB recommended)
- **Storage**: 50GB free space
- **Network**: Internet access for initial setup

### Optional Requirements
- **Node.js**: 18+ (for development)
- **Python**: 3.11+ (for development)
- **Git**: For version control

## 🏗️ Quick Start (Production Ready)

### 1. Download and Extract
```bash
# Download the system files
git clone <repository-url>
cd intelligent-knowledge-retrieval

# Or extract from provided archive
tar -xzf knowledge-retrieval-system.tar.gz
cd knowledge-retrieval-system
```

### 2. Environment Configuration
```bash
# Copy environment template
cp .env.example .env

# Edit configuration (optional - defaults work for most setups)
nano .env
```

### 3. Deploy with Docker Compose
```bash
# Start all services
docker-compose up -d

# Verify deployment
docker-compose ps
```

### 4. Access the System
- **Knowledge UI**: http://localhost:3000
- **Admin Dashboard**: http://localhost:3001  
- **API Documentation**: http://localhost:8000/docs
- **Health Check**: http://localhost:8000/health

## ⚙️ Configuration Options

### Environment Variables (.env)
```bash
# Application Settings
ENVIRONMENT=production
LOG_LEVEL=INFO
SECRET_KEY=your-secure-secret-key-here

# Database Configuration
DATABASE_URL=sqlite:///./data/metadata.db
VECTOR_DB_PATH=./data/chroma
DOCUMENTS_PATH=./data/documents

# AI/ML Settings
EMBEDDING_MODEL=all-MiniLM-L6-v2
SIMILARITY_THRESHOLD=0.7
MAX_SUGGESTIONS=10
CONTEXT_WINDOW_SIZE=512

# Performance Settings
MAX_CONCURRENT_REQUESTS=100
SEARCH_TIMEOUT=30
ENABLE_CACHING=true

# Security Settings
ENABLE_AUTH=false
SESSION_TIMEOUT_MINUTES=30

# Storage Settings
MAX_FILE_SIZE_MB=100
DATA_RETENTION_DAYS=90
AUTO_BACKUP=true
```

## 📁 Directory Structure
```
intelligent-knowledge-retrieval/
├── backend/                 # FastAPI backend
├── frontend/               # React frontend
├── admin-dashboard/        # Admin interface
├── data/                  # Persistent data
│   ├── chroma/           # Vector database
│   ├── documents/        # Document storage
│   ├── uploads/          # Temporary uploads
│   └── backups/          # System backups
├── docker-compose.yml     # Container orchestration
├── .env                  # Environment configuration
└── README.md             # Project documentation
```

## 🔧 Initial Setup

### 1. First-Time Configuration
```bash
# Create data directories
mkdir -p data/{chroma,documents,uploads,backups}

# Set proper permissions
chmod 755 data/
chmod -R 777 data/uploads/

# Initialize the system
docker-compose exec api python scripts/initialize.py
```

### 2. Upload Sample Documents
```bash
# Using the API
curl -X POST "http://localhost:8000/api/documents/upload" \
  -H "Content-Type: multipart/form-data" \
  -F "file=@sample_policy.pdf" \
  -F "category=Policies" \
  -F "tags=insurance,policy"
```

### 3. Verify System Health
```bash
# Check all services
curl http://localhost:8000/health

# Expected response:
{
  "status": "healthy",
  "components": {
    "database": "healthy",
    "vector_store": "healthy", 
    "document_processor": "healthy"
  }
}
```

## 🌐 Production Deployment

### Reverse Proxy Configuration (Nginx)
```nginx
server {
    listen 80;
    server_name your-domain.com;

    # Knowledge UI
    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # API Backend
    location /api/ {
        proxy_pass http://localhost:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # WebSocket Support
    location /ws/ {
        proxy_pass http://localhost:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_read_timeout 86400;
    }

    # Admin Dashboard
    location /admin/ {
        proxy_pass http://localhost:3001/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### SSL/HTTPS Configuration
```nginx
# Add SSL configuration
listen 443 ssl;
ssl_certificate /path/to/certificate.crt;
ssl_certificate_key /path/to/private.key;

# Redirect HTTP to HTTPS
server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$server_name$request_uri;
}
```

## 🔄 Backup and Maintenance

### Automated Backup Script
```bash
#!/bin/bash
# backup.sh

BACKUP_DIR="/backups/knowledge-system"
DATE=$(date +"%Y%m%d_%H%M%S")

# Create backup directory
mkdir -p $BACKUP_DIR

# Backup database
docker-compose exec api sqlite3 /app/data/metadata.db ".backup /app/data/backups/db_$DATE.db"

# Backup vector database
tar -czf $BACKUP_DIR/chroma_$DATE.tar.gz data/chroma/

# Backup documents
tar -czf $BACKUP_DIR/documents_$DATE.tar.gz data/documents/

# Backup configuration
cp .env $BACKUP_DIR/env_$DATE.backup
cp docker-compose.yml $BACKUP_DIR/compose_$DATE.backup

# Clean old backups (keep 7 days)
find $BACKUP_DIR -name "*.tar.gz" -mtime +7 -delete
find $BACKUP_DIR -name "*.db" -mtime +7 -delete

echo "Backup completed: $DATE"
```

### Monitoring and Health Checks
```bash
# Check system status
docker-compose ps

# View logs
docker-compose logs -f api
docker-compose logs -f frontend
docker-compose logs -f worker

# Monitor resource usage
docker stats

# Health check script
#!/bin/bash
# health_check.sh

API_HEALTH=$(curl -s http://localhost:8000/health | grep -o '"status":"healthy"')
FRONTEND_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000)

if [ "$API_HEALTH" != '"status":"healthy"' ]; then
    echo "API unhealthy - restarting..."
    docker-compose restart api
fi

if [ "$FRONTEND_STATUS" != "200" ]; then
    echo "Frontend unhealthy - restarting..."
    docker-compose restart frontend
fi
```

## 🔧 Troubleshooting

### Common Issues and Solutions

#### 1. Services Not Starting
```bash
# Check Docker status
docker --version
docker-compose --version

# View detailed logs
docker-compose logs api
docker-compose logs frontend

# Restart services
docker-compose down
docker-compose up -d
```

#### 2. Vector Database Issues
```bash
# Reset vector database
docker-compose down
rm -rf data/chroma/*
docker-compose up -d

# Reindex documents
curl -X POST "http://localhost:8000/api/admin/reindex"
```

#### 3. Document Processing Stuck
```bash
# Check worker status
docker-compose logs worker

# Restart worker
docker-compose restart worker

# Clear processing queue
docker-compose exec api redis-cli flushall
```

#### 4. High Memory Usage
```bash
# Monitor memory usage
docker stats

# Optimize vector database
curl -X POST "http://localhost:8000/api/admin/optimize"

# Reduce concurrent requests in .env
MAX_CONCURRENT_REQUESTS=50
```

#### 5. Slow Search Performance
```bash
# Check vector database health
curl http://localhost:8000/api/admin/vector-stats

# Rebuild vector index
curl -X POST "http://localhost:8000/api/admin/rebuild-index"

# Enable caching
ENABLE_CACHING=true
```

## 📊 Performance Optimization

### Production Recommendations
1. **Resource Allocation**:
   - CPU: 4+ cores
   - RAM: 16GB+ (8GB for vector database)
   - Storage: SSD recommended

2. **Docker Configuration**:
   ```yaml
   # In docker-compose.yml
   services:
     api:
       deploy:
         resources:
           limits:
             memory: 4G
             cpus: '2.0'
           reservations:
             memory: 2G
             cpus: '1.0'
   ```

3. **System Tuning**:
   ```bash
   # Increase file descriptor limits
   echo "* soft nofile 65536" >> /etc/security/limits.conf
   echo "* hard nofile 65536" >> /etc/security/limits.conf

   # Optimize Docker
   echo '{"storage-driver": "overlay2", "log-opts": {"max-size": "10m", "max-file": "3"}}' > /etc/docker/daemon.json
   ```

## 🔐 Security Hardening

### Production Security Checklist
- [ ] Change default secret keys
- [ ] Enable authentication
- [ ] Configure HTTPS/SSL
- [ ] Set up firewall rules
- [ ] Regular security updates
- [ ] Monitor access logs
- [ ] Backup encryption

### Security Configuration
```bash
# Generate secure secret key
openssl rand -base64 32

# Configure firewall (UFW example)
ufw enable
ufw allow 22    # SSH
ufw allow 80    # HTTP
ufw allow 443   # HTTPS
ufw deny 8000   # Block direct API access
```

## 🆘 Support and Maintenance

### Log Locations
- **API Logs**: `docker-compose logs api`
- **Frontend Logs**: `docker-compose logs frontend`
- **System Logs**: `/var/log/docker/`
- **Application Logs**: `data/logs/`

### Maintenance Schedule
- **Daily**: Health checks, log review
- **Weekly**: Backup verification, performance review
- **Monthly**: Security updates, capacity planning
- **Quarterly**: Full system backup test

### Contact and Support
- **Documentation**: Check README.md and API docs
- **Health Dashboard**: http://localhost:8000/docs
- **Admin Interface**: http://localhost:3001

## 🎯 Success Metrics
After deployment, verify these metrics:
- API response time: <500ms
- Document processing: <2 minutes per document
- Search accuracy: >80% relevance
- System uptime: >99.9%
- Memory usage: <70% of allocated

---

**🎉 Congratulations! Your Intelligent Knowledge Retrieval System is now deployed and ready to transform Appian case management workflows.**