/* ═══════════════════════════════════════════════════════════════
   DIGITAL LEAVING / CLEARANCE PROCESS
   ═══════════════════════════════════════════════════════════════ */

const ClearanceAdmin = {
  data: [],

  async render() {
    const el = App.getContentEl();
    el.innerHTML = '<div class="empty-state"><p>Loading clearance requests...</p></div>';

    try {
      this.data = await API.get('/api/clearance');
      this.renderView(el);
    } catch (err) {
      el.innerHTML = `<div class="empty-state"><div class="empty-icon">⚠️</div><p>${err.message}</p></div>`;
    }
  },

  renderView(el) {
    el.innerHTML = `
      <div class="table-wrapper">
        <table class="data-table">
          <thead>
            <tr>
              <th>Student</th>
              <th>Reason</th>
              <th>Leave Date</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${this.data.map(req => `
              <tr>
                <td><strong>${req.student_name}</strong><br><small>${req.roll_number}</small></td>
                <td>${req.reason || '—'}</td>
                <td>${formatDate(req.tentative_leave_date)}</td>
                <td><span class="badge ${this.getStatusBadge(req.status)}">${req.status.replace('_', ' ')}</span></td>
                <td class="actions-cell">
                  <button class="btn btn-sm btn-ghost" onclick="ClearanceAdmin.showModal(${req.id})">Review</button>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
      ${this.data.length === 0 ? '<div class="empty-state"><p>No clearance requests.</p></div>' : ''}
    `;
  },

  getStatusBadge(s) {
    if (s === 'Completed') return 'badge-success';
    if (s === 'Rejected') return 'badge-danger';
    if (s === 'Pending') return 'badge-warning';
    return 'badge-info';
  },

  async showModal(id) {
    const req = this.data.find(r => r.id === id);
    const content = `
      <div class="summary-row">
        <div class="summary-item">Student: <strong>${req.student_name}</strong></div>
        <div class="summary-item">Roll: <strong>${req.roll_number}</strong></div>
      </div>
      <p style="margin-bottom:1rem"><strong>Reason:</strong> ${req.reason || 'Not specified'}</p>
      
      <form id="clearance-review-form">
        <div class="form-group">
          <label>Update Status</label>
          <select name="status">
            <option value="Pending" ${req.status === 'Pending' ? 'selected' : ''}>Pending</option>
            <option value="Warden_Approved" ${req.status === 'Warden_Approved' ? 'selected' : ''}>Warden Approved</option>
            <option value="Fees_Cleared" ${req.status === 'Fees_Cleared' ? 'selected' : ''}>Fees Cleared</option>
            <option value="Completed" ${req.status === 'Completed' ? 'selected' : ''}>Completed (Student Checked Out)</option>
            <option value="Rejected" ${req.status === 'Rejected' ? 'selected' : ''}>Rejected</option>
          </select>
        </div>
        <div class="form-group">
          <label>Warden Remarks</label>
          <textarea name="warden_remarks" rows="2">${req.warden_remarks || ''}</textarea>
        </div>
        <div class="form-group">
          <label>Account/Fees Remarks</label>
          <textarea name="account_remarks" rows="2">${req.account_remarks || ''}</textarea>
        </div>
        <div style="display:flex; gap:1rem; margin-top:1rem;">
          <button type="submit" class="btn btn-primary" style="flex:1">Save Changes</button>
          <button type="button" class="btn btn-ghost" onclick="App.closeModal()" style="flex:1">Cancel</button>
        </div>
      </form>
    `;

    App.showModal('Review Clearance Request', content);

    document.getElementById('clearance-review-form').onsubmit = async (e) => {
      e.preventDefault();
      const data = Object.fromEntries(new FormData(e.target).entries());
      try {
        await API.put(`/api/clearance/${id}`, data);
        App.closeModal();
        showToast('Request updated');
        this.render();
      } catch (err) {
        showToast(err.message, 'error');
      }
    };
  }
};

const ClearanceStudent = {
  data: [],

  async render() {
    const el = App.getContentEl();
    el.innerHTML = '<div class="empty-state"><p>Loading my clearance status...</p></div>';

    try {
      this.data = await API.get('/api/clearance');
      this.renderView(el);
    } catch (err) {
      el.innerHTML = `<div class="empty-state"><div class="empty-icon">⚠️</div><p>${err.message}</p></div>`;
    }
  },

  renderView(el) {
    const activeReq = this.data[0]; // Most recent

    el.innerHTML = `
      <div class="dashboard-grid">
        <div class="card">
          <div class="card-header"><h3>Request to Vacate</h3></div>
          <div class="card-body">
            ${activeReq && activeReq.status !== 'Completed' && activeReq.status !== 'Rejected' ? `
              <div class="empty-state" style="padding:1rem">
                <div class="empty-icon">⏳</div>
                <p>You have a pending clearance request.</p>
                <div class="badge badge-info" style="margin-top:1rem; font-size:1rem; padding:0.5rem 1rem">
                  Status: ${activeReq.status.replace('_', ' ')}
                </div>
              </div>
              <div style="margin-top:1.5rem">
                <p><strong>Warden Remarks:</strong> ${activeReq.warden_remarks || 'Pending review...'}</p>
                <p><strong>Account Remarks:</strong> ${activeReq.account_remarks || 'Pending review...'}</p>
              </div>
            ` : `
              <form id="clearance-request-form">
                <div class="form-group">
                  <label>Tentative Leave Date</label>
                  <input type="date" name="tentative_leave_date" required min="${new Date().toISOString().split('T')[0]}">
                </div>
                <div class="form-group">
                  <label>Reason for Leaving</label>
                  <textarea name="reason" placeholder="Graduation, Transfer, Personal, etc." required></textarea>
                </div>
                <button type="submit" class="btn btn-primary btn-block">Submit Clearance Request</button>
              </form>
            `}
          </div>
        </div>

        <div class="card">
          <div class="card-header"><h3>Process Overview</h3></div>
          <div class="card-body">
            <ul style="padding-left:1.2rem; color:var(--text-secondary)">
              <li><strong>Step 1:</strong> Submit your request with a date and reason.</li>
              <li><strong>Step 2:</strong> Warden will inspect your room and furniture condition.</li>
              <li><strong>Step 3:</strong> Accounts department checks for any pending fees.</li>
              <li><strong>Step 4:</strong> Final approval and key return.</li>
            </ul>
          </div>
        </div>
      </div>

      ${this.data.length > 0 ? `
        <div class="card" style="margin-top:2rem">
          <div class="card-header"><h3>History</h3></div>
          <div class="card-body">
            <table class="data-table">
              <thead><tr><th>Date</th><th>Status</th><th>Remarks</th></tr></thead>
              <tbody>
                ${this.data.map(r => `
                  <tr>
                    <td>${formatDate(r.created_at)}</td>
                    <td><span class="badge ${ClearanceAdmin.getStatusBadge(r.status)}">${r.status}</span></td>
                    <td>${r.warden_remarks || '—'}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      ` : ''}
    `;

    const form = document.getElementById('clearance-request-form');
    if (form) {
      form.onsubmit = async (e) => {
        e.preventDefault();
        const data = Object.fromEntries(new FormData(e.target).entries());
        try {
          await API.post('/api/clearance', data);
          showToast('Request submitted successfully');
          this.render();
        } catch (err) {
          showToast(err.message, 'error');
        }
      };
    }
  }
};
window.ClearanceAdmin = ClearanceAdmin;
window.ClearanceStudent = ClearanceStudent;
