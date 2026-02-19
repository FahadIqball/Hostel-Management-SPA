/* ═══════════════════════════════════════════════════════════════
   ROOMS — CRUD Management
   ═══════════════════════════════════════════════════════════════ */

const Rooms = {
  data: [],

  async render() {
    const el = App.getContentEl();
    el.innerHTML = '<div class="empty-state"><p>Loading rooms...</p></div>';

    try {
      this.data = await API.get('/api/rooms');
      this.renderTable(el);
    } catch (err) {
      el.innerHTML = `<div class="empty-state"><div class="empty-icon">⚠️</div><p>${err.message}</p></div>`;
    }
  },

  renderTable(el) {
    const rows = this.data;
    el.innerHTML = `
      <div class="page-header">
        <div class="search-container">
          <div class="search-input-wrapper has-icon">
            <input type="text" id="rooms-search" placeholder="Search by room number or type...">
          </div>
          <button class="btn btn-primary" id="add-room-btn">+ Add Room</button>
        </div>
      </div>
      <div class="table-wrapper">
    <table class="data-table">
      <thead>
        <tr>
          <th>Room #</th>
          <th>Floor</th>
          <th>Type</th>
          <th>Capacity</th>
          <th>Occupied</th>
          <th>Status</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody id="rooms-tbody">
        ${rows.length === 0
        ? '<tr><td colspan="7"><div class="empty-state"><div class="empty-icon">🏠</div><p>No rooms added yet</p></div></td></tr>'
        : rows.map(r => `
                <tr>
                  <td data-label="Room #"><strong>${escapeHtml(r.room_number)}</strong></td>
                  <td data-label="Floor">${r.floor}</td>
                  <td data-label="Type">${r.type}</td>
                  <td data-label="Capacity">${r.capacity}</td>
                  <td data-label="Occupied">${r.occupied} / ${r.capacity}</td>
                  <td data-label="Status"><span class="badge ${r.status === 'Available' ? 'badge-success' : r.status === 'Full' ? 'badge-danger' : 'badge-warning'}">${r.status}</span></td>
                  <td class="actions-cell" data-label="Actions">
                    <button class="btn btn-sm btn-ghost" onclick="Rooms.edit(${r.id})">✏️</button>
                    <button class="btn btn-sm btn-danger btn-icon" onclick="Rooms.remove(${r.id})">🗑️</button>
                  </td>
                </tr>
              `).join('')
      }
      </tbody>
    </table>
  </div>
`;

    document.getElementById('add-room-btn').onclick = () => this.openForm();
    document.getElementById('rooms-search').addEventListener('input', (e) => this.search(e.target.value));
  },

  search(query) {
    const q = query.toLowerCase();
    const filtered = this.data.filter(r =>
      r.room_number.toLowerCase().includes(q) ||
      r.type.toLowerCase().includes(q) ||
      r.status.toLowerCase().includes(q)
    );
    const tbody = document.getElementById('rooms-tbody');
    if (filtered.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7"><div class="empty-state"><p>No matching rooms</p></div></td></tr>';
      return;
    }
    tbody.innerHTML = filtered.map(r => `
  < tr >
        <td data-label="Room #"><strong>${escapeHtml(r.room_number)}</strong></td>
        <td data-label="Floor">${r.floor}</td>
        <td data-label="Type">${r.type}</td>
        <td data-label="Capacity">${r.capacity}</td>
        <td data-label="Occupied">${r.occupied} / ${r.capacity}</td>
        <td data-label="Status"><span class="badge ${r.status === 'Available' ? 'badge-success' : r.status === 'Full' ? 'badge-danger' : 'badge-warning'}">${r.status}</span></td>
        <td class="actions-cell" data-label="Actions">
          <button class="btn btn-sm btn-ghost" onclick="Rooms.edit(${r.id})">✏️</button>
          <button class="btn btn-sm btn-danger btn-icon" onclick="Rooms.remove(${r.id})">🗑️</button>
        </td>
      </tr >
  `).join('');
  },

  openForm(room = null) {
    const isEdit = !!room;
    Modal.open(isEdit ? 'Edit Room' : 'Add New Room', `
      <form id="room-form">
        <div class="form-row">
          <div class="form-group">
            <label>Room Number</label>
            <input type="text" id="rf-number" value="${room ? escapeHtml(room.room_number) : ''}" required>
          </div>
          <div class="form-group">
            <label>Floor</label>
            <input type="number" id="rf-floor" value="${room ? room.floor : 1}" min="0" required>
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>Type</label>
            <select id="rf-type">
              <option ${room && room.type === 'Single' ? 'selected' : ''}>Single</option>
              <option ${!room || room.type === 'Double' ? 'selected' : ''}>Double</option>
              <option ${room && room.type === 'Triple' ? 'selected' : ''}>Triple</option>
              <option ${room && room.type === 'Dormitory' ? 'selected' : ''}>Dormitory</option>
            </select>
          </div>
          <div class="form-group">
            <label>Capacity</label>
            <input type="number" id="rf-capacity" value="${room ? room.capacity : 2}" min="1" required>
          </div>
        </div>
        <div class="form-group">
          <label>Status</label>
          <select id="rf-status">
            <option ${!room || room.status === 'Available' ? 'selected' : ''}>Available</option>
            <option ${room && room.status === 'Full' ? 'selected' : ''}>Full</option>
            <option ${room && room.status === 'Maintenance' ? 'selected' : ''}>Maintenance</option>
          </select>
        </div>
        <div class="modal-actions">
          <button type="button" class="btn btn-ghost" onclick="Modal.close()">Cancel</button>
          <button type="submit" class="btn btn-primary">${isEdit ? 'Update' : 'Add Room'}</button>
        </div>
      </form>
    `);

    document.getElementById('room-form').onsubmit = async (e) => {
      e.preventDefault();
      const data = {
        room_number: document.getElementById('rf-number').value.trim(),
        floor: parseInt(document.getElementById('rf-floor').value),
        type: document.getElementById('rf-type').value,
        capacity: parseInt(document.getElementById('rf-capacity').value),
        status: document.getElementById('rf-status').value,
      };

      try {
        if (isEdit) {
          await API.put(`/api/rooms/${room.id}`, data);
          showToast('Room updated successfully');
        } else {
          await API.post('/api/rooms', data);
          showToast('Room added successfully');
        }
        Modal.close();
        this.render();
      } catch (err) {
        showToast(err.message, 'error');
      }
    };
  },

  edit(id) {
    const room = this.data.find(r => r.id === id);
    if (room) this.openForm(room);
  },

  async remove(id) {
    App.confirm('Delete Room', 'Delete this room? Students assigned to it will be unassigned.', async () => {
      try {
        await API.delete(`/api/rooms/${id}`);
        showToast('Room deleted');
        this.render();
      } catch (err) {
        showToast(err.message, 'error');
      }
    });
  }
};
window.Rooms = Rooms;
