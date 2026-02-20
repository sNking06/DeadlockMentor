import React from 'react';

export function StatCard({ label, value, valueClassName = "" }) {
  return (
    <div className="stat-card">
      <div className="stat-label">{label}</div>
      {/* Utiliser dangerouslySetInnerHTML pour le HTML du héros, mais c'est contrôlé */}
      <div className={`stat-value ${valueClassName}`} dangerouslySetInnerHTML={{ __html: value }}></div>
    </div>
  );
}