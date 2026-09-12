import React from "react";

const AlertIcon = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
    <line x1="12" y1="9" x2="12" y2="13" />
    <line x1="12" y1="17" x2="12.01" y2="17" strokeWidth="2.5" />
  </svg>
);

const CloseIcon = ({ size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

export default function ErrorMessage({ message, title, onDismiss, style, className = "" }) {
  if (!message) return null;

  return (
    <div 
      className={`brgy-error-alert ${className}`}
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: "10px",
        background: "#fef2f2",
        border: "1px solid #fecaca",
        padding: "12px 14px",
        borderRadius: "8px",
        color: "#b91c1c",
        ...style
      }}
    >
      <div style={{ flexShrink: 0, marginTop: title ? "2px" : "0px", color: "#dc2626" }}>
        <AlertIcon size={title ? 20 : 16} />
      </div>
      
      <div style={{ flex: 1, paddingTop: title ? "0px" : "1px" }}>
        {title && (
          <h4 style={{ margin: "0 0 4px 0", fontSize: "0.9rem", fontWeight: 700, color: "#991b1b" }}>
            {title}
          </h4>
        )}
        <p style={{ margin: 0, fontSize: "0.85rem", lineHeight: "1.4", color: "#b91c1c" }}>
          {message}
        </p>
      </div>

      {onDismiss && (
        <button 
          onClick={onDismiss}
          type="button"
          aria-label="Dismiss error"
          style={{
            background: "transparent",
            border: "none",
            color: "#f87171",
            cursor: "pointer",
            padding: "4px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: "4px",
            transition: "color 0.2s, background 0.2s",
            marginLeft: "4px"
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = "#dc2626";
            e.currentTarget.style.background = "#fee2e2";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = "#f87171";
            e.currentTarget.style.background = "transparent";
          }}
        >
          <CloseIcon />
        </button>
      )}
    </div>
  );
}