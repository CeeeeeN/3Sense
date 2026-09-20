import React, { useMemo } from 'react';

// <-- Added inventoryData to props -->
export default function EquipmentAnalytics({ data = [], inventoryData = [] }) {
  const stats = useMemo(() => {
    let pending = 0;
    let claimed = 0; // Currently rented out
    let overdue = 0;
    let returned = 0;
    let totalItemsRentedOut = 0;

    // Calculate Master Inventory from the equipment collection
    let totalInventoryStock = 0;
    inventoryData.forEach(item => {
      // Sums the quantity field from the equipment documents
      totalInventoryStock += Number(item.quantity) || 0;
    });

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Calculate Rental Activity from equipment_rentals collection
    data.forEach(item => {
      const status = item.status || "Pending";
      const quantity = Number(item.quantity) || 1;

      if (status === "Pending") {
        pending++;
      } else if (status === "Returned") {
        returned++;
      } else if (status === "Claimed" || status === "Unreturned") {
        claimed++;
        totalItemsRentedOut += quantity;
        
        if (item.returnDate) {
          const returnD = new Date(item.returnDate + "T00:00:00");
          if (returnD < today) {
            overdue++;
          }
        }
      }
    });

    return { pending, claimed, overdue, returned, totalItemsRentedOut, totalInventoryStock };
  }, [data, inventoryData]);

  return (
    <div style={{ background: '#fff', padding: '24px', borderRadius: '12px', border: '1px solid #e2e8f0', marginTop: "1rem" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "4px" }}>
        <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: '800', color: '#1e293b' }}>Equipment Inventory & Rentals</h2>
        <span style={{ background: "#f1f5f9", padding: "4px 10px", borderRadius: "20px", fontSize: "0.75rem", color: "#64748b", fontWeight: 600 }}>
          {inventoryData.length} Equipment Types
        </span>
      </div>
      <p style={{ margin: '0 0 20px 0', fontSize: '0.85rem', color: '#64748b' }}>
        Current status of all barangay equipment inventory and active rental requests.
      </p>

      <div style={{ 
        display: "grid", 
        gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", 
        gap: "16px" 
      }}>
        
        {/* NEW: Master Inventory Card */}
        <div style={{ background: "#f0fdfa", border: "1px solid #ccfbf1", borderRadius: "10px", padding: "16px" }}>
          <div style={{ fontSize: "0.85rem", color: "#0f766e", fontWeight: 600, display: "flex", alignItems: "center", gap: "6px" }}>
            <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#14b8a6" }} />
            Total Base Inventory
          </div>
          <div style={{ fontSize: "2rem", fontWeight: 800, color: "#115e59", marginTop: "8px" }}>
            {stats.totalInventoryStock}
          </div>
          <div style={{ fontSize: "0.75rem", color: "#0d9488", marginTop: "4px" }}>
            (Registered items)
          </div>
        </div>

        {/* Claimed/Active Card */}
        <div style={{ background: "#fffbeb", border: "1px solid #fcd34d", borderRadius: "10px", padding: "16px" }}>
          <div style={{ fontSize: "0.85rem", color: "#92400e", fontWeight: 600, display: "flex", alignItems: "center", gap: "6px" }}>
            <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#f59e0b" }} />
            Currently Out
          </div>
          <div style={{ fontSize: "2rem", fontWeight: 800, color: "#78350f", marginTop: "8px" }}>
            {stats.totalItemsRentedOut}
          </div>
          <div style={{ fontSize: "0.75rem", color: "#b45309", marginTop: "4px" }}>
            (Across {stats.claimed} active rentals)
          </div>
        </div>

        {/* Pending Card */}
        <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "10px", padding: "16px" }}>
          <div style={{ fontSize: "0.85rem", color: "#64748b", fontWeight: 600, display: "flex", alignItems: "center", gap: "6px" }}>
            <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#3b82f6" }} />
            Pending Requests
          </div>
          <div style={{ fontSize: "2rem", fontWeight: 800, color: "#0f172a", marginTop: "8px" }}>
            {stats.pending}
          </div>
        </div>

        {/* Overdue Card */}
        <div style={{ background: stats.overdue > 0 ? "#fef2f2" : "#f8fafc", border: stats.overdue > 0 ? "1px solid #fecaca" : "1px solid #e2e8f0", borderRadius: "10px", padding: "16px" }}>
          <div style={{ fontSize: "0.85rem", color: stats.overdue > 0 ? "#991b1b" : "#64748b", fontWeight: 600, display: "flex", alignItems: "center", gap: "6px" }}>
            <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: stats.overdue > 0 ? "#ef4444" : "#cbd5e1" }} />
            Overdue Returns
          </div>
          <div style={{ fontSize: "2rem", fontWeight: 800, color: stats.overdue > 0 ? "#7f1d1d" : "#0f172a", marginTop: "8px" }}>
            {stats.overdue}
          </div>
        </div>

      </div>
    </div>
  );
}