import React, { useEffect, useState } from "react";

const NOTIF_ICONS = {
  document_update: { icon: "📄", bg: "rgba(232,160,32,0.12)" },
  facility_update: { icon: "🏛️", bg: "rgba(49,125,137,0.12)" },
  program_reminder: { icon: "📢", bg: "rgba(13,122,85,0.12)" },
  announcement: { icon: "📣", bg: "rgba(49,125,137,0.15)" },
  bswd: { icon: "🤝", bg: "rgba(59,130,246,0.12)" },
  incident: { icon: "⚠️", bg: "rgba(239,68,68,0.12)" },
  general: { icon: "🔔", bg: "rgba(100,100,200,0.12)" },
};

function formatModalTime(timestamp) {
  if (!timestamp) return "Just now";
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

export default function NotificationModal({
  isOpen,
  onClose,
  notifications = [],
  onNotificationClick,
  onMarkAllRead,
  onDelete,
}) {
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) {
      document.body.style.overflow = "hidden";
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const filteredNotifs = notifications.filter((n) => {
    if (filter === "unread") return !n.isRead;
    return true;
  });

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <div
      style={styles.overlay}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
    >
      <div style={styles.card}>
        {/* Header */}
        <div style={styles.header}>
          <div style={styles.headerLeft}>
            <div style={styles.iconBadge}>
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.73 21a2 2 0 0 1-3.46 0" />
              </svg>
            </div>
            <div>
              <h2 style={styles.title}>Notifications</h2>
              <p style={styles.subtitle}>Stay updated with your latest activities</p>
            </div>
          </div>

          <button style={styles.closeBtn} onClick={onClose} aria-label="Close">
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Controls Bar */}
        <div style={styles.controls}>
          <div style={styles.filterPills}>
            <button
              style={{
                ...styles.pill,
                ...(filter === "all" ? styles.pillActive : {}),
              }}
              onClick={() => setFilter("all")}
            >
              All ({notifications.length})
            </button>
            <button
              style={{
                ...styles.pill,
                ...(filter === "unread" ? styles.pillActive : {}),
              }}
              onClick={() => setFilter("unread")}
            >
              Unread {unreadCount > 0 && <span style={styles.pillBadge}>{unreadCount}</span>}
            </button>
          </div>

          {unreadCount > 0 && onMarkAllRead && (
            <button style={styles.markReadBtn} onClick={onMarkAllRead}>
              Mark all as read
            </button>
          )}
        </div>

        {/* Notification Items List */}
        <div style={styles.list}>
          {filteredNotifs.length === 0 ? (
            <div style={styles.emptyState}>
              <div style={styles.emptyIcon}>🔔</div>
              <h4 style={{ margin: "0 0 4px 0", color: "#334155" }}>No notifications found</h4>
              <p style={{ margin: 0, fontSize: "0.85rem", color: "#64748b" }}>
                {filter === "unread"
                  ? "You have caught up with all notifications!"
                  : "You don't have any notifications right now."}
              </p>
            </div>
          ) : (
            filteredNotifs.map((n) => {
              const iconCfg = NOTIF_ICONS[n.type] || NOTIF_ICONS.general;
              return (
                <div
                  key={n.id}
                  style={{
                    ...styles.item,
                    ...(!n.isRead ? styles.itemUnread : {}),
                  }}
                  onClick={() => {
                    if (onNotificationClick) onNotificationClick(n);
                  }}
                >
                  <div style={{ ...styles.itemIcon, backgroundColor: iconCfg.bg }}>
                    {iconCfg.icon}
                  </div>

                  <div style={styles.itemContent}>
                    <div style={styles.itemHeader}>
                      <span style={styles.itemTitle}>{n.title || "Notification"}</span>
                      <span style={styles.itemTime}>{formatModalTime(n.createdAt)}</span>
                    </div>
                    <p style={styles.itemMessage}>{n.message}</p>
                    {n.refNum && (
                      <span style={styles.refTag}>Ref: {n.refNum}</span>
                    )}
                  </div>

                  <div style={styles.itemActions}>
                    {!n.isRead && <span style={styles.unreadDot} />}
                    {onDelete && (
                      <button
                        style={styles.deleteBtn}
                        title="Delete notification"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDelete(n.id);
                        }}
                      >
                        <svg
                          width="14"
                          height="14"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <polyline points="3 6 5 6 21 6" />
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

const styles = {
  overlay: {
    position: "fixed",
    inset: 0,
    backgroundColor: "rgba(15, 23, 42, 0.65)",
    backdropFilter: "blur(4px)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 9999,
    padding: "1.25rem",
  },
  card: {
    width: "100%",
    maxWidth: "560px",
    maxHeight: "85vh",
    backgroundColor: "#ffffff",
    borderRadius: "16px",
    display: "flex",
    flexDirection: "column",
    boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
    overflow: "hidden",
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "1.25rem 1.5rem",
    borderBottom: "1px solid #f1f5f9",
    backgroundColor: "#ffffff",
  },
  headerLeft: {
    display: "flex",
    alignItems: "center",
    gap: "0.875rem",
  },
  iconBadge: {
    width: "40px",
    height: "40px",
    borderRadius: "10px",
    backgroundColor: "rgba(49, 125, 137, 0.12)",
    color: "#317d89",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    margin: 0,
    fontSize: "1.15rem",
    fontWeight: 700,
    color: "#0f172a",
  },
  subtitle: {
    margin: "2px 0 0 0",
    fontSize: "0.825rem",
    color: "#64748b",
  },
  closeBtn: {
    width: "32px",
    height: "32px",
    borderRadius: "8px",
    backgroundColor: "#f8fafc",
    border: "1px solid #e2e8f0",
    color: "#64748b",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
  },
  controls: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "0.75rem 1.5rem",
    backgroundColor: "#f8fafc",
    borderBottom: "1px solid #f1f5f9",
  },
  filterPills: {
    display: "flex",
    gap: "0.5rem",
  },
  pill: {
    padding: "0.35rem 0.75rem",
    borderRadius: "20px",
    fontSize: "0.8rem",
    fontWeight: 600,
    border: "1px solid #e2e8f0",
    backgroundColor: "#ffffff",
    color: "#64748b",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: "0.35rem",
  },
  pillActive: {
    backgroundColor: "#317d89",
    color: "#ffffff",
    borderColor: "#317d89",
  },
  pillBadge: {
    backgroundColor: "#ef4444",
    color: "#ffffff",
    fontSize: "0.7rem",
    padding: "1px 5px",
    borderRadius: "10px",
  },
  markReadBtn: {
    background: "none",
    border: "none",
    fontSize: "0.8rem",
    fontWeight: 600,
    color: "#317d89",
    cursor: "pointer",
  },
  list: {
    flex: 1,
    overflowY: "auto",
    padding: "0.75rem 1.25rem 1.5rem",
    display: "flex",
    flexDirection: "column",
    gap: "0.5rem",
  },
  item: {
    display: "flex",
    alignItems: "flex-start",
    gap: "0.875rem",
    padding: "0.875rem 1rem",
    borderRadius: "12px",
    border: "1px solid #f1f5f9",
    backgroundColor: "#ffffff",
    cursor: "pointer",
  },
  itemUnread: {
    backgroundColor: "#f0fdfa",
    borderColor: "rgba(49, 125, 137, 0.25)",
  },
  itemIcon: {
    width: "36px",
    height: "36px",
    borderRadius: "8px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "1.1rem",
    flexShrink: 0,
  },
  itemContent: {
    flex: 1,
  },
  itemHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "0.5rem",
  },
  itemTitle: {
    fontSize: "0.9rem",
    fontWeight: 700,
    color: "#0f172a",
  },
  itemTime: {
    fontSize: "0.75rem",
    color: "#94a3b8",
    whiteSpace: "nowrap",
  },
  itemMessage: {
    margin: "3px 0 0 0",
    fontSize: "0.825rem",
    color: "#475569",
    lineHeight: "1.4",
  },
  refTag: {
    display: "inline-block",
    marginTop: "5px",
    fontSize: "0.725rem",
    fontFamily: "monospace",
    backgroundColor: "#e2e8f0",
    color: "#475569",
    padding: "2px 6px",
    borderRadius: "4px",
  },
  itemActions: {
    display: "flex",
    alignItems: "center",
    gap: "0.5rem",
    alignSelf: "center",
  },
  unreadDot: {
    width: "8px",
    height: "8px",
    borderRadius: "50%",
    backgroundColor: "#317d89",
  },
  deleteBtn: {
    background: "none",
    border: "none",
    color: "#cbd5e1",
    cursor: "pointer",
    padding: "4px",
    borderRadius: "4px",
    display: "flex",
  },
  emptyState: {
    textAlign: "center",
    padding: "3rem 1rem",
  },
  emptyIcon: {
    fontSize: "2rem",
    marginBottom: "0.5rem",
  },
};