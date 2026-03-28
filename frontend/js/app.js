const API_URL = 'http://localhost:5000/api/auth';
const RECAPTCHA_SITE_KEY = '6LfKYJssAAAAAAHtyluWPspyDdMH6H6m0bSEB99c'; // Replace this

// UI Toggles
const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');
const alertBox = document.getElementById('alertBox');

if (document.getElementById('showRegister')) {
    document.getElementById('showRegister').addEventListener('click', (e) => {
        e.preventDefault();
        loginForm.classList.add('d-none');
        registerForm.classList.remove('d-none');
    });

    document.getElementById('showLogin').addEventListener('click', (e) => {
        e.preventDefault();
        registerForm.classList.add('d-none');
        loginForm.classList.remove('d-none');
    });
}

function showAlert(message, type) {
    alertBox.textContent = message;
    alertBox.className = `alert alert-${type}`;
    alertBox.classList.remove('d-none');
}

// Handle Login
if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;

        try {
            const res = await fetch(`${API_URL}/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });
            const data = await res.json();
            
            if (res.ok) {
                localStorage.setItem('token', data.token);
                window.location.href = 'dashboard.html';
            } else {
                showAlert(data.message, 'danger');
            }
        } catch (err) {
            showAlert('Server error', 'danger');
        }
    });
}

// Handle Register with reCAPTCHA v3
if (registerForm) {
    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = document.getElementById('regName').value;
        const email = document.getElementById('regEmail').value;
        const password = document.getElementById('regPassword').value;

        // Execute reCAPTCHA
        grecaptcha.ready(function() {
            grecaptcha.execute(RECAPTCHA_SITE_KEY, {action: 'submit'}).then(async function(token) {
                try {
                    const res = await fetch(`${API_URL}/register`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ name, email, password, captchaToken: token })
                    });
                    const data = await res.json();
                    
                    if (res.ok) {
                        showAlert(data.message, 'success');
                        registerForm.reset();
                    } else {
                        showAlert(data.message, 'danger');
                    }
                } catch (err) {
                    showAlert('Server error', 'danger');
                }
            });
        });
    });
}
