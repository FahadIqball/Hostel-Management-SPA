/* ═══════════════════════════════════════════════════════════════
   STUDENTS — CRUD Management
   ═══════════════════════════════════════════════════════════════ */

const Students = {
  data: [],
  filterStatus: 'All',

  async render() {
    const el = App.getContentEl();
    el.innerHTML = '<div class="empty-state"><p>Loading students...</p></div>';

    try {
      this.data = await API.get('/api/students');
      this.renderTable(el);
    } catch (err) {
      el.innerHTML = `<div class="empty-state"><div class="empty-icon">⚠️</div><p>${err.message}</p></div>`;
    }
  },

  getFiltered() {
    if (this.filterStatus === 'All') return this.data;
    return this.data.filter(s => s.status === this.filterStatus);
  },

  renderTable(el) {
    const rows = this.getFiltered();
    el.innerHTML = `
      <div class="page-header">
        <div class="search-container">
          <div class="search-input-wrapper has-icon">
            <input type="text" id="students-search" placeholder="Search by name or roll number...">
          </div>
          <button class="btn btn-primary" id="add-student-btn">+ Add Student</button>
        </div>

        <div class="filter-chips">
          ${['All', 'Active', 'Checked-Out', 'Suspended'].map(f => `
            <div class="filter-chip ${this.filterStatus === f ? 'active' : ''}" onclick="Students.setFilter('${f}')">${f}</div>
          `).join('')}
        </div>
      </div>
      <div class="table-wrapper">
        <table class="data-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Roll #</th>
              <th>Contact</th>
              <th>Email</th>
              <th>Room</th>
              <th>Check-in</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody id="students-tbody">
            ${rows.length === 0
        ? '<tr><td colspan="8"><div class="empty-state"><div class="empty-icon">👨‍🎓</div><p>No students found</p></div></td></tr>'
        : rows.map(s => `
                <tr>
                  <td data-label="Name"><strong>${escapeHtml(s.name)}</strong></td>
                  <td data-label="Roll #">${escapeHtml(s.roll_number)}</td>
                  <td data-label="Contact">${escapeHtml(s.contact) || '—'}</td>
                  <td data-label="Email">${escapeHtml(s.email) || '—'}</td>
                  <td data-label="Room">${s.room_number ? '<span class="badge badge-info">' + escapeHtml(s.room_number) + '</span>' : '<span class="badge badge-default">Unassigned</span>'}</td>
                  <td data-label="Check-in">${formatDate(s.check_in_date)}</td>
                  <td data-label="Status"><span class="badge ${s.status === 'Active' ? 'badge-success' : s.status === 'Suspended' ? 'badge-danger' : 'badge-default'}">${s.status}</span></td>
                  <td class="actions-cell" data-label="Actions">
                    <button class="btn btn-sm btn-ghost" onclick="Students.edit(${s.id})">✏️</button>
                    <button class="btn btn-sm btn-danger btn-icon" onclick="Students.remove(${s.id})">🗑️</button>
                  </td>
                </tr>
              `).join('')
      }
          </tbody>
        </table>
      </div>
    `;

    document.getElementById('add-student-btn').onclick = () => this.openForm();
    document.getElementById('students-search').addEventListener('input', (e) => this.search(e.target.value));
  },

  setFilter(status) {
    this.filterStatus = status;
    this.renderTable(App.getContentEl());
  },

  search(query) {
    const q = query.toLowerCase();
    const filtered = this.getFiltered().filter(s =>
      s.name.toLowerCase().includes(q) ||
      s.roll_number.toLowerCase().includes(q) ||
      (s.room_number && s.room_number.toLowerCase().includes(q))
    );
    const tbody = document.getElementById('students-tbody');
    if (filtered.length === 0) {
      tbody.innerHTML = '<tr><td colspan="8"><div class="empty-state"><p>No matching students</p></div></td></tr>';
      return;
    }
    tbody.innerHTML = filtered.map(s => `
      <tr>
        <td data-label="Name"><strong>${escapeHtml(s.name)}</strong></td>
        <td data-label="Roll #">${escapeHtml(s.roll_number)}</td>
        <td data-label="Contact">${escapeHtml(s.contact) || '—'}</td>
        <td data-label="Email">${escapeHtml(s.email) || '—'}</td>
        <td data-label="Room">${s.room_number ? '<span class="badge badge-info">' + escapeHtml(s.room_number) + '</span>' : '<span class="badge badge-default">Unassigned</span>'}</td>
        <td data-label="Check-in">${formatDate(s.check_in_date)}</td>
        <td data-label="Status"><span class="badge ${s.status === 'Active' ? 'badge-success' : s.status === 'Suspended' ? 'badge-danger' : 'badge-default'}">${s.status}</span></td>
        <td class="actions-cell" data-label="Actions">
          <button class="btn btn-sm btn-ghost" onclick="Students.edit(${s.id})">✏️</button>
          <button class="btn btn-sm btn-danger btn-icon" onclick="Students.remove(${s.id})">🗑️</button>
        </td>
      </tr>
    `).join('');
  },

  async openForm(student = null) {
    const isEdit = !!student;
    let rooms = [];
    try { rooms = await API.get('/api/rooms/available'); } catch (e) { }
    // If editing and the student already has a room, include it in options
    if (isEdit && student.room_id) {
      const alreadyIn = rooms.find(r => r.id === student.room_id);
      if (!alreadyIn) {
        rooms.unshift({ id: student.room_id, room_number: student.room_number, capacity: 0, occupied: 0 });
      }
    }

    Modal.open(isEdit ? 'Edit Student' : 'Add New Student', `
      <form id="student-form">
        <div class="form-group">
          <label>Full Name</label>
          <input type="text" id="sf-name" value="${student ? escapeHtml(student.name) : ''}" required>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>Roll Number / ID</label>
            <input type="text" id="sf-roll" value="${student ? escapeHtml(student.roll_number) : ''}" required>
          </div>
          <div class="form-group">
            <label>Contact</label>
            <input type="text" id="sf-contact" value="${student ? escapeHtml(student.contact || '') : ''}">
          </div>
        </div>
        <div class="form-group">
          <label>Email</label>
          <input type="email" id="sf-email" value="${student ? escapeHtml(student.email || '') : ''}">
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>Room Assignment</label>
            <select id="sf-room">
              <option value="">— Unassigned —</option>
              ${rooms.map(r => `<option value="${r.id}" ${student && student.room_id === r.id ? 'selected' : ''}>${escapeHtml(r.room_number)} (${r.occupied}/${r.capacity})</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label>Check-in Date</label>
            <input type="date" id="sf-checkin" value="${student && student.check_in_date ? student.check_in_date.split('T')[0] : new Date().toISOString().split('T')[0]}">
          </div>
        </div>
        <div class="form-group">
          <label>Status</label>
          <select id="sf-status">
            <option ${!student || student.status === 'Active' ? 'selected' : ''}>Active</option>
            <option ${student && student.status === 'Checked-Out' ? 'selected' : ''}>Checked-Out</option>
            <option ${student && student.status === 'Suspended' ? 'selected' : ''}>Suspended</option>
          </select>
        </div>
        <div class="modal-actions">
          <button type="button" class="btn btn-ghost" onclick="Modal.close()">Cancel</button>
          <button type="submit" class="btn btn-primary">${isEdit ? 'Update' : 'Add Student'}</button>
        </div>
      </form>
    `);

    document.getElementById('student-form').onsubmit = async (e) => {
      e.preventDefault();
      const data = {
        name: document.getElementById('sf-name').value.trim(),
        roll_number: document.getElementById('sf-roll').value.trim(),
        contact: document.getElementById('sf-contact').value.trim(),
        email: document.getElementById('sf-email').value.trim(),
        room_id: document.getElementById('sf-room').value || null,
        check_in_date: document.getElementById('sf-checkin').value,
        status: document.getElementById('sf-status').value,
      };

      try {
        if (isEdit) {
          await API.put(`/api/students/${student.id}`, data);
          showToast('Student updated');
        } else {
          await API.post('/api/students', data);
          showToast('Student added');
        }
        Modal.close();
        this.render();
      } catch (err) {
        showToast(err.message, 'error');
      }
    };
  },

  edit(id) {
    const student = this.data.find(s => s.id === id);
    if (student) this.openForm(student);
  },

  async remove(id) {
    App.confirm('Delete Student', 'Delete this student? All associated fees, complaints, and attendance records will also be deleted.', async () => {
      try {
        await API.delete(`/api/students/${id}`);
        showToast('Student deleted');
        this.render();
      } catch (err) {
        showToast(err.message, 'error');
      }
    });
  }
};
window.Students = Students;
