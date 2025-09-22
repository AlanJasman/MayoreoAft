// file: context/AuthContext.js
import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showSessionExpiredModal, setShowSessionExpiredModal] = useState(false);
  const router = useRouter();

  const TOKEN_KEY = 'jasman_auth_token';
  const USER_KEY = 'jasman_user_data';

  const login = async (token, userData) => {
    try {
      // console.log("AuthContext - login: Datos de usuario recibidos:", userData); // Puedes mantener este log para depuración
      localStorage.setItem(TOKEN_KEY, token);

      // Ajusta el nombre de la propiedad 'rol' a 'role' aquí
      const userWithCorrectRole = { ...userData, role: userData.rol }; 
      localStorage.setItem(USER_KEY, JSON.stringify(userWithCorrectRole));

      setUser({ ...userWithCorrectRole, token });
      // console.log("AuthContext - login: Usuario establecido en el estado:", { ...userWithCorrectRole, token }); // Puedes mantener este log para depuración
      setShowSessionExpiredModal(false);
    } catch (error) {
      console.error('Error en login:', error);
      throw error;
    }
  };

  const logout = useCallback((autoRedirect = true) => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    setUser(null);
    setShowSessionExpiredModal(true);

    if (autoRedirect) {
      router.push('/login');
    }
  }, [router]);

  const confirmLogoutAndRedirect = useCallback(() => {
    setShowSessionExpiredModal(false);
    logout(false);
    router.push('/login');
  }, [logout, router]);

  const getToken = () => {
    return localStorage.getItem(TOKEN_KEY);
  };

  const fetchUserData = async (token) => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/users/me`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        if (res.status === 401) {
          logout();
          throw new Error('Sesión expirada o token inválido.');
        }
        throw new Error('No se pudo obtener la información del usuario');
      }

      const userData = await res.json();
      // console.log("AuthContext - fetchUserData: Datos de usuario de la API /users/me:", userData); // Puedes mantener este log para depuración
      return userData;
    } catch (error) {
      console.error('Error al obtener datos del usuario:', error);
      if (!showSessionExpiredModal) {
        logout();
      }
      throw error;
    }
  };

  useEffect(() => {
    const handleSessionExpired = () => {
      logout();
    };
    window.addEventListener('sessionExpired', handleSessionExpired);

    const initializeAuth = async () => {
      setLoading(true);
      const token = getToken();

      if (token) {
        try {
          const storedUser = localStorage.getItem(USER_KEY);

          if (storedUser) {
            const parsedStoredUser = JSON.parse(storedUser);
            // console.log("AuthContext - initializeAuth: Usuario de localStorage:", parsedStoredUser); // Puedes mantener este log para depuración

            // Ajusta el nombre de la propiedad 'rol' a 'role' aquí
            const userWithCorrectRole = { ...parsedStoredUser, role: parsedStoredUser.rol };
            setUser({ ...userWithCorrectRole, token });
            setShowSessionExpiredModal(false);
          } else {
            const userData = await fetchUserData(token);
            // Ajusta el nombre de la propiedad 'rol' a 'role' aquí después de obtenerlo de la API
            const userWithCorrectRole = { ...userData, role: userData.rol };
            setUser({ ...userWithCorrectRole, token });
            localStorage.setItem(USER_KEY, JSON.stringify(userWithCorrectRole));
            setShowSessionExpiredModal(false);
          }
        } catch (error) {
          console.error('Error al inicializar autenticación (useEffect):', error);
          if (!showSessionExpiredModal) {
            logout();
          }
        }
      } else {
        setUser(null);
        setShowSessionExpiredModal(false);
      }

      setLoading(false);
    };

    initializeAuth();

    return () => {
      window.removeEventListener('sessionExpired', handleSessionExpired);
    };
  }, [logout, showSessionExpiredModal]);

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      login,
      logout,
      getToken,
      fetchUserData,
      showSessionExpiredModal,
      confirmLogoutAndRedirect
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}