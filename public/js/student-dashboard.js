/* ═══════════════════════════════════════════════════════════════
   STUDENT DASHBOARD
   ═══════════════════════════════════════════════════════════════ */

const StudentDashboard = {
  data: {},

  async render() {
    const el = App.getContentEl();
    el.innerHTML = '<div class="empty-state"><p>Loading dashboard...</p></div>';

    try {
      this.data = await API.get('/api/student-profile'); // Fetches student + room info
      this.renderView(el);
    } catch (err) {
      el.innerHTML = `<div class="empty-state"><div class="empty-icon">⚠️</div><p>${err.message}</p></div>`;
    }
  },

  renderView(el) {
    const s = this.data;

    el.innerHTML = `
      <div class="dashboard-grid">
        <!-- Profile Card -->
        <div class="card" style="grid-column: span 2">
          <div class="card-header">
            <h3>👤 My Profile</h3>
            <span class="badge badge-success">${s.status}</span>
          </div>
          <div class="card-body">
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:1.5rem">
              <div>
                <p style="color:var(--text-secondary);font-size:0.85rem">Full Name</p>
                <p style="font-weight:600;font-size:1.1rem">${escapeHtml(s.name)}</p>
              </div>
              <div>
                <p style="color:var(--text-secondary);font-size:0.85rem">Roll Number</p>
                <p style="font-weight:600;font-size:1.1rem">${escapeHtml(s.roll_number)}</p>
              </div>
              <div>
                <p style="color:var(--text-secondary);font-size:0.85rem">Room Number</p>
                <p style="font-weight:600;font-size:1.1rem">${s.room_number ? `${s.room_number} (Floor ${s.floor})` : 'Not Assigned'}</p>
              </div>
              <div>
                <p style="color:var(--text-secondary);font-size:0.85rem">Contact</p>
                <p style="font-weight:600;font-size:1.1rem">${escapeHtml(s.contact || '—')}</p>
              </div>
            </div>
          </div>
        </div>

        <!-- Quick Actions -->
        <div class="card">
             <div class="card-header"><h3>⚡ Quick Actions</h3></div>
             <div class="card-body" style="display:flex;flex-direction:column;gap:0.75rem">
                <button class="btn btn-primary btn-block" onclick="App.navigate('gate-passes')">Request Gate Pass</button>
                <button class="btn btn-ghost btn-block" onclick="App.navigate('my-complaints')">File Complaint</button>
                <button class="btn btn-ghost btn-block" onclick="App.navigate('room-transfers')">Request Room Transfer</button>
             </div>
        </div>

        <!-- Recent Notices -->
        <div class="card" style="grid-column: span 2">
          <div class="card-header">
             <h3>📢 Recent Notices</h3>
             <a href="#announcements" style="font-size:0.85rem;text-decoration:none;color:var(--text-accent)">View All</a>
          </div>
          <div class="card-body" id="std-notices-list">
             <p style="color:var(--text-secondary)">Loading notices...</p>
          </div>
        </div>
      </div>
    `;

    this.loadNotices();
  },

  async loadNotices() {
    try {
      const notices = await API.get('/api/announcements');
      const container = document.getElementById('std-notices-list');
      if (notices.length === 0) {
        container.innerHTML = '<p class="text-muted">No recent notices.</p>';
        return;
      }
      container.innerHTML = notices.slice(0, 3).map(n => `
        <div class="announcement-card" style="margin-bottom:0.75rem">
           <h4>${escapeHtml(n.title)}</h4>
           <div class="announcement-meta">
             <span>${formatDate(n.created_at)}</span>
             ${n.priority ? `<span class="badge ${n.priority === 'Urgent' ? 'badge-danger' : 'badge-info'}" style="font-size:0.65rem">${n.priority}</span>` : ''}
           </div>
        </div>
      `).join('');
    } catch (e) { console.error(e); }
  }
};
window.StudentDashboard = StudentDashboard;
