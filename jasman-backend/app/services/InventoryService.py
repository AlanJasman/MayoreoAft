from fastapi import HTTPException
from typing import List, Dict, Optional, Any
import os
import re
import logging
import requests
# from app.models import InventorySearch # Comentado si no se usa directamente aquí, como mencionaste

logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)  # Asegúrate de que el nivel sea INFO o DEBUG
handler = logging.StreamHandler()
handler.setFormatter(logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s'))
logger.addHandler(handler)

class InventoryPriceService:
    @staticmethod
    def _odoo_request(
        model: str,
        method: str,
        domain: List = None,
        fields: List = None,
        kwargs: Dict = None,
        use_session: bool = False
    ):
        """Método unificado para peticiones a Odoo"""
        payload = {
            "jsonrpc": "2.0",
            "method": "call",
            "params": {
                "service": "object",
                "method": "execute_kw",
                "args": [
                    os.getenv("ODOO_DB"),
                    int(os.getenv("ODOO_USER_ID")),
                    os.getenv("ODOO_API_KEY"),
                    model,
                    method,
                    [domain or []],
                    {"fields": fields or [], **(kwargs or {})}
                ]
            }
        }

        try:
            url = os.getenv("ODOO_URL_PRICES" if use_session else "ODOO_URL")
            response = requests.post(
                url,
                json=payload,
                headers={'Content-Type': 'application/json'},
                timeout=30
            )
            response.raise_for_status()
            result = response.json()

            if "error" in result:
                raise HTTPException(status_code=400, detail=result["error"]["message"])
            return result

        except requests.exceptions.RequestException as e:
            raise HTTPException(status_code=503, detail=f"Error de conexión con Odoo: {str(e)}")

    @staticmethod
    def authenticate_odoo_session() -> requests.cookies.RequestsCookieJar:
        """Autentica en Odoo y devuelve cookies de sesión"""
        logger.info("Autenticando en Odoo con usuario de sesión")
        response = requests.post(
            f"{os.getenv('ODOO_URL_PRICES')}/web/session/authenticate",
            json={
                "jsonrpc": "2.0",
                "params": {
                    "db": os.getenv("ODOO_DB"),
                    "login": os.getenv("ODOO_USERNAME"),
                    "password": os.getenv("ODOO_PASSWORD")
                }
            },
            timeout=30
        )

        if response.status_code != 200:
            logger.error(f"Error autenticando en Odoo: {response.text}")
            raise Exception("Error de autenticación en Odoo")

        cookies = response.cookies.get_dict()
        if "session_id" not in cookies:
            logger.error("No se recibió session_id desde Odoo")
            raise Exception("No se recibió cookie de sesión")

        return response.cookies

    @staticmethod
    def get_product_templates_map(product_ids: List[int]) -> Dict[int, int]:
        """Mapea product.product IDs a product.template IDs"""
        if not product_ids:
            return {}

        try:
            result = InventoryPriceService._odoo_request(
                model="product.product",
                method="search_read",
                domain=[["id", "in", product_ids]],
                fields=["id", "product_tmpl_id"]
            )
            return {item["id"]: item["product_tmpl_id"][0] for item in result.get('result', [])}

        except Exception as e:
            logger.error(f"Error al mapear productos a templates: {str(e)}")
            return {}

    @staticmethod
    def get_prices(template_ids: List[int]) -> Dict[int, str]:
        """Obtiene precios usando el flujo con sesión"""
        if not template_ids:
            return {}

        try:
            session_cookies = InventoryPriceService.authenticate_odoo_session()

            payload = {
                "jsonrpc": "2.0",
                "method": "call",
                "params": {
                    "model": "report.product.report_pricelist",
                    "method": "get_html",
                    "args": [],
                    "kwargs": {
                        "data": {
                            "active_model": "product.template",
                            "active_ids": template_ids,
                            "pricelist_id": int(os.getenv("PRICELIST_ID", 7)),
                            "quantities": [1]
                        }
                    }
                }
            }

            response = requests.post(
                f"{os.getenv('ODOO_URL_PRICES')}/web/dataset/call_kw/report.product.report_pricelist/get_html",
                cookies=session_cookies,
                json=payload,
                timeout=30
            )

            html = response.json().get("result", "")
            price_matches = re.finditer(
                r'data-res-id="(\d+)".*?<span class="oe_currency_value">([\d,.]+)</span>',
                html,
                re.DOTALL
            )

            return {int(match.group(1)): match.group(2).replace(',', '') for match in price_matches}

        except Exception as e:
            logger.error(f"Error al procesar precios: {str(e)}")
            return {}

    @classmethod
    def _get_physical_location_id(cls, warehouse_id: int) -> int:
        """Obtiene ID de ubicación física para un almacén"""
        result = cls._odoo_request(
            model="stock.warehouse",
            method="search_read",
            domain=[["id", "=", warehouse_id]],
            fields=["lot_stock_id"]
        )
        return result['result'][0]['lot_stock_id'][0]

    @classmethod
    def _extract_region_from_location(cls, location_name: str) -> str:
        """Extrae región del nombre de ubicación (1-4)"""
        match = re.search(r'(1|2|3|4)', location_name or '')
        return match.group(1) if match else ''

    # El método search_inventory fue proporcionado en el contexto anterior.
    # Lo incluyo aquí por completitud, asumiendo que es parte de tu servicio.
    @classmethod
    def search_inventory(cls, search_params: Any) -> List[Dict]: # Cambiado Any si InventorySearch no está importado/definido
        """Consulta principal de inventario con agrupación por zona y almacén (incluye nombre del almacén)"""
        domain = [["location_id.usage", "=", "internal"]]

        if hasattr(search_params, 'piso') and search_params.piso:
            domain.append(["product_id.name", "ilike", search_params.piso])
        if hasattr(search_params, 'serie') and search_params.serie:
            domain.append(["product_id.name", "ilike", search_params.serie])
        if hasattr(search_params, 'rin') and search_params.rin:
            rin_value = search_params.rin.upper().replace("R", "")
            domain.extend([
                "|",
                ["product_id.name", "ilike", f"R{rin_value}"],
                ["product_id.name", "ilike", rin_value]
            ])

        products = cls._odoo_request(
            model="stock.quant",
            method="search_read",
            domain=domain,
            fields=["id", "product_id", "quantity", "location_id", "warehouse_id"]
        )['result']

        grouped = {}
        physical_location_id = None

        if hasattr(search_params, 'warehouse_id') and search_params.warehouse_id:
            try:
                physical_location_id = cls._get_physical_location_id(search_params.warehouse_id)
            except Exception:
                pass

        for item in products:
            try:
                product_id = item['product_id'][0]
                product_name = item['product_id'][1]
                location_id = item['location_id'][0]
                location_name = item['location_id'][1]
                quantity = item.get('quantity', 0)
                warehouse = item.get('warehouse_id')
                warehouse_id = warehouse[0] if warehouse and isinstance(warehouse, list) else None
                warehouse_name = warehouse[1] if warehouse and isinstance(warehouse, list) else "Desconocido"

                if product_id not in grouped:
                    grouped[product_id] = {
                        'id': product_id,
                        'name': product_name,
                        'warehouse_exist': 0,
                        'has_warehouse': False,
                        'price': 'N/A',
                        'zonas': {
                            "zona1": {"total": 0, "almacenes": {}},
                            "zona2": {"total": 0, "almacenes": {}},
                            "zona3": {"total": 0, "almacenes": {}},
                            "zona4": {"total": 0, "almacenes": {}},
                        }
                    }

                if physical_location_id and location_id == physical_location_id:
                    grouped[product_id]['warehouse_exist'] += quantity
                    grouped[product_id]['has_warehouse'] = True

                region = cls._extract_region_from_location(location_name)
                if region in ['1', '2', '3', '4'] and warehouse_id is not None:
                    zona_key = f"zona{region}"
                    zona_data = grouped[product_id]["zonas"][zona_key]

                    zona_data["total"] += quantity

                    if warehouse_id not in zona_data["almacenes"]:
                        zona_data["almacenes"][warehouse_id] = {
                            "name": warehouse_name,
                            "quantity": 0
                        }

                    zona_data["almacenes"][warehouse_id]["quantity"] += quantity
                    
            except Exception as e:
                logger.error(f"❌ Error procesando producto: {item} → {str(e)}")
                continue

        # Obtener precios
        if grouped:
            product_ids = list(grouped.keys())
            template_map = cls.get_product_templates_map(product_ids)
            if template_map:
                template_ids = list(template_map.values())
                prices = cls.get_prices(template_ids)
                for pid, data in grouped.items():
                    if pid in template_map:
                        data['price'] = prices.get(template_map[pid], 'N/A')

        return list(grouped.values())


    @staticmethod
    def get_product_attribute_lines(template_ids: List[int]) -> Dict[int, List[Dict[str, Any]]]:
        """
        Obtiene los attribute_line_ids para los product.template,
        incluyendo el ID del atributo y sus value_ids.
        También ordena los atributos por el ID del atributo para garantizar una "posición" consistente
        en la lista que Odoo devuelve, lo cual es CRÍTICO para el mapeo por posición.
        """
        if not template_ids:
            return {}

        try:
            result = InventoryPriceService._odoo_request(
                model="product.template.attribute.line",
                method="search_read",
                domain=[["product_tmpl_id", "in", template_ids]],
                fields=["id", "product_tmpl_id", "attribute_id", "value_ids"],
                kwargs={'order': 'attribute_id asc'} # ¡Clave! Ordenar por attribute_id
            )
            
            # Mapeo: template_id -> lista de dicts con 'attribute_id' y 'value_ids'
            template_to_attr_data = {}
            for item in result.get('result', []):
                template_id = item['product_tmpl_id'][0]
                if template_id not in template_to_attr_data:
                    template_to_attr_data[template_id] = []
                template_to_attr_data[template_id].append({
                    'attribute_id': item['attribute_id'][0],
                    'value_ids': item['value_ids']
                })
            
            return template_to_attr_data

        except Exception as e:
            logger.error(f"Error al obtener líneas de atributos: {str(e)}")
            return {}

    @staticmethod
    def get_attribute_values(value_ids: List[int]) -> Dict[int, str]:
        """Obtiene los nombres de los valores de atributos"""
        if not value_ids:
            return {}

        try:
            result = InventoryPriceService._odoo_request(
                model="product.attribute.value",
                method="search_read",
                domain=[["id", "in", value_ids]],
                fields=["id", "name"]
            )
            
            return {item["id"]: item["name"] for item in result.get('result', [])}

        except Exception as e:
            logger.error(f"Error al obtener valores de atributos: {str(e)}")
            return {}
        
    @classmethod
    def get_all_inventory(cls, line_id: Optional[int] = None) -> List[Dict]:
        """Obtiene todo el inventario con filtro opcional por line_id y desglose por almacén dentro de cada zona, con nombres de atributos amigables por posición."""
        try:
            logger.info(f"🚀 Iniciando get_all_inventory con line_id: {line_id}")
            
            CONSIGNA_CATEGORY_IDS = [503, 504, 505, 517]
            # Construir dominio
            domain = [
                ["location_id.usage", "=", "internal"],
                ["product_id.product_tmpl_id.line_id", "=", line_id] if line_id else [],
                # Excluir categorías consigna por ID
                ["product_id.categ_id", "not in", CONSIGNA_CATEGORY_IDS]
            ]
            domain = [d for d in domain if d]
            
            logger.info(f"🔍 Dominio completo: {domain}")

            # Consultar stock.quant con paginación
            all_products = []
            limit = 5000
            offset = 0
            fields = ["id", "product_id", "quantity", "location_id", "warehouse_id"] 
            
            while True:
                logger.info(f"📋 Consultando stock.quant (offset: {offset}, limit: {limit})")
                
                response = cls._odoo_request(
                    model="stock.quant",
                    method="search_read",
                    domain=domain,
                    fields=fields,
                    kwargs={"limit": limit, "offset": offset}
                )
                
                if 'result' not in response:
                    logger.error(f"❌ Error en stock.quant: {response}")
                    break
                    
                batch = response['result']
                if not batch:
                    logger.info(f"🏁 Fin de paginación en offset {offset}")
                    break
                    
                all_products.extend(batch)
                offset += limit
                logger.info(f"📦 Lote actual: {len(batch)} items. Total acumulado: {len(all_products)}")

            logger.info(f"📊 Total de productos encontrados: {len(all_products)}")
            
            if not all_products:
                logger.info("⚠️ No se encontraron productos con los filtros aplicados")
                return []

            # Agrupar por product_id y por zona/almacén
            grouped = {}
            for item in all_products:
                try:
                    product_id = item['product_id'][0]
                    product_name = item['product_id'][1]
                    location_name = item['location_id'][1]
                    quantity = item.get('quantity', 0)
                    warehouse = item.get('warehouse_id') # Obtener la tupla (ID, Nombre) del almacén
                    warehouse_id = warehouse[0] if warehouse and isinstance(warehouse, list) else None
                    warehouse_name = warehouse[1] if warehouse and isinstance(warehouse, list) else "Desconocido"

                    if product_id not in grouped:
                        grouped[product_id] = {
                            'id': product_id,
                            'name': product_name,
                            'total_quantity': 0,
                            'price': 'N/A',
                            'attributes': {}, # Campo para atributos
                            'zonas': { # Nueva estructura para zonas y almacenes
                                "zona1": {"total": 0, "almacenes": {}},
                                "zona2": {"total": 0, "almacenes": {}},
                                "zona3": {"total": 0, "almacenes": {}},
                                "zona4": {"total": 0, "almacenes": {}},
                            }
                        }

                    grouped[product_id]['total_quantity'] += quantity

                    region = cls._extract_region_from_location(location_name)
                    if region in ['1', '2', '3', '4'] and warehouse_id is not None:
                        zona_key = f"zona{region}"
                        zona_data = grouped[product_id]["zonas"][zona_key]

                        # Sumar al total de la zona
                        zona_data["total"] += quantity

                        # Sumar al almacén con nombre y cantidad
                        if warehouse_id not in zona_data["almacenes"]:
                            zona_data["almacenes"][warehouse_id] = {
                                "name": warehouse_name,
                                "quantity": 0
                            }
                        zona_data["almacenes"][warehouse_id]["quantity"] += quantity
                        
                except Exception as e:
                    logger.error(f"⚠️ Error procesando item {item.get('id')}: {str(e)}")
                    continue

            logger.info(f"🧮 Productos agrupados: {len(grouped)} items")

            # Obtener información adicional si hay resultados
            if grouped:
                product_ids = list(grouped.keys())
                
                # 1. Obtener mapeo de productos a templates
                logger.info(f"💲 Obteniendo mapeo de templates para {len(product_ids)} productos")
                template_map = cls.get_product_templates_map(product_ids)
                logger.info(f"🔄 Mapeo de templates obtenido: {len(template_map)} items")
                
                if template_map:
                    template_ids = list(set(template_map.values()))  # IDs únicos
                    
                    # 2. Obtener precios
                    logger.info(f"💰 Obteniendo precios para {len(template_ids)} templates")
                    prices = cls.get_prices(template_ids)
                    logger.info(f"💵 Precios obtenidos: {len(prices)} items")

                    # 3. Obtener atributos de los productos
                    logger.info(f"🏷️ Obteniendo atributos para {len(template_ids)} templates")
                    # Obtener las líneas de atributos con sus attribute_id y value_ids, ya ordenados
                    template_to_attr_data = cls.get_product_attribute_lines(template_ids)
                    
                    # Recolectar todos los value_ids únicos
                    all_value_ids = list(set(
                        value_id 
                        for attr_data_list in template_to_attr_data.values() 
                        for attr_item in attr_data_list
                        for value_id in attr_item['value_ids']
                    ))
                    
                    # Obtener nombres de los valores de atributos
                    value_names = cls.get_attribute_values(all_value_ids)
                    
                    # Definir el mapeo de nombres de atributos por POSICIÓN
                    # Este es el mapeo fijo y el orden es crítico:
                    attribute_position_names = [
                        "piso",                     # Posición 0
                        "serie",                    # Posición 1
                        "rin",                      # Posición 2
                        "carga / velocidad",        # Posición 3 (anteriormente "atributo_no_importante_1")
                        "marca",                    # Posición 4
                        "modelo",                   # Posición 5
                        # Añade más nombres aquí si hay más atributos en posiciones fijas
                    ]

                    assigned_prices = 0
                    assigned_attributes = 0
                    
                    for pid, data in grouped.items():
                        if pid in template_map:
                            template_id = template_map[pid]
                            
                            # Asignar precio
                            if template_id in prices:
                                data['price'] = prices[template_id]
                                assigned_prices += 1
                            
                            # Asignar atributos por posición
                            if template_id in template_to_attr_data:
                                friendly_attributes = {}
                                
                                # Obtenemos los items de atributos para este template.
                                # Ya están ordenados por attribute_id gracias a la query en get_product_attribute_lines.
                                # Asumimos que este ordenamiento por attribute_id corresponde a tus "posiciones fijas".
                                sorted_attr_items = template_to_attr_data[template_id]
                                
                                for i, attr_item in enumerate(sorted_attr_items):
                                    if i < len(attribute_position_names):
                                        friendly_name = attribute_position_names[i]
                                        
                                        # Asumimos que cada attribute_line_id tiene UN value_id relevante
                                        if attr_item['value_ids'] and attr_item['value_ids'][0] in value_names:
                                            value = value_names[attr_item['value_ids'][0]]
                                            friendly_attributes[friendly_name] = value
                                            assigned_attributes += 1
                                        else:
                                            # Si no hay valor o no se encontró el nombre del valor
                                            friendly_attributes[friendly_name] = None # O "Desconocido", según prefieras
                                    # Si hay más atributos de los que tenemos nombres definidos, se ignoran por posición.
                                
                                data['attributes'] = friendly_attributes
                    
                    logger.info(f"💲 Precios asignados a {assigned_prices} productos.")
                    logger.info(f"🏷️ Atributos asignados a {assigned_attributes} productos.")

            logger.info("🎉 Retornando resultados finales.")
            return list(grouped.values())

        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"💥 Error crítico en get_all_inventory: {str(e)}", exc_info=True)
            raise HTTPException(
                status_code=500,
                detail=f"Error interno al procesar el inventario: {str(e)}"
            )