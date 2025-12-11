/**
 * ThemeManager - Gerenciamento de Temas (Claro/Escuro)
 * @module 3-managers/ui/ThemeManager
 */
(function () {
    'use strict';

    class ThemeManager {
        constructor() {
            this.currentTheme = 'light';
            this.init();
        }

        init() {
            // Verificar localStorage
            const savedTheme = localStorage.getItem('dashboard-theme');

            if (savedTheme && ['light', 'dark'].includes(savedTheme)) {
                this.currentTheme = savedTheme;
            } else {
                // Preferência do sistema
                const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
                this.currentTheme = prefersDark ? 'dark' : 'light';
            }

            // Aplicar tema inicial
            if (document.body) {
                document.body.classList.add('theme-loading');
                this.applyTheme(this.currentTheme);
                setTimeout(() => document.body.classList.remove('theme-loading'), 50);
            } else {
                document.addEventListener('DOMContentLoaded', () => {
                    document.body.classList.add('theme-loading');
                    this.applyTheme(this.currentTheme);
                    setTimeout(() => document.body.classList.remove('theme-loading'), 50);
                });
            }

            this.setupToggleButton();
            this.setupSystemPreferenceListener();

            console.log('✅ ThemeManager inicializado');
        }

        applyTheme(theme) {
            document.documentElement.setAttribute('data-theme', theme);
            if (document.body) document.body.setAttribute('data-theme', theme);
            this.currentTheme = theme;
            localStorage.setItem('dashboard-theme', theme);

            // Evento
            window.dispatchEvent(new CustomEvent('themeChanged', {
                detail: { theme: theme }
            }));
        }

        toggleTheme() {
            const newTheme = this.currentTheme === 'light' ? 'dark' : 'light';
            this.applyTheme(newTheme);
            this.showFeedback(newTheme);
        }

        showFeedback(theme) {
            // Feedback visual simples
            const msg = `Tema ${theme === 'dark' ? 'Escuro' : 'Claro'} ativado`;
            console.log(msg);

            // Tentar usar NotificationService se disponível
            if (window.NotificationService && typeof window.NotificationService.success === 'function') {
                window.NotificationService.success(msg);
            }
        }

        setupToggleButton() {
            // Delegação de evento para funcionar mesmo se o botão for criado dinamicamente
            document.addEventListener('click', (e) => {
                const btn = e.target.closest('#themeToggle');
                if (btn) {
                    this.toggleTheme();
                }
            });
        }

        setupSystemPreferenceListener() {
            if (window.matchMedia) {
                window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
                    if (!localStorage.getItem('dashboard-theme')) {
                        this.applyTheme(e.matches ? 'dark' : 'light');
                    }
                });
            }
        }
    }

    // Exportação direta para window
    if (typeof window !== 'undefined') {
        window.ThemeManager = ThemeManager;

        // Auto-inicialização somente se ainda não existir
        document.addEventListener('DOMContentLoaded', () => {
            if (!window.themeManager) {
                window.themeManager = new ThemeManager();
            }
        });
    }

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = ThemeManager;
    }

})();
