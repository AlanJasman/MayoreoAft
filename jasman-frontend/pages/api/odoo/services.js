export default async function handler(req, res) {
  console.log('Iniciando handler de /api/odoo/services');
  try {
    const { plate, vin_sn } = req.query;
    console.log('Query recibida:', { plate, vin_sn });

    if ((!plate || plate.length < 3) && (!vin_sn || vin_sn.length < 3)) {
      return res.status(400).json({
        error: 'Debes proporcionar una placa o VIN con al menos 3 caracteres'
      });
    }

    const queryParams = new URLSearchParams();
    if (plate) queryParams.append('plate', plate);
    if (vin_sn) queryParams.append('vin_sn', vin_sn);

    const apiUrl = `${process.env.NEXT_PUBLIC_BACKEND_URL}/services?${queryParams.toString()}`;
    console.log('Consultando backend en:', apiUrl);

    const response = await fetch(apiUrl, {
      headers: {
        Authorization: req.headers.authorization || '',
      }
    });

    console.log('Respuesta del backend:', {
      status: response.status,
      statusText: response.statusText
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return res.status(response.status).json({
        error: errorData.error || 'Error al consultar servicios en Odoo',
        details: errorData.details || null
      });
    }

    const data = await response.json();
    console.log('Datos recibidos del backend:', {
      count: data.length,
      sample: data.length > 0 ? data[0] : null
    });

    res.status(200).json(data);
  } catch (error) {
    console.error('Error completo en services API:', {
      message: error.message,
      stack: error.stack
    });
    res.status(500).json({
      error: error.message || 'Error interno del servidor',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}
