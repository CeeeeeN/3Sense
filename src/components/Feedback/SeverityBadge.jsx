import React from 'react';

export default function SeverityBadge({ severity }) {
  switch (String(severity).toLowerCase()) {
    case 'high':
    case 'critical': 
      return <span style={{ padding: '4px 8px', borderRadius: '4px', background: '#fee2e2', color: '#991b1b', fontSize: '0.75rem', fontWeight: 'bold' }}>High</span>;
    case 'medium': 
      return <span style={{ padding: '4px 8px', borderRadius: '4px', background: '#fef3c7', color: '#92400e', fontSize: '0.75rem', fontWeight: 'bold' }}>Medium</span>;
    default: 
      return <span style={{ padding: '4px 8px', borderRadius: '4px', background: '#e0e7ff', color: '#3730a3', fontSize: '0.75rem', fontWeight: 'bold' }}>Normal</span>;
  }
}