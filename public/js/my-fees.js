/* ═══════════════════════════════════════════════════════════════
   MY FEES (Student View)
   ═══════════════════════════════════════════════════════════════ */

const MyFees = {
  data: [],

  async render() {
    const el = App.getContentEl();
    el.innerHTML = '<div class="empty-state"><p>Loading fee records...</p></div>';

    try {
      this.data = await API.get('/api/fees');
      this.renderView(el);
    } catch (err) {
      el.innerHTML = `<div class="empty-state"><div class="empty-icon">⚠️</div><p>${err.message}</p></div>`;
    }
  },

  renderView(el) {
    const rows = this.data;
    const pendingAmount = rows.filter(r => r.status !== 'Paid').reduce((sum, r) => sum + parseFloat(r.amount), 0);
    const paidAmount = rows.filter(r => r.status === 'Paid').reduce((sum, r) => sum + parseFloat(r.amount), 0);

    el.innerHTML = `
      <div class="summary-row">
        <div class="summary-item">Total Pending: <strong style="color:var(--text-accent)">$${pendingAmount.toFixed(2)}</strong></div>
        <div class="summary-item">Total Paid: <strong style="color:#34d399">$${paidAmount.toFixed(2)}</strong></div>
      </div>

      <div class="table-wrapper">
        <table class="data-table">
          <thead>
            <tr>
              <th>Month / Year</th>
              <th>Amount</th>
              <th>Due Date</th>
              <th>Status</th>
              <th>Paid Date</th>
            </tr>
          </thead>
          <tbody>
            ${rows.map(r => `
              <tr>
                <td data-label="Month / Year"><strong>${MONTHS[r.month]} ${r.year}</strong></td>
                <td data-label="Amount">$${parseFloat(r.amount).toFixed(2)}</td>
                <td data-label="Due Date">${formatDate(r.due_date)}</td>
                <td data-label="Status">
                  <span class="badge ${r.status === 'Paid' ? 'badge-success' : r.status === 'Overdue' ? 'badge-danger' : 'badge-warning'}">
                    ${r.status}
                  </span>
                </td>
                <td data-label="Paid Date">${formatDate(r.paid_date)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
      ${rows.length === 0 ? '<div class="empty-state"><p>No fee records found.</p></div>' : ''}
    `;
  }
};
