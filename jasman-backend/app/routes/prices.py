# app/routers/prices.py
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from fastapi.responses import JSONResponse
from app.models import UserInDB
from app.services.auth import get_current_user
from app.services.supabase_db import supabase_db_service
from datetime import datetime
import pandas as pd
import io
from typing import List
from pydantic import BaseModel

router = APIRouter(prefix="/prices", tags=["prices"])

class PriceUpdate(BaseModel):
    sku: str
    price: float

class BulkPriceUpdate(BaseModel):
    updates: List[PriceUpdate]

@router.post("/upload", response_model=BulkPriceUpdate)
async def upload_prices(
    file: UploadFile = File(...),
    current_user: UserInDB = Depends(get_current_user)
):
    """
    Endpoint para subir precios desde un archivo CSV o Excel.
    Requiere rol 'admin' o 'precios'.
    El archivo debe tener las columnas: sku, price
    """
    if current_user.role not in ['admin', 'precios']:  # Cambiado a 'precios'
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Se requieren privilegios de admin o precios"
        )

    try:
        # Leer el archivo según su extensión
        if file.filename.endswith('.csv'):
            contents = await file.read()
            df = pd.read_csv(io.StringIO(contents.decode('utf-8')))
        elif file.filename.endswith('.xlsx') or file.filename.endswith('.xls'):
            contents = await file.read()
            df = pd.read_excel(io.BytesIO(contents))
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Formato de archivo no soportado. Use CSV o Excel."
            )

        # Validar columnas requeridas
        if not all(col in df.columns for col in ['sku', 'price']):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="El archivo debe contener las columnas 'sku' y 'price'"
            )

        # Convertir a lista de diccionarios
        updates = df[['sku', 'price']].to_dict('records')
        
        # Procesar cada actualización
        success_count = 0
        errors = []
        
        for update in updates:
            try:
                # Verificar que el precio sea válido
                if not isinstance(update['price'], (int, float)) or update['price'] <= 0:
                    errors.append(f"Precio inválido para SKU {update['sku']}: {update['price']}")
                    continue
                
                # Actualizar en Supabase
                response = supabase_db_service.client.table("product_prices_aft") \
                    .upsert({
                        "sku": update['sku'],
                        "price": float(update['price']),
                        "updated_at": datetime.utcnow().isoformat()
                    }, on_conflict="sku") \
                    .execute()
                
                if response.data:
                    success_count += 1
                else:
                    errors.append(f"No se pudo actualizar el precio para SKU {update['sku']}")
                    
            except Exception as e:
                errors.append(f"Error procesando SKU {update['sku']}: {str(e)}")

        return JSONResponse(
            status_code=status.HTTP_200_OK,
            content={
                "message": f"Procesado completo. Éxitos: {success_count}, Errores: {len(errors)}",
                "success_count": success_count,
                "error_count": len(errors),
                "errors": errors if errors else None
            }
        )

    except pd.errors.EmptyDataError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El archivo está vacío"
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error procesando el archivo: {str(e)}"
        )