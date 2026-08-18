import React from "react";

export default function DashboardSummaryCards({ stats, totalFeedbacks }) {
  const totalActiveRequests = stats.docRequests + stats.facilityRequests;

  return (
    <div className="card-grid">
      <div className="card">
        Total Households<br />
        <strong>{stats.households}</strong>
      </div>
      <div className="card">
        Total Residents<br />
        <strong>{stats.residents}</strong>
      </div>
      <div className="card">
        Active Requests<br />
        <strong>{totalActiveRequests}</strong>
      </div>
      <div className="card">
        Pending Approvals<br />
        <strong>{stats.pendingApprovals}</strong>
      </div>
      <div className="card">
        Total Feedbacks<br />
        <strong>{totalFeedbacks}</strong>
      </div>
    </div>
  );
}