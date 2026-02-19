/* ═══════════════════════════════════════════════════════════════
   APPROVAL QUEUE (Admin)
   ═══════════════════════════════════════════════════════════════ */

const Approvals = {
  data: [],

  async render() {
    const el = App.getContentEl();
    el.innerHTML = '<div class="empty-state"><p>Loading approvals...</p></div>';

    try {
      this.data = await API.get('/api/approvals');
      this.renderView(el);
    } catch (err) {
      el.innerHTML = `<div class="empty-state"><div class="empty-icon">⚠️</div><p>${err.message}</p></div>`;
    }
  },

  renderView(el) {
    const rows = this.data;

    el.innerHTML = `
      <div class="header-actions">
        <h2>Student Registration Requests</h2>
      </div>

      <div class="table-wrapper">
        <table class="data-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Name</th>
              <th>Roll Number</th>
              <th>Email / Contact</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${rows.map(r => `
              <tr>
                <td data-label="Date">${formatDate(r.created_at)}</td>
                <td data-label="Name"><strong>${escapeHtml(r.full_name)}</strong><br><small>@${escapeHtml(r.username)}</small></td>
                <td data-label="Roll Number">${escapeHtml(r.roll_number)}</td>
                <td data-label="Contact">${escapeHtml(r.email)}<br><small>${escapeHtml(r.contact)}</small></td>
                <td class="actions-cell" data-label="Actions">
                  <button class="btn btn-sm btn-success" onclick="Approvals.decide(${r.id}, 'Approved')">Approve</button>
                  <button class="btn btn-sm btn-danger" onclick="Approvals.decide(${r.id}, 'Rejected')">Reject</button>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
      ${rows.length === 0 ? '<div class="empty-state"><p>No pending approvals.</p></div>' : ''}
    `;
  },

  async decide(id, status) {
    const record = this.data.find(r => r.id === id);
    const name = record ? record.full_name : 'Unknown';

    App.confirm(`${status} Registration`, `Are you sure you want to ${status.toLowerCase()} registration for ${name}?`, async () => {
      try {
        await API.put(`/api/approvals/${id}`, { status });
        showToast(`User ${status}`);
        this.render();
      } catch (err) {
        showToast(err.message, 'error');
      }
    });
  }
};
window.Approvals = Approvals;
