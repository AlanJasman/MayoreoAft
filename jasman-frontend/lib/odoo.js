import api from './api'; 

export const checkUserInOdoo = async (email) => {
  try {
    const response = await api.post('/odoo/check-user', { email });
    return response.data; 
  } catch (error) {
    return {
      success: false,
      message: error.response?.data?.detail || 'Error al verificar usuario en Odoo'
    };
  }
};
