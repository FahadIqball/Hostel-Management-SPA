/* ═══════════════════════════════════════════════════════════════
   VISITORS — Check-in / Check-out Log
   ═══════════════════════════════════════════════════════════════ */

const Visitors = {
  data: [],

  async render() {
    const el = App.getContentEl();
    el.innerHTML = '<div class="empty-state"><p>Loading visitor log...</p></div>';

    try {
      this.data = await API.get('/api/visitors');
      this.renderView(el);
    } catch (err) {
      el.innerHTML = `<div class="empty-state"><div class="empty-icon">⚠️</div><p>${err.message}</p></div>`;
    }
  },

  renderView(el) {
    const rows = this.data;
    const activeCount = rows.filter(v => !v.check_out).length;

    el.innerHTML = `
      <div class="summary-row">
        <div class="summary-item">Total Visitors: <strong>${rows.length}</strong></div>
        <div class="summary-item">Currently Inside: <strong style="color:#818cf8">${activeCount}</strong></div>
      </div>
      <div class="page-header">
        <div class="search-container">
          <div class="search-input-wrapper has-icon">
            <input type="text" id="visitors-search" placeholder="Search by name, contact or student...">
          </div>
          <button class="btn btn-primary" id="add-visitor-btn">+ Check In Visitor</button>
        </div>
      </div>
      <div class="table-wrapper">
        <table class="data-table">
          <thead>
            <tr>
              <th>Visitor Name</th>
              <th>Contact</th>
              <th>Purpose</th>
              <th>Visiting Student</th>
              <th>Check-In</th>
              <th>Check-Out</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody id="visitors-tbody">
            ${rows.length === 0
        ? '<tr><td colspan="7"><div class="empty-state"><div class="empty-icon">🚪</div><p>No visitor records</p></div></td></tr>'
        : rows.map(v => `
                <tr>
                  <td data-label="Visitor Name"><strong>${escapeHtml(v.visitor_name)}</strong></td>
                  <td data-label="Contact">${escapeHtml(v.contact) || '—'}</td>
                  <td data-label="Purpose">${escapeHtml(v.purpose) || '—'}</td>
                  <td data-label="Visiting Student">${v.student_name ? escapeHtml(v.student_name) : '—'}</td>
                  <td data-label="Check-In">${formatDateTime(v.check_in)}</td>
                  <td data-label="Check-Out">${v.check_out ? formatDateTime(v.check_out) : '<span class="badge badge-info">Inside</span>'}</td>
                  <td class="actions-cell" data-label="Actions">
                    ${!v.check_out ? `<button class="btn btn-sm btn-warning" onclick="Visitors.checkout(${v.id})">⬅ Check Out</button>` : ''}
                    <button class="btn btn-sm btn-danger btn-icon" onclick="Visitors.remove(${v.id})">🗑️</button>
                  </td>
                </tr>
              `).join('')
      }
          </tbody>
        </table>
      </div>
    `;

    document.getElementById('add-visitor-btn').onclick = () => this.openForm();
    document.getElementById('visitors-search').addEventListener('input', (e) => {
      const q = e.target.value.toLowerCase();
      const filtered = this.data.filter(v =>
        v.visitor_name.toLowerCase().includes(q) ||
        (v.student_name && v.student_name.toLowerCase().includes(q)) ||
        (v.purpose && v.purpose.toLowerCase().includes(q))
      );
      const tbody = document.getElementById('visitors-tbody');
      if (filtered.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7"><div class="empty-state"><p>No matching visitors</p></div></td></tr>';
        return;
      }
      tbody.innerHTML = filtered.map(v => `
        <tr>
          <td data-label="Visitor Name"><strong>${escapeHtml(v.visitor_name)}</strong></td>
          <td data-label="Contact">${escapeHtml(v.contact) || '—'}</td>
          <td data-label="Purpose">${escapeHtml(v.purpose) || '—'}</td>
          <td data-label="Visiting Student">${v.student_name ? escapeHtml(v.student_name) : '—'}</td>
          <td data-label="Check-In">${formatDateTime(v.check_in)}</td>
          <td data-label="Check-Out">${v.check_out ? formatDateTime(v.check_out) : '<span class="badge badge-info">Inside</span>'}</td>
          <td class="actions-cell" data-label="Actions">
            ${!v.check_out ? `<button class="btn btn-sm btn-warning" onclick="Visitors.checkout(${v.id})">⬅ Check Out</button>` : ''}
            <button class="btn btn-sm btn-danger btn-icon" onclick="Visitors.remove(${v.id})">🗑️</button>
          </td>
        </tr>
      `).join('');
    });
  },

  async openForm() {
    let students = [];
    try { students = await API.get('/api/students/active'); } catch (e) { }

    Modal.open('Check In Visitor', `
      <form id="visitor-form">
        <div class="form-group">
          <label>Visitor Name</label>
          <input type="text" id="vf-name" placeholder="Full name" required>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>Contact Number</label>
            <input type="text" id="vf-contact" placeholder="Phone number">
          </div>
          <div class="form-group">
            <label>Visiting Student</label>
            <select id="vf-student">
              <option value="">— General Visit —</option>
              ${students.map(s => `<option value="${s.id}">${escapeHtml(s.name)} (${escapeHtml(s.roll_number)})</option>`).join('')}
            </select>
          </div>
        </div>
        <div class="form-group">
          <label>Purpose of Visit</label>
          <input type="text" id="vf-purpose" placeholder="e.g., Parent visit, Delivery, etc.">
        </div>
        <div class="modal-actions">
          <button type="button" class="btn btn-ghost" onclick="Modal.close()">Cancel</button>
          <button type="submit" class="btn btn-primary">Check In</button>
        </div>
      </form>
    `);

    document.getElementById('visitor-form').onsubmit = async (e) => {
      e.preventDefault();
      const data = {
        visitor_name: document.getElementById('vf-name').value.trim(),
        contact: document.getElementById('vf-contact').value.trim(),
        student_id: document.getElementById('vf-student').value || null,
        purpose: document.getElementById('vf-purpose').value.trim(),
      };

      try {
        await API.post('/api/visitors', data);
        showToast('Visitor checked in');
        Modal.close();
        this.render();
      } catch (err) {
        showToast(err.message, 'error');
      }
    };
  },

  async checkout(id) {
    try {
      await API.put(`/api/visitors/${id}/checkout`);
      showToast('Visitor checked out');
      this.render();
    } catch (err) {
      showToast(err.message, 'error');
    }
  },

  async remove(id) {
    App.confirm('Delete Visitor Record', 'Are you sure you want to delete this visitor record?', async () => {
      try {
        await API.delete(`/api/visitors/${id}`);
        showToast('Visitor record deleted');
        this.render();
      } catch (err) {
        showToast(err.message, 'error');
      }
    });
  }
};
window.Visitors = Visitors;
