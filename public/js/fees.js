/* ═══════════════════════════════════════════════════════════════
   FEES — Payment Management
   ═══════════════════════════════════════════════════════════════ */

const Fees = {
  data: [],
  filter: 'All',

  async render() {
    const el = App.getContentEl();
    el.innerHTML = '<div class="empty-state"><p>Loading fees...</p></div>';

    try {
      this.data = await API.get('/api/fees');
      this.renderView(el);
    } catch (err) {
      el.innerHTML = `<div class="empty-state"><div class="empty-icon">⚠️</div><p>${err.message}</p></div>`;
    }
  },

  getFiltered() {
    if (this.filter === 'All') return this.data;
    return this.data.filter(f => f.status === this.filter);
  },

  renderView(el) {
    const rows = this.getFiltered();
    const totalCollected = this.data.filter(f => f.status === 'Paid').reduce((s, f) => s + Number(f.amount), 0);
    const totalPending = this.data.filter(f => f.status !== 'Paid').reduce((s, f) => s + Number(f.amount), 0);

    el.innerHTML = `
      <div class="summary-row">
        <div class="summary-item">Total Records: <strong>${this.data.length}</strong></div>
        <div class="summary-item">Collected: <strong style="color:#34d399">Rs. ${totalCollected.toLocaleString()}</strong></div>
        <div class="summary-item">Pending: <strong style="color:#f87171">Rs. ${totalPending.toLocaleString()}</strong></div>
      </div>
      <div class="page-header">
        <div class="search-container">
          <div class="search-input-wrapper has-icon">
             <input type="text" id="fees-search" placeholder="Search students or month...">
          </div>
          <button class="btn btn-primary" id="add-fee-btn">+ Add Fee</button>
        </div>

        <div class="filter-chips">
          ${['All', 'Paid', 'Unpaid', 'Overdue'].map(f => `
            <div class="filter-chip ${this.filter === f ? 'active' : ''}" onclick="Fees.setFilter('${f}')">${f}</div>
          `).join('')}
        </div>
      </div>
      <div class="table-wrapper">
        <table class="data-table">
          <thead>
            <tr>
              <th>Student</th>
              <th>Roll #</th>
              <th>Amount</th>
              <th>Month</th>
              <th>Due Date</th>
              <th>Status</th>
              <th>Paid Date</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${rows.length === 0
        ? '<tr><td colspan="8"><div class="empty-state"><div class="empty-icon">💰</div><p>No fee records found</p></div></td></tr>'
        : rows.map(f => `
                <tr>
                  <td data-label="Student"><strong>${escapeHtml(f.student_name)}</strong></td>
                  <td data-label="Roll #">${escapeHtml(f.roll_number)}</td>
                  <td data-label="Amount">Rs. ${Number(f.amount).toLocaleString()}</td>
                  <td data-label="Month">${MONTHS[f.month] || f.month} ${f.year}</td>
                  <td data-label="Due Date">${formatDate(f.due_date)}</td>
                  <td data-label="Status"><span class="badge ${f.status === 'Paid' ? 'badge-success' : f.status === 'Overdue' ? 'badge-danger' : 'badge-warning'}">${f.status}</span></td>
                  <td data-label="Paid Date">${f.paid_date ? formatDate(f.paid_date) : '—'}</td>
                  <td class="actions-cell" data-label="Actions">
                    ${f.status !== 'Paid' ? `<button class="btn btn-sm btn-success" onclick="Fees.markPaid(${f.id})">✓ Pay</button>` : ''}
                    <button class="btn btn-sm btn-ghost" onclick="Fees.edit(${f.id})">✏️</button>
                    <button class="btn btn-sm btn-danger btn-icon" onclick="Fees.remove(${f.id})">🗑️</button>
                  </td>
                </tr>
              `).join('')
      }
          </tbody>
        </table>
      </div>
    `;

    document.getElementById('add-fee-btn').onclick = () => this.openForm();
  },

  setFilter(f) {
    this.filter = f;
    this.renderView(App.getContentEl());
  },

  async openForm(fee = null) {
    const isEdit = !!fee;
    let students = [];
    try { students = await API.get('/api/students/active'); } catch (e) { }

    const now = new Date();
    Modal.open(isEdit ? 'Edit Fee Record' : 'Add Fee Record', `
      <form id="fee-form">
        <div class="form-group">
          <label>Student</label>
          <select id="ff-student" required>
            <option value="">— Select Student —</option>
            ${students.map(s => `<option value="${s.id}" ${fee && fee.student_id === s.id ? 'selected' : ''}>${escapeHtml(s.name)} (${escapeHtml(s.roll_number)})</option>`).join('')}
          </select>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>Amount (Rs.)</label>
            <input type="number" id="ff-amount" value="${fee ? fee.amount : '5000'}" min="0" step="100" required>
          </div>
          <div class="form-group">
            <label>Due Date</label>
            <input type="date" id="ff-due" value="${fee && fee.due_date ? fee.due_date.split('T')[0] : ''}">
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>Month</label>
            <select id="ff-month">
              ${[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(m => `<option value="${m}" ${fee ? (fee.month === m ? 'selected' : '') : (m === now.getMonth() + 1 ? 'selected' : '')}>${MONTHS[m]}</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label>Year</label>
            <input type="number" id="ff-year" value="${fee ? fee.year : now.getFullYear()}" required>
          </div>
        </div>
        <div class="form-group">
          <label>Status</label>
          <select id="ff-status">
            <option ${!fee || fee.status === 'Unpaid' ? 'selected' : ''}>Unpaid</option>
            <option ${fee && fee.status === 'Paid' ? 'selected' : ''}>Paid</option>
            <option ${fee && fee.status === 'Overdue' ? 'selected' : ''}>Overdue</option>
          </select>
        </div>
        <div class="modal-actions">
          <button type="button" class="btn btn-ghost" onclick="Modal.close()">Cancel</button>
          <button type="submit" class="btn btn-primary">${isEdit ? 'Update' : 'Add Record'}</button>
        </div>
      </form>
    `);

    document.getElementById('fee-form').onsubmit = async (e) => {
      e.preventDefault();
      const data = {
        student_id: parseInt(document.getElementById('ff-student').value),
        amount: parseFloat(document.getElementById('ff-amount').value),
        month: parseInt(document.getElementById('ff-month').value),
        year: parseInt(document.getElementById('ff-year').value),
        due_date: document.getElementById('ff-due').value || null,
        status: document.getElementById('ff-status').value,
      };

      try {
        if (isEdit) {
          await API.put(`/api/fees/${fee.id}`, data);
          showToast('Fee record updated');
        } else {
          await API.post('/api/fees', data);
          showToast('Fee record added');
        }
        Modal.close();
        this.render();
      } catch (err) {
        showToast(err.message, 'error');
      }
    };
  },

  edit(id) {
    const fee = this.data.find(f => f.id === id);
    if (fee) this.openForm(fee);
  },

  async markPaid(id) {
    try {
      await API.put(`/api/fees/${id}/pay`);
      showToast('Fee marked as paid');
      this.render();
    } catch (err) {
      showToast(err.message, 'error');
    }
  },

  async remove(id) {
    App.confirm('Delete Fee Record', 'Are you sure you want to delete this fee record?', async () => {
      try {
        await API.delete(`/api/fees/${id}`);
        showToast('Fee record deleted');
        this.render();
      } catch (err) {
        showToast(err.message, 'error');
      }
    });
  }
};
window.Fees = Fees;
