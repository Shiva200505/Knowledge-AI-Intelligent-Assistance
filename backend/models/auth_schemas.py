"""
Authentication schemas and models
"""
from pydantic import BaseModel, EmailStr, Field, validator
from typing import Optional
from datetime import datetime
import re

class UserBase(BaseModel):
    """Base user model"""
    email: EmailStr = Field(..., description="User email address")
    full_name: str = Field(..., min_length=2, max_length=100, description="User's full name")
    
class UserCreate(UserBase):
    """User registration model"""
    password: str = Field(..., min_length=8, max_length=100, description="User password")
    
    @validator('password')
    def validate_password(cls, v):
        """Validate password strength"""
        if len(v) < 8:
            raise ValueError('Password must be at least 8 characters long')
        if not re.search(r'[A-Z]', v):
            raise ValueError('Password must contain at least one uppercase letter')
        if not re.search(r'[a-z]', v):
            raise ValueError('Password must contain at least one lowercase letter')
        if not re.search(r'\d', v):
            raise ValueError('Password must contain at least one digit')
        return v

class UserLogin(BaseModel):
    """User login model"""
    email: EmailStr = Field(..., description="User email address")
    password: str = Field(..., description="User password")

class UserResponse(UserBase):
    """User response model (without password)"""
    id: str = Field(..., description="User unique identifier")
    is_active: bool = Field(default=True, description="User account status")
    is_admin: bool = Field(default=False, description="Admin privileges")
    created_at: datetime = Field(..., description="Account creation timestamp")
    last_login: Optional[datetime] = Field(None, description="Last login timestamp")
    
    class Config:
        from_attributes = True

class Token(BaseModel):
    """JWT token response"""
    access_token: str = Field(..., description="JWT access token")
    refresh_token: str = Field(..., description="JWT refresh token")
    token_type: str = Field(default="bearer", description="Token type")
    expires_in: int = Field(..., description="Token expiration time in seconds")

class TokenData(BaseModel):
    """Token payload data"""
    user_id: str = Field(..., description="User identifier")
    email: str = Field(..., description="User email")
    is_admin: bool = Field(default=False, description="Admin status")
    exp: Optional[datetime] = Field(None, description="Token expiration")

class RefreshTokenRequest(BaseModel):
    """Refresh token request"""
    refresh_token: str = Field(..., description="Refresh token")

class PasswordChangeRequest(BaseModel):
    """Password change request"""
    current_password: str = Field(..., description="Current password")
    new_password: str = Field(..., min_length=8, description="New password")
    
    @validator('new_password')
    def validate_password(cls, v):
        """Validate password strength"""
        if len(v) < 8:
            raise ValueError('Password must be at least 8 characters long')
        if not re.search(r'[A-Z]', v):
            raise ValueError('Password must contain at least one uppercase letter')
        if not re.search(r'[a-z]', v):
            raise ValueError('Password must contain at least one lowercase letter')
        if not re.search(r'\d', v):
            raise ValueError('Password must contain at least one digit')
        return v

class PasswordResetRequest(BaseModel):
    """Password reset request"""
    email: EmailStr = Field(..., description="User email address")

class PasswordResetConfirm(BaseModel):
    """Password reset confirmation"""
    token: str = Field(..., description="Reset token")
    new_password: str = Field(..., min_length=8, description="New password")
