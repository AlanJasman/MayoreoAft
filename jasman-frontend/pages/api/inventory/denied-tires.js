export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ 
      success: false,
      message: 'Método no permitido' 
    });
  }

  try {
    const FASTAPI_URL = process.env.NEXT_PUBLIC_BACKEND_URL;

    console.log("🔥 [DEBUG] Headers recibidos:", req.headers);
    console.log("🔥 [DEBUG] Body recibido:", req.body);
    console.log("🔥 [DEBUG] URL de backend:", `${FASTAPI_URL}/deniedtires`);

    const response = await fetch(`${FASTAPI_URL}/deniedtires`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': req.headers.authorization || ''
      },
      body: JSON.stringify(req.body)
    });

    const data = await response.json();

    console.log("🔥 [DEBUG] Código respuesta backend:", response.status);
    console.log("🔥 [DEBUG] Respuesta backend:", data);

    if (!response.ok) {
      return res.status(response.status).json({
        success: false,
        message: data.detail || 'Error al registrar la llanta negada',
        error: data
      });
    }

    return res.status(200).json(data);
    
  } catch (error) {
    console.error("🔥 [ERROR] Error en handler:", error);
    return res.status(500).json({ 
      success: false, 
      message: error.message || 'Error interno del servidor'
    });
  }
}
