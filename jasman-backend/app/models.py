from ast import Dict
from pydantic import BaseModel, EmailStr, Field, validator
from pydantic.generics import GenericModel
from typing import Optional, List, Generic, TypeVar, Dict
from datetime import datetime
from enum import Enum
from uuid import UUID
from sqlalchemy import Column, ForeignKey, Text, DateTime
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.sql import func
from enum import Enum
import uuid
from sqlalchemy.ext.declarative import declarative_base

Base = declarative_base()

class LogSesion(Base):
    __tablename__ = "log_sesiones"

    id = Column(PGUUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    usuario_id = Column(PGUUID(as_uuid=True), ForeignKey("usuarios.id", ondelete="CASCADE"))
    partner_id = Column(PGUUID(as_uuid=True), ForeignKey("usuarios.id", ondelete="CASCADE"), nullable=True)
    ip = Column(Text)
    fecha = Column(DateTime, server_default=func.now())


class UserRole(str, Enum):
    ADMIN = "admin"
    PARTNER = "partner"
    CLIENT = "cliente"
    SYSTEMS = "sistemas"
    PRICES = "precios"
    VENDEDOR = "vendedor"

class UserBase(BaseModel):
    email: EmailStr = Field(..., alias="correo")
    name: str = Field(..., min_length=2, max_length=100, alias="nombre")
    company: Optional[str] = Field(None, max_length=100, alias="empresa")
    role: UserRole = Field(default=UserRole.CLIENT, alias="rol")
    parent_partner_id: Optional[UUID] = None
    validated: bool = Field(default=False, alias="validado")

class UserCreate(UserBase):
    password: str = Field(..., min_length=8, alias="contraseña")
    codigo_usuario: Optional[str] = None  # Nuevo campo para código usuario padre

class UserUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=2, max_length=100, alias="nombre")
    company: Optional[str] = Field(None, max_length=100, alias="empresa")
    role: Optional[UserRole] = None
    parent_partner_id: Optional[UUID] = None
    validated: Optional[bool] = None

    @validator('parent_partner_id', pre=True)
    def convert_uuid_to_str(cls, v):
        if v is not None:
            return str(v)
        return None

class UserInDB(UserBase):
    id: UUID
    codigo_usuario: Optional[str] = Field(None)  
    created_at: datetime = Field(..., alias="creado_en")
    password: str = Field(..., alias="contraseña")

    class Config:
        orm_mode = True
        allow_population_by_field_name = True
        json_encoders = {datetime: lambda v: v.isoformat()}


class UserPublic(UserBase):
    id: UUID
    codigo_usuario: Optional[str] = Field(None, alias="codigo_usuario")
    codigo_partner: Optional[str] = Field(None, alias="codigo_partner")
    telefono: Optional[str] = Field(None, alias="telefono")
    direccion: Optional[str] = Field(None, alias="direccion")
    created_at: Optional[datetime] = Field(None, alias="creado_en")

    class Config:
        allow_population_by_field_name = True


class Token(BaseModel):
    access_token: str
    token_type: str
    role: str
    user_id: str

class TokenData(BaseModel):
    email: Optional[str] = None
    user_id: Optional[str] = None
    role: Optional[str] = None

T = TypeVar("T")

class PaginatedResponse(GenericModel, Generic[T]):
    data: List[T]
    pagination: dict

class InventorySearch(BaseModel):
    piso: Optional[str] = None  # Ancho del neumático
    serie: Optional[str] = None  # Perfil (ej: 65)
    rin: Optional[str] = None    # Diámetro (ej: R15)

class LogBusqueda(Base):
    __tablename__ = "log_busquedas"

    id = Column(PGUUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    usuario_id = Column(PGUUID(as_uuid=True), ForeignKey("usuarios.id", ondelete="CASCADE"))
    partner_id = Column(PGUUID(as_uuid=True), ForeignKey("usuarios.id", ondelete="CASCADE"), nullable=True)
    piso = Column(Text, nullable=True)
    serie = Column(Text, nullable=True)
    rin = Column(Text, nullable=True)
    medidas = Column(Text, nullable=True)
    fecha = Column(DateTime, server_default=func.now())

class TipoRegistro(str, Enum):
    BUSQUEDA = "busqueda"
    TABLA = "tabla"
    MANUAL = "manual"

class LlantaNegadaBase(BaseModel):
    codigo: Optional[str] = Field(None, max_length=50, alias="sku")
    piso: Optional[str] = Field(None, max_length=20)
    serie: Optional[str] = Field(None, max_length=20)
    rin: Optional[str] = Field(None, max_length=20)
    modelo: Optional[str] = Field(None, max_length=100)
    medidas: Optional[str] = Field(None, max_length=50)
    cantidad: int = Field(1, ge=1)
    tipo: TipoRegistro = Field(..., description="Origen del registro: busqueda, tabla o manual")
    marca: Optional[str] = Field(None, max_length=50)

class LlantaNegadaCreate(LlantaNegadaBase):
    pass

class LlantaNegadaInDB(LlantaNegadaBase):
    id: UUID
    usuario_id: UUID
    partner_id: Optional[UUID]
    fecha: datetime

    class Config:
        orm_mode = True
        allow_population_by_field_name = True
        json_encoders = {datetime: lambda v: v.isoformat()}

# Enum para los estados de la cotización

class EstadoCotizacion(str, Enum):
    NUEVA = "nueva"
    VISTA = "vista"
    ACEPTADA = "aceptada"
    RECHAZADA = "rechazada"
    EN_PROCESO = "en_proceso"
    PAGADA = "pagada"
    CERRADA = "cerrada"
    CANCELADA = "cancelada"

class DetalleCotizacionBase(BaseModel):
    sku: str = Field(..., max_length=50, alias="codigo")  # Usamos SKU como código
    precio_unitario: float = Field(..., gt=0)
    cantidad: int = Field(..., gt=0)

    class Config:
        allow_population_by_field_name = True  # Permite usar "codigo" en JSON pero mapea a "sku"

class DetalleCotizacionCreate(DetalleCotizacionBase):
    pass

class CotizacionCreate(BaseModel):
    cliente_id: Optional[UUID] = None
    observaciones: Optional[str] = Field(None, max_length=500)
    estado: EstadoCotizacion = Field(default=EstadoCotizacion.NUEVA)
    detalles: List[DetalleCotizacionCreate]  # Lista de detalles con SKU

class DetalleCotizacionInDB(DetalleCotizacionBase):
    id: UUID
    cotizacion_id: Optional[UUID] = None  # ← Hacer opcional
    total: Optional[float] = None  # ← Hacer opcional
    products: Optional[Dict] = None  # ← Producto opcional


    class Config:
        orm_mode = True

class CotizacionBase(BaseModel):
    cliente_id: Optional[UUID] = None
    observaciones: Optional[str] = Field(None, max_length=500)
    estado: EstadoCotizacion = Field(default=EstadoCotizacion.NUEVA)
    total: float
    subtotal: float

class CotizacionCreate(CotizacionBase):
    detalles: List[DetalleCotizacionCreate]

class CotizacionUpdate(BaseModel):
    estado: Optional[EstadoCotizacion] = None
    observaciones: Optional[str] = Field(None, max_length=500)
    subtotal: Optional[float] = None  # ← Agregar este campo
    total: Optional[float] = None     # ← Y este campo
    detalles: Optional[List[DetalleCotizacionCreate]] = None


    class Config:
        allow_population_by_field_name = True
        json_encoders = {
            UUID: lambda v: str(v)  # Convertir UUIDs a strings en JSON
        }

class CotizacionInDB(CotizacionBase):
    id: UUID
    partner_id: Optional[UUID]
    usuario_id: Optional[UUID]
    subtotal: float
    total: float
    fecha: datetime
    id_cotizacion: Optional[str] = None
    observaciones: Optional[str] = None

    # Relación con detalles
    detalle_cotizacion: List[DetalleCotizacionInDB] = []

    # Relaciones con usuarios
    cliente: Optional[UserPublic] = None
    partner: Optional[UserPublic] = None
    usuario: Optional[UserPublic] = None

    class Config:
        orm_mode = True
        allow_population_by_field_name = True
        json_encoders = {datetime: lambda v: v.isoformat()}
