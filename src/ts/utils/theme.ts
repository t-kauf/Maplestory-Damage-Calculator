declare global {
    interface Window {
        toggleTheme: () => void;
    }
}

window.toggleTheme = () => toggleTheme();

export function toggleTheme(): void {
    // Dark mode only - light theme disabled
    // Ensure dark mode is always active
    const html = document.documentElement;
    if (!html.classList.contains('dark')) {
        html.classList.add('dark');
    }
    localStorage.setItem('theme', 'dark');
}

export function loadTheme(): void {
    // Dark mode only - ignore saved theme and force dark mode
    const html = document.documentElement;
    const themeToggle = document.getElementById('theme-toggle');
    const themeToggleSidebar = document.getElementById('theme-icon-sidebar');

    html.classList.add('dark');
    localStorage.setItem('theme', 'dark');

    if (themeToggle) themeToggle.textContent = '☀️';
    if (themeToggleSidebar) themeToggleSidebar.textContent = '☀️';
}
