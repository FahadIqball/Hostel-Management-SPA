/* ═══════════════════════════════════════════════════════════════
   ROOM TRANSFER REQUESTS
   ═══════════════════════════════════════════════════════════════ */

const RoomTransfers = {
  data: [],
  isAdmin: false,

  async render() {
    this.isAdmin = false;
    await this.fetchData();
    this.renderView();
  },

  async renderAdmin() {
    this.isAdmin = true;
    await this.fetchData();
    this.renderView();
  },

  async fetchData() {
    try {
      this.data = await API.get('/api/room-transfers');
    } catch (err) {
      showToast(err.message, 'error');
    }
  },

  renderView() {
    const el = App.getContentEl();
    const rows = this.data;

    let actions = '';
    if (!this.isAdmin) {
      actions = `<button class="btn btn-primary" onclick="RoomTransfers.requestTransfer()">➕ Request Transfer</button>`;
    }

    el.innerHTML = `
      <div class="header-actions">
        <h2>${this.isAdmin ? 'Transfer Requests' : 'My Transfer Requests'}</h2>
        ${actions}
      </div>
      <div class="table-wrapper">
        <table class="data-table">
          <thead>
            <tr>
              <th>Date</th>
              ${this.isAdmin ? '<th>Student</th>' : ''}
              <th>Current Room</th>
              <th>Requested Room</th>
              <th>Reason</th>
              <th>Status</th>
              ${this.isAdmin ? '<th>Actions</th>' : ''}
            </tr>
          </thead>
          <tbody>
            ${rows.map(r => `
              <tr>
                <td data-label="Date">${formatDate(r.created_at)}</td>
                ${this.isAdmin ? `<td data-label="Student"><strong>${escapeHtml(r.student_name)}</strong><br><small>${escapeHtml(r.roll_number)}</small></td>` : ''}
                <td data-label="Current">${escapeHtml(r.current_room || '—')}</td>
                <td data-label="Requested">${escapeHtml(r.requested_room || '—')}</td>
                <td data-label="Reason"><small>${escapeHtml(r.reason)}</small></td>
                <td data-label="Status">
                  <span class="badge ${r.status === 'Approved' ? 'badge-success' : r.status === 'Rejected' ? 'badge-danger' : 'badge-warning'}">
                    ${r.status}
                  </span>
                </td>
                ${this.isAdmin ? `
                  <td class="actions-cell" data-label="Actions">
                    ${r.status === 'Pending' ? `
                      <button class="btn btn-sm btn-success" onclick="RoomTransfers.updateStatus(${r.id}, 'Approved')">Approve</button>
                      <button class="btn btn-sm btn-danger" onclick="RoomTransfers.updateStatus(${r.id}, 'Rejected')">Reject</button>
                    ` : ''}
                  </td>
                ` : ''}
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  },

  requestTransfer() {
    // Need list of available rooms? Or just input ID?
    // Ideally user selects from available rooms.
    // For MVP, user enters room number or ID.
    // Let's assume Room ID input for now or fetch rooms.
    // Fetching rooms is better.
    this.showRequestForm();
  },

  async showRequestForm() {
    try {
      // We need current room of student. Profile API has it.
      const profile = await API.get('/api/student-profile');
      // We need available rooms.
      const rooms = await API.get('/api/rooms/available');

      Modal.open('Request Room Transfer', `
        <form id="rt-form">
          <div class="form-group">
            <label>Current Room</label>
            <input type="text" value="${profile.room_number || 'None'}" disabled>
            <input type="hidden" id="rt-current" value="${profile.room_id || ''}">
          </div>
          <div class="form-group">
            <label>Requested Room</label>
            <select id="rt-requested" required>
              <option value="">Select Room</option>
              ${rooms.map(r => `<option value="${r.id}">${r.room_number} (${r.type})</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label>Reason</label>
            <textarea id="rt-reason" rows="3" required></textarea>
          </div>
          <button type="submit" class="btn btn-primary btn-block">Submit Request</button>
        </form>
      `);

      document.getElementById('rt-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const payload = {
          currentRoomId: document.getElementById('rt-current').value,
          requestedRoomId: document.getElementById('rt-requested').value,
          reason: document.getElementById('rt-reason').value
        };
        try {
          await API.post('/api/room-transfers', payload);
          showToast('Transfer request submitted');
          Modal.close();
          this.render();
        } catch (err) {
          showToast(err.message, 'error');
        }
      });

    } catch (err) {
      showToast(err.message, 'error');
    }
  },

  async updateStatus(id, status) {
    App.confirm('Update Status', `Mark request as ${status}?`, async () => {
      try {
        await API.put(`/api/room-transfers/${id}/status`, { status });
        showToast(`Request ${status}`);
        this.renderAdmin();
      } catch (err) {
        showToast(err.message, 'error');
      }
    });
  }
};
window.RoomTransfers = RoomTransfers;
