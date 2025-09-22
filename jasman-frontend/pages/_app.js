import { AuthProvider } from '../context/AuthContext';
import { useAuth } from '../context/AuthContext';
import SessionExpiredModal from '../components/SessionExpiredModal';
import { Analytics } from '@vercel/analytics/react'; // Importa Analytics
import '../styles/globals.css';

function MyApp({ Component, pageProps }) {
  return (
    <AuthProvider>
      <AppContent Component={Component} pageProps={pageProps} />
    </AuthProvider>
  );
}

function AppContent({ Component, pageProps }) {
  const { showSessionExpiredModal, confirmLogoutAndRedirect } = useAuth();
  
  return (
    <>
      <Component {...pageProps} />
      <Analytics /> {/* Agrega el componente Analytics aquí */}
      <SessionExpiredModal 
        isOpen={showSessionExpiredModal}
        onConfirm={confirmLogoutAndRedirect}
      />
    </>
  );
}

export default MyApp;