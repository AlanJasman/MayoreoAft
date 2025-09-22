// file: pages/api/inventory/vehicle-models.js
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Método no permitido' });
  }

  try {
    const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL;
    if (!BACKEND_URL) {
      throw new Error('La URL del backend no está configurada');
    }

    const token = req.headers.authorization?.split(' ')[1];
    const { search } = req.query;
    
    if (!token) {
      return res.status(401).json({ message: 'No autorizado' });
    }
    
    // Construye la URL correctamente
    const url = new URL(`${BACKEND_URL}/vehicles/brands`);
    if (search) {
      url.searchParams.append('search', search);
    }
    
    console.log('Fetching URL:', url.toString()); // Para depuración
    
    const response = await fetch(url.toString(), {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });
    
    // Verifica el content-type antes de parsear
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      const text = await response.text();
      console.error('Respuesta no JSON:', text);
      throw new Error('El servidor respondió con formato incorrecto');
    }
    
    const data = await response.json();
    
    if (!response.ok) {
      console.error('Error del backend:', data);
      // *** CAMBIO AQUI: Devolver el mismo status del backend si es un 401 u otro error ***
      return res.status(response.status).json({ 
        message: data.message || 'Error en la búsqueda'
      });
    }
    
    res.status(200).json(data.brands || []);
    
  } catch (error) {
    console.error('Error completo:', {
      message: error.message,
      stack: error.stack
    });
    res.status(500).json({ message: error.message || 'Error interno del servidor' });
  }
}