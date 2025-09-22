export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Método no permitido' });
  }

  try {
    const { width, ratio, diameter } = req.query;
    
    if (!width || !ratio || !diameter) {
      return res.status(400).json({ message: 'Parámetros incompletos' });
    }

    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
    if (!backendUrl) {
      throw new Error('La URL del backend no está configurada');
    }

    const response = await fetch(
      `${backendUrl}/existencia/search?width=${width}&ratio=${ratio}&diameter=${diameter}`,
      {
        headers: {
          'Authorization': req.headers.authorization || ''
        }
      }
    );

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.detail || error.message || 'Error al consultar existencias');
    }

    const data = await response.json();
    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ 
      message: error.message || 'Error en el servidor al buscar existencias' 
    });
  }
}