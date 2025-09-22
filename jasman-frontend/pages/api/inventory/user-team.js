// file: pages/api/inventory/user-team.js
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ 
      success: false,
      message: 'Método no permitido' 
    });
  }

  try {
    const FASTAPI_URL = process.env.NEXT_PUBLIC_BACKEND_URL;
    if (!FASTAPI_URL) {
      throw new Error('Configuración faltante: FASTAPI_URL no definida');
    }

    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ 
        success: false,
        message: 'Token de autorización faltante' 
      });
    }

    const response = await fetch(`${FASTAPI_URL}/inventory/user-team`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      timeout: 5000
    }).catch(err => {
      throw new Error(`No se pudo conectar al servidor: ${err.message}`);
    });

    // Verificar si la respuesta es JSON
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      const text = await response.text();
      console.error('Respuesta no JSON:', text); // Agregado para depuración
      throw new Error(`Respuesta inesperada: ${text.substring(0, 100)}`);
    }

    const data = await response.json();

    if (!response.ok) {
      console.error('Error del backend:', data);
      // *** CAMBIO AQUI: Devolver el mismo status del backend si es un 401 u otro error ***
      return res.status(response.status).json({ 
        success: false,
        message: data.message || `Error ${response.status}`
      });
    }

    res.status(200).json({
      success: true,
      ...data
    });
    
  } catch (error) {
    console.error('Error en /api/inventory/user-team:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Error interno del servidor',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}