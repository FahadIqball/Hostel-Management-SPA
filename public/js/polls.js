/* ═══════════════════════════════════════════════════════════════
   POLLS & FEEDBACK
   ═══════════════════════════════════════════════════════════════ */

const Polls = {
  data: [],

  async render() {
    const el = App.getContentEl();
    el.innerHTML = '<div class="empty-state"><p>Loading polls...</p></div>';

    try {
      this.data = await API.get('/api/polls');
      this.renderView(el);
    } catch (err) {
      el.innerHTML = `<div class="empty-state"><div class="empty-icon">⚠️</div><p>${err.message}</p></div>`;
    }
  },

  renderView(el) {
    const user = JSON.parse(sessionStorage.getItem('user') || '{}');
    const isAdmin = user.role === 'Admin' || user.role === 'Warden';

    el.innerHTML = `
      <div class="page-header">
        <div class="search-container" style="justify-content:flex-end;">
          ${isAdmin ? `<button class="btn btn-primary" onclick="Polls.showCreateModal()">+ Create Poll</button>` : ''}
        </div>
      </div>

      <div class="dashboard-grid">
        ${this.data.map(poll => this.renderPollCard(poll, isAdmin)).join('')}
      </div>
      ${this.data.length === 0 ? '<div class="empty-state"><p>No active polls.</p></div>' : ''}
    `;
  },

  renderPollCard(poll, isAdmin) {
    const totalVotes = poll.total_votes || 0;
    const isExpired = poll.expires_at && new Date(poll.expires_at) < new Date();

    return `
      <div class="card">
        <div class="card-header">
          <h3>${poll.question}</h3>
          ${isAdmin ? `<button class="btn btn-sm btn-danger" onclick="Polls.deletePoll(${poll.id})">Delete</button>` : ''}
        </div>
        <div class="card-body">
          <div class="poll-options">
            ${poll.options.map((opt, idx) => {
      const isSelected = poll.user_vote === idx;
      return `
                <div class="poll-option ${isSelected ? 'selected' : ''} ${isExpired ? 'expired' : ''}" 
                     onclick="${!isExpired ? `Polls.vote(${poll.id}, ${idx})` : ''}">
                  <div class="option-text">${opt}</div>
                  ${isSelected ? '<span class="selected-check">✓</span>' : ''}
                </div>
              `;
    }).join('')}
          </div>
          <div style="margin-top:1rem; display:flex; justify-content:space-between; font-size:0.85rem; color:var(--text-secondary)">
            <span>${totalVotes} total votes</span>
            <span>${isExpired ? 'Poll Ended' : poll.expires_at ? 'Ends: ' + formatDate(poll.expires_at) : 'Ongoing'}</span>
          </div>
        </div>
      </div>
    `;
  },

  async showCreateModal() {
    const content = `
      <form id="create-poll-form">
        <div class="form-group">
          <label>Question</label>
          <input type="text" name="question" placeholder="e.g. What should be for Sunday special dinner?" required>
        </div>
        <div id="options-container">
          <div class="form-group">
            <label>Options</label>
            <input type="text" name="option[]" placeholder="Option 1" required style="margin-bottom:0.5rem">
            <input type="text" name="option[]" placeholder="Option 2" required style="margin-bottom:0.5rem">
          </div>
        </div>
        <button type="button" class="btn btn-sm btn-ghost" onclick="Polls.addOptionField()" style="margin-bottom:1rem">+ Add Option</button>
        <div class="form-group">
          <label>Expiry Date (Optional)</label>
          <input type="datetime-local" name="expires_at">
        </div>
        <div style="display:flex; gap:1rem; margin-top:1rem;">
          <button type="submit" class="btn btn-primary" style="flex:1">Post Poll</button>
          <button type="button" class="btn btn-ghost" onclick="App.closeModal()" style="flex:1">Cancel</button>
        </div>
      </form>
    `;

    App.showModal('Create New Poll', content);

    document.getElementById('create-poll-form').onsubmit = async (e) => {
      e.preventDefault();
      const question = e.target.question.value;
      const options = Array.from(e.target.elements['option[]']).map(i => i.value).filter(v => v.trim());
      const expires_at = e.target.expires_at.value;

      try {
        await API.post('/api/polls', { question, options, expires_at });
        App.closeModal();
        showToast('Poll created');
        this.render();
      } catch (err) {
        showToast(err.message, 'error');
      }
    };
  },

  addOptionField() {
    const container = document.querySelector('#options-container .form-group');
    const input = document.createElement('input');
    input.type = 'text';
    input.name = 'option[]';
    input.placeholder = `Option ${container.querySelectorAll('input').length + 1}`;
    input.style.marginBottom = '0.5rem';
    container.appendChild(input);
  },

  async vote(pollId, idx) {
    try {
      await API.post(`/api/polls/${pollId}/vote`, { option_index: idx });
      showToast('Vote recorded');
      this.render();
    } catch (err) {
      showToast(err.message, 'error');
    }
  },

  async deletePoll(id) {
    App.confirm('Delete Poll', 'Are you sure you want to delete this poll?', async () => {
      try {
        await API.delete(`/api/polls/${id}`);
        showToast('Poll deleted');
        this.render();
      } catch (err) { showToast(err.message, 'error'); }
    });
  }
};
window.Polls = Polls;
