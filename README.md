# Intelligent Knowledge Retrieval System for Appian Case Management

## 🎯 Overview
A Just-in-Time knowledge system that provides context-aware document suggestions to support agents handling complex casework in Appian workflows.

## 🚀 Features
- **Context-Aware Suggestions**: Automatically analyzes active case data and suggests relevant documents
- **Verifiable Citations**: Every suggestion includes exact page/paragraph references
- **Real-time Integration**: WebSocket-based live suggestions as case data changes
- **Beautiful UI**: Modern, responsive interface with intuitive navigation
- **100% Free**: Uses only open-source components
- **Scalable Architecture**: Docker-based deployment with horizontal scaling support

## 🏗️ Architecture
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Appian UI     │    │  Knowledge UI   │    │ Admin Dashboard │
│   (Integration) │    │   (React)       │    │    (React)      │
└─────────┬───────┘    └─────────┬───────┘    └─────────┬───────┘
          │                      │                      │
          └──────────────────────┼──────────────────────┘
                                 │
┌─────────────────────────────────┼─────────────────────────────────┐
│                    API Gateway (FastAPI)                         │
├─────────────────────────────────┼─────────────────────────────────┤
│  ┌─────────────────┐   ┌───────┴────────┐   ┌─────────────────┐ │
│  │ Context Engine  │   │ Search Engine  │   │Citation Tracker │ │
│  │                 │   │                │   │                 │ │
│  └─────────────────┘   └────────────────┘   └─────────────────┘ │
└─────────────────────────────────┼─────────────────────────────────┘
                                  │
┌─────────────────────────────────┼─────────────────────────────────┐
│              Data Layer                                           │
│  ┌─────────────────┐   ┌───────┴────────┐   ┌─────────────────┐ │
│  │ Vector DB       │   │ Document Store │   │ Metadata DB     │ │
│  │ (Chroma)        │   │ (File System)  │   │ (SQLite)        │ │
│  └─────────────────┘   └────────────────┘   └─────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

## 🛠️ Technology Stack
- **Backend**: Python 3.11, FastAPI, WebSockets
- **AI/ML**: Sentence Transformers, spaCy, PyPDF2
- **Database**: Chroma (Vector), SQLite (Metadata)
- **Frontend**: React 18, TypeScript, Tailwind CSS
- **Real-time**: Socket.IO
- **Deployment**: Docker, Docker Compose

## 📋 Installation & Setup

### Prerequisites
- Docker & Docker Compose
- Node.js 18+ (for development)
- Python 3.11+ (for development)

### Quick Start
```bash
# Clone and start the system
git clone <repository>
cd intelligent-knowledge-retrieval
docker-compose up -d

# Access the system
# Knowledge UI: http://localhost:3000
# API: http://localhost:8000
# Admin Dashboard: http://localhost:3001
```

## 📚 Usage

### For Support Agents
1. Open the Knowledge UI alongside your Appian workflow
2. Enter case details (claim type, state, etc.) or let the system auto-detect context
3. Receive real-time document suggestions with exact citations
4. Click suggestions to view highlighted relevant sections

### For Administrators
1. Use the Admin Dashboard to upload policy documents
2. Monitor system performance and suggestion accuracy
3. Manage document categories and metadata
4. Review usage analytics and compliance metrics

## 🔧 Configuration
See `config/` directory for environment-specific settings.

## 📖 API Documentation
Interactive API docs available at: http://localhost:8000/docs

## 🤝 Contributing
This is a complete solution designed for production use. See CONTRIBUTING.md for development guidelines.