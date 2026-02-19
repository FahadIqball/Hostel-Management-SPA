/* ═══════════════════════════════════════════════════════════════
   COMPLAINTS — Maintenance & Issues
   ═══════════════════════════════════════════════════════════════ */

const Complaints = {
  data: [],
  filter: 'All',

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

  getFiltered() {
    if (this.filter === 'All') return this.data;
    return this.data.filter(c => c.status === this.filter);
  },

  renderView(el) {
    const rows = this.getFiltered();
    el.innerHTML = `
      <div class="page-header">
        <div class="search-container">
          <div class="search-input-wrapper has-icon">
             <input type="text" id="complaints-search" placeholder="Search by student or subject...">
          </div>
          <button class="btn btn-primary" id="add-complaint-btn">+ File Complaint</button>
        </div>

        <div class="filter-chips">
          <div class="filter-chip ${this.filter === 'All' ? 'active' : ''}" onclick="Complaints.setFilter('All')">All (${this.data.length})</div>
          <div class="filter-chip ${this.filter === 'Open' ? 'active' : ''}" onclick="Complaints.setFilter('Open')">Open</div>
          <div class="filter-chip ${this.filter === 'In Progress' ? 'active' : ''}" onclick="Complaints.setFilter('In Progress')">In Progress</div>
          <div class="filter-chip ${this.filter === 'Resolved' ? 'active' : ''}" onclick="Complaints.setFilter('Resolved')">Resolved</div>
        </div>
      </div>
      <div class="table-wrapper">
        <table class="data-table">
          <thead>
            <tr>
              <th>Student</th>
              <th>Category</th>
              <th>Subject</th>
              <th>Priority</th>
              <th>Status</th>
              <th>Filed</th>
              <th>Resolved</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${rows.length === 0
        ? '<tr><td colspan="8"><div class="empty-state"><div class="empty-icon">📝</div><p>No complaints found</p></div></td></tr>'
        : rows.map(c => `
                <tr>
                  <td data-label="Student"><strong>${escapeHtml(c.student_name)}</strong></td>
                  <td data-label="Category"><span class="badge badge-info">${c.category}</span></td>
                  <td data-label="Subject">${escapeHtml(c.subject)}</td>
                  <td data-label="Priority"><span class="badge ${c.priority === 'Urgent' ? 'badge-danger' : c.priority === 'High' ? 'badge-warning' : c.priority === 'Medium' ? 'badge-info' : 'badge-default'}">${c.priority}</span></td>
                  <td data-label="Status"><span class="badge ${c.status === 'Resolved' ? 'badge-success' : c.status === 'In Progress' ? 'badge-warning' : 'badge-danger'}">${c.status}</span></td>
                  <td data-label="Filed">${formatDate(c.created_at)}</td>
                  <td data-label="Resolved">${c.resolved_at ? formatDate(c.resolved_at) : '—'}</td>
                  <td class="actions-cell" data-label="Actions">
                    ${c.status !== 'Resolved' ? `<button class="btn btn-sm btn-success" onclick="Complaints.resolve(${c.id})">✓ Resolve</button>` : ''}
                    <button class="btn btn-sm btn-ghost" onclick="Complaints.edit(${c.id})">✏️</button>
                    <button class="btn btn-sm btn-danger btn-icon" onclick="Complaints.remove(${c.id})">🗑️</button>
                  </td>
                </tr>
              `).join('')
      }
          </tbody>
        </table>
      </div>
    `;

    document.getElementById('add-complaint-btn').onclick = () => this.openForm();
  },

  setFilter(f) {
    this.filter = f;
    this.renderView(App.getContentEl());
  },

  async openForm(complaint = null) {
    const isEdit = !!complaint;
    let students = [];
    try { students = await API.get('/api/students/active'); } catch (e) { }

    Modal.open(isEdit ? 'Edit Complaint' : 'File a Complaint', `
      <form id="complaint-form">
        <div class="form-group">
          <label>Student</label>
          <select id="cf-student" required>
            <option value="">— Select Student —</option>
            ${students.map(s => `<option value="${s.id}" ${complaint && complaint.student_id === s.id ? 'selected' : ''}>${escapeHtml(s.name)} (${escapeHtml(s.roll_number)})</option>`).join('')}
          </select>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>Category</label>
            <select id="cf-category">
              <option ${complaint && complaint.category === 'Plumbing' ? 'selected' : ''}>Plumbing</option>
              <option ${complaint && complaint.category === 'Electrical' ? 'selected' : ''}>Electrical</option>
              <option ${complaint && complaint.category === 'Furniture' ? 'selected' : ''}>Furniture</option>
              <option ${complaint && complaint.category === 'Cleanliness' ? 'selected' : ''}>Cleanliness</option>
              <option ${!complaint || complaint.category === 'Other' ? 'selected' : ''}>Other</option>
            </select>
          </div>
          <div class="form-group">
            <label>Priority</label>
            <select id="cf-priority">
              <option ${complaint && complaint.priority === 'Low' ? 'selected' : ''}>Low</option>
              <option ${!complaint || complaint.priority === 'Medium' ? 'selected' : ''}>Medium</option>
              <option ${complaint && complaint.priority === 'High' ? 'selected' : ''}>High</option>
              <option ${complaint && complaint.priority === 'Urgent' ? 'selected' : ''}>Urgent</option>
            </select>
          </div>
        </div>
        <div class="form-group">
          <label>Subject</label>
          <input type="text" id="cf-subject" value="${complaint ? escapeHtml(complaint.subject) : ''}" required>
        </div>
        <div class="form-group">
          <label>Description</label>
          <textarea id="cf-desc">${complaint ? escapeHtml(complaint.description || '') : ''}</textarea>
        </div>
        ${isEdit ? `
          <div class="form-group">
            <label>Status</label>
            <select id="cf-status">
              <option ${complaint.status === 'Open' ? 'selected' : ''}>Open</option>
              <option ${complaint.status === 'In Progress' ? 'selected' : ''}>In Progress</option>
              <option ${complaint.status === 'Resolved' ? 'selected' : ''}>Resolved</option>
            </select>
          </div>
        ` : ''}
        <div class="modal-actions">
          <button type="button" class="btn btn-ghost" onclick="Modal.close()">Cancel</button>
          <button type="submit" class="btn btn-primary">${isEdit ? 'Update' : 'Submit'}</button>
        </div>
      </form>
    `);

    document.getElementById('complaint-form').onsubmit = async (e) => {
      e.preventDefault();
      const data = {
        student_id: parseInt(document.getElementById('cf-student').value),
        category: document.getElementById('cf-category').value,
        priority: document.getElementById('cf-priority').value,
        subject: document.getElementById('cf-subject').value.trim(),
        description: document.getElementById('cf-desc').value.trim(),
      };
      if (isEdit) data.status = document.getElementById('cf-status').value;

      try {
        if (isEdit) {
          await API.put(`/api/complaints/${complaint.id}`, data);
          showToast('Complaint updated');
        } else {
          await API.post('/api/complaints', data);
          showToast('Complaint filed');
        }
        Modal.close();
        this.render();
      } catch (err) {
        showToast(err.message, 'error');
      }
    };
  },

  edit(id) {
    const c = this.data.find(x => x.id === id);
    if (c) this.openForm(c);
  },

  async resolve(id) {
    try {
      await API.put(`/api/complaints/${id}/resolve`);
      showToast('Complaint resolved');
      this.render();
    } catch (err) {
      showToast(err.message, 'error');
    }
  },

  async remove(id) {
    App.confirm('Delete Complaint', 'Are you sure you want to delete this complaint?', async () => {
      try {
        await API.delete(`/api/complaints/${id}`);
        showToast('Complaint deleted');
        this.render();
      } catch (err) {
        showToast(err.message, 'error');
      }
    });
  }
};
window.Complaints = Complaints;
