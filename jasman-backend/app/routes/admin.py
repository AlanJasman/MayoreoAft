from fastapi import APIRouter, Depends, HTTPException, status, Query
from typing import Optional, List
from datetime import datetime
from uuid import UUID
from app.models import (
    PaginatedResponse, 
    UserInDB, 
    UserUpdate, 
    UserPublic, 
    UserRole,
    UserBase
)
from app.services.auth import get_current_user
from app.services.supabase_db import supabase_db_service
import logging

router = APIRouter(prefix="/admin", tags=["admin"])
logger = logging.getLogger(__name__)

@router.get("/", response_model=PaginatedResponse[UserPublic])
async def get_all_users(
    current_user: UserInDB = Depends(get_current_user),
    page: int = Query(1, gt=0),
    per_page: int = Query(10, gt=0, le=100),
    role: Optional[UserRole] = None,
    company: Optional[str] = None,
    search: Optional[str] = None,
    validated: Optional[bool] = None
):
    # Verificar permisos
    if current_user.role not in [UserRole.ADMIN, UserRole.SYSTEMS, UserRole.PRICES, UserRole.VENDEDOR]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Requiere privilegios de administrador o sistemas"
        )

    try:
        # Lógica diferente para vendedores
        if current_user.role == UserRole.VENDEDOR:
            users = supabase_db_service.get_users_by_partner(current_user.id)
            
            # Aplicar filtros locales (ya que Supabase no los aplicó)
            filtered_users = []
            for user in users:
                # Filtro por rol
                if role and user.get("rol") != (role.value if isinstance(role, UserRole) else role):
                    continue
                # Filtro por compañía
                if company and company.lower() not in user.get("empresa", "").lower():
                    continue
                # Filtro por búsqueda
                if search and (search.lower() not in user.get("nombre", "").lower() and 
                              search.lower() not in user.get("correo", "").lower()):
                    continue
                # Filtro por validación
                if validated is not None and user.get("validado") != validated:
                    continue
                
                filtered_users.append(user)
            
            users = filtered_users
        else:
            # Para otros roles, obtener todos los usuarios con filtros
            users = supabase_db_service.get_all_users(
                role=role,
                company=company,
                search=search,
                validated=validated
            )

        # Procesar usuarios para la respuesta
        processed_users = []
        for user in users:
            user_data = {
                "id": user["id"],
                "correo": user["correo"],
                "nombre": user["nombre"],
                "empresa": user["empresa"],
                "rol": user["rol"],
                "codigo_usuario": user["codigo_usuario"],
                "codigo_partner": user.get("parent_partner", {}).get("codigo_usuario") if user.get("parent_partner") else None,
                "validado": user["validado"],
                "creado_en": user["creado_en"]
            }
            processed_users.append(user_data)

        # Paginación
        total_users = len(processed_users)
        total_pages = (total_users + per_page - 1) // per_page
        paginated_users = processed_users[(page-1)*per_page : page*per_page]

        return {
            "data": paginated_users,
            "pagination": {
                "total": total_users,
                "page": page,
                "per_page": per_page,
                "total_pages": total_pages,
                "has_next": page < total_pages,
                "has_prev": page > 1
            }
        }

    except Exception as e:
        logger.error(f"Error en get_all_users: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error al obtener usuarios"
        )
    
    
@router.get("/user-by-code/{user_code}", response_model=UserPublic)
async def get_user_by_code(
    user_code: str,
    current_user: UserInDB = Depends(get_current_user)
):
    try:
        user = supabase_db_service.get_user_by_codigo(user_code)
        if not user:
            raise HTTPException(status_code=404, detail="Usuario no encontrado")
        return user
    except Exception as e:
        logger.error(f"Error buscando usuario por código: {str(e)}")
        raise HTTPException(status_code=500, detail="Error al buscar usuario")


@router.get("/my-team", response_model=List[UserPublic])
async def get_my_team(
    current_user: UserInDB = Depends(get_current_user)
):
    if current_user.role != UserRole.VENDEDOR:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Solo disponible para vendedores"
        )

    try:
        users = supabase_db_service.get_users_by_partner(current_user.id)
        return [{
            "id": user.get("id"),
            "correo": user.get("correo"),
            "nombre": user.get("nombre"),
            "empresa": user.get("empresa"),
            "rol": user.get("rol"),
            "parent_partner_id": user.get("parent_partner_id"),
            "validado": user.get("validado", False),
            "creado_en": user.get("creado_en")
        } for user in users]
    except Exception as e:
        logger.error(f"Error getting team for vendor {current_user.id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error al obtener tu equipo"
        )





@router.put("/{user_id}", response_model=UserPublic)
async def update_user(
    user_id: UUID,
    user_data: UserUpdate,
    current_user: UserInDB = Depends(get_current_user)
):
    # Verificar permisos básicos
    if current_user.role not in [UserRole.ADMIN, UserRole.SYSTEMS, UserRole.VENDEDOR]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Requiere privilegios de administrador, sistemas o vendedor"
        )

    # Obtener el usuario que se va a modificar
    target_user = supabase_db_service.get_user_by_id(user_id)
    if not target_user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    # Restricciones específicas por rol
    if current_user.role == UserRole.VENDEDOR:
        # Vendedores solo pueden editar usuarios no-admin y ciertos campos
        if target_user.get("rol") == UserRole.ADMIN.value:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No puedes editar administradores"
            )
        
        # Limitar campos que pueden modificar
        allowed_fields = {"validated", "company", "name"}
        update_data = {k: v for k, v in user_data.dict().items() 
                      if k in allowed_fields and v is not None}
        
    elif current_user.role == UserRole.SYSTEMS:
        # Sistemas no puede crear nuevos admins
        if user_data.role == UserRole.ADMIN:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No puedes asignar rol de administrador"
            )
        update_data = user_data.dict(exclude_unset=True)
    else:
        # Admin puede hacer cualquier cambio
        update_data = user_data.dict(exclude_unset=True)

    # Mapear nombres de campos si es necesario
    field_mapping = {
        "name": "nombre",
        "company": "empresa",
        "role": "rol",
        "validated": "validado"
    }
    
    update_fields = {}
    for key, value in update_data.items():
        db_field = field_mapping.get(key, key)
        # Convertir enum a valor string si es necesario
        if isinstance(value, UserRole):
            value = value.value
        update_fields[db_field] = value

    try:
        success = supabase_db_service.update_user(user_id, update_fields)
        if not success:
            raise HTTPException(status_code=404, detail="Usuario no encontrado")

        updated_user = supabase_db_service.get_user_by_id(user_id)
        return updated_user

    except Exception as e:
        logger.error(f"Error updating user {user_id}: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error al actualizar usuario"
        )

@router.delete("/{user_id}")
async def delete_user(
    user_id: UUID,
    current_user: UserInDB = Depends(get_current_user)
):
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Requiere privilegios de administrador"
        )

    if current_user.id == user_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No puedes eliminar tu propia cuenta"
        )

    try:
        success = supabase_db_service.delete_user(user_id)
        if not success:
            raise HTTPException(status_code=404, detail="Usuario no encontrado")
        return {"message": "Usuario eliminado correctamente"}
    except Exception as e:
        logger.error(f"Error deleting user {user_id}: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error al eliminar usuario"
        )

@router.post("/{user_id}/validate")
async def validate_user(
    user_id: UUID,
    current_user: UserInDB = Depends(get_current_user)
):
    if current_user.role not in [UserRole.ADMIN, UserRole.SYSTEMS, UserRole.VENDEDOR]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Requiere privilegios de administrador o sistemas"
        )

    try:
        success = supabase_db_service.update_user(user_id, {"validado": True})
        if not success:
            raise HTTPException(status_code=404, detail="Usuario no encontrado")
        return {"message": "Usuario validado correctamente"}
    except Exception as e:
        logger.error(f"Error validating user {user_id}: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error al validar usuario"
        )
    

@router.get("/partner/{partner_id}", response_model=List[UserPublic])
async def get_users_by_partner(
    partner_id: UUID,
    current_user: UserInDB = Depends(get_current_user)
):
    if current_user.role not in [UserRole.ADMIN, UserRole.PARTNER, UserRole.SYSTEMS]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Requiere privilegios de administrador, partner o sistemas"
        )

    # Partners solo pueden ver sus propios usuarios
    if current_user.role == UserRole.PARTNER and str(current_user.id) != str(partner_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Solo puedes ver tus propios usuarios"
        )

    try:
        users = supabase_db_service.get_users_by_partner(partner_id)
        return users
    except Exception as e:
        logger.error(f"Error getting users for partner {partner_id}: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error al obtener usuarios del partner"
        )