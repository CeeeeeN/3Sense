import '../AdminStyle.css';
import AdminLayout from "../components/AdminLayout"

export default function AdminDashboard() {

  return (
    <AdminLayout>

      <div className="main-content">
          {/* SUMMARY CARDS */}
          <div className="card-grid">
            <div className="card">Total Households<br /><strong>120</strong></div>
            <div className="card">Total Residents<br /><strong>560</strong></div>
            <div className="card">Active Requests<br /><strong>23</strong></div>
            <div className="card">Pending Approvals<br /><strong>5</strong></div>
            <div className="card">Feedback This Month<br /><strong>42</strong></div>
          </div>

          {/* AI SENTIMENT */}
          <div className="section">
            <h2>Community Sentiment Summary</h2>

            <div className="card-grid">
              <div className="card">
                Services
                <div className="sentiment">
                  <span className="positive">
                    <span className="face">
                      <svg viewBox="0 0 24 24">
                        <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="2" />
                        <circle cx="9" cy="9" r="1.2" fill="currentColor" />
                        <circle cx="15" cy="9" r="1.2" fill="currentColor" />
                        <path d="M8 14c1.5 2 6.5 2 8 0" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                      </svg>
                    </span>
                    70%
                  </span>

                  <span className="neutral">
                    <span className="face">
                      <svg viewBox="0 0 24 24">
                        <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="2" />
                        <circle cx="9" cy="9" r="1.2" fill="currentColor" />
                        <circle cx="15" cy="9" r="1.2" fill="currentColor" />
                        <line x1="8" y1="14" x2="16" y2="14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                      </svg>
                    </span>
                    20%
                  </span>

                  <span className="negative">
                    <span className="face">
                      <svg viewBox="0 0 24 24">
                        <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="2" />
                        <circle cx="9" cy="9" r="1.2" fill="currentColor" />
                        <circle cx="15" cy="9" r="1.2" fill="currentColor" />
                        <path d="M8 16c1.5-2 6.5-2 8 0" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                      </svg>
                    </span>
                    10%
                  </span>
                </div>
              </div>
              <div className="card">
                Facilities
                <div className="sentiment">
                  <span className="positive">
                    <span className="face">
                      <svg viewBox="0 0 24 24">
                        <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="2" />
                        <circle cx="9" cy="9" r="1.2" fill="currentColor" />
                        <circle cx="15" cy="9" r="1.2" fill="currentColor" />
                        <path d="M8 14c1.5 2 6.5 2 8 0" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                      </svg>
                    </span>
                    70%
                  </span>

                  <span className="neutral">
                    <span className="face">
                      <svg viewBox="0 0 24 24">
                        <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="2" />
                        <circle cx="9" cy="9" r="1.2" fill="currentColor" />
                        <circle cx="15" cy="9" r="1.2" fill="currentColor" />
                        <line x1="8" y1="14" x2="16" y2="14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                      </svg>
                    </span>
                    20%
                  </span>

                  <span className="negative">
                    <span className="face">
                      <svg viewBox="0 0 24 24">
                        <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="2" />
                        <circle cx="9" cy="9" r="1.2" fill="currentColor" />
                        <circle cx="15" cy="9" r="1.2" fill="currentColor" />
                        <path d="M8 16c1.5-2 6.5-2 8 0" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                      </svg>
                    </span>
                    10%
                  </span>
                </div>
              </div>

              <div className="card">
                Documents
                <div className="sentiment">
                  <span className="positive">
                    <span className="face">
                      <svg viewBox="0 0 24 24">
                        <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="2" />
                        <circle cx="9" cy="9" r="1.2" fill="currentColor" />
                        <circle cx="15" cy="9" r="1.2" fill="currentColor" />
                        <path d="M8 14c1.5 2 6.5 2 8 0" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                      </svg>
                    </span>
                    70%
                  </span>

                  <span className="neutral">
                    <span className="face">
                      <svg viewBox="0 0 24 24">
                        <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="2" />
                        <circle cx="9" cy="9" r="1.2" fill="currentColor" />
                        <circle cx="15" cy="9" r="1.2" fill="currentColor" />
                        <line x1="8" y1="14" x2="16" y2="14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                      </svg>
                    </span>
                    20%
                  </span>

                  <span className="negative">
                    <span className="face">
                      <svg viewBox="0 0 24 24">
                        <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="2" />
                        <circle cx="9" cy="9" r="1.2" fill="currentColor" />
                        <circle cx="15" cy="9" r="1.2" fill="currentColor" />
                        <path d="M8 16c1.5-2 6.5-2 8 0" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                      </svg>
                    </span>
                    10%
                  </span>
                </div>
              </div>

              <div className="card">
                Programs
                <div className="sentiment">
                  <span className="positive">
                    <span className="face">
                      <svg viewBox="0 0 24 24">
                        <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="2" />
                        <circle cx="9" cy="9" r="1.2" fill="currentColor" />
                        <circle cx="15" cy="9" r="1.2" fill="currentColor" />
                        <path d="M8 14c1.5 2 6.5 2 8 0" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                      </svg>
                    </span>
                    70%
                  </span>

                  <span className="neutral">
                    <span className="face">
                      <svg viewBox="0 0 24 24">
                        <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="2" />
                        <circle cx="9" cy="9" r="1.2" fill="currentColor" />
                        <circle cx="15" cy="9" r="1.2" fill="currentColor" />
                        <line x1="8" y1="14" x2="16" y2="14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                      </svg>
                    </span>
                    20%
                  </span>

                  <span className="negative">
                    <span className="face">
                      <svg viewBox="0 0 24 24">
                        <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="2" />
                        <circle cx="9" cy="9" r="1.2" fill="currentColor" />
                        <circle cx="15" cy="9" r="1.2" fill="currentColor" />
                        <path d="M8 16c1.5-2 6.5-2 8 0" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                      </svg>
                    </span>
                    10%
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* CHART */}
          <div className="section">
            <h2>Service Satisfaction Comparison</h2>
            <div className="chart-placeholder">
              Chart goes here (Bar / Radar)
            </div>
          </div>

          {/* AI INSIGHTS */}
          <div className="section">
            <h2>AI Insights</h2>

            <div className="insight-card">
              <p><strong>Detected Issue:</strong> Long waiting time in document processing.</p>
              <p><strong>Suggested Action:</strong> Increase document processing window hours.</p>
              <p><strong>Impact:</strong> High</p>
            </div>
          </div>

      </div>
    </AdminLayout>
  )
}