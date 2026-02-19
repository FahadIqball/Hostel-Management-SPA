/* ═══════════════════════════════════════════════════════════════
   AUTH — Login and Student Registration
   ═══════════════════════════════════════════════════════════════ */

const Auth = {
    init() {
        const loginForm = document.getElementById('login-form');
        const registerForm = document.getElementById('register-form');
        const toggleLink = document.getElementById('toggle-link');
        const backLink = document.getElementById('back-to-login');
        const errorEl = document.getElementById('login-error');
        const loginBtn = document.getElementById('login-btn');

        // Toggle forms
        if (toggleLink) {
            toggleLink.addEventListener('click', (e) => {
                e.preventDefault();
                loginForm.style.display = 'none';
                document.getElementById('register-toggle').style.display = 'none';
                registerForm.style.display = 'block';
            });
        }

        if (backLink) {
            backLink.addEventListener('click', (e) => {
                e.preventDefault();
                registerForm.style.display = 'none';
                loginForm.style.display = 'block';
                document.getElementById('register-toggle').style.display = 'block';
            });
        }

        // Login
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            errorEl.textContent = '';
            loginBtn.disabled = true;
            loginBtn.textContent = 'Signing in...';

            const username = document.getElementById('login-username').value.trim();
            const password = document.getElementById('login-password').value;

            try {
                const data = await API.post('/api/login', { username, password });
                sessionStorage.setItem('sessionId', data.sessionId);
                sessionStorage.setItem('user', JSON.stringify(data.user));
                App.launch();
            } catch (err) {
                errorEl.textContent = err.message;
                loginBtn.disabled = false;
                loginBtn.textContent = 'Sign In';
            }
        });

        // Registration
        if (registerForm) {
            registerForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const errEl = document.getElementById('register-error');
                const succEl = document.getElementById('register-success');
                errEl.textContent = '';
                succEl.textContent = '';

                const data = {
                    fullName: document.getElementById('reg-fullname').value.trim(),
                    username: document.getElementById('reg-username').value.trim(),
                    rollNumber: document.getElementById('reg-roll').value.trim(),
                    email: document.getElementById('reg-email').value.trim(),
                    contact: document.getElementById('reg-contact').value.trim(),
                    password: document.getElementById('reg-password').value
                };

                try {
                    const res = await API.post('/api/student-register', data);
                    succEl.textContent = res.message || 'Registration successful! Waiting for approval.';
                    registerForm.reset();
                    setTimeout(() => {
                        if (backLink) backLink.click();
                        succEl.textContent = '';
                    }, 3000);
                } catch (err) {
                    errEl.textContent = err.message;
                }
            });
        }
    }
};
