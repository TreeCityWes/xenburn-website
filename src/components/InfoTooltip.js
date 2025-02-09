import React from 'react';

export function InfoTooltip({ content }) {
  return (
    <div className="tooltip">
      <span className="tooltip-icon">ⓘ</span>
      <div className="tooltip-content">{content}</div>
    </div>
  );
} 