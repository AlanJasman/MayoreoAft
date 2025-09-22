from fastapi import APIRouter, HTTPException, Request, Depends, Body, Query
from typing import Optional
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import os
import requests
from jose import jwt
from app.supabase import supabase

# ✅ Prefijo único
router = APIRouter(prefix="/odoo", tags=["quotations"])
security = HTTPBearer()

ODOO_URL = os.getenv("ODOO_URL")
ODOO_DB = os.getenv("ODOO_DB")


# 🔐 Obtener credenciales de Supabase por email del token
async def get_odoo_credentials(request: Request, credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        token = credentials.credentials
        payload = jwt.decode(
            token,
            os.getenv("SECRET_KEY"),
            algorithms=[os.getenv("ALGORITHM", "HS256")]
        )
        user_email = payload.get("sub")
        if not user_email:
            raise HTTPException(status_code=401, detail="Token inválido")

        response = supabase.table("users") \
            .select("id_odoo, odoo_api_key") \
            .eq("email", user_email) \
            .execute()

        if not response.data:
            raise HTTPException(status_code=404, detail="Usuario no encontrado")

        user_data = response.data[0]
        return {
            "id_odoo": user_data["id_odoo"],
            "odoo_api_key": user_data["odoo_api_key"]
        }

    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expirado")
    except jwt.JWTError:
        raise HTTPException(status_code=401, detail="Token inválido")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error interno: {str(e)}")


# 🔁 Función genérica para llamar a Odoo (MODIFICADA)
def odoo_request(model, method, odoo_creds, domain=None, fields=None, args=None, kwargs=None):
    domain = domain or []
    kwargs = kwargs or {}

    # Configuración según método
    if method == 'create':
        payload_args = args if args is not None else [{}]
        payload_kwargs = {}

    elif method == 'write':
        # write espera [ids], {datos}
        payload_args = args if args is not None else []
        payload_kwargs = {} 

    elif method == 'search_read':
        payload_args = [domain]
        payload_kwargs = kwargs if kwargs else {"fields": fields or []}

    else:
        payload_args = args if args is not None else [domain]
        payload_kwargs = kwargs if kwargs else {"fields": fields or []}

    payload = {
        "jsonrpc": "2.0",
        "method": "call",
        "params": {
            "service": "object",
            "method": "execute_kw",
            "args": [
                ODOO_DB,
                odoo_creds["id_odoo"],
                odoo_creds["odoo_api_key"],
                model,
                method,
                payload_args,
                payload_kwargs
            ]
        }
    }

    try:
        response = requests.post(ODOO_URL, json=payload, timeout=30)
        response.raise_for_status()
        result = response.json()

        if "error" in result:
            error_msg = result["error"].get("message", "Error de Odoo")
            raise HTTPException(status_code=500, detail=f"Odoo error: {error_msg}")

        return result["result"]

    except requests.exceptions.RequestException as e:
        raise HTTPException(status_code=503, detail=f"Conexión Odoo fallida: {str(e)}")


# 🔎 Buscar clientes (partners) - MODIFICADO
@router.get("/partners")
async def search_partners(search: str = Query(...), creds: dict = Depends(get_odoo_credentials)):
    try:
        partners = odoo_request(
            "res.partner",
            "search_read",
            creds,
            domain=[["name", "ilike", search]],
            fields=["id", "name", "phone", "email"]
        )
        
        return {
            "found": len(partners) > 0,
            "count": len(partners),
            "partners": partners
        }
        
    except Exception as e:
        print("❌ Error al buscar partners:", str(e))
        raise HTTPException(status_code=500, detail="Error al buscar partners")


# 🔎 Buscar partner por email o teléfono (verificación)
@router.get("/partners/check")
async def check_partner(
    email: Optional[str] = Query(None),
    phone: Optional[str] = Query(None),
    odoo_creds: dict = Depends(get_odoo_credentials)  
):
    if not email and not phone:
        raise HTTPException(status_code=400, detail="Se requiere email o teléfono")

    # Si vienen ambos, usamos OR (|)
    domain = []
    if email and phone:
        domain = ["|", ("email", "=", email), ("phone", "=", phone)]
    elif email:
        domain = [("email", "=", email)]
    elif phone:
        domain = [("phone", "=", phone)]

    partners = odoo_request(
        "res.partner",
        "search_read",
        odoo_creds,
        domain=domain,
        fields=["id", "name", "email", "phone"]
    )

    # Saber qué campo(s) están duplicados
    exists_fields = []
    for partner in partners:
        if email and partner.get("email") == email:
            exists_fields.append("email")
        if phone and partner.get("phone") == phone:
            exists_fields.append("phone")

    return {
        "exists": bool(partners),
        "existsFields": exists_fields,  
        "partners": partners
    }



# ➕ Crear un nuevo partner
@router.post("/partners/create")
async def create_partner(
    payload: dict = Body(...),
    creds: dict = Depends(get_odoo_credentials)
):
    """
    Crea un nuevo partner en Odoo.
    Campos requeridos: name, phone y/o email (Obligatorios))
    """
    try:
        name = payload.get("name")
        if not name:
            raise HTTPException(status_code=400, detail="El campo 'name' es obligatorio")
        
        # Preparar los datos para crear el partner
        partner_data = {
            "name": name,
            "phone": payload.get("phone"),
            "email": payload.get("email")
        }
        
        # Filtrar campos None
        partner_data = {k: v for k, v in partner_data.items() if v is not None}
        
        # Crear el partner en Odoo
        new_partner_id = odoo_request(
            "res.partner",
            "create",
            creds,
            args=[partner_data]
        )
        
        return {
            "success": True,
            "partner_id": new_partner_id,
            "message": "Partner creado exitosamente"
        }
        
    except Exception as e:
        print("❌ Error al crear partner:", str(e))
        raise HTTPException(status_code=500, detail=f"Error al crear partner: {str(e)}")


# ✏️ Actualizar un partner existente
@router.put("/partners/update/{partner_id}")
async def update_partner(
    partner_id: int,
    payload: dict = Body(...),
    creds: dict = Depends(get_odoo_credentials)
):
    """
    Actualiza los datos de un partner existente.
    Campos actualizables: phone, email (al menos uno requerido)
    """
    try:
        # Validar que el partner_id existe primero
        existing_partner = odoo_request(
            "res.partner",
            "search_read",
            creds,
            domain=[["id", "=", partner_id]],
            fields=["id"]
        )
        
        if not existing_partner:
            raise HTTPException(status_code=404, detail="Partner no encontrado en Odoo")

        update_data = {
            "phone": payload.get("phone"),
            "email": payload.get("email"),
            "name": payload.get("name")
        }
        
        # Filtrar campos None/empty y verificar que hay al menos un campo para actualizar
        update_data = {k: v for k, v in update_data.items() if v is not None and v != ""}
        if not update_data:
            raise HTTPException(status_code=400, detail="Se requiere al menos un campo para actualizar (name, phone o email)")

        # Actualizar el partner en Odoo
        result = odoo_request(
            "res.partner",
            "write",
            creds,
            args=[[int(partner_id)], update_data]
        )
        
        if not result:
            raise HTTPException(status_code=400, detail="La actualización no tuvo efecto")

        # Obtener los datos actualizados para devolverlos
        updated_partner = odoo_request(
            "res.partner",
            "search_read",
            creds,
            domain=[["id", "=", partner_id]],
            fields=["id", "name", "phone", "email"]
        )

        return {
            "success": True,
            "updated": result,
            "partner": updated_partner[0] if updated_partner else None,
            "message": "Partner actualizado exitosamente"
        }
        
    except HTTPException as he:
        raise he
    except Exception as e:
        print(f"❌ Error detallado al actualizar partner {partner_id}:", str(e))
        raise HTTPException(
            status_code=500, 
            detail=f"Error del servidor al actualizar partner: {str(e)}"
        )

# 🔎 Buscar productos
@router.get("/products")
async def search_products(search: str = Query(...), creds: dict = Depends(get_odoo_credentials)):
    try:
        products = odoo_request(
            "product.product",
            "search_read",
            creds,
            domain=[["name", "ilike", search]],
            fields=["id", "name"]
        )
        return products
    except Exception as e:
        print("❌ Error al buscar productos:", str(e))
        raise HTTPException(status_code=500, detail="Error al buscar productos")


# ➕ Crear cotización
@router.post("/quotations/create")
async def create_quotation(payload: dict = Body(...), creds: dict = Depends(get_odoo_credentials)):
    try:
        partner_id = payload.get("partner_id")
        order_lines = payload.get("order_lines", [])
        if not partner_id or not order_lines:
            raise HTTPException(status_code=400, detail="Faltan partner_id u order_lines")

        order_line_values = [
            [0, 0, {
                "product_id": int(line["product_id"]),
                "product_uom_qty": line["quantity"],
                "price_unit": line.get("unit_price", 0),
                "name": line.get("product_name", "")
            }] for line in order_lines
        ]

        new_order_id = odoo_request(
            "sale.order",
            "create",
            creds,
            args=[{
                "partner_id": int(partner_id),
                "order_line": order_line_values
            }]
        )

        return {"success": True, "order_id": new_order_id}

    except Exception as e:
        print("❌ Error al crear cotización:", str(e))
        raise HTTPException(status_code=500, detail=f"Error al crear cotización: {str(e)}")