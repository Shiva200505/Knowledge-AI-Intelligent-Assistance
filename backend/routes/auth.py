"""
Authentication routes
"""
from fastapi import APIRouter, HTTPException, status, Depends
from datetime import datetime, timedelta
import logging

from models.auth_schemas import (
    UserCreate, 
    UserLogin, 
    UserResponse, 
    Token,
    RefreshTokenRequest,
    PasswordChangeRequest
)
from utils.auth import (
    verify_password,
    get_password_hash,
    create_access_token,
    create_refresh_token,
    decode_token,
    get_current_active_user,
    ACCESS_TOKEN_EXPIRE_MINUTES,
    REFRESH_TOKEN_EXPIRE_DAYS
)
from database.user_db import UserDatabase

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/auth", tags=["authentication"])

# Initialize user database
user_db = UserDatabase()

@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register(user_data: UserCreate):
    """Register a new user"""
    try:
        # Check if user already exists
        existing_user = await user_db.get_user_by_email(user_data.email)
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered"
            )
        
        # Hash password
        hashed_password = get_password_hash(user_data.password)
        
        # Create user
        user = await user_db.create_user(
            email=user_data.email,
            full_name=user_data.full_name,
            hashed_password=hashed_password
        )
        
        if not user:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to create user"
            )
        
        logger.info(f"New user registered: {user_data.email}")
        
        return UserResponse(
            id=user['id'],
            email=user['email'],
            full_name=user['full_name'],
            is_active=bool(user['is_active']),
            is_admin=bool(user['is_admin']),
            created_at=datetime.fromisoformat(user['created_at']),
            last_login=datetime.fromisoformat(user['last_login']) if user.get('last_login') else None
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Registration error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Registration failed"
        )

@router.post("/login", response_model=Token)
async def login(user_data: UserLogin):
    """Login user and return JWT tokens"""
    try:
        # Get user by email
        user = await user_db.get_user_by_email(user_data.email)
        
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect email or password",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        # Verify password
        if not verify_password(user_data.password, user['hashed_password']):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect email or password",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        # Check if user is active
        if not user['is_active']:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Account is inactive"
            )
        
        # Update last login
        await user_db.update_last_login(user['id'])
        
        # Create tokens
        token_data = {
            "user_id": user['id'],
            "email": user['email'],
            "is_admin": bool(user['is_admin'])
        }
        
        access_token = create_access_token(token_data)
        refresh_token = create_refresh_token(token_data)
        
        # Store refresh token
        expires_at = datetime.utcnow() + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
        await user_db.store_refresh_token(user['id'], refresh_token, expires_at)
        
        logger.info(f"User logged in: {user_data.email}")
        
        return Token(
            access_token=access_token,
            refresh_token=refresh_token,
            token_type="bearer",
            expires_in=ACCESS_TOKEN_EXPIRE_MINUTES * 60
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Login error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Login failed"
        )

@router.post("/refresh", response_model=Token)
async def refresh_token(request: RefreshTokenRequest):
    """Refresh access token using refresh token"""
    try:
        # Decode refresh token
        payload = decode_token(request.refresh_token)
        
        # Verify it's a refresh token
        if payload.get("type") != "refresh":
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token type"
            )
        
        # Verify refresh token in database
        user_id = await user_db.verify_refresh_token(request.refresh_token)
        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or expired refresh token"
            )
        
        # Get user data
        user = await user_db.get_user_by_id(user_id)
        if not user or not user['is_active']:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User not found or inactive"
            )
        
        # Create new tokens
        token_data = {
            "user_id": user['id'],
            "email": user['email'],
            "is_admin": bool(user['is_admin'])
        }
        
        access_token = create_access_token(token_data)
        new_refresh_token = create_refresh_token(token_data)
        
        # Revoke old refresh token and store new one
        await user_db.revoke_refresh_token(request.refresh_token)
        expires_at = datetime.utcnow() + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
        await user_db.store_refresh_token(user['id'], new_refresh_token, expires_at)
        
        logger.info(f"Token refreshed for user: {user['email']}")
        
        return Token(
            access_token=access_token,
            refresh_token=new_refresh_token,
            token_type="bearer",
            expires_in=ACCESS_TOKEN_EXPIRE_MINUTES * 60
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Token refresh error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Token refresh failed"
        )

@router.post("/logout")
async def logout(
    request: RefreshTokenRequest,
    current_user: dict = Depends(get_current_active_user)
):
    """Logout user by revoking refresh token"""
    try:
        await user_db.revoke_refresh_token(request.refresh_token)
        logger.info(f"User logged out: {current_user['email']}")
        
        return {"message": "Successfully logged out"}
        
    except Exception as e:
        logger.error(f"Logout error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Logout failed"
        )

@router.get("/me", response_model=UserResponse)
async def get_current_user_info(current_user: dict = Depends(get_current_active_user)):
    """Get current user information"""
    try:
        user = await user_db.get_user_by_id(current_user['user_id'])
        
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        return UserResponse(
            id=user['id'],
            email=user['email'],
            full_name=user['full_name'],
            is_active=bool(user['is_active']),
            is_admin=bool(user['is_admin']),
            created_at=datetime.fromisoformat(user['created_at']),
            last_login=datetime.fromisoformat(user['last_login']) if user.get('last_login') else None
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get user info error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get user information"
        )

@router.post("/change-password")
async def change_password(
    request: PasswordChangeRequest,
    current_user: dict = Depends(get_current_active_user)
):
    """Change user password"""
    try:
        # Get user
        user = await user_db.get_user_by_id(current_user['user_id'])
        
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        # Verify current password
        if not verify_password(request.current_password, user['hashed_password']):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Current password is incorrect"
            )
        
        # Hash new password
        new_hashed_password = get_password_hash(request.new_password)
        
        # Update password
        success = await user_db.update_password(user['id'], new_hashed_password)
        
        if not success:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to update password"
            )
        
        # Revoke all refresh tokens to force re-login
        await user_db.revoke_all_user_tokens(user['id'])
        
        logger.info(f"Password changed for user: {user['email']}")
        
        return {"message": "Password changed successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Password change error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Password change failed"
        )
