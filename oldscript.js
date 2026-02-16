function updateCountdown() {
    const now = new Date();
    const currentYear = now.getFullYear();
    const endOfYear = new Date(currentYear, 11, 31, 23, 59, 59);

    const totalSeconds = (endOfYear - now) / 1000;

    const months = Math.floor(totalSeconds / (60 * 60 * 24 * 30.44));
    const days = Math.floor((totalSeconds % (60 * 60 * 24 * 30.44)) / (60 * 60 * 24));
    const hours = Math.floor((totalSeconds % (60 * 60 * 24)) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = Math.floor(totalSeconds % 60);

    document.getElementById('months').textContent = String(months).padStart(2, '0');
    document.getElementById('days').textContent = String(days).padStart(2, '0');
    document.getElementById('hours').textContent = String(hours).padStart(2, '0');
    document.getElementById('minutes').textContent = String(minutes).padStart(2, '0');
    document.getElementById('seconds').textContent = String(seconds).padStart(2, '0');
}

setInterval(updateCountdown, 1000);
updateCountdown(); // Chamada inicial para evitar atraso

/* ========================================
   THEME TOGGLE FUNCTIONALITY
   ======================================== */

// Get theme toggle button
const themeToggle = document.getElementById('theme-toggle');
const themeIcon = document.querySelector('.theme-icon');

// Check for saved theme preference or default to 'dark'
const currentTheme = localStorage.getItem('theme') || 'dark';

// Apply the saved theme on page load
if (currentTheme === 'light') {
    document.body.setAttribute('data-theme', 'light');
    themeIcon.textContent = '☀️';
}

// Toggle theme function
function toggleTheme() {
    const currentTheme = document.body.getAttribute('data-theme');

    if (currentTheme === 'light') {
        // Switch to dark mode
        document.body.removeAttribute('data-theme');
        themeIcon.textContent = '🌙';
        localStorage.setItem('theme', 'dark');
    } else {
        // Switch to light mode
        document.body.setAttribute('data-theme', 'light');
        themeIcon.textContent = '☀️';
        localStorage.setItem('theme', 'light');
    }
}

// Add click event listener
themeToggle.addEventListener('click', toggleTheme);

// Optional: Listen for system theme preference changes
if (window.matchMedia) {
    const darkModeQuery = window.matchMedia('(prefers-color-scheme: dark)');

    darkModeQuery.addEventListener('change', (e) => {
        // Only auto-switch if user hasn't manually set a preference
        if (!localStorage.getItem('theme')) {
            if (e.matches) {
                document.body.removeAttribute('data-theme');
                themeIcon.textContent = '🌙';
            } else {
                document.body.setAttribute('data-theme', 'light');
                themeIcon.textContent = '☀️';
            }
        }
    });
}
