import axios from 'axios';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Método no permitido' });
  }

  try {
    const { image_data } = req.body;
    
    // Primero obtenemos el email asociado al rostro (esto depende de tu implementación)
    const response = await axios.post(
      `${process.env.BACKEND_URL}/auth/login-face`,
      { image_data }
    );
    
    // Si es exitoso, obtenemos el token
    const tokenResponse = await axios.post(
      `${process.env.BACKEND_URL}/auth/token`,
      new URLSearchParams({
        username: response.data.email,
        password: 'dummy' // O implementa otro método en tu backend
      }),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );
    
    res.setHeader('Set-Cookie', `token=${tokenResponse.data.access_token}; Path=/; HttpOnly`);
    res.status(200).json(tokenResponse.data);
  } catch (error) {
    const status = error.response?.status || 500;
    const message = error.response?.data?.detail || 'Autenticación facial fallida';
    res.status(status).json({ message });
  }
}