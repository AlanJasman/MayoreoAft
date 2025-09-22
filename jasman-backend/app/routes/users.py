from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from app.models import UserInDB, UserUpdate
from app.models import UserInDB, UserRole
from app.services.auth import get_current_user, get_password_hash
from app.services.supabase_db import supabase_db_service
from datetime import datetime
from typing import Optional
from uuid import UUID

router = APIRouter(prefix="/users", tags=["users"])

class FlexiblePasswordUpdate(BaseModel):
    user_id: Optional[UUID] = None  # Opcional: si es None, se usa el usuario actual
    new_password: str = Field(..., min_length=8)

@router.get("/me", response_model=UserInDB)
async def read_user_me(current_user: UserInDB = Depends(get_current_user)):
    return current_user

@router.get("/{user_id}", response_model=UserInDB)
async def read_user(
    user_id: UUID,
    current_user: UserInDB = Depends(get_current_user)
):
    if current_user.rol != 'admin':
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin privileges required"
        )

    try:
        user = supabase_db_service.get_user_by_id(user_id)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        return user
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching user: {str(e)}"
        )

@router.put("/me", response_model=UserInDB)
async def update_self(
    update_data: UserUpdate,
    current_user: UserInDB = Depends(get_current_user)
):
    try:
        updated_fields = {k: v for k, v in update_data.dict().items() if v is not None}
        if not updated_fields:
            return current_user

        supabase_db_service.update_user(
            current_user.id,
            updated_fields
        )
        return supabase_db_service.get_user_by_id(current_user.id)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error updating profile: {str(e)}"
        )

@router.post("/change-password", response_model=dict)
async def change_password_flexible(
    data: FlexiblePasswordUpdate,
    current_user: UserInDB = Depends(get_current_user)
):
    """
    Cambia contraseña: 
    - Propia si no se especifica user_id 
    - De otro usuario si se tienen permisos de admin
    
    Permisos:
    - Cualquier usuario autenticado puede cambiar SU PROPIA contraseña
    - Solo ADMIN y SYSTEMS pueden cambiar contraseñas de otros usuarios
    """
    # Determinar el ID del usuario objetivo
    target_user_id = data.user_id if data.user_id else current_user.id
    
    # Si se intenta cambiar otro usuario, verificar permisos de admin
    if data.user_id and data.user_id != current_user.id:
        if current_user.role not in [UserRole.ADMIN, UserRole.SYSTEMS]:  # 👈 corregido
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Admin privileges required to change other users' passwords"
            )
        
        # Verificar que el usuario objetivo existe
        target_user = supabase_db_service.get_user_by_id(data.user_id)
        if not target_user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
    
    try:
        # Hashear la nueva contraseña
        update_data = {
            "contraseña": get_password_hash(data.new_password)
        }
        
        # Actualizar en la base de datos
        success = supabase_db_service.update_user(target_user_id, update_data)
        
        if not success:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to update password in database"
            )
            
        # Mensaje personalizado según el caso
        if target_user_id == current_user.id:
            message = "Your password has been updated successfully"
        else:
            # Obtener información del usuario objetivo para el mensaje
            target_user_info = supabase_db_service.get_user_by_id(target_user_id)
            user_email = target_user_info.get('correo', 'the user') if target_user_info else 'the user'
            message = f"Password for user {user_email} has been updated successfully"
            
        return {"message": message}
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error changing password: {str(e)}"
        )


@router.post("/logout")
async def logout_user():
    return {"message": "Logged out successfully"}
