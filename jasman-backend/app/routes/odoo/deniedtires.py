from fastapi import APIRouter, Depends, HTTPException, status
from datetime import datetime
import pytz
from typing import Optional, List
from uuid import UUID
from app.models import LlantaNegadaCreate, LlantaNegadaInDB, UserInDB, UserRole
from app.services.supabase_db import supabase_db_service
from app.services.auth import get_current_user

router = APIRouter(prefix="/deniedtires", tags=["deniedtires"])

@router.post("/", response_model=LlantaNegadaInDB)
async def registrar_llanta_negada(
    llanta_data: LlantaNegadaCreate,
    current_user: UserInDB = Depends(get_current_user)
):
    """
    Registra una llanta negada en el sistema.
    Tipo puede ser: busqueda, tabla o manual
    """
    try:
        datos = llanta_data.dict(exclude_unset=True)
        
        # Calcular medidas si no se proporcionó
        if not datos.get('medidas') and all([datos.get('piso'), datos.get('serie'), datos.get('rin')]):
            datos['medidas'] = f"{datos['piso']}/{datos['serie']}R{datos['rin']}"
        
        # Asegurar que el tipo sea válido
        if datos['tipo'] not in ['busqueda', 'tabla', 'manual']:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Tipo de registro inválido"
            )
        
        resultado = supabase_db_service.registrar_llanta_negada(
            usuario_id=str(current_user.id),
            partner_id=str(current_user.parent_partner_id) if current_user.parent_partner_id else None,
            datos=datos
        )
        
        if not resultado:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="No se pudo registrar la llanta negada"
            )
            
        return resultado
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al registrar llanta negada: {str(e)}"
        )
    
    
@router.get("/", response_model=List[LlantaNegadaInDB])
async def obtener_llantas_negadas(
    current_user: UserInDB = Depends(get_current_user),
    fecha_inicio: Optional[str] = None,
    fecha_fin: Optional[str] = None,
    limit: int = 100
):
    """
    Obtiene el historial de llantas negadas.
    Puede filtrar por rango de fechas (formato YYYY-MM-DD).
    """
    try:
        query = supabase_db_service.client.table("llantas_negadas") \
            .select("*") \
            .order("fecha", desc=True) \
            .limit(limit)
        
        # Aplicar filtros de usuario/partner según rol
        if current_user.role != UserRole.ADMIN:
            query = query.or_(f"usuario_id.eq.{str(current_user.id)},partner_id.eq.{str(current_user.parent_partner_id)}") \
                if current_user.parent_partner_id else query.eq("usuario_id", str(current_user.id))
            
        # Aplicar filtros de fecha
        if fecha_inicio:
            query = query.gte("fecha", fecha_inicio + "T00:00:00")
        if fecha_fin:
            query = query.lte("fecha", fecha_fin + "T23:59:59")
            
        response = query.execute()
        
        # Convertir fechas a zona horaria de México
        tz_mexico = pytz.timezone('America/Mexico_City')
        for item in response.data:
            if item.get('fecha'):
                utc_time = datetime.fromisoformat(item['fecha'].replace('Z', '+00:00'))
                local_time = utc_time.astimezone(tz_mexico)
                item['fecha'] = local_time.isoformat()
        
        return response.data
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al obtener llantas negadas: {str(e)}"
        )