import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "../../context/AuthContext";
import { IoLogOut, IoMenu, IoClose } from "react-icons/io5";
import { useState } from "react";
import { FaCartPlus } from "react-icons/fa";
import styles from "../../styles/Components/Navigation.module.css";

export default function Navigation() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  const toggleMenu = () => {
    setMenuOpen(!menuOpen);
  };

  const closeMenu = () => {
    setMenuOpen(false);
  };

  const getInitials = (name) => {
    if (!name) return "US";
    const parts = name.split(" ");
    let initials = parts[0][0];
    if (parts.length > 1) initials += parts[1][0];
    return initials.substring(0, 2).toUpperCase();
  };

  // Función para verificar permisos de administración
  const hasAdminAccess = () => {
    return user && (user.role === 'admin' || user.role === 'sistemas');
  };

  return (
    <nav className={styles.navContainer}>
      {/* Botón del menú hamburguesa */}
      <button className={styles.menuButton} onClick={toggleMenu} aria-label="Toggle menu">
        {menuOpen ? <IoClose size={24} /> : <IoMenu size={24} />}
      </button>

      {/* Logo */}
      <div className={styles.logoContainer}>
        <Link href="/dashboard" className={styles.logoLink} onClick={closeMenu}>
          <span className={styles.logoText}>Mayoreo Jasman</span>
        </Link>
      </div>

      {/* Menú de navegación */}
      <div className={`${styles.navLinks} ${menuOpen ? styles.active : ""}`}>
        <Link
          href="/dashboard/existencias"
          className={`${styles.navLink} ${
            pathname === "/dashboard/existencias" ? styles.activeLink : ""
          }`}
          onClick={closeMenu}
        >
          Inventario
        </Link>
        
        {hasAdminAccess() && user.role !== 'vendedor' && (
          <Link
            href="/admin/admin"
            className={`${styles.navLink} ${
              pathname === "/admin/admin" ? styles.activeLink : ""
            }`}
            onClick={closeMenu}
          >
            Administración
          </Link>
        )}
         {hasAdminAccess() && (
          <Link
            href="/dashboard/cotizaciones"
            className={`${styles.navLink} ${
              pathname === "/dashboard/cotizaciones" ? styles.activeLink : ""
            }`}
            onClick={closeMenu}
          >
            Cotizaciones
          </Link>
        )}
      </div>

      {/* Sección de usuario */}
      <div className={styles.userSection}>
      

      {hasAdminAccess() && (
          <Link
            href="/dashboard/cotizar"
            className={`${styles.navLink} ${styles.iconOnlyLink} ${
              pathname === "/dashboard/cotizar" ? styles.activeLink : ""
            }`}
            onClick={closeMenu}
            title="Cotización"
          >
            <FaCartPlus size={20} />
          </Link>
        )}
        
        {user && (
          
          
          <Link href="/user" className={styles.userLink}>
            <div className={styles.userInfo}>
              <div className={styles.userInitials}>
                {getInitials(user.nombre)}
              </div>
              <span className={styles.userName}>{user.nombre || "Usuario"}</span>
            </div>
          </Link>

        )}

        <button onClick={logout} className={styles.logoutButton} aria-label="Logout">
          <IoLogOut className={styles.logoutIcon} />
          <span className={styles.logoutText}>Cerrar sesión</span>
        </button>
      </div>
    </nav>
  );
}