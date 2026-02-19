/* ═══════════════════════════════════════════════════════════════
   API — Fetch wrapper for all backend calls
   ═══════════════════════════════════════════════════════════════ */

const API = {
    getSessionId() {
        return sessionStorage.getItem('sessionId');
    },

    async request(method, url, body = null) {
        const headers = { 'Content-Type': 'application/json' };
        const sessionId = this.getSessionId();
        if (sessionId) headers['X-Session-Id'] = sessionId;

        const opts = { method, headers };
        if (body) opts.body = JSON.stringify(body);

        const res = await fetch(url, opts);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Request failed');
        return data;
    },

    get(url) { return this.request('GET', url); },
    post(url, body) { return this.request('POST', url, body); },
    put(url, body) { return this.request('PUT', url, body); },
    delete(url) { return this.request('DELETE', url); },
};
window.API = API;
