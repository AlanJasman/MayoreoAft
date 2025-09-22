// file: pages/api/inventory/enrich.js

export default async function handler(req, res) {
    if (req.method !== 'POST') {
      return res.status(405).json({ message: 'Método no permitido' });
    }
  
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
    if (!backendUrl) {
      console.error('NEXT_PUBLIC_BACKEND_URL no está configurada.');
      return res.status(500).json({
        success: false,
        message: 'Error de configuración del servidor. URL del backend no definida.',
      });
    }
  
    const { product_ids } = req.body;
  
    if (!Array.isArray(product_ids) || product_ids.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Se requiere un arreglo de product_ids no vacío.',
      });
    }
  
    try {
      const response = await fetch(`${backendUrl}/inventory/stockquant/enrich`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': req.headers.authorization || '', // Pasar token si viene del cliente
        },
        body: JSON.stringify({ product_ids }),
      });
  
      if (!response.ok) {
        const errorText = await response.text();
        let errorData = {};
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { message: errorText || `Error del backend con status ${response.status}` };
        }
  
        return res.status(response.status).json({
          success: false,
          message: errorData.message || `Error del backend con status ${response.status}`,
          details:
            errorData.detail || (process.env.NODE_ENV === 'development' ? errorData : undefined),
        });
      }
  
      const data = await response.json();
      return res.status(200).json(data);
    } catch (error) {
      console.error('Error en /api/inventory/enrich:', error);
      return res.status(500).json({
        success: false,
        message: 'Error interno del servidor al consultar precios.',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      });
    }
  }
  