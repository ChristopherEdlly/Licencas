// ==================== THEME MANAGER ====================
class ThemeManager {
    constructor() {
        this.currentTheme = 'light';
        this.init();
    }

    init() {
        // Verificar se há um tema salvo no localStorage
        const savedTheme = localStorage.getItem('dashboard-theme');
        
        if (savedTheme && ['light', 'dark'].includes(savedTheme)) {
            this.currentTheme = savedTheme;
        } else {
            // Detectar preferência do sistema
            const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            this.currentTheme = prefersDark ? 'dark' : 'light';
        }

        // Aplicar tema sem transição para evitar flash
        document.body.classList.add('theme-loading');
        this.applyTheme(this.currentTheme);
        
        // Remover classe de loading após um breve delay
        setTimeout(() => {
            document.body.classList.remove('theme-loading');
        }, 50);

        // Configurar o botão de toggle
        this.setupToggleButton();
        
        // Escutar mudanças na preferência do sistema
        this.setupSystemPreferenceListener();
    }

    applyTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        this.currentTheme = theme;
        
        // Salvar no localStorage
        localStorage.setItem('dashboard-theme', theme);
        
        // Atualizar cores do Chart.js se existe
        if (window.dashboardChart) {
            this.updateChartColors();
        }
        
        // Disparar evento personalizado para outros componentes
        window.dispatchEvent(new CustomEvent('themeChanged', {
            detail: { theme: theme }
        }));
    }

    toggleTheme() {
        const newTheme = this.currentTheme === 'light' ? 'dark' : 'light';
        this.applyTheme(newTheme);
        this.showThemeChangeNotification(newTheme);
    }

    showThemeChangeNotification(theme) {
        // Criar uma pequena notificação para feedback do usuário
        const notification = document.createElement('div');
        notification.className = 'theme-notification';
        notification.innerHTML = `
            <i class="bi bi-${theme === 'dark' ? 'moon' : 'sun'}"></i>
            Tema ${theme === 'dark' ? 'Escuro' : 'Claro'} ativado
        `;
        
        // Estilos inline para a notificação
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: var(--bg-primary);
            color: var(--text-primary);
            padding: 12px 16px;
            border-radius: 8px;
            box-shadow: var(--shadow-lg);
            border: 1px solid var(--border);
            display: flex;
            align-items: center;
            gap: 8px;
            font-size: 14px;
            font-weight: 500;
            z-index: 1001;
            transform: translateX(100%);
            transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        `;
        
        document.body.appendChild(notification);
        
        // Animar entrada
        setTimeout(() => {
            notification.style.transform = 'translateX(0)';
        }, 10);
        
        // Remover após 2 segundos
        setTimeout(() => {
            notification.style.transform = 'translateX(100%)';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 2000);
    }

    setupToggleButton() {
        const toggleButton = document.getElementById('themeToggle');
        if (!toggleButton) {
            console.warn('Botão de alternância de tema não encontrado');
            return;
        }

        toggleButton.addEventListener('click', () => {
            this.toggleTheme();
        });

        // Adicionar suporte a teclado
        toggleButton.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                this.toggleTheme();
            }
        });
    }

    setupSystemPreferenceListener() {
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        
        mediaQuery.addEventListener('change', (e) => {
            // Apenas aplicar se o usuário não tiver definido uma preferência manual
            const savedTheme = localStorage.getItem('dashboard-theme');
            if (!savedTheme) {
                this.applyTheme(e.matches ? 'dark' : 'light');
            }
        });
    }

    updateChartColors() {
        if (!window.dashboardChart || !window.dashboardChart.data) return;
        
        if (window.dashboardChart.data.datasets[0]) {
            window.dashboardChart.data.datasets[0].backgroundColor = CARGO_COLORS;
            window.dashboardChart.update('none');
        }
    }

    // Método público para obter o tema atual
    getCurrentTheme() {
        return this.currentTheme;
    }

    // Método público para verificar se é tema escuro
    isDarkTheme() {
        return this.currentTheme === 'dark';
    }

    // Método para forçar um tema específico
    setTheme(theme) {
        if (['light', 'dark'].includes(theme)) {
            this.applyTheme(theme);
        }
    }
}

// Inicializar o gerenciador de temas assim que o DOM carregar
document.addEventListener('DOMContentLoaded', () => {
    window.themeManager = new ThemeManager();
});

// Exportar para uso global
window.ThemeManager = ThemeManager;