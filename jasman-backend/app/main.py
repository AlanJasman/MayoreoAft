from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routes import auth, users, admin
from app.routes.odoo import inventory, deniedtires
from app.routes.Existencias import ExistenciaPlanta
from app.routes import prices
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from datetime import datetime
import pytz
import os
import asyncio
import atexit
import logging
from app.routes import cotizaciones

# Configuración de logger
logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO)

# Inicializa la app FastAPI
app = FastAPI(title="Mayoreo AFT", version="1.0.0")

# Zona horaria de México
mexico_tz = pytz.timezone('America/Mexico_City')

# Inicializa APScheduler con zona horaria
scheduler = AsyncIOScheduler(timezone=mexico_tz)

# Configuración dinámica de CORS
def get_allowed_origins():
    origins = [
        "http://localhost:3000",
        "http://192.168.110.74:3000",
        "http://192.168.0.38:3000",
        "http://192.168.110.198:3000",
    ]
    frontend_url = os.getenv("FRONTEND_URL")
    if frontend_url:
        origins.append(frontend_url)

    vercel_url = os.getenv("VERCEL_URL")
    if vercel_url:
        origins.extend([
            f"https://{vercel_url}",
            f"https://www.{vercel_url}"
        ])
    return origins

# Middleware CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=get_allowed_origins(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Incluir rutas
app.include_router(auth.router)
app.include_router(users.router)
app.include_router(inventory.router)
app.include_router(admin.router)
app.include_router(deniedtires.router)
app.include_router(ExistenciaPlanta.existencia_router)
app.include_router(prices.router)
app.include_router(cotizaciones.router)

# Función para ejecutar la sync async correctamente
async def run_auto_sync_inventory():
    try:
        logger.info("🚀 Ejecutando tarea programada: auto_sync_inventory")
        await inventory.auto_sync_inventory()
    except Exception as e:
        logger.error(f"❌ Error al ejecutar auto_sync_inventory: {e}")

# Mostrar configuración del scheduler
def log_scheduler_events():
    now = datetime.now(mexico_tz)
    print(f"\n⏰ [Configuración del Scheduler]")
    print(f"  • Hora actual en CDMX: {now.strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"  • Próxima sincronización programada para las 9:30 AM hora CDMX")
    print(f"  • Zona horaria configurada: America/Mexico_City\n")

# Evento de arranque de la app
@app.on_event("startup")
async def startup_event():
    if not scheduler.running:
        scheduler.add_job(
            run_auto_sync_inventory,  # función async
            trigger='cron',
            hour=10,
            minute=00,
            name="daily_inventory_sync",
            misfire_grace_time=3600
        )
        scheduler.start()
        log_scheduler_events()


# Evento de cierre de la app
@app.on_event("shutdown")
async def shutdown_event():
    if scheduler.running:
        scheduler.shutdown()
        print("\n🛑 Scheduler detenido correctamente\n")


# También garantiza cierre si se apaga abruptamente
atexit.register(lambda: scheduler.shutdown() if scheduler.running else None)

# Ruta base
@app.get("/")
def read_root():
    return {"message": "Bienvenido a Mayoreo Jasman APP"}
