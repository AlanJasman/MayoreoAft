FROM python:3.11-slim

# Instala dependencias del sistema necesarias
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
        build-essential \
        libpq-dev && \
    # Necesario para psycopg2 (PostgreSQL)
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copia requirements e instala dependencias primero 
COPY requirements.txt .
RUN pip install --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Copia todo el proyecto (excepto lo excluido en .dockerignore)
COPY . .

# Variables de entorno
ENV PYTHONUNBUFFERED=1
ENV PYTHONPATH=/app

# Puerto que expone tu aplicación 
EXPOSE 8000

# Comando para ejecutar (usando Uvicorn directamente como lo haces localmente)
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]