import axios from 'axios';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Método no permitido' });
  }

  try {
    const response = await axios.post(
      `${process.env.BACKEND_URL}/auth/register`,
      req.body
    );
    res.status(200).json(response.data);
  } catch (error) {
    const status = error.response?.status || 500;
    const message = error.response?.data?.detail || 'Error en el registro';
    res.status(status).json({ message });
  }
}