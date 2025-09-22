import styles from '../../styles/Cotizaciones/modalDuplicados.module.css';

export default function ModalDuplicados({ duplicates = [], onClose }) {
  return (
    <div className={styles.backdrop}>
      <div className={styles.modal}>
        <h3>Clientes con datos duplicados</h3>
        <ul className={styles.list}>
          {duplicates.map((p) => (
            <li key={p.id}>
              <strong>{p.name}</strong> – {p.email || 'Sin correo'} – {p.phone || 'Sin teléfono'}
            </li>
          ))}
        </ul>
        <button onClick={onClose} className={styles.closeButton}>Cerrar</button>
      </div>
    </div>
  );
}
