import React from 'react';

export function Finding({ finding }) {
  const { severity, title, why, evidence, action } = finding;

  return (
    <article className={`finding sev-${severity}`}>
      <div className="finding-header">
        <span className="finding-title">{title}</span>
        <span className={`sev-badge ${severity}`}>{severity}</span>
      </div>
      <div className="finding-body">
        <div className="finding-row"><strong>Pourquoi :</strong> {why}</div>
        <div className="finding-row"><strong>Preuve :</strong> {evidence}</div>
        <div className="finding-row"><strong>Action coach :</strong> {action}</div>
      </div>
    </article>
  );
}