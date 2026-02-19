/* ═══════════════════════════════════════════════════════════════
   MY COMPLAINTS (Student View)
   ═══════════════════════════════════════════════════════════════ */

const MyComplaints = {
  data: [],

  async render() {
    const el = App.getContentEl();
    el.innerHTML = '<div class="empty-state"><p>Loading complaints...</p></div>';

    try {
      this.data = await API.get('/api/complaints');
      this.renderView(el);
    } catch (err) {
      el.innerHTML = `<div class="empty-state"><div class="empty-icon">⚠️</div><p>${err.message}</p></div>`;
    }
  },

  renderView(el) {
    const rows = this.data;

    el.innerHTML = `
      <div class="actions-bar">
        <button class="btn btn-primary" onclick="MyComplaints.openForm()">➕ New Complaint</button>
      </div>

      <div class="table-wrapper">
        <table class="data-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Subject</th>
              <th>Category</th>
              <th>Status</th>
              <th>Priority</th>
            </tr>
          </thead>
          <tbody>
            ${rows.map(r => `
              <tr>
                <td data-label="Date">${formatDate(r.created_at)}</td>
                <td data-label="Subject"><strong>${escapeHtml(r.subject)}</strong><br><small>${escapeHtml(r.description)}</small></td>
                <td data-label="Category">${escapeHtml(r.category)}</td>
                <td data-label="Status">
                  <span class="badge ${r.status === 'Resolved' ? 'badge-success' : 'badge-warning'}">
                    ${r.status}
                  </span>
                </td>
                <td data-label="Priority">
                  <span class="badge ${r.priority === 'High' ? 'badge-danger' : r.priority === 'Medium' ? 'badge-warning' : 'badge-info'}">
                    ${r.priority}
                  </span>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
      ${rows.length === 0 ? '<div class="empty-state"><p>No complaints found.</p></div>' : ''}
    `;
  },

  openForm() {
    Modal.open('File Complaint', `
      <form id="complaint-form">
        <div class="form-group">
          <label>Category</label>
          <select id="cf-category">
            <option value="Maintenance">Maintenance (Plumbing, Electrical, etc.)</option>
            <option value="Food">Food / Mess</option>
            <option value="Cleanliness">Cleanliness</option>
            <option value="Other">Other</option>
          </select>
        </div>
        <div class="form-group">
          <label>Subject</label>
          <input type="text" id="cf-subject" required>
        </div>
        <div class="form-group">
          <label>Description</label>
          <textarea id="cf-desc" rows="3" required></textarea>
        </div>
        <div class="form-group">
          <label>Priority</label>
          <select id="cf-priority">
            <option value="Low">Low</option>
            <option value="Medium" selected>Medium</option>
            <option value="High">High</option>
          </select>
        </div>
        <button type="submit" class="btn btn-primary btn-block">Submit Complaint</button>
      </form>
    `);

    document.getElementById('complaint-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const payload = {
        category: document.getElementById('cf-category').value,
        subject: document.getElementById('cf-subject').value,
        description: document.getElementById('cf-desc').value,
        priority: document.getElementById('cf-priority').value
      };

      try {
        await API.post('/api/complaints', payload);
        showToast('Complaint filed successfully');
        Modal.close();
        this.render();
      } catch (err) {
        showToast(err.message, 'error');
      }
    });
  }
};
