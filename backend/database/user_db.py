"""
User database operations
"""
import sqlite3
import uuid
from datetime import datetime
from typing import Optional, Dict, Any
import logging

logger = logging.getLogger(__name__)

class UserDatabase:
    """User database manager"""
    
    def __init__(self, db_path: str = "./data/metadata.db"):
        self.db_path = db_path
        self.init_tables()
    
    def get_connection(self):
        """Get database connection"""
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        return conn
    
    def init_tables(self):
        """Initialize user tables"""
        conn = self.get_connection()
        try:
            cursor = conn.cursor()
            
            # Users table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS users (
                    id TEXT PRIMARY KEY,
                    email TEXT UNIQUE NOT NULL,
                    full_name TEXT NOT NULL,
                    hashed_password TEXT NOT NULL,
                    is_active BOOLEAN DEFAULT 1,
                    is_admin BOOLEAN DEFAULT 0,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    last_login TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            
            # Refresh tokens table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS refresh_tokens (
                    id TEXT PRIMARY KEY,
                    user_id TEXT NOT NULL,
                    token TEXT UNIQUE NOT NULL,
                    expires_at TIMESTAMP NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
                )
            """)
            
            # Password reset tokens table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS password_reset_tokens (
                    id TEXT PRIMARY KEY,
                    user_id TEXT NOT NULL,
                    token TEXT UNIQUE NOT NULL,
                    expires_at TIMESTAMP NOT NULL,
                    used BOOLEAN DEFAULT 0,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
                )
            """)
            
            conn.commit()
            logger.info("User database tables initialized")
            
        except Exception as e:
            logger.error(f"Error initializing user tables: {e}")
            conn.rollback()
        finally:
            conn.close()
    
    async def create_user(self, email: str, full_name: str, hashed_password: str, is_admin: bool = False) -> Optional[Dict[str, Any]]:
        """Create a new user"""
        conn = self.get_connection()
        try:
            cursor = conn.cursor()
            user_id = str(uuid.uuid4())
            
            cursor.execute("""
                INSERT INTO users (id, email, full_name, hashed_password, is_admin)
                VALUES (?, ?, ?, ?, ?)
            """, (user_id, email, full_name, hashed_password, is_admin))
            
            conn.commit()
            
            # Fetch and return the created user
            cursor.execute("SELECT * FROM users WHERE id = ?", (user_id,))
            row = cursor.fetchone()
            
            if row:
                return dict(row)
            return None
            
        except sqlite3.IntegrityError:
            logger.error(f"User with email {email} already exists")
            return None
        except Exception as e:
            logger.error(f"Error creating user: {e}")
            conn.rollback()
            return None
        finally:
            conn.close()
    
    async def get_user_by_email(self, email: str) -> Optional[Dict[str, Any]]:
        """Get user by email"""
        conn = self.get_connection()
        try:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM users WHERE email = ?", (email,))
            row = cursor.fetchone()
            
            if row:
                return dict(row)
            return None
            
        except Exception as e:
            logger.error(f"Error getting user by email: {e}")
            return None
        finally:
            conn.close()
    
    async def get_user_by_id(self, user_id: str) -> Optional[Dict[str, Any]]:
        """Get user by ID"""
        conn = self.get_connection()
        try:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM users WHERE id = ?", (user_id,))
            row = cursor.fetchone()
            
            if row:
                return dict(row)
            return None
            
        except Exception as e:
            logger.error(f"Error getting user by ID: {e}")
            return None
        finally:
            conn.close()
    
    async def update_last_login(self, user_id: str):
        """Update user's last login timestamp"""
        conn = self.get_connection()
        try:
            cursor = conn.cursor()
            cursor.execute("""
                UPDATE users 
                SET last_login = CURRENT_TIMESTAMP 
                WHERE id = ?
            """, (user_id,))
            conn.commit()
            
        except Exception as e:
            logger.error(f"Error updating last login: {e}")
            conn.rollback()
        finally:
            conn.close()
    
    async def update_password(self, user_id: str, hashed_password: str):
        """Update user's password"""
        conn = self.get_connection()
        try:
            cursor = conn.cursor()
            cursor.execute("""
                UPDATE users 
                SET hashed_password = ?, updated_at = CURRENT_TIMESTAMP 
                WHERE id = ?
            """, (hashed_password, user_id))
            conn.commit()
            return True
            
        except Exception as e:
            logger.error(f"Error updating password: {e}")
            conn.rollback()
            return False
        finally:
            conn.close()
    
    async def store_refresh_token(self, user_id: str, token: str, expires_at: datetime):
        """Store refresh token"""
        conn = self.get_connection()
        try:
            cursor = conn.cursor()
            token_id = str(uuid.uuid4())
            
            cursor.execute("""
                INSERT INTO refresh_tokens (id, user_id, token, expires_at)
                VALUES (?, ?, ?, ?)
            """, (token_id, user_id, token, expires_at.isoformat()))
            
            conn.commit()
            
        except Exception as e:
            logger.error(f"Error storing refresh token: {e}")
            conn.rollback()
        finally:
            conn.close()
    
    async def verify_refresh_token(self, token: str) -> Optional[str]:
        """Verify refresh token and return user_id"""
        conn = self.get_connection()
        try:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT user_id FROM refresh_tokens 
                WHERE token = ? AND expires_at > CURRENT_TIMESTAMP
            """, (token,))
            
            row = cursor.fetchone()
            if row:
                return row['user_id']
            return None
            
        except Exception as e:
            logger.error(f"Error verifying refresh token: {e}")
            return None
        finally:
            conn.close()
    
    async def revoke_refresh_token(self, token: str):
        """Revoke a refresh token"""
        conn = self.get_connection()
        try:
            cursor = conn.cursor()
            cursor.execute("DELETE FROM refresh_tokens WHERE token = ?", (token,))
            conn.commit()
            
        except Exception as e:
            logger.error(f"Error revoking refresh token: {e}")
            conn.rollback()
        finally:
            conn.close()
    
    async def revoke_all_user_tokens(self, user_id: str):
        """Revoke all refresh tokens for a user"""
        conn = self.get_connection()
        try:
            cursor = conn.cursor()
            cursor.execute("DELETE FROM refresh_tokens WHERE user_id = ?", (user_id,))
            conn.commit()
            
        except Exception as e:
            logger.error(f"Error revoking user tokens: {e}")
            conn.rollback()
        finally:
            conn.close()
