// components/odoo/StatusCounters.js

const StatusCounters = ({ data, level }) => {
  const calculateStatusCounts = (items) => {
    let green = 0, yellow = 0, red = 0;
    
    items.forEach(order => {
      const hours = Math.floor((new Date() - new Date(order.date_order)) / (1000 * 60 * 60));
      
      if (hours < 100) green++;
      else if (hours >= 100 && hours < 200) yellow++;
      else red++;
    });
    
    return { green, yellow, red };
  };

  const renderCounters = (items) => {
    const { green, yellow, red } = calculateStatusCounts(items);
    
    return (
      <div className={styles.countersContainer}>
        <div className={styles.counterItem}>
          <span className={`${styles.counterCircle} ${styles.green}`}>{green}</span>
          <span className={styles.counterLabel}>Verde</span>
        </div>
        <div className={styles.counterItem}>
          <span className={`${styles.counterCircle} ${styles.yellow}`}>{yellow}</span>
          <span className={styles.counterLabel}>Amarillo</span>
        </div>
        <div className={styles.counterItem}>
          <span className={`${styles.counterCircle} ${styles.red}`}>{red}</span>
          <span className={styles.counterLabel}>Rojo</span>
        </div>
      </div>
    );
  };

  return (
    <div className={styles.statusSection}>
      <h3 className={styles.sectionTitle}>Estados {level}</h3>
      {renderCounters(data)}
    </div>
  );
};

export default StatusCounters;