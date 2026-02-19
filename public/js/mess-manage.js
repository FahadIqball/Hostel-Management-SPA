/* ═══════════════════════════════════════════════════════════════
   ADVANCED MESS MANAGEMENT (Attendance & Billing)
   ═══════════════════════════════════════════════════════════════ */

const MessManage = {
  data: [],
  currentDate: new Date().toISOString().split('T')[0],

  async render() {
    const el = App.getContentEl();
    el.innerHTML = '<div class="empty-state"><p>Loading mess management...</p></div>';

    try {
      this.students = await API.get('/api/students/active');
      this.attendance = await API.get(`/api/mess/attendance?date=${this.currentDate}`);
      this.bills = await API.get('/api/mess/bills');
      this.renderView(el);
    } catch (err) {
      el.innerHTML = `<div class="empty-state"><div class="empty-icon">⚠️</div><p>${err.message}</p></div>`;
    }
  },

  renderView(el) {
    el.innerHTML = `
      <div class="page-header">
        <div class="search-container">
          <input type="date" value="${this.currentDate}" onchange="MessManage.changeDate(this.value)" class="form-select-sm" style="height:48px; border-radius:var(--radius-lg);">
          <button class="btn btn-primary" onclick="MessManage.generateBills()">Generate Monthly Bills</button>
        </div>
      </div>

      <div class="dashboard-grid">
        <div class="card">
          <div class="card-header">
            <h3>Daily Attendance — ${formatDate(this.currentDate)}</h3>
            <button class="btn btn-sm btn-success" onclick="MessManage.saveAttendance()">Save Attendance</button>
          </div>
          <div class="card-body" style="padding:0">
            <div class="table-wrapper" style="border:none; border-radius:0">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>Student</th>
                    <th>Breakfast</th>
                    <th>Lunch</th>
                    <th>Dinner</th>
                  </tr>
                </thead>
                <tbody id="attendance-body">
                  ${this.students.map(s => {
      const meals = ['Breakfast', 'Lunch', 'Dinner'].map(type => {
        const record = this.attendance.find(a => a.student_id === s.id && a.meal_type === type);
        const status = record ? record.status : 'Present';
        return `
                        <td>
                          <select data-stu="${s.id}" data-type="${type}" class="form-select-sm">
                            <option value="Present" ${status === 'Present' ? 'selected' : ''}>P</option>
                            <option value="Absent" ${status === 'Absent' ? 'selected' : ''}>A</option>
                          </select>
                        </td>
                      `;
      }).join('');
      return `<tr><td><strong>${s.name}</strong><br><small>${s.roll_number}</small></td>${meals}</tr>`;
    }).join('')}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div class="card">
          <div class="card-header">
            <h3>Recent Mess Bills</h3>
          </div>
          <div class="card-body" style="padding:0">
            <div class="table-wrapper" style="border:none; border-radius:0">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>Student</th>
                    <th>Month</th>
                    <th>Amount</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  ${this.bills.slice(0, 10).map(b => `
                    <tr>
                      <td>${b.student_name}</td>
                      <td>${MONTHS[b.month]} ${b.year}</td>
                      <td>$${b.amount}</td>
                      <td><span class="badge ${b.status === 'Paid' ? 'badge-success' : 'badge-danger'}">${b.status}</span></td>
                      <td>
                        ${b.status === 'Unpaid' ? `<button class="btn btn-sm btn-ghost" onclick="MessManage.markBillPaid(${b.id})">Mark Paid</button>` : '—'}
                      </td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
            ${this.bills.length === 0 ? '<div class="empty-state"><p>No bills generated yet.</p></div>' : ''}
          </div>
        </div>
      </div>
    `;
  },

  async changeDate(date) {
    this.currentDate = date;
    this.render();
  },

  async saveAttendance() {
    const selects = document.querySelectorAll('#attendance-body select');
    const records = Array.from(selects).map(sel => ({
      student_id: sel.dataset.stu,
      meal_type: sel.dataset.type,
      status: sel.value
    }));

    try {
      await API.post('/api/mess/attendance/bulk', { date: this.currentDate, records });
      showToast('Attendance saved');
      this.render();
    } catch (err) {
      showToast(err.message, 'error');
    }
  },

  async generateBills() {
    const content = `
      <form id="gen-bills-form">
        <div class="form-row">
          <div class="form-group">
            <label>Month (1-12)</label>
            <input type="number" name="month" value="${new Date().getMonth() + 1}" min="1" max="12" required>
          </div>
          <div class="form-group">
            <label>Year</label>
            <input type="number" name="year" value="${new Date().getFullYear()}" required>
          </div>
        </div>
        <div class="form-group">
          <label>Daily Mess Rate (Total for 3 meals)</label>
          <input type="number" name="dailyRate" value="300" required>
        </div>
        <div style="display:flex; gap:1rem; margin-top:1.5rem">
          <button type="submit" class="btn btn-primary" style="flex:1">Generate Now</button>
          <button type="button" class="btn btn-ghost" onclick="App.closeModal()" style="flex:1">Cancel</button>
        </div>
      </form>
    `;

    App.showModal('Generate Mess Bills', content);

    document.getElementById('gen-bills-form').onsubmit = async (e) => {
      e.preventDefault();
      const formData = new FormData(e.target);
      const data = Object.fromEntries(formData.entries());

      try {
        const res = await API.post('/api/mess/bills/generate', data);
        App.closeModal();
        showToast(res.message);
        this.render();
      } catch (err) {
        showToast(err.message, 'error');
      }
    };
  },

  async markBillPaid(id) {
    App.confirm('Mark Paid', 'Mark this bill as paid?', async () => {
      try {
        await API.put(`/api/mess/bills/${id}/pay`);
        showToast('Bill updated');
        this.render();
      } catch (err) {
        showToast(err.message, 'error');
      }
    });
  }
};

const MyMess = {
  async render() {
    const el = App.getContentEl();
    el.innerHTML = '<div class="empty-state"><p>Loading my mess records...</p></div>';

    try {
      this.attendance = await API.get('/api/mess/attendance');
      this.bills = await API.get('/api/mess/bills');
      this.renderView(el);
    } catch (err) {
      el.innerHTML = `<div class="empty-state"><div class="empty-icon">⚠️</div><p>${err.message}</p></div>`;
    }
  },

  renderView(el) {
    el.innerHTML = `
      <div class="dashboard-grid">
        <div class="card">
          <div class="card-header"><h3>My Mess Bills</h3></div>
          <div class="card-body">
            <div class="table-wrapper">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>Month / Year</th>
                    <th>Amount</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  ${this.bills.map(b => `
                    <tr>
                      <td>${MONTHS[b.month]} ${b.year}</td>
                      <td>$${b.amount}</td>
                      <td><span class="badge ${b.status === 'Paid' ? 'badge-success' : 'badge-danger'}">${b.status}</span></td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
            ${this.bills.length === 0 ? '<div class="empty-state"><p>No bills found.</p></div>' : ''}
          </div>
        </div>

        <div class="card">
          <div class="card-header"><h3>Recent Attendance</h3></div>
          <div class="card-body">
            <div class="table-wrapper">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Meal</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  ${this.attendance.slice(0, 15).map(a => `
                    <tr>
                      <td>${formatDate(a.date)}</td>
                      <td>${a.meal_type}</td>
                      <td><span class="badge ${a.status === 'Present' ? 'badge-success' : 'badge-danger'}">${a.status}</span></td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    `;
  }
};
window.MessManage = MessManage;
window.MyMess = MyMess;
