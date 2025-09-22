from fastapi import Request
from fastapi import APIRouter, Depends, HTTPException, status, Body
from fastapi.security import OAuth2PasswordRequestForm
from datetime import timedelta
from typing import Optional
import logging

from app.models import UserCreate, Token
from app.services.auth import (
    get_password_hash,
    create_access_token,
    authenticate_user,
    ACCESS_TOKEN_EXPIRE_MINUTES,
)
from app.services.supabase_db import supabase_db_service

router = APIRouter(prefix="/auth", tags=["auth"])
logger = logging.getLogger(__name__)

@router.post("/register", response_model=dict)
async def register_user(user_data: UserCreate = Body(...)):
    logger.info("🔥 Data received on /register: %s", user_data.dict(by_alias=True))
    try:
        existing_user = supabase_db_service.get_user_by_email(user_data.email)
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered"
            )

        # Buscar parent_partner_id si envían codigo_usuario
        parent_partner_id = None
        if hasattr(user_data, "codigo_usuario") and user_data.codigo_usuario:
            parent_user = supabase_db_service.get_user_by_codigo_usuario(user_data.codigo_usuario)
            if parent_user:
                parent_partner_id = parent_user["id"]
            else:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Código usuario padre no válido"
                )

        user_data_for_db = {
            "correo": user_data.email,
            "contraseña": get_password_hash(user_data.password),
            "nombre": user_data.name,
            "empresa": user_data.company,
            "rol": user_data.role,
            "parent_partner_id": parent_partner_id,
            "validado": False
        }

        created_user = supabase_db_service.create_user(user_data_for_db)
        user_id = created_user["id"]
        codigo_usuario = created_user["codigo_usuario"]

        logger.info(f"✅ User registered with ID: {user_id} and codigo_usuario: {codigo_usuario}")

        return {
            "id": user_id,
            "codigo_usuario": codigo_usuario,
            "message": "User registered successfully"
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Critical error on /register: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error registering user: {str(e)}"
        )



@router.post("/token", response_model=Token)
async def login_for_access_token(
    request: Request,
    form_data: OAuth2PasswordRequestForm = Depends(),
):
    user = authenticate_user(form_data.username, form_data.password)
    if not user:
        raise HTTPException(status_code=401, detail="Incorrect credentials")

    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    token = create_access_token(
        data={"sub": str(user.id), "rol": user.role.value},
        expires_delta=access_token_expires
    )

    ip_address = request.client.host

    # Registrar sesión en Supabase
    supabase_db_service.registrar_sesion_supabase(
        usuario_id=str(user.id),
        partner_id=str(user.parent_partner_id) if user.parent_partner_id else None,
        ip=ip_address
    )

    return {
        "access_token": token,
        "token_type": "bearer",
        "role": user.role.value,
        "user_id": str(user.id)
    }
