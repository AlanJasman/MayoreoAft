from fastapi import APIRouter, Depends, HTTPException, status, Query
from typing import List, Optional
from uuid import UUID
from datetime import datetime
import logging
from app.supabase import supabase
from app.models import (
    CotizacionCreate,
    CotizacionInDB,
    CotizacionUpdate,
    DetalleCotizacionInDB,
    UserPublic,
    UserRole,
    UserInDB,
    PaginatedResponse
)
from app.services.supabase_db import supabase_db_service
from app.services.auth import get_current_user

router = APIRouter(prefix="/cotizaciones", tags=["cotizaciones"])
logger = logging.getLogger(__name__)


@router.get("/buscar-usuarios")
async def buscar_usuarios(
    current_user: UserInDB = Depends(get_current_user),
    search: Optional[str] = Query(None, description="Buscar por nombre o correo"),
    role: Optional[str] = Query(None, description="Filtrar por rol"),
    page: int = Query(1, ge=1),
    per_page: int = Query(10, ge=1, le=100)
):
    try:
        query = supabase.table("usuarios").select("*")

        # Si el usuario actual es vendedor, filtrar por su parent_partner_id
        # Verifica el nombre correcto del atributo (puede ser 'role' en lugar de 'rol')
        if hasattr(current_user, 'rol') and current_user.rol == "vendedor":
            query = query.eq("parent_partner_id", current_user.id)
        elif hasattr(current_user, 'role') and current_user.role == "vendedor":
            query = query.eq("parent_partner_id", current_user.id)

        if search:
            query = query.or_(f"nombre.ilike.%{search}%,correo.ilike.%{search}%")
        if role:
            query = query.eq("rol", role)

        start = (page - 1) * per_page
        end = start + per_page - 1
        data = query.range(start, end).execute()

        return {
            "data": data.data,
            "pagination": {
                "page": page,
                "per_page": per_page,
                "total": len(data.data)
            }
        }
    except Exception as e:
        logger.error(f"Error buscando usuarios: {str(e)}", exc_info=True)
        raise HTTPException(500, f"Error al buscar usuarios: {str(e)}")
    
    
@router.get("/buscar-productos")
async def buscar_productos(
    current_user: UserInDB = Depends(get_current_user),
    search: str = Query(..., description="Buscar por SKU o nombre"),
    page: int = Query(1, ge=1),
    per_page: int = Query(10, ge=1, le=500)
):
    try:
        start = (page - 1) * per_page
        end = start + per_page - 1

        # Primero obtenemos los productos
        query = supabase.table("products").select("*", count="exact")
        if search:
            # Buscar por SKU o nombre
            query = query.or_(f"sku.ilike.%{search}%,name.ilike.%{search}%")
        query = query.range(start, end)

        response = query.execute()
        
        if not response.data:
            return {
                "data": [],
                "pagination": {
                    "total_items": 0,
                    "current_page": page,
                    "per_page": per_page,
                    "total_pages": 0
                }
            }

        # Obtenemos los SKUs de los productos encontrados
        skus = [product["sku"] for product in response.data if product.get("sku")]
        
        # Buscamos los precios correspondientes
        prices_response = supabase.table("product_prices")\
            .select("sku, price")\
            .in_("sku", skus)\
            .execute()
        
        # Creamos un diccionario de precios por SKU
        prices_dict = {price["sku"]: price["price"] for price in prices_response.data}

        # Combinamos los productos con sus precios
        products_with_prices = []
        for product in response.data:
            product_with_price = product.copy()
            product_with_price["price"] = prices_dict.get(product["sku"])
            products_with_prices.append(product_with_price)

        return {
            "data": products_with_prices,
            "pagination": {
                "total_items": response.count,
                "current_page": page,
                "per_page": per_page,
                "total_pages": (response.count + per_page - 1) // per_page
            }
        }

    except Exception as e:
        # Manejo de errores
        logger.error(f"Error en buscar_productos: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error interno del servidor al buscar productos"
        )

@router.post("/", response_model=CotizacionInDB)
async def crear_cotizacion(
    cotizacion: CotizacionCreate,
    current_user: UserInDB = Depends(get_current_user)
):
    try:
        # Preparar datos para Supabase
        cotizacion_data = cotizacion.dict(by_alias=True)  # Respeta el alias "codigo" para SKU
        cotizacion_data["usuario_id"] = current_user.id

        # Si es partner/vendedor, asignar partner_id automáticamente
        if current_user.role in [UserRole.PARTNER, UserRole.VENDEDOR]:
            cotizacion_data["partner_id"] = (
                current_user.parent_partner_id 
                if current_user.role == UserRole.VENDEDOR 
                else current_user.id
            )

        nueva_cotizacion = supabase_db_service.create_cotizacion(cotizacion_data)
        return nueva_cotizacion

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error creando cotización: {str(e)}")
        raise HTTPException(status_code=500, detail="Error interno al crear cotización")


@router.get("/", response_model=PaginatedResponse[CotizacionInDB])
async def listar_cotizaciones(
    current_user: UserInDB = Depends(get_current_user),
    page: int = 1,
    per_page: int = 10,
    estado: Optional[str] = None,
    cliente_id: Optional[UUID] = None
):
    try:
        # Query base con joins
        query = supabase_db_service.client.from_("cotizaciones").select('''
            *,
            detalle_cotizacion(*, products(*)),
            cliente:cliente_id(*),
            partner:partner_id(*),
            usuario:usuario_id(*)
        ''')
        
        # Filtro según rol
        if current_user.role == UserRole.ADMIN or current_user.role == UserRole.SYSTEMS:
            pass  # ven todo
        elif current_user.role == UserRole.PARTNER:
            query = query.eq("partner_id", str(current_user.id))
        elif current_user.role == UserRole.VENDEDOR:
            query = query.eq("usuario_id", str(current_user.id))
        elif current_user.role == UserRole.CLIENT:
            query = query.eq("cliente_id", str(current_user.id))
        else:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No tienes permisos para ver cotizaciones"
            )
        
        # Filtros adicionales
        if estado:
            query = query.eq("estado", estado)
        if cliente_id and (current_user.role in [UserRole.ADMIN, UserRole.SYSTEMS, UserRole.PARTNER]):
            query = query.eq("cliente_id", str(cliente_id))
        
        # Paginación
        query = query.order("fecha", desc=True).range((page-1)*per_page, page*per_page-1)
        response = query.execute()
        cotizaciones = response.data if response.data else []
        
        # Contador total (para paginación)
        total = supabase_db_service.client.from_("cotizaciones").select("id", count="exact").execute().count or 0
        
        return {
            "data": cotizaciones,
            "pagination": {
                "total": total,
                "page": page,
                "per_page": per_page,
                "total_pages": (total + per_page - 1) // per_page,
                "has_next": page * per_page < total,
                "has_prev": page > 1
            }
        }
    except Exception as e:
        logger.error(f"Error obteniendo cotizaciones: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error al obtener las cotizaciones"
        )


@router.get("/{cotizacion_id}", response_model=CotizacionInDB)
async def obtener_cotizacion(
    cotizacion_id: UUID,
    current_user: UserInDB = Depends(get_current_user)
):
    try:
        cotizacion = supabase_db_service.get_cotizacion_by_id(cotizacion_id)
        
        if not cotizacion:
            raise HTTPException(status_code=404, detail="Cotización no encontrada")
        
        # Validar permisos para ver esta cotización
        if current_user.role == UserRole.CLIENT and str(cotizacion.get("cliente_id")) != str(current_user.id):
            raise HTTPException(status_code=403, detail="No tienes acceso a esta cotización")
        elif current_user.role == UserRole.PARTNER and cotizacion.get("partner_id") and str(cotizacion.get("partner_id")) != str(current_user.id):
            raise HTTPException(status_code=403, detail="No tienes acceso a esta cotización")
        elif current_user.role == UserRole.VENDEDOR and str(cotizacion.get("usuario_id")) != str(current_user.id):
            raise HTTPException(status_code=403, detail="No tienes acceso a esta cotización")
        
        return cotizacion
        
    except Exception as e:
        logger.error(f"Error obteniendo cotización {cotizacion_id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail="Error al obtener la cotización")

@router.put("/{cotizacion_id}", response_model=CotizacionInDB)
async def actualizar_cotizacion(
    cotizacion_id: UUID,
    cotizacion_data: CotizacionUpdate,
    current_user: UserInDB = Depends(get_current_user)
):
    try:
        # 1. Obtener la cotización completa con información del cliente
        cotizacion = supabase_db_service.get_cotizacion_completa(cotizacion_id)
        if not cotizacion:
            raise HTTPException(status_code=404, detail="Cotización no encontrada")
        
        # 2. Validar permisos
        if current_user.role == UserRole.CLIENT:
            # Clientes solo pueden cambiar estado a aceptada/rechazada
            update_fields = cotizacion_data.dict(exclude_unset=True)
            if "estado" not in update_fields or update_fields["estado"] not in ["aceptada", "rechazada"]:
                raise HTTPException(
                    status_code=403, 
                    detail="Solo puedes aceptar o rechazar la cotización"
                )
            
            # Clientes solo pueden modificar sus propias cotizaciones
            if str(cotizacion.get("cliente_id")) != str(current_user.id):
                raise HTTPException(
                    status_code=403, 
                    detail="No puedes modificar esta cotización"
                )
            
        elif current_user.role == UserRole.VENDEDOR:
            # Vendedores: Pueden modificar si crearon la cotización O si el cliente es suyo
            vendedor_creo_la_cotizacion = (
                cotizacion.get("usuario_id") and 
                str(cotizacion.get("usuario_id")) == str(current_user.id)
            )
            
            cliente_es_del_vendedor = (
                cotizacion.get("cliente") and 
                cotizacion["cliente"].get("parent_partner_id") and
                str(cotizacion["cliente"].get("parent_partner_id")) == str(current_user.id)
            )
            
            if not (vendedor_creo_la_cotizacion or cliente_es_del_vendedor):
                raise HTTPException(
                    status_code=403, 
                    detail="No puedes modificar esta cotización"
                )
                
        elif current_user.role == UserRole.PARTNER:
            # Partners solo pueden modificar sus propias cotizaciones
            if str(cotizacion.get("partner_id")) != str(current_user.id):
                raise HTTPException(
                    status_code=403, 
                    detail="No puedes modificar cotizaciones de otros partners"
                )
        
        # 3. Preparar datos para actualización
        update_data = cotizacion_data.dict(exclude_unset=True)
        
        # 4. Si incluye detalles, manejarlos por separado
        detalles_actualizados = None
        if "detalles" in update_data:
            detalles_actualizados = update_data.pop("detalles")
        
        # 5. Si NO incluye totales pero SÍ incluye detalles, calcularlos automáticamente
        if detalles_actualizados and ("subtotal" not in update_data or "total" not in update_data):
            subtotal_calculado = sum(detalle["precio_unitario"] * detalle["cantidad"] for detalle in detalles_actualizados)
            total_calculado = subtotal_calculado  # Puedes agregar impuestos aquí si es necesario
            
            if "subtotal" not in update_data:
                update_data["subtotal"] = subtotal_calculado
            if "total" not in update_data:
                update_data["total"] = total_calculado
        
        # 6. Actualizar la cotización principal (si hay datos)
        if update_data:
            success = supabase_db_service.update_cotizacion(cotizacion_id, update_data)
            if not success:
                raise HTTPException(
                    status_code=404, 
                    detail="Error al actualizar la cotización"
                )
        
        # 7. Si hay detalles para actualizar, procesarlos
        if detalles_actualizados:
            try:
                # Primero eliminar detalles existentes
                logger.debug("Eliminando detalles existentes...")
                supabase_db_service.eliminar_detalles_cotizacion(cotizacion_id)
                logger.debug("Detalles existentes eliminados")
                
                # Luego agregar los nuevos detalles
                for detalle in detalles_actualizados:
                    # Validar que el detalle tenga los campos requeridos
                    required_fields = ["precio_unitario", "cantidad"]
                    sku_fields = ["codigo", "sku"]
                    
                    # Verificar campos requeridos
                    if not all(key in detalle for key in required_fields):
                        raise HTTPException(
                            status_code=400,
                            detail="Cada detalle debe tener precio_unitario y cantidad"
                        )
                    
                    # Verificar que tenga al menos un campo de SKU
                    if not any(key in detalle for key in sku_fields):
                        raise HTTPException(
                            status_code=400,
                            detail="Cada detalle debe tener código (SKU)"
                        )
                    
                    # Normalizar el campo SKU
                    if "sku" in detalle:
                        detalle["codigo"] = detalle.pop("sku")
                    
                    # Validar valores positivos
                    if detalle["precio_unitario"] <= 0 or detalle["cantidad"] <= 0:
                        raise HTTPException(
                            status_code=400,
                            detail="Precio y cantidad deben ser mayores a 0"
                        )
                    
                    logger.debug(f"Agregando detalle: {detalle}")
                    
                    try:
                        supabase_db_service.agregar_detalle_cotizacion(
                            cotizacion_id, 
                            detalle["codigo"], 
                            detalle["precio_unitario"], 
                            detalle["cantidad"]
                        )
                        logger.debug(f"Detalle {detalle['codigo']} agregado exitosamente")
                    except Exception as detalle_error:
                        logger.error(f"ERROR ESPECÍFICO al agregar detalle {detalle['codigo']}: {str(detalle_error)}", exc_info=True)
                        raise HTTPException(
                            status_code=500, 
                            detail=f"Error al agregar producto {detalle['codigo']}: {str(detalle_error)}"
                        )
                    
            except HTTPException:
                raise
            except ValueError as e:
                raise HTTPException(status_code=400, detail=str(e))
            except Exception as e:
                logger.error(f"Error general actualizando detalles: {str(e)}", exc_info=True)
                raise HTTPException(
                    status_code=500, 
                    detail=f"Error al actualizar los detalles de la cotización: {str(e)}"
                )
        
        # 8. Devolver la cotización actualizada con todos los joins
        logger.debug("Obteniendo cotización actualizada...")
        updated_cotizacion = supabase_db_service.get_cotizacion_completa(cotizacion_id)
        if not updated_cotizacion:
            raise HTTPException(
                status_code=404, 
                detail="Error al obtener la cotización actualizada"
            )
        
        logger.debug("Cotización actualizada obtenida exitosamente")
        return updated_cotizacion
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error general actualizando cotización {cotizacion_id}: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error interno al actualizar la cotización: {str(e)}"
        )


@router.delete("/{cotizacion_id}", status_code=status.HTTP_204_NO_CONTENT)
async def eliminar_cotizacion(
    cotizacion_id: UUID,
    current_user: UserInDB = Depends(get_current_user)
):
    if current_user.role not in [UserRole.ADMIN, UserRole.SYSTEMS]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Requiere privilegios de administrador o sistemas"
        )
    
    try:
        success = supabase_db_service.delete_cotizacion(cotizacion_id)
        if not success:
            raise HTTPException(status_code=404, detail="Cotización no encontrada")
    except Exception as e:
        logger.error(f"Error eliminando cotización {cotizacion_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error al eliminar la cotización"
        )
    
