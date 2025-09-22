// components/inventory/InventoryTabs.js
import { useState } from 'react';
import styles from '../../styles/Inventory/InventoryTabs.module.css';

export default function InventoryTabs({ children, defaultTab }) {
  const [activeTab, setActiveTab] = useState(defaultTab || 0);

  return (
    <div className={styles.tabsContainer}>
      <div className={styles.tabsHeader}>
        {children.map((child, index) => (
          <button
            key={index}
            className={`${styles.tabButton} ${activeTab === index ? styles.activeTab : ''}`}
            onClick={() => setActiveTab(index)}
          >
            {child.props.label}
          </button>
        ))}
      </div>
      <div className={styles.tabsContent}>
        {children[activeTab]}
      </div>
    </div>
  );
}