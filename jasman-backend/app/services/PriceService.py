import os
import re
import requests
import logging
from typing import List, Dict

logger = logging.getLogger(__name__)

class PriceService:
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

        logger.debug(f"Cookie de sesión recibida: {cookies['session_id']}")
        return response.cookies  # objeto CookieJar

    @staticmethod
    def get_prices(template_ids: List[int]) -> Dict[int, str]:
        """Obtiene precios usando el flujo con sesión y cookie de Odoo"""
        if not template_ids:
            logger.warning("Lista de template_ids vacía, no se consultarán precios.")
            return {}

        logger.info(f"Consultando precios para {len(template_ids)} plantillas")

        try:
            session_cookies = PriceService.authenticate_odoo_session()

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
                            "display_pricelist_title": "",
                            "pricelist_id": int(os.getenv("PRICELIST_ID", 7)),
                            "quantities": [1]
                        },
                        "context": {
                            "lang": "es_MX",
                            "tz": "America/Mexico_City",
                            "uid": 73,  # UID del usuario app@jasman.com.mx
                            "allowed_company_ids": [1]
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

            result = response.json()
            html = result.get("result", "")

            if not isinstance(html, str) or not html:
                logger.warning("No se recibió HTML válido del reporte de precios")
                return {}

            # RegEx robusto: busca el template_id (data-res-id) y el precio en la misma fila
            price_matches = re.finditer(
                r'data-res-id="(\d+)".*?<span class="oe_currency_value">([\d,.]+)</span>',
                html,
                re.DOTALL | re.IGNORECASE
            )

            prices = {}
            for match in price_matches:
                template_id = int(match.group(1))
                price = match.group(2).replace(',', '').strip()
                prices[template_id] = price
                logger.debug(f"Precio encontrado: {template_id} => {price}")

            return prices

        except Exception as e:
            logger.error(f"Error al procesar precios: {str(e)}")
            return {}
