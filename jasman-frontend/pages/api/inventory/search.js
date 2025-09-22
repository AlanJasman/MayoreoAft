export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Método no permitido' });
  }

  try {
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
    if (!backendUrl) {
      throw new Error('URL del backend no configurada');
    }

    // Construir query string desde el front
    const queryParams = new URLSearchParams(req.query).toString();

    // ✅ Cambiar el endpoint al nuevo
    const apiUrl = `${backendUrl}/inventory/reporte-zonas-detallado?${queryParams}`;

    const response = await fetch(apiUrl, {
      headers: {
        'Authorization': req.headers.authorization || '',
      },
    });

    console.log('Token enviado al backend:', req.headers.authorization);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return res.status(response.status).json({
        success: false,
        message: errorData.message || 'Error en la respuesta del backend',
      });
    }

    const data = await response.json();
    res.status(200).json(data);
  } catch (error) {
    console.error('Error en /api/inventory/search:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error al procesar la solicitud',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}
