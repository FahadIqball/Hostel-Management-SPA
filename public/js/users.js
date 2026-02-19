/* ═══════════════════════════════════════════════════════════════
   USERS — Admin-only User Management
   ═══════════════════════════════════════════════════════════════ */

const Users = {
  data: [],

  async render() {
    const el = App.getContentEl();
    el.innerHTML = '<div class="empty-state"><p>Loading users...</p></div>';

    try {
      this.data = await API.get('/api/users');
      this.renderView(el);
    } catch (err) {
      el.innerHTML = `<div class="empty-state"><div class="empty-icon">⚠️</div><p>${err.message}</p></div>`;
    }
  },

  renderView(el) {
    const rows = this.data;
    const currentUser = JSON.parse(sessionStorage.getItem('user') || '{}');

    el.innerHTML = `
      <div class="page-toolbar">
        <div class="toolbar-left">
          <span style="font-size:0.9rem;color:var(--text-secondary)">${rows.length} user${rows.length !== 1 ? 's' : ''} registered</span>
        </div>
        <div class="toolbar-right">
          <button class="btn btn-primary" id="add-user-btn">+ Add User</button>
        </div>
      </div>
      <div class="table-wrapper">
        <table class="data-table">
          <thead>
            <tr>
              <th>Full Name</th>
              <th>Username</th>
              <th>Role</th>
              <th>Created</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${rows.map(u => `
              <tr>
                <td data-label="Full Name"><strong>${escapeHtml(u.full_name)}</strong></td>
                <td data-label="Username">${escapeHtml(u.username)}</td>
                <td data-label="Role"><span class="badge ${u.role === 'Admin' ? 'badge-info' : 'badge-warning'}">${u.role}</span></td>
                <td data-label="Created">${formatDate(u.created_at)}</td>
                <td class="actions-cell" data-label="Actions">
                  <button class="btn btn-sm btn-ghost" onclick="Users.editRole(${u.id})">✏️</button>
                  <button class="btn btn-sm btn-warning" onclick="Users.resetPassword(${u.id})">🔑</button>
                  ${u.id !== currentUser.id ? `<button class="btn btn-sm btn-danger btn-icon" onclick="Users.remove(${u.id})">🗑️</button>` : ''}
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;

    document.getElementById('add-user-btn').onclick = () => this.openAddForm();
  },

  openAddForm() {
    Modal.open('Add New User', `
      <form id="user-add-form">
        <div class="form-group">
          <label>Full Name</label>
          <input type="text" id="uf-fullname" placeholder="Full name" required>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>Username</label>
            <input type="text" id="uf-username" placeholder="Login username" required>
          </div>
          <div class="form-group">
            <label>Role</label>
            <select id="uf-role">
              <option value="Admin">Admin</option>
              <option value="Warden" selected>Warden</option>
            </select>
          </div>
        </div>
        <div class="form-group">
          <label>Password</label>
          <input type="password" id="uf-password" placeholder="Initial password" required>
        </div>
        <div class="modal-actions">
          <button type="button" class="btn btn-ghost" onclick="Modal.close()">Cancel</button>
          <button type="submit" class="btn btn-primary">Create User</button>
        </div>
      </form>
    `);

    document.getElementById('user-add-form').onsubmit = async (e) => {
      e.preventDefault();
      const data = {
        fullName: document.getElementById('uf-fullname').value.trim(),
        username: document.getElementById('uf-username').value.trim(),
        role: document.getElementById('uf-role').value,
        password: document.getElementById('uf-password').value,
      };
      try {
        await API.post('/api/register', data);
        showToast('User created successfully');
        Modal.close();
        this.render();
      } catch (err) {
        showToast(err.message, 'error');
      }
    };
  },

  editRole(id) {
    const u = this.data.find(x => x.id === id);
    if (!u) return;

    Modal.open('Edit User', `
      <form id="user-edit-form">
        <div class="form-group">
          <label>Full Name</label>
          <input type="text" id="ue-fullname" value="${escapeHtml(u.full_name)}" required>
        </div>
        <div class="form-group">
          <label>Role</label>
          <select id="ue-role">
            <option value="Admin" ${u.role === 'Admin' ? 'selected' : ''}>Admin</option>
            <option value="Warden" ${u.role === 'Warden' ? 'selected' : ''}>Warden</option>
          </select>
        </div>
        <div class="modal-actions">
          <button type="button" class="btn btn-ghost" onclick="Modal.close()">Cancel</button>
          <button type="submit" class="btn btn-primary">Save</button>
        </div>
      </form>
    `);

    document.getElementById('user-edit-form').onsubmit = async (e) => {
      e.preventDefault();
      try {
        await API.put(`/api/users/${id}`, {
          full_name: document.getElementById('ue-fullname').value.trim(),
          role: document.getElementById('ue-role').value,
        });
        showToast('User updated');
        Modal.close();
        this.render();
      } catch (err) {
        showToast(err.message, 'error');
      }
    };
  },

  resetPassword(id) {
    const u = this.data.find(x => x.id === id);
    if (!u) return;

    Modal.open('Reset Password — ' + u.full_name, `
      <form id="user-pw-form">
        <div class="form-group">
          <label>New Password</label>
          <input type="password" id="up-password" placeholder="Enter new password" required>
        </div>
        <div class="modal-actions">
          <button type="button" class="btn btn-ghost" onclick="Modal.close()">Cancel</button>
          <button type="submit" class="btn btn-primary">Reset Password</button>
        </div>
      </form>
    `);

    document.getElementById('user-pw-form').onsubmit = async (e) => {
      e.preventDefault();
      try {
        await API.put(`/api/users/${id}/reset-password`, {
          password: document.getElementById('up-password').value,
        });
        showToast('Password reset successfully');
        Modal.close();
      } catch (err) {
        showToast(err.message, 'error');
      }
    };
  },

  async remove(id) {
    App.confirm('Delete User', 'Delete this user? This action cannot be undone.', async () => {
      try {
        await API.delete(`/api/users/${id}`);
        showToast('User deleted');
        this.render();
      } catch (err) {
        showToast(err.message, 'error');
      }
    });
  }
};
window.Users = Users;
