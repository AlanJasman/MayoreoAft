// file: components/auth/withAuth.js
import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../../context/AuthContext';

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Si no está cargando y no hay usuario, redirigir al login
    if (!loading && !user) {
      // *** CAMBIO: Redirigir a la página de login si es diferente a la raíz ***
      router.push('/login'); // Asegúrate que esta sea la ruta correcta de tu login
    }
  }, [user, loading, router]); // Añadir 'router' a las dependencias

  if (loading || !user) {
    // Puedes mostrar un spinner o un mensaje de carga mientras se verifica el estado de autenticación
    return <div>Cargando...</div>;
  }

  // Si hay usuario y no está cargando, renderizar el contenido protegido
  return children;
}