"""
Application configuration settings
"""
from pydantic_settings import BaseSettings
from typing import Optional
import os

class Settings(BaseSettings):
    """Application settings with environment variable support"""
    
    # Application settings
    app_name: str = "Intelligent Knowledge Retrieval System"
    environment: str = "development"
    debug: bool = True
    log_level: str = "INFO"
    
    # Database settings
    database_url: str = "sqlite:///./data/metadata.db"
    
    # Vector database settings
    vector_db_path: str = "./data/chroma"
    # Using smaller, faster model for better performance
    embedding_model: str = "all-MiniLM-L6-v2"  # 80MB model, good balance of speed and quality
    
    # Document storage
    documents_path: str = "./data/documents"
    upload_path: str = "./data/uploads"
    max_file_size: int = 100 * 1024 * 1024  # 100MB
    
    # Redis settings
    redis_url: str = "redis://localhost:6379"
    redis_password: Optional[str] = None
    
    # AI/ML settings
    similarity_threshold: float = 0.7
    max_suggestions: int = 10
    context_window_size: int = 512
    
    # Search settings
    search_timeout: int = 30
    max_search_results: int = 50
    
    # WebSocket settings
    websocket_timeout: int = 60
    
    # Security settings
    secret_key: str = "your-secret-key-change-in-production"
    access_token_expire_minutes: int = 30
    
    # Monitoring
    enable_metrics: bool = True
    metrics_port: int = 9090
    
    # Performance settings
    worker_processes: int = 4
    max_concurrent_requests: int = 100
    enable_caching: bool = True
    cache_ttl: int = 3600  # 1 hour
    
    # Notification settings
    email_notifications: bool = True
    push_notifications: bool = False
    system_alerts: bool = True
    
    # Storage settings
    data_retention_days: int = 90
    auto_backup: bool = True
    backup_frequency: str = "daily"  # hourly, daily, weekly, monthly
    backup_path: str = "./data/backups"
    
    class Config:
        env_file = ".env"
        case_sensitive = False

# Create global settings instance
settings = Settings()