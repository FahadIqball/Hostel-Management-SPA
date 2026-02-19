/* ═══════════════════════════════════════════════════════════════
   ACTIVITY LOG
   ═══════════════════════════════════════════════════════════════ */

const ActivityLog = {
  data: [],

  async render() {
    const el = App.getContentEl();
    el.innerHTML = '<div class="empty-state"><p>Loading log...</p></div>';

    try {
      this.data = await API.get('/api/activity-log');
      this.renderView(el);
    } catch (err) {
      el.innerHTML = `<div class="empty-state"><div class="empty-icon">⚠️</div><p>${err.message}</p></div>`;
    }
  },

  renderView(el) {
    el.innerHTML = `
      <div class="header-actions">
        <h2>📜 Activity Log</h2>
        <button class="btn btn-ghost" onclick="ActivityLog.render()">Refresh</button>
      </div>

      <div class="table-wrapper">
        <table class="data-table">
          <thead>
            <tr>
              <th>Time</th>
              <th>User</th>
              <th>Action</th>
              <th>Details</th>
              <th>IP</th>
            </tr>
          </thead>
          <tbody>
            ${this.data.map(r => `
              <tr>
                <td data-label="Time">${formatDateTime(r.created_at)}</td>
                <td data-label="User"><strong>${escapeHtml(r.username || r.user_id)}</strong><br><small>${escapeHtml(r.role || 'Unknown')}</small></td>
                <td data-label="Action"><span class="badge badge-info">${escapeHtml(r.action)}</span></td>
                <td data-label="Details">${escapeHtml(r.details)}</td>
                <td data-label="IP">${escapeHtml(r.ip_address || '—')}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
      ${this.data.length === 0 ? '<div class="empty-state"><p>No activity recorded yet.</p></div>' : ''}
    `;
  }
};
