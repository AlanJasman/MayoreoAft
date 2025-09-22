from typing import Optional, Dict, List
from app.supabase import supabase
from datetime import datetime
from uuid import UUID
import logging
from datetime import datetime
import pytz

from app.models import UserRole  # Agrega esto con las otras importaciones


logger = logging.getLogger(__name__)

class SupabaseDBService:
    def __init__(self):
        self.client = supabase

    def create_user(self, user_data: Dict) -> Dict:
        try:
            codigo = self.generar_codigo_usuario(user_data["nombre"])

            supabase_data = {
                "correo": user_data["correo"],
                "contraseña": user_data["contraseña"],
                "nombre": user_data["nombre"],
                "empresa": user_data["empresa"],
                "rol": user_data["rol"],
                "parent_partner_id": user_data["parent_partner_id"],
                "validado": user_data.get("validado", False),
                "codigo_usuario": codigo
            }

            response = self.client.table("usuarios").insert(supabase_data).execute()
            return response.data[0]
        except Exception as e:
            logger.error(f"Error creating user: {str(e)}")
            raise
    
    def get_user_by_codigo_usuario(self, codigo_usuario: str) -> Optional[Dict]:
        try:
            response = self.client.table("usuarios").select("*").eq("codigo_usuario", codigo_usuario).execute()
            return response.data[0] if response.data else None
        except Exception as e:
            logger.error(f"Error getting user by codigo_usuario: {str(e)}")
            return None

    def get_user_by_email(self, email: str) -> Optional[Dict]:
        try:
            response = self.client.table("usuarios").select("*").eq("correo", email).execute()
            return response.data[0] if response.data else None
        except Exception as e:
            logger.error(f"Error getting user by email: {str(e)}")
            return None

    def get_user_by_id(self, user_id: UUID) -> Optional[Dict]:
        try:
            response = self.client.table("usuarios").select("*").eq("id", str(user_id)).execute()
            return response.data[0] if response.data else None
        except Exception as e:
            logger.error(f"Error getting user by ID: {str(e)}")
            return None

    def update_user(self, user_id: UUID, fields: Dict) -> bool:
        try:
            str_id = str(user_id)
            # Convertir todos los UUID a strings
            valid_fields = {}
            for k, v in fields.items():
                if v is not None:
                    valid_fields[k] = str(v) if isinstance(v, UUID) else v
            
            if not valid_fields:
                return True
                
            response = self.client.table("usuarios").update(valid_fields).eq("id", str_id).execute()
            if not response or not response.data:
                raise Exception("Error updating user: empty or invalid response")
            return True
        except Exception as e:
            logger.error(f"Error updating user {user_id}: {str(e)}")
            raise Exception(f"Error updating user: {str(e)}")

    def generar_codigo_usuario(self, nombre: str) -> str:
        try:
            letra = nombre.strip()[0].upper()
            response = self.client.table("usuarios") \
                .select("codigo_usuario") \
                .ilike("codigo_usuario", f"{letra}-%") \
                .order("codigo_usuario", desc=True) \
                .limit(1) \
                .execute()

            if response.data:
                ultimo_codigo = response.data[0]["codigo_usuario"]
                ultima_parte = int(ultimo_codigo.split("-")[1])
                nuevo_numero = ultima_parte + 1
            else:
                nuevo_numero = 450000

            return f"{letra}-{nuevo_numero}"
        except Exception as e:
            logger.error(f"Error generando código de usuario: {str(e)}")
            raise


    def delete_user(self, user_id: UUID) -> bool:
        try:
            response = self.client.table("usuarios").delete().eq("id", str(user_id)).execute()
            if not response:
                raise Exception("Error deleting user in Supabase")
            return True
        except Exception as e:
            raise Exception(f"Error deleting user: {str(e)}")

    def get_users_by_role(self, role: str) -> List[Dict]:
        try:
            response = self.client.table("usuarios").select("*").eq("rol", role).execute()
            return response.data if response.data else []
        except Exception as e:
            print(f"Error getting users by role: {str(e)}")
            return []

    def get_users_by_company(self, company: str) -> List[Dict]:
        try:
            response = self.client.table("usuarios").select("*").ilike("empresa", f"%{company}%").execute()
            return response.data if response.data else []
        except Exception as e:
            print(f"Error getting users by company: {str(e)}")
            return []

    def get_validated_users(self, validated: bool = True) -> List[Dict]:
        try:
            response = self.client.table("usuarios").select("*").eq("validado", validated).execute()
            return response.data if response.data else []
        except Exception as e:
            print(f"Error getting users by validation status: {str(e)}")
            return []

    def get_user_by_codigo(self, codigo_usuario: str) -> Optional[Dict]:
        try:
            response = self.client.table('usuarios') \
                .select('*') \
                .eq('codigo_usuario', codigo_usuario) \
                .execute()
            return response.data[0] if response.data else None
        except Exception as e:
            logger.error(f"Error getting user by codigo: {str(e)}")
            return None

    def get_users_by_partner(self, partner_id: UUID) -> List[Dict]:
        try:
            response = self.client.table("usuarios") \
                .select("*") \
                .eq("parent_partner_id", str(partner_id)) \
                .execute()
            return response.data if response.data else []
        except Exception as e:
            logger.error(f"Error getting users by partner: {str(e)}")
            return []

    def get_all_users(self, role=None, company=None, search=None, validated=None):
        try:
            # Consulta principal con JOIN explícito
            query = self.client.from_('usuarios').select('''
                id,
                correo,
                nombre,
                empresa,
                rol,
                parent_partner_id,
                validado,
                creado_en,
                codigo_usuario,
                parent_partner:parent_partner_id(codigo_usuario)
            ''')

            # Aplicar filtros
            if role:
                query = query.eq('rol', role.value if isinstance(role, UserRole) else role)
            if company:
                query = query.ilike('empresa', f'%{company}%')
            if search:
                query = query.or_(f'nombre.ilike.%{search}%,correo.ilike.%{search}%')
            if validated is not None:
                query = query.eq('validado', validated)

            response = query.execute()
            
            # Debug: Ver la estructura completa de los datos
            logger.debug(f"Datos crudos de Supabase: {response.data}")

            # Procesar respuesta
            processed_users = []
            for user in response.data:
                processed_user = {
                    **user,
                    "codigo_partner": user.get("parent_partner", {}).get("codigo_usuario") if user.get("parent_partner") else None
                }
                processed_users.append(processed_user)

            return processed_users

        except Exception as e:
            logger.error(f"Error en get_all_users: {str(e)}", exc_info=True)
            raise
        


    def registrar_sesion_supabase(self, usuario_id: str, partner_id: Optional[str], ip: str):
        # Obtener la hora actual en Ciudad de México
        tz_mexico = pytz.timezone('America/Mexico_City')
        fecha_mexico = datetime.now(tz_mexico)
        
        data = {
            "usuario_id": usuario_id,
            "partner_id": partner_id,
            "ip": ip,
            "fecha": fecha_mexico.isoformat()  # Sobreescribe el valor automático
        }
        
        response = self.client.table("log_sesiones").insert(data).execute()
        if hasattr(response, "error") and response.error:
            raise Exception(f"Error insertando log_sesion: {response.error}")
        return response.data
    


    def registrar_busqueda_supabase(
        self, 
        usuario_id: Optional[str], 
        partner_id: Optional[str], 
        piso: Optional[str] = None,
        serie: Optional[str] = None,
        rin: Optional[str] = None,
        medidas: Optional[str] = None
    ):
        # Obtener la hora actual en Ciudad de México
        tz_mexico = pytz.timezone('America/Mexico_City')
        fecha_mexico = datetime.now(tz_mexico)
        
        data = {
            "usuario_id": usuario_id,
            "partner_id": partner_id,
            "piso": piso,
            "serie": serie,
            "rin": rin,
            "medidas": medidas,
            "fecha": fecha_mexico.isoformat()  # Sobreescribimos el valor automático
        }
        
        response = self.client.table("log_busquedas").insert(data).execute()
        if hasattr(response, "error") and response.error:
            raise Exception(f"Error insertando log_busqueda: {response.error}")
        return response.data
    

    def registrar_llanta_negada(
        self,
        usuario_id: str,
        partner_id: Optional[str],
        datos: dict
    ) -> Dict:
        try:
            # Preparar datos para Supabase
            supabase_data = {
                "usuario_id": usuario_id,
                "partner_id": partner_id,
                "codigo": datos.get("sku"),
                "piso": datos.get("piso"),
                "serie": datos.get("serie"),
                "rin": datos.get("rin"),
                "modelo": datos.get("modelo"),
                "medidas": datos.get("medidas"),
                "cantidad": datos.get("cantidad", 1),
                "tipo": datos.get("tipo"),
                "marca": datos.get("marca")
            }

            response = self.client.table("llantas_negadas").insert(supabase_data).execute()
            return response.data[0] if response.data else None
            
        except Exception as e:
            logger.error(f"Error registrando llanta negada: {str(e)}")
            raise


    def update_product_price(self, sku: str, price: float) -> bool:
        try:
            response = self.client.table("product_prices") \
                .upsert({
                    "sku": sku,
                    "price": price,
                    "updated_at": datetime.utcnow().isoformat()
                }, on_conflict="sku") \
                .execute()
                
            return bool(response.data)
        except Exception as e:
            logger.error(f"Error updating product price: {str(e)}")
            raise

# cotizaciones
    def create_cotizacion(self, cotizacion_data: Dict) -> Dict:
        try:
            # Verificar que todos los SKUs existen antes de crear
            for detalle in cotizacion_data["detalles"]:
                sku = detalle["codigo"]  # Usamos "codigo" como alias de "sku"
                response = self.client.table("products").select("sku").eq("sku", sku).execute()
                if not response.data:
                    raise ValueError(f"El SKU {sku} no existe en la tabla products")

            # Insertar la cotización principal
            cotizacion_response = self.client.table("cotizaciones").insert({
                "cliente_id": str(cotizacion_data["cliente_id"]) if cotizacion_data.get("cliente_id") else None,
                "partner_id": str(cotizacion_data["partner_id"]) if cotizacion_data.get("partner_id") else None,
                "usuario_id": str(cotizacion_data["usuario_id"]),
                "total": cotizacion_data.get("total", 0),
                "subtotal": cotizacion_data.get("subtotal", 0),
                "observaciones": cotizacion_data.get("observaciones"),
                "estado": cotizacion_data.get("estado", "nueva")
            }).execute()

            cotizacion_id = cotizacion_response.data[0]["id"]

            # Insertar detalles (usando SKU como "codigo")
            detalles = []
            for detalle in cotizacion_data["detalles"]:
                detalle_response = self.client.table("detalle_cotizacion").insert({
                    "cotizacion_id": cotizacion_id,
                    "codigo": detalle["codigo"],  # SKU de products
                    "precio_unitario": detalle["precio_unitario"],
                    "cantidad": detalle["cantidad"]
                }).execute()
                detalles.append(detalle_response.data[0])

            return self.get_cotizacion_by_id(cotizacion_id)

        except Exception as e:
            logger.error(f"Error creando cotización: {str(e)}")
            raise


    def get_cotizacion_by_id(self, cotizacion_id: UUID) -> Optional[Dict]:
        try:
            # Query completo con todos los joins
            query = self.client.from_("cotizaciones").select('''
                *,
                detalle_cotizacion (
                    id,
                    codigo,
                    precio_unitario,
                    cantidad,
                    total,
                    cotizacion_id,
                    products (
                        sku,
                        name,
                        marca,
                        modelo,
                        piso,
                        serie,
                        rin
                    )
                ),
                cliente:cliente_id (
                    id,
                    nombre,
                    correo,
                    telefono,
                    direccion,
                    codigo_usuario,
                    creado_en
                ),
                partner:partner_id (
                    id,
                    nombre,
                    correo,
                    telefono,
                    direccion,
                    codigo_usuario,
                    creado_en
                ),
                usuario:usuario_id (
                    id,
                    nombre,
                    correo,
                    telefono,
                    codigo_usuario,
                    creado_en
                )
            ''').eq("id", str(cotizacion_id))
            
            response = query.execute()
            
            if not response.data:
                return None
                
            cotizacion = response.data[0]
            return cotizacion
            
        except Exception as e:
            logger.error(f"Error getting cotización {cotizacion_id}: {str(e)}", exc_info=True)
            return None

    def get_cotizaciones_paginated(self, filters: Dict, current_user: Dict) -> Dict:
        try:
            # Query base con joins
            query = self.client.from_("cotizaciones").select('''
                *,
                detalle_cotizacion (
                    id,
                    codigo,
                    precio_unitario,
                    cantidad,
                    total,
                    cotizacion_id,
                    products (
                        sku,
                        name,
                        marca,
                        modelo,
                        piso,
                        serie,
                        rin
                    )
                ),
                cliente:cliente_id (
                    id,
                    nombre,
                    correo,
                    telefono,
                    direccion,
                    codigo_usuario,
                    creado_en
                ),
                partner:partner_id (
                    id,
                    nombre,
                    correo,
                    telefono,
                    direccion,
                    codigo_usuario,
                    creado_en
                ),
                usuario:usuario_id (
                    id,
                    nombre,
                    correo,
                    telefono,
                    codigo_usuario,
                    creado_en
                )
            ''')
            
            # Aplicar filtros según rol
            if current_user.get("role") in [UserRole.ADMIN, UserRole.SYSTEMS]:
                pass  # ven todo
            elif current_user.get("role") == UserRole.PARTNER:
                query = query.eq("partner_id", str(current_user.get("id")))
            elif current_user.get("role") == UserRole.VENDEDOR:
                query = query.eq("usuario_id", str(current_user.get("id")))
            elif current_user.get("role") == UserRole.CLIENT:
                query = query.eq("cliente_id", str(current_user.get("id")))
            
            # Filtros adicionales
            if filters.get("estado"):
                query = query.eq("estado", filters.get("estado"))
            if filters.get("cliente_id") and current_user.get("role") in [UserRole.ADMIN, UserRole.SYSTEMS, UserRole.PARTNER]:
                query = query.eq("cliente_id", str(filters.get("cliente_id")))
            
            # Paginación
            page = filters.get("page", 1)
            per_page = filters.get("per_page", 10)
            start = (page - 1) * per_page
            end = start + per_page - 1
            
            response = query.order("fecha", desc=True).range(start, end).execute()
            cotizaciones = response.data if response.data else []
            
            # Contador total
            count_query = self.client.from_("cotizaciones").select("id", count="exact")
            
            # Aplicar mismos filtros al count
            if current_user.get("role") == UserRole.PARTNER:
                count_query = count_query.eq("partner_id", str(current_user.get("id")))
            elif current_user.get("role") == UserRole.VENDEDOR:
                count_query = count_query.eq("usuario_id", str(current_user.get("id")))
            elif current_user.get("role") == UserRole.CLIENT:
                count_query = count_query.eq("cliente_id", str(current_user.get("id")))
            
            if filters.get("estado"):
                count_query = count_query.eq("estado", filters.get("estado"))
            if filters.get("cliente_id") and current_user.get("role") in [UserRole.ADMIN, UserRole.SYSTEMS, UserRole.PARTNER]:
                count_query = count_query.eq("cliente_id", str(filters.get("cliente_id")))
                
            count_response = count_query.execute()
            total = count_response.count if count_response.count else 0
            
            return {
                "data": cotizaciones,
                "pagination": {
                    "total": total,
                    "page": page,
                    "per_page": per_page,
                    "total_pages": (total + per_page - 1) // per_page if per_page > 0 else 0,
                    "has_next": page * per_page < total,
                    "has_prev": page > 1
                }
            }
            
        except Exception as e:
            logger.error(f"Error getting cotizaciones paginated: {str(e)}", exc_info=True)
            return {"data": [], "pagination": {}}


    def get_cotizacion_completa(self, cotizacion_id: UUID) -> Optional[Dict]:
        try:
            query = self.client.from_("cotizaciones").select('''
                *,
                detalle_cotizacion (
                    id,
                    codigo,
                    precio_unitario,
                    cantidad,
                    total,
                    cotizacion_id,
                    products (
                        sku,
                        name,
                        marca,
                        modelo,
                        piso,
                        serie,
                        rin
                    )
                ),
                cliente:cliente_id (
                    id,
                    nombre,
                    correo,
                    telefono,
                    direccion,
                    codigo_usuario,
                    creado_en,
                    parent_partner_id
                ),
                partner:partner_id (
                    id,
                    nombre,
                    correo,
                    telefono,
                    direccion,
                    codigo_usuario,
                    creado_en
                ),
                usuario:usuario_id (
                    id,
                    nombre,
                    correo,
                    telefono,
                    codigo_usuario,
                    creado_en
                )
            ''').eq("id", str(cotizacion_id))
            
            response = query.execute()
            return response.data[0] if response.data else None
            
        except Exception as e:
            logger.error(f"Error getting cotización completa {cotizacion_id}: {str(e)}", exc_info=True)
            return None

    def update_cotizacion(self, cotizacion_id: UUID, update_data: Dict) -> bool:
        try:
            # Filtrar campos que no existen en la tabla
            campos_validos = ["estado", "observaciones", "cliente_id", "subtotal", "total"]
            processed_data = {}
            
            for key, value in update_data.items():
                if key not in campos_validos:
                    continue  # Saltar campos que no existen en la tabla
                    
                if value is None:
                    processed_data[key] = None
                elif isinstance(value, UUID):
                    processed_data[key] = str(value)
                else:
                    processed_data[key] = value
            
            # No intentar actualizar campos vacíos
            if not processed_data:
                return True
                
            response = self.client.table("cotizaciones")\
                .update(processed_data)\
                .eq("id", str(cotizacion_id))\
                .execute()
            
            return bool(response.data)
        except Exception as e:
            logger.error(f"Error updating cotización {cotizacion_id}: {str(e)}", exc_info=True)
            raise



    def eliminar_detalles_cotizacion(self, cotizacion_id: UUID) -> bool:
        try:
            response = self.client.table("detalle_cotizacion")\
                .delete()\
                .eq("cotizacion_id", str(cotizacion_id))\
                .execute()
            return bool(response.data)
        except Exception as e:
            logger.error(f"Error eliminando detalles de cotización {cotizacion_id}: {str(e)}", exc_info=True)
            raise

    def agregar_detalle_cotizacion(self, cotizacion_id: UUID, codigo: str, precio_unitario: float, cantidad: int) -> bool:
        try:
            # Verificar que el producto existe
            producto_response = self.client.table("products")\
                .select("sku")\
                .eq("sku", codigo)\
                .execute()
            
            if not producto_response.data:
                raise ValueError(f"El producto con SKU {codigo} no existe")

            # Insertar el detalle SIN el campo total (se calcula automáticamente)
            detalle_data = {
                "cotizacion_id": str(cotizacion_id),
                "codigo": codigo,
                "precio_unitario": precio_unitario,
                "cantidad": cantidad
                # ELIMINAR: "total": precio_unitario * cantidad
            }
            
            response = self.client.table("detalle_cotizacion")\
                .insert(detalle_data)\
                .execute()
            
            if not response.data:
                error_msg = f"Error insertando detalle: {response}"
                logger.error(error_msg)
                raise ValueError(error_msg)
            
            return True
                
        except Exception as e:
            logger.error(f"Error en agregar_detalle_cotizacion: {str(e)}", exc_info=True)
            raise



    def get_cotizaciones_by_user(self, user_id: UUID, role: UserRole) -> List[Dict]:
        try:
            query = self.client.from_("cotizaciones").select('''
                *,
                detalle_cotizacion(*, products(*)),
                cliente:cliente_id(*),
                partner:partner_id(*),
                usuario:usuario_id(*)
            ''')
            
            # Filtros según el rol
            if role == UserRole.CLIENT:
                query = query.eq("cliente_id", str(user_id))
            elif role == UserRole.PARTNER:
                query = query.eq("partner_id", str(user_id))
            elif role == UserRole.VENDEDOR:
                query = query.eq("usuario_id", str(user_id))
            # ADMIN / SYSTEMS pueden ver todas → sin filtro extra
            
            response = query.order("fecha", desc=True).execute()
            return response.data if response.data else []
        except Exception as e:
            logger.error(f"Error getting cotizaciones for user {user_id}: {str(e)}")
            return []


    def delete_cotizacion(self, cotizacion_id: UUID) -> bool:
        try:
            # Los detalles se eliminarán automáticamente por ON DELETE CASCADE
            response = self.client.table("cotizaciones").delete().eq("id", str(cotizacion_id)).execute()
            return bool(response.data)
        except Exception as e:
            logger.error(f"Error deleting cotización {cotizacion_id}: {str(e)}")
            raise

# Instancia global
supabase_db_service = SupabaseDBService()
