// file: pages/api/inventory/all.js
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Método no permitido' });
  }

  try {
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
    if (!backendUrl) {
      console.error('NEXT_PUBLIC_BACKEND_URL no está configurada.');
      return res.status(500).json({ 
        success: false, 
        message: 'Error de configuración del servidor. URL del backend no definida.' 
      });
    }

    const apiUrl = `${backendUrl}/inventory/stockquant/all?line_id=4`; 
    
    const response = await fetch(apiUrl, {
      headers: {
        'Authorization': req.headers.authorization || '', 
      },
    });

    // CLAVE: Propagar el status y el cuerpo de la respuesta del backend
    if (!response.ok) {
      const errorText = await response.text(); // Leer como texto para evitar fallos de JSON si no es JSON
      let errorData = {};
      try {
          errorData = JSON.parse(errorText); // Intentar parsear como JSON
      } catch (e) {
          errorData = { message: errorText || `Error del backend con status ${response.status}` };
      }
      
      // Retorna el MISMO status que el backend original
      return res.status(response.status).json({ 
        success: false,
        message: errorData.message || `Error del backend con status ${response.status}`,
        details: errorData.detail || (process.env.NODE_ENV === 'development' ? errorData : undefined) 
      });
    }

    const data = await response.json();
    res.status(200).json(data);
  } catch (error) {
    console.error('Error en /api/inventory/all (API Route):', error);
    res.status(500).json({ 
      success: false,
      message: 'Error interno del servidor al procesar la solicitud.',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}