// file: pages/api/odoo/vehicles.js

export default async function handler(req, res) {
  try {
    const { plate, vin_sn } = req.query;

    // Validar que al menos uno esté presente y tenga mínimo 3 caracteres
    if ((!plate || plate.length < 3) && (!vin_sn || vin_sn.length < 3)) {
      return res.status(400).json({
        error: 'Debes proporcionar una placa o VIN con al menos 3 caracteres'
      });
    }

    // Construir query string dinámico
    const queryParams = new URLSearchParams();
    if (plate) queryParams.append('plate', plate);
    if (vin_sn) queryParams.append('vin_sn', vin_sn);

    const apiUrl = `${process.env.NEXT_PUBLIC_BACKEND_URL}/vehicles?${queryParams.toString()}`;

    const response = await fetch(apiUrl, {
      headers: {
        'Authorization': req.headers.authorization || '', // reenviar token
      }
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return res.status(response.status).json({
        error: errorData.message || 'Error al consultar Odoo'
      });
    }

    const data = await response.json();
    res.status(200).json(data);
  } catch (error) {
    console.error('Error en vehicles API:', error);
    res.status(500).json({
      error: error.message || 'Error interno del servidor'
    });
  }
}
