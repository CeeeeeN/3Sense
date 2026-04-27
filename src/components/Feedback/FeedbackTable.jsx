import React, { useState, useEffect } from 'react';
import SeverityBadge from './SeverityBadge';

export default function FeedbackTable({ dataList, emptyMessage, onReview }) {
  // --- PAGINATION STATES ---
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10); // Default to 10 rows

  // Reset to page 1 whenever the filtered data changes (e.g., when searching)
  useEffect(() => {
    setCurrentPage(1);
  }, [dataList]);

  // --- PAGINATION LOGIC ---
  const totalPages = Math.ceil(dataList.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  // Slice the data to only show the current page's rows
  const currentData = dataList.slice(startIndex, startIndex + itemsPerPage);

  // Helper to generate the 1 2 3 ... 10 page buttons
  const renderPageNumbers = () => {
    const pages = [];
    const maxVisible = 5;
    
    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      if (currentPage <= 3) {
        pages.push(1, 2, 3, 4, '...', totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1, '...', totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
      } else {
        pages.push(1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages);
      }
    }

    return pages.map((page, index) => (
      <button
        key={index}
        className={`af-page-btn ${currentPage === page ? "active" : ""}`}
        onClick={() => typeof page === 'number' ? setCurrentPage(page) : null}
        disabled={typeof page !== 'number'}
        style={{ 
          cursor: typeof page === 'number' ? 'pointer' : 'default', 
          border: typeof page !== 'number' ? 'none' : '',
          background: typeof page !== 'number' ? 'transparent' : ''
        }}
      >
        {page}
      </button>
    ));
  };

  return (
    <div className="req-table-wrapper" style={{ animation: 'fadeIn 0.3s ease-in-out' }}>
      {dataList.length === 0 ? (
        <div className="empty-state"><h3>{emptyMessage}</h3></div>
      ) : (
        <>
          <table className="req-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Resident</th>
                <th>Facility</th>
                <th style={{ width: '30%' }}>Comment</th>
                <th>Sentiment</th>
                <th>Severity</th>
                <th>Status</th>
                <th style={{ textAlign: 'center' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {/* Note: Mapping over currentData instead of dataList */}
              {currentData.map((fb) => (
                <tr key={fb.docId}>
                  <td style={{ fontSize: '0.85rem', color: '#64748b' }}>{fb.CreatedAt}</td>
                  <td style={{ fontWeight: 600, fontSize: '0.85rem', color: '#334155' }}>{fb.UserName || "Resident"}</td>
                  <td style={{ fontWeight: 500 }}>{fb.FacilityName}</td>
                  <td>
                    <div style={{ maxWidth: '200px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: '#475569', fontSize: '0.9rem' }} title={fb.Comment}>
                      "{fb.Comment}"
                    </div>
                  </td>
                  <td>
                    <span style={{ color: fb.Sentiment === 'Positive' ? '#166534' : fb.Sentiment === 'Negative' ? '#991b1b' : '#92400e', fontWeight: 600, fontSize: '0.85rem' }}>
                      {fb.Sentiment || "Pending AI"}
                    </span>
                  </td>
                  <td><SeverityBadge severity={fb.Severity} /></td>
                  <td>
                    <span className={`status-badge ${String(fb.Status || "pending").replace(' ', '_').toLowerCase()}`}>
                      {String(fb.Status || "Pending").charAt(0).toUpperCase() + String(fb.Status || "pending").slice(1).replace('_', ' ')}
                    </span>
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <button className="btn-view" onClick={() => onReview(fb)}>Review</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* --- PAGINATION CONTROLS BOTTOM BAR --- */}
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center', 
            padding: '16px 24px',
            borderTop: '1px solid #e2e8f0',
            background: '#f8fafc',
            borderBottomLeftRadius: '12px',
            borderBottomRightRadius: '12px',
            flexWrap: 'wrap',
            gap: '16px'
          }}>
            
            {/* Rows Per Page Selector */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', color: '#64748b' }}>
              <span>Rows per page:</span>
              <select 
                value={itemsPerPage} 
                onChange={(e) => setItemsPerPage(Number(e.target.value))}
                style={{ 
                  padding: '4px 8px', 
                  borderRadius: '6px', 
                  border: '1px solid #cbd5e1',
                  background: 'white',
                  color: '#334155',
                  cursor: 'pointer'
                }}
              >
                <option value={10}>10</option>
                <option value={15}>15</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
              </select>
            </div>

            {/* Page Buttons */}
            {totalPages > 1 && (
              <div className="af-pagination" style={{ display: 'flex', gap: '8px', margin: 0 }}>
                <button 
                  className="af-page-btn" 
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  style={{ opacity: currentPage === 1 ? 0.5 : 1, cursor: currentPage === 1 ? 'not-allowed' : 'pointer' }}
                >
                  Previous
                </button>
                
                {renderPageNumbers()}
                
                <button 
                  className="af-page-btn" 
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  style={{ opacity: currentPage === totalPages ? 0.5 : 1, cursor: currentPage === totalPages ? 'not-allowed' : 'pointer' }}
                >
                  Next
                </button>
              </div>
            )}

            {/* Showing X of Y text */}
            <div style={{ fontSize: '0.85rem', color: '#64748b' }}>
              Showing {dataList.length === 0 ? 0 : startIndex + 1} to {Math.min(startIndex + itemsPerPage, dataList.length)} of {dataList.length} entries
            </div>

          </div>
        </>
      )}
    </div>
  );
}