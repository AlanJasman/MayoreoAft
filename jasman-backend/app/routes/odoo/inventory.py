from fastapi import APIRouter, Request, HTTPException, Query, Depends
from typing import List, Dict, Optional
from fastapi.responses import JSONResponse
from fastapi.responses import StreamingResponse
from app.models import InventorySearch
from app.supabase import supabase
from app.services.InventoryService import InventoryPriceService
from app.services.auth import get_current_user  # Importa la función de autenticación
from app.models import UserInDB  # Add this import
from app.services.supabase_db import supabase_db_service  # Import the service
import logging
import io
import csv
from datetime import datetime
import re
import pytz


logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)

if not logger.handlers:
    handler = logging.StreamHandler()
    handler.setFormatter(logging.Formatter('%(asctime)s - %(levelname)s - %(message)s'))
    logger.addHandler(handler)

DEFAULT_LINE_ID = 4
MEXICO_TZ = pytz.timezone('America/Mexico_City')

router = APIRouter(
    prefix="/inventory",
    tags=["inventory"],
    responses={404: {"description": "No encontrado"}}
)


def _is_consigna_product(product: Dict) -> bool:
    """
    Detecta si un producto es de consigna basado en el categ_id
    """
    # IDs de categorías consigna a excluir
    CONSIGNA_CATEGORY_IDS = {503, 504, 505, 517}
    
    # Obtener el categ_id del producto
    categ_id = product.get('categ_id')
    
    # Si categ_id es una lista/tupla [id, nombre]
    if isinstance(categ_id, (list, tuple)) and len(categ_id) > 0:
        return categ_id[0] in CONSIGNA_CATEGORY_IDS
    
    # Si categ_id es solo el ID numérico
    elif isinstance(categ_id, int):
        return categ_id in CONSIGNA_CATEGORY_IDS
    
    return False

@router.get("/stockquant/all", response_model=Dict)
async def sync_inventory(request: Request):
    try:
        inventory_data = InventoryPriceService.get_all_inventory(line_id=DEFAULT_LINE_ID)
        result = await _sync_inventory_to_supabase(inventory_data)
        
        return {
            "status": "success",
            "message": "Inventario sincronizado con Supabase",
            "details": result
        }
    except Exception as e:
        logger.error(f"💥 Error en sincronización manual: {str(e)}", exc_info=True)
        return JSONResponse(
            status_code=500,
            content={"status": "error", "message": f"Error al sincronizar: {str(e)}"}
        )

async def _sync_inventory_to_supabase(inventory_data: List[Dict]) -> Dict:
    """Función que sincroniza inventario ELIMINANDO TODOS los productos previos"""
    try:
        # 1. ✅ ELIMINAR TODOS los productos existentes primero
        try:
            logger.info("🗑️ Eliminando TODOS los productos existentes...")
            # Primero eliminar inventario (por restricciones de foreign key)
            supabase.table('inventory').delete().neq('product_id', 0).execute()
            # Luego eliminar todos los productos
            supabase.table('products').delete().neq('id', 0).execute()
            logger.info("✅ Todos los productos anteriores eliminados")
        except Exception as e:
            logger.error(f"Error eliminando productos existentes: {str(e)}")
            raise

        # 2. ✅ OBTENER WAREHOUSES PRIMERO (¡esto va ANTES del loop!)
        existing_warehouses = {}
        try:
            result = supabase.table('warehouses').select("id, type").execute()
            existing_warehouses = {wh['id']: wh['type'] for wh in result.data}
            logger.info(f"🏭 Warehouses obtenidos: {len(existing_warehouses)}")
        except Exception as e:
            logger.error(f"⚠️ Error obteniendo warehouses: {str(e)}")

        # 3. Obtener IDs de productos actuales desde Odoo (excluyendo consignas)
        current_product_ids = set()
        consigna_products = 0
        
        for product in inventory_data:
            if _is_consigna_product(product):
                consigna_products += 1
                logger.info(f"⏭️ Saltando producto consigna: {product.get('name')}")
                continue
            product_id = int(product.get('id', 0))
            if product_id:
                current_product_ids.add(product_id)
        
        logger.info(f"⏭️ Se excluyeron {consigna_products} productos consigna")
        logger.info(f"📦 Se procesarán {len(current_product_ids)} productos válidos")
        
        warehouses_to_update = set()
        product_inserts = []
        inventory_inserts = []

        for product in inventory_data:
            try:
                # EXCLUIR PRODUCTOS CON CATEGORÍA "CONSIGNA"
                if _is_consigna_product(product):
                    continue

                product_id = int(product.get('id', 0))
                if not product_id:
                    continue

                # Procesar almacenes
                for zone_name, zone_data in product.get('zonas', {}).items():
                    for wh_id, wh_data in zone_data.get('almacenes', {}).items():
                        try:
                            wh_id_int = int(wh_id)
                            zone_num = zone_name.replace("zona", "")
                            wh_name = wh_data.get('name', 'Desconocido')
                            wh_type = existing_warehouses.get(wh_id_int, 'Sucursal')
                            warehouses_to_update.add((wh_id_int, wh_name, zone_num, wh_type))
                        except (ValueError, TypeError):
                            continue

                attributes = product.get('attributes', {})
                sku_match = re.search(r'\[([A-Za-z0-9]+)\]', product.get('name', ''))

                product_data = {
                    'id': product_id,
                    'name': str(product.get('name', 'Nombre no disponible'))[:500],
                    'sku': sku_match.group(1) if sku_match else None,
                    'total_quantity': int(float(product.get('total_quantity', 0))),
                    'piso': str(attributes.get('piso', ''))[:50],
                    'serie': str(attributes.get('serie', ''))[:50],
                    'rin': str(attributes.get('rin', ''))[:50],
                    'carga_velocidad': str(attributes.get('carga / velocidad', ''))[:100],
                    'marca': str(attributes.get('marca', ''))[:100],
                    'modelo': str(attributes.get('modelo', ''))[:100],
                    'last_sync': datetime.now(MEXICO_TZ).isoformat()
                }
                product_inserts.append(product_data)

                for zone_name, zone_data in product.get('zonas', {}).items():
                    for wh_id, wh_data in zone_data.get('almacenes', {}).items():
                        try:
                            wh_id_int = int(wh_id)
                            inventory_inserts.append({
                                'product_id': product_id,
                                'warehouse_id': wh_id_int,
                                'quantity': int(float(wh_data.get('quantity', 0))),
                                'last_updated': datetime.now(MEXICO_TZ).isoformat()
                            })
                        except (ValueError, TypeError):
                            continue
            except Exception as e:
                logger.error(f"Error procesando producto: {str(e)}")
                continue

        # 4. Actualizar warehouses
        if warehouses_to_update:
            for wh_id, name, zone, wh_type in warehouses_to_update:
                try:
                    existing = supabase.table('warehouses').select("*").eq('id', wh_id).execute()
                    if existing.data:
                        supabase.table('warehouses').update({
                            'name': name[:200],
                            'zone': int(zone) if str(zone).isdigit() else 1
                        }).eq('id', wh_id).execute()
                    else:
                        supabase.table('warehouses').insert({
                            'id': wh_id,
                            'name': name[:200],
                            'type': wh_type,
                            'zone': int(zone) if str(zone).isdigit() else 1
                        }).execute()
                except Exception as e:
                    logger.error(f"Error actualizando/insertando warehouse {wh_id}: {str(e)}")

        # 5. UPSERT productos e inventario
        if product_inserts:
            supabase.table('products').upsert(product_inserts, on_conflict=["id"]).execute()

        if inventory_inserts:
            supabase.table('inventory').upsert(inventory_inserts, on_conflict="product_id,warehouse_id").execute()

        return {
            "products_updated": len(product_inserts),
            "products_deleted": "ALL",
            "consigna_excluded": consigna_products,
            "warehouses": len(warehouses_to_update),
            "inventory_records": len(inventory_inserts),
            "message": "Inventario completamente reemplazado (productos consigna excluidos)"
        }

    except Exception as e:
        logger.error(f"🔥 Error crítico: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Error interno: {str(e)}"
        )

def _parse_price(price_str: str) -> Optional[float]:
    if not price_str or not isinstance(price_str, str) or price_str == 'N/A':
        return None
    try:
        return float(price_str.replace(',', '').strip())
    except (ValueError, AttributeError):
        return None

def _determine_warehouse_type(warehouse_name: str) -> str:
    if not isinstance(warehouse_name, str):
        return 'Sucursal'
    warehouse_name = warehouse_name.upper()
    if 'CEDIS' in warehouse_name:
        return 'CEDIS'
    elif 'AMAZON' in warehouse_name:
        return 'Amazon'
    return 'Sucursal'

def _batch_insert(client, table: str, data: list, batch_size: int = 100):
    for i in range(0, len(data), batch_size):
        batch = data[i:i + batch_size]
        client.table(table).insert(batch).execute()


@router.get("/reporte-zonas-detallado", response_model=Dict)
async def get_reporte_zonas_detallado(
    request: Request,
    piso: Optional[str] = None,
    serie: Optional[str] = None,
    rin: Optional[str] = None,
    page: int = Query(1, ge=1),
    per_page: int = Query(500, ge=1, le=500),
    current_user: UserInDB = Depends(get_current_user)
):
    try:
        logger.info(f"📊 Generando reporte (página {page}, {per_page} items)")

        # --- Registrar búsqueda ---
        try:
            medidas = None
            if piso and serie and rin:
                medidas = f"{piso}/{serie}R{rin}"
            supabase_db_service.registrar_busqueda_supabase(
                usuario_id=str(current_user.id),
                partner_id=str(current_user.parent_partner_id) if current_user.parent_partner_id else None,
                piso=piso, serie=serie, rin=rin, medidas=medidas
            )
        except Exception as e:
            logger.error(f"Error registrando búsqueda: {str(e)}", exc_info=True)

        start = (page - 1) * per_page
        end = start + per_page - 1

        # --- Obtener productos de products ---
        query = supabase.table('products').select('*', count='exact')
        if piso:
            query = query.ilike('piso', f'%{piso}%')
        if serie:
            query = query.ilike('serie', f'%{serie}%')
        if rin:
            query = query.ilike('rin', f'%{rin}%')
        query = query.range(start, end)
        products_response = query.execute()
        products_data = products_response.data
        product_ids = [p['id'] for p in products_data]

        # --- Inventario normal ---
        inventory_data = []
        if product_ids:
            inventory_response = supabase.table('inventory').select(
                "quantity, product_id, warehouse_id!inner(id, name, type, zone)"
            ).in_('product_id', product_ids).execute()
            inventory_data = inventory_response.data

        # --- Precios para products ---
        skus_products = [str(p['sku']) for p in products_data if p.get('sku')]
        prices_response = supabase.table('product_prices').select('*').in_('sku', skus_products).execute()
        prices_dict = {str(p['sku']): p['price'] for p in prices_response.data}

        # --- ExistenciaPlanta ---
        existencia_query = supabase.table('ExistenciaPlanta').select('*')
        if piso:
            existencia_query = existencia_query.ilike('width', f'%{piso}%')
        if serie:
            existencia_query = existencia_query.eq('ratio', int(serie))
        if rin:
            existencia_query = existencia_query.ilike('diameter', f'%{rin}%')
        existencia_data = existencia_query.execute().data

        # --- Precios para ExistenciaPlanta ---
        skus_existencia = [str(e['sku']) for e in existencia_data if e.get('sku')]
        all_skus = list(set(skus_products + skus_existencia))
        precios_extra = supabase.table('product_prices').select('*').in_('sku', all_skus).execute()
        prices_dict.update({str(p['sku']): p['price'] for p in precios_extra.data})

        # --- Armar reporte ---
        reporte = {}
        proveedores_info = {}  # Nuevo diccionario para info de proveedores

        # Procesar ExistenciaPlanta primero para obtener info de proveedores
        for e in existencia_data:
            manufacturer = e.get('manufacturer')
            if manufacturer and manufacturer not in proveedores_info:
                proveedores_info[manufacturer] = {
                    'update': e.get('update'),
                    'created_at': e.get('created_at')
                }

        # productos de products
        for p in products_data:
            sku = str(p.get('sku'))
            if not sku:
                continue
            reporte[sku] = {
                "sku": sku,
                "nombre": p['name'],
                "piso": p.get('piso'),
                "serie": p.get('serie'),
                "marca": p.get('marca'),
                "rin": p.get('rin'),
                "precio": prices_dict.get(sku),
                "zonas": {str(z): {
                    "CEDIS": [], "Sucursales": [],
                    "total_cedis": 0, "total_sucursales": 0, "total_general": 0
                } for z in range(1, 5)}
            }

        # inventario normal
        for item in inventory_data:
            product = next((p for p in products_data if p['id'] == item['product_id']), None)
            if not product:
                continue
            sku = str(product['sku'])
            if sku not in reporte:
                continue

            wh = item['warehouse_id']
            zone = str(wh.get('zone', '1'))
            almacen = {"almacen_id": wh['id'], "nombre": wh['name'], "cantidad": item['quantity']}

            if wh['type'].upper() == 'CEDIS':
                reporte[sku]['zonas'][zone]['CEDIS'].append(almacen)
            else:
                reporte[sku]['zonas'][zone]['Sucursales'].append(almacen)

        # inventario de ExistenciaPlanta
        for e in existencia_data:
            sku = str(e['sku'])
            if not sku:
                continue

            if sku not in reporte:
                reporte[sku] = {
                    "sku": sku,
                    "nombre": e.get('description', f'SKU-{sku}'),
                    "marca": e.get('brand'),  
                    "piso": e.get('width'),
                    "serie": e.get('ratio'),
                    "rin": e.get('diameter'),
                    "precio": prices_dict.get(sku),
                    "zonas": {}
                }

            zone_name = e.get('warehouse', 'Planta')
            if zone_name not in reporte[sku]['zonas']:
                reporte[sku]['zonas'][zone_name] = {
                    "CEDIS": [], "Sucursales": [],
                    "total_cedis": 0, "total_sucursales": 0, "total_general": 0
                }

            reporte[sku]['zonas'][zone_name]['CEDIS'].append({
                "almacen_id": None,
                "nombre": f"Planta ({zone_name})",
                "cantidad": e.get('on_hand', 0)
            })

        # Totales
        for p in reporte.values():
            for z in p['zonas'].values():
                z['total_cedis'] = sum(i['cantidad'] for i in z['CEDIS'])
                z['total_sucursales'] = sum(i['cantidad'] for i in z['Sucursales'])
                z['total_general'] = z['total_cedis'] + z['total_sucursales']

        return {
            "data": sorted(reporte.values(), key=lambda x: x['sku']),
            "proveedores": proveedores_info,  # Agregamos la info de proveedores aquí
            "pagination": {
                "total_items": products_response.count,
                "current_page": page,
                "per_page": per_page,
                "total_pages": (products_response.count + per_page - 1) // per_page,
                "filters": {k: v for k, v in {'piso': piso, 'serie': serie, 'rin': rin}.items() if v is not None}
            }
        }

    except Exception as e:
        logger.error(f"💥 Error al generar reporte: {str(e)}", exc_info=True)
        raise HTTPException(500, f"Error al generar reporte: {str(e)}")



def _process_products_data(products_data, inventory_data, precios_data):
    """Función helper para procesamiento común"""
    reporte = {}

    # Diccionario rápido para precios por SKU
    sku_to_precio = {item['sku']: item['price'] for item in precios_data}

    # Crear productos
    for product in products_data:
        sku = product.get('sku') or f"ID-{product['id']}"
        precio = sku_to_precio.get(sku)

        reporte[str(product['id'])] = {
            "sku": sku,
            "nombre": product['name'],
            **{k: product.get(k) for k in ['piso', 'serie', 'rin', 'marca']},
            "precio": precio,
            "zonas": {
                str(zone): {
                    "CEDIS": [],
                    "Sucursales": [],
                    "total_cedis": 0,
                    "total_sucursales": 0,
                    "total_general": 0
                } for zone in range(1, 5)
            }
        }

    # Agregar inventario
    for item in inventory_data:
        try:
            product_id = str(item['product_id'])
            if product_id not in reporte:
                continue
                
            warehouse = item.get('warehouse_id', {})
            zone = str(warehouse.get('zone', '1'))
            wh_type = warehouse.get('type', '').strip().upper()
            
            almacen = {
                "almacen_id": warehouse.get('id'),
                "nombre": warehouse.get('name'),
                "cantidad": item.get('quantity', 0)
            }
            
            if wh_type == 'CEDIS':
                reporte[product_id]['zonas'][zone]['CEDIS'].append(almacen)
            elif wh_type == 'SUCURSAL':
                reporte[product_id]['zonas'][zone]['Sucursales'].append(almacen)
                
        except Exception as e:
            logger.error(f"Error procesando ítem: {str(e)}")
            continue

    # Calcular totales
    for product in reporte.values():
        for zone_data in product['zonas'].values():
            zone_data['total_cedis'] = sum(i['cantidad'] for i in zone_data['CEDIS'])
            zone_data['total_sucursales'] = sum(i['cantidad'] for i in zone_data['Sucursales'])
            zone_data['total_general'] = zone_data['total_cedis'] + zone_data['total_sucursales']
    
    return list(reporte.values())

@router.get("/export/supabase/csv", tags=["inventory"])
async def export_supabase_inventory_csv(
    current_user: UserInDB = Depends(get_current_user)
):
    """
    Exporta todo el inventario desde Supabase en formato CSV simplificado.
    """
    try:
        logger.info(f"Iniciando exportación CSV desde Supabase para usuario {current_user.email}")

        # 1. Obtener todos los productos paginados
        all_products = []
        page = 0
        page_size = 1000
        
        while True:
            logger.info(f"Obteniendo productos página {page + 1}")
            response = supabase.table('products') \
                .select('id, sku, name, piso, serie, rin, marca, modelo, total_quantity') \
                .range(page * page_size, (page + 1) * page_size - 1) \
                .execute()
            
            batch = response.data
            if not batch:
                break
                
            all_products.extend(batch)
            page += 1

        if not all_products:
            logger.warning("No se encontraron productos en Supabase")
            raise HTTPException(status_code=404, detail="No se encontraron productos")

        # 2. Obtener todos los precios
        prices = {}
        prices_response = supabase.table('product_prices').select('sku, price').execute()
        for price in prices_response.data:
            prices[price['sku']] = price['price']

        # 3. Generar CSV
        def generate_csv():
            output = io.StringIO()
            writer = csv.writer(output, delimiter=',', quotechar='"', quoting=csv.QUOTE_MINIMAL)
            
            # Encabezados simplificados
            headers = [
                "SKU", "Nombre", "Piso", "Serie", "Rin", 
                "Marca", "Modelo", "Precio", "Stock Total"
            ]
            writer.writerow(headers)
            yield output.getvalue()
            output.seek(0)
            output.truncate(0)

            # Datos de productos
            for product in all_products:
                try:
                    # Construir fila simplificada
                    row = [
                        product.get('sku', ''),
                        product.get('name', ''),
                        product.get('piso', ''),
                        product.get('serie', ''),
                        product.get('rin', ''),
                        product.get('marca', ''),
                        product.get('modelo', ''),
                        prices.get(str(product.get('sku')), ''),  # Precio
                        product.get('total_quantity', 0)  # Stock total
                    ]
                    writer.writerow(row)
                    yield output.getvalue()
                    output.seek(0)
                    output.truncate(0)
                    
                except Exception as e:
                    logger.error(f"Error procesando producto {product.get('id')}: {str(e)}")
                    continue

        # Configurar respuesta
        now = datetime.now(MEXICO_TZ).strftime("%Y%m%d_%H%M%S")
        filename = f"inventario_simplificado_{now}.csv"
        
        logger.info(f"Exportación CSV completada. Filename: {filename}")
        
        return StreamingResponse(
            generate_csv(),
            media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename={filename}"}
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error en export_supabase_inventory_csv: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Error al generar CSV desde Supabase: {str(e)}"
        )

@router.post("/stockquant/enrich")
async def enrich_inventory_data(payload: Dict):
    product_ids = payload.get("product_ids", [])
    if not product_ids:
        raise HTTPException(status_code=400, detail="Faltan product_ids")

    try:
        template_map = InventoryPriceService.get_product_templates_map(product_ids)
        template_ids = list(set(template_map.values()))
        prices = InventoryPriceService.get_prices(template_ids)

        return {
            pid: {
                "price": prices.get(template_map.get(pid), "N/A")
            }
            for pid in product_ids
        }
    except Exception as e:
        logger.error(f"Error en enrich_inventory_data: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error al enriquecer productos: {str(e)}")

async def auto_sync_inventory():
    """Función para sincronización automática"""
    try:
        logger.info("🔄 Iniciando sincronización automática")
        inventory_data = InventoryPriceService.get_all_inventory(line_id=DEFAULT_LINE_ID)
        result = await _sync_inventory_to_supabase(inventory_data)
        logger.info(f"✅ Sincronización automática completada: {result}")
    except Exception as e:
        logger.error(f"❌ Error en sincronización automática: {str(e)}")