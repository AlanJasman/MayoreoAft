import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { FiChevronRight, FiHome } from 'react-icons/fi';
import { useState, useEffect } from 'react';
import styles from '../../styles/Components/Breadcrumbs.module.css';

export default function DynamicBreadcrumbs() {
  const router = useRouter();
  
  // ✅ Limpiar query params del path
  const cleanPath = router.asPath.split('?')[0];
  const pathSegments = cleanPath.split('/').filter(Boolean);

  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const isScrolled = window.scrollY > 10;
      if (isScrolled !== scrolled) {
        setScrolled(isScrolled);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [scrolled]);

  const pathNames = {
    dashboard: 'Panel',
    settings: 'Configuración',
    profile: 'Perfil',
    user: 'Usuario',
    patio: 'Patio', 
    cotizar: 'Cotizar',
    historial: 'Historial',
    existencias: 'Existencias',
    // Agrega más mapeos aquí si necesitas
  };

  const getFriendlyName = (segment) => {
    return pathNames[segment.toLowerCase()] || 
           segment.charAt(0).toUpperCase() + segment.slice(1);
  };

  return (
    <div className={`${styles.breadcrumbContainer} ${scrolled ? styles.scrolled : ''}`}>
      <Head>
        <title>
          {pathSegments.length > 0 
            ? `${getFriendlyName(pathSegments[pathSegments.length - 1])} - JasmanApp` 
            : 'JasmanApp'}
        </title>
      </Head>

      <nav aria-label="Ruta de navegación" className={styles.breadcrumb}>
        <ol className={styles.breadcrumbList}>
          <li className={styles.breadcrumbItem}>
            <Link href="/dashboard" className={styles.breadcrumbLink}>
              <FiHome className={styles.homeIcon} />
            </Link>
            {pathSegments.length > 0 && (
              <FiChevronRight className={styles.breadcrumbSeparator} />
            )}
          </li>

          {pathSegments.map((segment, index) => {
            const path = `/${pathSegments.slice(0, index + 1).join('/')}`;
            const isLast = index === pathSegments.length - 1;

            return (
              <li key={index} className={styles.breadcrumbItem}>
                {isLast ? (
                  <span className={styles.breadcrumbCurrent} title={getFriendlyName(segment)}>
                    {getFriendlyName(segment)}
                  </span>
                ) : (
                  <>
                    <Link href={path} className={styles.breadcrumbLink} title={getFriendlyName(segment)}>
                      {getFriendlyName(segment)}
                    </Link>
                    <FiChevronRight className={styles.breadcrumbSeparator} />
                  </>
                )}
              </li>
            );
          })}
        </ol>
      </nav>
    </div>
  );
}
