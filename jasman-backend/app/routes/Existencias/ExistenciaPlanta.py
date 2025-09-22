from fastapi import APIRouter, Query, HTTPException
from app.supabase import supabase

existencia_router = APIRouter(prefix="/existencia", tags=["existencia"])

@existencia_router.get("/search")
async def search_llantas_por_size(
    width: str = Query(..., example="165"),
    ratio: str = Query(..., example="70"),
    diameter: str = Query(..., example="13")
):
    try:
        size_str = f"{width}/{ratio}R{diameter}"

        response = supabase.table("ExistenciaPlanta")\
            .select("*")\
            .eq("size", size_str)\
            .execute()

        return response.data
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error al buscar existencia por medida: {str(e)}"
        )
