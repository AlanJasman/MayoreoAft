// api/auth/me.js
import axios from 'axios';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Método no permitido' });
  }

  try {
    const token = req.cookies.token;
    
    const response = await axios.get(
      `${process.env.BACKEND_URL}/auth/me`,
      {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }
    );
    
    res.status(200).json(response.data);
  } catch (error) {
    const status = error.response?.status || 500;
    const message = error.response?.data?.detail || 'Error obteniendo datos';
    res.status(status).json({ message });
  }
}