/* ═══════════════════════════════════════════════════════════════
   DASHBOARD — Stats & Overview
   ═══════════════════════════════════════════════════════════════ */

const Dashboard = {
  async render() {
    const el = App.getContentEl();
    el.innerHTML = '<div class="empty-state"><p>Loading dashboard...</p></div>';

    try {
      const stats = await API.get('/api/dashboard');
      let announcements = [];
      try { announcements = await API.get('/api/announcements'); } catch (e) { }

      el.innerHTML = `
        <div class="stats-grid">
          <div class="stat-card" onclick="location.hash='#rooms'">
            <div class="stat-icon rooms">🏠</div>
            <div class="stat-info">
              <h3>${stats.totalRooms}</h3>
              <p>Total Rooms</p>
            </div>
          </div>
          <div class="stat-card" onclick="location.hash='#rooms'">
            <div class="stat-icon occupied">🔑</div>
            <div class="stat-info">
              <h3>${stats.occupiedRooms}</h3>
              <p>Occupied Rooms</p>
            </div>
          </div>
          <div class="stat-card" onclick="location.hash='#students'">
            <div class="stat-icon students">👨‍🎓</div>
            <div class="stat-info">
              <h3>${stats.totalStudents}</h3>
              <p>Active Students</p>
            </div>
          </div>
          <div class="stat-card" onclick="location.hash='#fees'">
            <div class="stat-icon fees">💰</div>
            <div class="stat-info">
              <h3>${stats.pendingFees}</h3>
              <p>Pending Fees</p>
            </div>
          </div>
          <div class="stat-card" onclick="location.hash='#complaints'">
            <div class="stat-icon complaints">📝</div>
            <div class="stat-info">
              <h3>${stats.openComplaints}</h3>
              <p>Open Complaints</p>
            </div>
          </div>
          <div class="stat-card" onclick="location.hash='#visitors'">
            <div class="stat-icon visitors">🚪</div>
            <div class="stat-info">
              <h3>${stats.todayVisitors}</h3>
              <p>Today's Visitors</p>
            </div>
          </div>
        </div>

        <div class="dashboard-grid">
          <div class="card">
            <div class="card-header">
              <h3>💰 Fee Overview</h3>
            </div>
            <div class="card-body">
              <div class="summary-row">
                <div class="summary-item">
                  Total Collected: <strong style="color:#34d399">Rs. ${Number(stats.totalCollected).toLocaleString()}</strong>
                </div>
                <div class="summary-item">
                  Total Pending: <strong style="color:#f87171">Rs. ${Number(stats.totalPending).toLocaleString()}</strong>
                </div>
              </div>
              <div style="height:8px;background:rgba(15,15,35,0.5);border-radius:4px;overflow:hidden">
                <div style="height:100%;width:${stats.totalCollected > 0 ? Math.round(stats.totalCollected / (Number(stats.totalCollected) + Number(stats.totalPending)) * 100) : 0}%;background:var(--gradient-success);border-radius:4px;transition:width 0.5s ease"></div>
              </div>
            </div>
          </div>

          <div class="card">
            <div class="card-header">
              <h3>📢 Recent Notices</h3>
              <a href="#announcements" style="color:var(--text-accent);font-size:0.8rem;text-decoration:none">View All</a>
            </div>
            <div class="card-body">
              ${announcements.length === 0
          ? '<p style="color:var(--text-muted);font-size:0.85rem">No announcements yet.</p>'
          : announcements.slice(0, 3).map(a => `
                  <div style="margin-bottom:0.75rem;padding-bottom:0.75rem;border-bottom:1px solid var(--border-color)">
                    <div style="font-weight:600;font-size:0.9rem;margin-bottom:0.2rem">${escapeHtml(a.title)}</div>
                    <div style="font-size:0.8rem;color:var(--text-secondary)">${escapeHtml(a.message).substring(0, 80)}${a.message.length > 80 ? '...' : ''}</div>
                    <div style="font-size:0.7rem;color:var(--text-muted);margin-top:0.2rem">${formatDate(a.created_at)}</div>
                  </div>
                `).join('')
        }
            </div>
          </div>
        </div>
      `;
    } catch (err) {
      el.innerHTML = `<div class="empty-state"><div class="empty-icon">⚠️</div><p>${err.message}</p></div>`;
    }
  }
};
window.Dashboard = Dashboard;
