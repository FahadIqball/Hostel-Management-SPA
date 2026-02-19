/* ═══════════════════════════════════════════════════════════════
   INVENTORY & ASSET MANAGEMENT
   ═══════════════════════════════════════════════════════════════ */

const Inventory = {
  data: [],
  filter: 'All',

  async render() {
    const el = App.getContentEl();
    el.innerHTML = '<div class="empty-state"><p>Loading inventory...</p></div>';

    try {
      this.data = await API.get('/api/inventory');
      this.renderView(el);
    } catch (err) {
      el.innerHTML = `<div class="empty-state"><div class="empty-icon">⚠️</div><p>${err.message}</p></div>`;
    }
  },

  renderView(el) {
    const user = JSON.parse(sessionStorage.getItem('user') || '{}');
    const isAdmin = user.role === 'Admin' || user.role === 'Warden';
    const filtered = this.filter === 'All' ? this.data : this.data.filter(i => i.type === this.filter);

    el.innerHTML = `
      <div class="page-header">
        <div class="search-container">
          <div class="filter-chips">
            ${['All', 'Furniture', 'Asset', 'Consumable'].map(f => `
              <div class="filter-chip ${this.filter === f ? 'active' : ''}" onclick="Inventory.setFilter('${f}')">${f}</div>
            `).join('')}
          </div>
          ${isAdmin ? `<button class="btn btn-primary" onclick="Inventory.showModal()">+ Add Item</button>` : ''}
        </div>
      </div>

      <div class="table-wrapper">
        <table class="data-table">
          <thead>
            <tr>
              <th>Item Name</th>
              <th>Type</th>
              <th>Location / Room</th>
              <th>Condition</th>
              <th>Qty</th>
              ${isAdmin ? '<th>Actions</th>' : ''}
            </tr>
          </thead>
          <tbody>
            ${filtered.map(item => `
              <tr>
                <td data-label="Item Name"><strong>${item.name}</strong></td>
                <td data-label="Type"><span class="badge badge-info">${item.type}</span></td>
                <td data-label="Location">${item.room_number ? 'Room ' + item.room_number : 'General'}</td>
                <td data-label="Condition">
                  <span class="badge ${this.getConditionBadge(item.item_condition)}">${item.item_condition}</span>
                </td>
                <td data-label="Qty">${item.quantity}</td>
                ${isAdmin ? `
                  <td class="actions-cell">
                    <button class="btn btn-sm btn-ghost" onclick="Inventory.showModal(${item.id})">Edit</button>
                    <button class="btn btn-sm btn-danger" onclick="Inventory.deleteItem(${item.id})">Delete</button>
                  </td>
                ` : ''}
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
      ${filtered.length === 0 ? '<div class="empty-state"><p>No items found.</p></div>' : ''}
    `;
  },

  getConditionBadge(c) {
    if (c === 'New' || c === 'Good') return 'badge-success';
    if (c === 'Fair') return 'badge-warning';
    return 'badge-danger';
  },

  setFilter(f) {
    this.filter = f;
    this.render();
  },

  async showModal(id = null) {
    const item = id ? this.data.find(i => i.id === id) : { name: '', type: 'Furniture', room_id: null, item_condition: 'Good', quantity: 1 };
    const rooms = await API.get('/api/rooms');

    const content = `
      <form id="inventory-form">
        <div class="form-group">
          <label>Item Name</label>
          <input type="text" name="name" value="${item.name}" required>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>Type</label>
            <select name="type">
              <option value="Furniture" ${item.type === 'Furniture' ? 'selected' : ''}>Furniture</option>
              <option value="Asset" ${item.type === 'Asset' ? 'selected' : ''}>Asset</option>
              <option value="Consumable" ${item.type === 'Consumable' ? 'selected' : ''}>Consumable</option>
            </select>
          </div>
          <div class="form-group">
            <label>Condition</label>
            <select name="item_condition">
              <option value="New" ${item.item_condition === 'New' ? 'selected' : ''}>New</option>
              <option value="Good" ${item.item_condition === 'Good' ? 'selected' : ''}>Good</option>
              <option value="Fair" ${item.item_condition === 'Fair' ? 'selected' : ''}>Fair</option>
              <option value="Damaged" ${item.item_condition === 'Damaged' ? 'selected' : ''}>Damaged</option>
            </select>
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>Assign to Room (Optional)</label>
            <select name="room_id">
              <option value="">General / None</option>
              ${rooms.map(r => `<option value="${r.id}" ${item.room_id === r.id ? 'selected' : ''}>Room ${r.room_number}</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label>Quantity</label>
            <input type="number" name="quantity" value="${item.quantity}" min="1">
          </div>
        </div>
        <div style="display:flex; gap:1rem; margin-top:1rem;">
          <button type="submit" class="btn btn-primary" style="flex:1">${id ? 'Update' : 'Add'} Item</button>
          <button type="button" class="btn btn-ghost" onclick="App.closeModal()" style="flex:1">Cancel</button>
        </div>
      </form>
    `;

    App.showModal(id ? 'Edit Inventory Item' : 'Add Inventory Item', content);

    document.getElementById('inventory-form').onsubmit = async (e) => {
      e.preventDefault();
      const formData = new FormData(e.target);
      const data = Object.fromEntries(formData.entries());
      if (!data.room_id) data.room_id = null;

      try {
        if (id) await API.put(`/api/inventory/${id}`, data);
        else await API.post('/api/inventory', data);
        App.closeModal();
        showToast(id ? 'Item updated' : 'Item added');
        this.render();
      } catch (err) {
        showToast(err.message, 'error');
      }
    };
  },

  async deleteItem(id) {
    App.confirm('Delete Item', 'Are you sure you want to delete this item?', async () => {
      try {
        await API.delete(`/api/inventory/${id}`);
        showToast('Item deleted');
        this.render();
      } catch (err) {
        showToast(err.message, 'error');
      }
    });
  }
};
window.Inventory = Inventory;
