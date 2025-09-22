import api from './api';

export const login = async (email, password) => {
  try {
    const formData = new URLSearchParams();
    formData.append('username', email);
    formData.append('password', password);

    const response = await api.post('/auth/token', formData, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });
    console.log('login response', response);

    return {
      success: true,
      data: {
        access_token: response.data.access_token,
        token_type: response.data.token_type
      }
    };
  } catch (error) {
    console.error('login error', error.response?.data);

    return {
      success: false,
      message: error.response?.data?.detail || 'Error de autenticación'
    };
  }
};

export const register = async (userData) => {
  try {
    console.log('Enviando registro a /auth/register', userData);
    const response = await api.post('/auth/register', userData, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    return {
      success: true,
      data: response.data
    };
  } catch (error) {
    const raw = error.response?.data?.detail;

    console.error('Error en register:', {
      message: error.message,
      response: raw
    });

    let message = 'Error en el registro';

    if (Array.isArray(raw)) {
      message = raw.map((err) => `${err.msg} (${err.loc?.join('.')})`).join(', ');
    } else if (typeof raw === 'string') {
      message = raw;
    }

    return {
      success: false,
      message
    };
  }
};

export const registerFace = async (userId, imageData) => {
  try {
    const response = await api.post('/auth/register-face', {
      user_id: userId,
      image_data: imageData
    });
    return {
      success: true,
      data: response.data
    };
  } catch (error) {
    return {
      success: false,
      message: error.response?.data?.detail || 'Error registrando rostro'
    };
  }
};

export const loginWithFace = async (email, imageData) => {
  try {
    const response = await api.post('/auth/login-face', {
      email,
      image_data: imageData
    });
    return {
      success: true,
      data: response.data
    };
  } catch (error) {
    return {
      success: false,
      message: error.response?.data?.detail || 'Autenticación facial fallida'
    };
  }
};

export const getCurrentUser = async () => {
  try {
    const response = await api.get('/users/me');
    return {
      success: true,
      data: response.data
    };
  } catch (error) {
    return {
      success: false,
      message: error.response?.data?.detail || 'Error obteniendo usuario'
    };
  }
};

export const toggleFaceAuth = async (enable) => {
  try {
    const response = await api.put('/users/toggle-face-auth', { enable });
    return {
      success: true,
      data: response.data
    };
  } catch (error) {
    return {
      success: false,
      message: error.response?.data?.detail || 'Error actualizando preferencia'
    };
  }
};
