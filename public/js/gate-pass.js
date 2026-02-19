/* ═══════════════════════════════════════════════════════════════
   GATE PASS SYSTEM
   ═══════════════════════════════════════════════════════════════ */

const GatePass = {
  data: [],
  isAdmin: false,

  async render() {
    this.isAdmin = false;
    await this.fetchData();
    this.renderView('student');
  },

  async renderAdmin() {
    this.isAdmin = true;
    await this.fetchData();
    this.renderView('admin');
  },

  async fetchData() {
    try {
      this.data = await API.get('/api/gate-passes');
    } catch (err) {
      this.data = [];
      showToast(err.message, 'error');
    }
  },

  renderView(viewType) {
    const el = App.getContentEl();
    const isStudent = viewType === 'student';

    let actions = '';
    if (isStudent) {
      actions = `<button class="btn btn-primary" onclick="GatePass.requestPass()">➕ Request Pass</button>`;
    }

    let rows = this.data.map(p => `
      <tr>
        <td data-label="Request Date">${formatDate(p.created_at)}</td>
        ${this.isAdmin ? `<td data-label="Student"><strong>${escapeHtml(p.student_name)}</strong><br><small>${escapeHtml(p.roll_number)} — ${p.room_number || 'No Room'}</small></td>` : ''}
        <td data-label="Destination"><strong>${escapeHtml(p.destination)}</strong><br><small>${escapeHtml(p.reason)}</small></td>
        <td data-label="Duration">${formatDateTime(p.from_date)}<br>to ${formatDateTime(p.to_date)}</td>
        <td data-label="Status">
          <span class="badge ${p.status === 'Approved' ? 'badge-success' : p.status === 'Rejected' ? 'badge-danger' : 'badge-warning'}">
            ${p.status}
          </span>
        </td>
        ${this.isAdmin ? `
          <td class="actions-cell" data-label="Actions">
            ${p.status === 'Pending' ? `
              <button class="btn btn-sm btn-success" onclick="GatePass.updateStatus(${p.id}, 'Approved')">Approve</button>
              <button class="btn btn-sm btn-danger" onclick="GatePass.updateStatus(${p.id}, 'Rejected')">Reject</button>
            ` : ''}
          </td>
        ` : ''}
      </tr>
    `).join('');

    el.innerHTML = `
      <div class="header-actions">
        <h2>${isStudent ? 'My Gate Passes' : 'Gate Pass Requests'}</h2>
        ${actions}
      </div>
      <div class="table-wrapper">
        <table class="data-table">
          <thead>
            <tr>
              <th>Request Date</th>
              ${this.isAdmin ? '<th>Student</th>' : ''}
              <th>Destination / Reason</th>
              <th>Duration</th>
              <th>Status</th>
              ${this.isAdmin ? '<th>Actions</th>' : ''}
            </tr>
          </thead>
          <tbody>
            ${rows.length ? rows : '<tr><td colspan="6" class="text-center">No gate passes formatted.</td></tr>'}
          </tbody>
        </table>
      </div>
    `;
  },

  requestPass() {
    Modal.open('Request Gate Pass', `
      <form id="pass-form">
        <div class="form-group">
          <label>Destination</label>
          <input type="text" id="gp-dest" required>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>From Date/Time</label>
            <input type="datetime-local" id="gp-from" required>
          </div>
          <div class="form-group">
            <label>To Date/Time</label>
            <input type="datetime-local" id="gp-to" required>
          </div>
        </div>
        <div class="form-group">
          <label>Reason</label>
          <textarea id="gp-reason" rows="3" required></textarea>
        </div>
        <button type="submit" class="btn btn-primary btn-block">Submit Request</button>
      </form>
    `);

    document.getElementById('pass-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const payload = {
        destination: document.getElementById('gp-dest').value,
        fromDate: document.getElementById('gp-from').value,
        toDate: document.getElementById('gp-to').value,
        reason: document.getElementById('gp-reason').value
      };

      try {
        await API.post('/api/gate-passes', payload);
        showToast('Gate pass requested');
        Modal.close();
        this.render();
      } catch (err) {
        showToast(err.message, 'error');
      }
    });
  },

  async updateStatus(id, status) {
    App.confirm('Update Status', `Mark request as ${status}?`, async () => {
      try {
        await API.put(`/api/gate-passes/${id}/status`, { status });
        showToast(`Request ${status}`);
        this.renderAdmin();
      } catch (err) {
        showToast(err.message, 'error');
      }
    });
  }
};
window.GatePass = GatePass;
