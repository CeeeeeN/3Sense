import React, { useState, useEffect, useMemo } from 'react';
import '../AdminStyle.css';
import AdminLayout from "../components/AdminLayout";
import { Search, Clock, ShieldAlert, Activity, FilterX } from 'lucide-react';
import { db } from '../firebase/firebase';
import { collection, query, orderBy, onSnapshot, limit } from 'firebase/firestore';

export default function AdminLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // --- FILTER & SORT STATES ---
  const [searchTerm, setSearchTerm] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [sortOrder, setSortOrder] = useState('date_desc'); // date_desc, date_asc, name_asc, name_desc, action_asc, action_desc
  
  // --- PAGINATION STATES ---
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(15);

  useEffect(() => {
    const q = query(
      collection(db, 'audit_logs'), 
      orderBy('timestamp', 'desc'),
      limit(300)
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const logData = snapshot.docs.map(doc => {
        const data = doc.data();
        const rawTime = data.timestamp?.toDate ? data.timestamp.toDate().getTime() : (data.timestamp ? new Date(data.timestamp).getTime() : 0);
        return {
          id: doc.id,
          adminName: data.adminName || 'Unknown',
          adminRole: data.adminRole || 'Unknown',
          actionType: data.actionType || 'SYSTEM_ACTION',
          details: data.details || 'No details provided',
          timestamp: data.timestamp,
          rawTime: rawTime
        };
      });
      setLogs(logData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const formatDateTime = (timestamp) => {
    if (!timestamp) return 'Just now';
    if (typeof timestamp.toDate === 'function') {
      return timestamp.toDate().toLocaleString('en-US', { 
        month: 'short', day: 'numeric', year: 'numeric', 
        hour: 'numeric', minute: '2-digit', hour12: true 
      });
    }
    return String(timestamp);
  };

  const getBadgeColor = (actionType) => {
    const type = actionType.toUpperCase();
    if (type.includes('APPROVE') || type.includes('RESOLVE') || type.includes('CLAIM')) {
      return { bg: '#dcfce7', text: '#166534' };
    }
    if (type.includes('REJECT') || type.includes('DELETE') || type.includes('REMOVE')) {
      return { bg: '#fee2e2', text: '#991b1b' };
    }
    if (type.includes('UPDATE') || type.includes('EDIT')) {
      return { bg: '#fef3c7', text: '#92400e' };
    }
    return { bg: '#e0e7ff', text: '#3730a3' };
  };

  // --- FILTERING & SORTING ---
  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      const safeSearch = String(searchTerm || "").toLowerCase();
      const matchesSearch = 
        String(log.adminName || "").toLowerCase().includes(safeSearch) ||
        String(log.actionType || "").toLowerCase().includes(safeSearch) ||
        String(log.details || "").toLowerCase().includes(safeSearch) ||
        String(log.adminRole || "").toLowerCase().includes(safeSearch);

      let matchesDate = true;
      if ((startDate || endDate) && log.timestamp) {
        const logDate = typeof log.timestamp.toDate === 'function' 
          ? log.timestamp.toDate() 
          : new Date(log.timestamp);
        
        logDate.setHours(0, 0, 0, 0);

        if (startDate) {
          const start = new Date(startDate);
          start.setHours(0, 0, 0, 0);
          if (logDate < start) matchesDate = false;
        }
        
        if (endDate) {
          const end = new Date(endDate);
          end.setHours(23, 59, 59, 999);
          if (logDate > end) matchesDate = false;
        }
      }

      return matchesSearch && matchesDate;
    }).sort((a, b) => {
      if (sortOrder === 'date_desc') {
        return (b.rawTime || 0) - (a.rawTime || 0);
      }
      if (sortOrder === 'date_asc') {
        return (a.rawTime || 0) - (b.rawTime || 0);
      }
      if (sortOrder === 'name_asc') {
        return a.adminName.localeCompare(b.adminName);
      }
      if (sortOrder === 'name_desc') {
        return b.adminName.localeCompare(a.adminName);
      }
      if (sortOrder === 'action_asc') {
        return a.actionType.localeCompare(b.actionType);
      }
      if (sortOrder === 'action_desc') {
        return b.actionType.localeCompare(a.actionType);
      }
      return 0;
    });
  }, [logs, searchTerm, startDate, endDate, sortOrder]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, startDate, endDate, sortOrder, itemsPerPage]);

  const totalPages = Math.ceil(filteredLogs.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentLogs = filteredLogs.slice(startIndex, startIndex + itemsPerPage);

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
    <AdminLayout>
      <div className="requests-container">

        {/* HEADER */}
        <div className="requests-header">
          <h1 className="requests-title" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <ShieldAlert size={28} color="#e11d48" /> System Audit Logs
          </h1>
          <p className="requests-subtitle">Monitor and track all administrative actions performed within the system. Only visible to Super Admins.</p>
        </div>

        {/* CONTROLS & FILTERS */}
        <div className="requests-controls" style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'flex-end' }}>
          
          <div className="search-wrapper" style={{ flex: '1', minWidth: '250px' }}>
            <Search className="search-icon" size={20} />
            <input
              type="text"
              placeholder="Search by Admin Name, Role, or Action..."
              className="search-input"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', marginBottom: '4px' }}>Start Date</label>
              <input 
                type="date" 
                className="filter-select" 
                value={startDate} 
                onChange={(e) => setStartDate(e.target.value)}
                style={{ padding: '8px 12px' }}
              />
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', marginBottom: '4px' }}>End Date</label>
              <input 
                type="date" 
                className="filter-select" 
                value={endDate} 
                onChange={(e) => setEndDate(e.target.value)}
                style={{ padding: '8px 12px' }}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', marginBottom: '4px' }}>Sort By</label>
              <select
                className="filter-select"
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value)}
                style={{ padding: '8px 12px' }}
              >
                <option value="date_desc">Date: Newest First</option>
                <option value="date_asc">Date: Oldest First</option>
                <option value="name_asc">Admin Name: A to Z</option>
                <option value="name_desc">Admin Name: Z to A</option>
                <option value="action_asc">Action: A to Z</option>
                <option value="action_desc">Action: Z to A</option>
              </select>
            </div>

            {(startDate || endDate) && (
              <button 
                onClick={() => { setStartDate(''); setEndDate(''); }}
                style={{ 
                  display: 'flex', alignItems: 'center', gap: '6px', 
                  marginTop: 'auto', marginBottom: '2px', padding: '8px 16px', 
                  background: '#f1f5f9', color: '#64748b', border: '1px solid #cbd5e1', 
                  borderRadius: '6px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600
                }}
              >
                <FilterX size={16} /> Clear Dates
              </button>
            )}
          </div>

        </div>

        {/* DATA TABLE */}
        <div className="req-table-wrapper" style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
          {loading ? (
            <div className="empty-state">
              <Clock className="animate-spin mb-2" size={32} />
              <h3>Loading logs...</h3>
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="empty-state">
              <Activity className="empty-state-icon" size={48} />
              <h3>No logs found</h3>
              <p>No system actions match your current search and date filters.</p>
            </div>
          ) : (
            <table className="req-table" style={{ minWidth: '850px' }}>
              <thead>
                <tr>
                  <th style={{ width: '15%', whiteSpace: 'nowrap' }}>Date & Time</th>
                  <th style={{ width: '20%', whiteSpace: 'nowrap' }}>Admin</th>
                  <th style={{ width: '15%', whiteSpace: 'nowrap' }}>Action Type</th>
                  <th style={{ width: '50%', minWidth: '250px' }}>Details</th>
                </tr>
              </thead>
              <tbody>
                {currentLogs.map((log) => {
                  const badge = getBadgeColor(log.actionType);
                  return (
                    <tr key={log.id}>
                      <td style={{ fontSize: '0.85rem', color: '#64748b', whiteSpace: 'nowrap' }}>
                        {formatDateTime(log.timestamp)}
                      </td>
                      <td>
                        <div className="req-res-info">
                          <span className="req-res-name">{log.adminName}</span>
                          <span className="req-res-email">{log.adminRole}</span>
                        </div>
                      </td>
                      <td>
                        <span style={{ 
                          padding: '4px 8px', 
                          borderRadius: '6px', 
                          fontSize: '0.75rem', 
                          fontWeight: 700, 
                          background: badge.bg, 
                          color: badge.text,
                          display: 'inline-block',
                          whiteSpace: 'nowrap'
                        }}>
                          {log.actionType.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td>
                        <span style={{ color: '#334155', fontSize: '0.9rem', lineHeight: '1.4' }}>
                          {log.details}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* UPGRADED PAGINATION CONTROLS */}
        {!loading && filteredLogs.length > 0 && (
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

            <div style={{ fontSize: '0.85rem', color: '#64748b' }}>
              Showing {startIndex + 1} to {Math.min(startIndex + itemsPerPage, filteredLogs.length)} of {filteredLogs.length} logs
            </div>

          </div>
        )}
      </div>
    </AdminLayout>
  );
}