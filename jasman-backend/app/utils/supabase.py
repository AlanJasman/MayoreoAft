# utils/supabase.py

import os
import base64
import time
import io
from PIL import Image
from supabase import create_client

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
SUPABASE_BUCKET = os.getenv("SUPABASE_BUCKET", "user-faces")

client = create_client(SUPABASE_URL, SUPABASE_KEY)

def upload_face_image(base64_image: str, user_id: int) -> str:
    try:
        print("📤 Iniciando subida de imagen a Supabase...")

        # Decodifica la imagen
        image_bytes = base64.b64decode(base64_image)

        # Valida que sea imagen JPEG
        img = Image.open(io.BytesIO(image_bytes))
        img.verify()

        # Genera ruta única
        timestamp = int(time.time())
        file_path = f"faces/user_{user_id}/{timestamp}.jpg"

        print(f"📁 Ruta de almacenamiento: {file_path}")

        # Sube la imagen
        response = client.storage.from_(SUPABASE_BUCKET).upload(
            file=image_bytes,
            path=file_path,
            file_options={
                "content-type": "image/jpeg",
                "x-upsert": "true"
            }
        )

        print("✅ Imagen subida. Generando URL pública...")

        # Devuelve la URL pública
        public_url = f"{SUPABASE_URL}/storage/v1/object/public/{SUPABASE_BUCKET}/{file_path}"
        print(f"🌐 URL pública: {public_url}")
        return public_url

    except Exception as e:
        print(f"❌ Error al subir imagen a Supabase: {e}")
        raise Exception(f"Error al subir imagen a Supabase: {e}")
