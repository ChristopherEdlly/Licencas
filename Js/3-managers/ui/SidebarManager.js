/**
 * SidebarManager - Gerenciamento da sidebar
 *
 * Responsabilidades:
 * - Abrir/fechar sidebar
 * - Navegação entre páginas
 * - Estado ativo dos links
 * - Responsive (mobile)
 *
 * @module 3-managers/ui/SidebarManager
 */

class SidebarManager {
    /**
     * Construtor
     * @param {Object} app - Instância do App/Dashboard
     */
    constructor(app) {
        this.app = app;

        // Referências DOM
        this.sidebar = null;
        this.navLinks = [];

        // Estado
        this.isOpen = true;
        this.isCollapsed = false;

        console.log('✅ SidebarManager inicializado');
    }

    /**
     * Inicializa o manager
     */
    init() {
        this.sidebar = document.querySelector('.sidebar');

        if (!this.sidebar) {
            console.warn('Sidebar não encontrada');
            return;
        }

        this.navLinks = Array.from(this.sidebar.querySelectorAll('.nav-link'));

        this._setupEventListeners();
        this._setupResponsive();

        console.log('📂 Sidebar configurada');
    }

    /**
     * Setup event listeners
     * @private
     */
    _setupEventListeners() {
        // Navegação
        this.navLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const page = link.dataset.page;
                if (page) {
                    this.navigateTo(page);
                }
            });
        });

        // Toggle sidebar (mobile)
        const toggleBtn = document.getElementById('sidebarToggle');
        if (toggleBtn) {
            toggleBtn.addEventListener('click', () => {
                this.toggle();
            });
        }
    }

    /**
     * Setup comportamento responsive
     * @private
     */
    _setupResponsive() {
        // Fechar sidebar em mobile
        if (window.innerWidth < 768) {
            this.close();
        }

        // Listener para resize
        window.addEventListener('resize', () => {
            if (window.innerWidth < 768 && this.isOpen) {
                this.close();
            } else if (window.innerWidth >= 768 && !this.isOpen) {
                this.open();
            }
        });
    }

    /**
     * Navega para página
     * @param {string} page - Nome da página
     */
    navigateTo(page) {
        // Atualizar link ativo
        this._setActiveLink(page);

        // Navegar
        if (this.app && this.app.navigateToPage) {
            this.app.navigateToPage(page);
        }

        // Fechar sidebar em mobile
        if (window.innerWidth < 768) {
            this.close();
        }

        console.log(`📂 Navegado para: ${page}`);
    }

    /**
     * Define link ativo
     * @private
     * @param {string} page - Nome da página
     */
    _setActiveLink(page) {
        this.navLinks.forEach(link => {
            if (link.dataset.page === page) {
                link.classList.add('active');
                link.setAttribute('aria-current', 'page');
            } else {
                link.classList.remove('active');
                link.removeAttribute('aria-current');
            }
        });
    }

    /**
     * Abre sidebar
     */
    open() {
        if (!this.sidebar) return;

        this.sidebar.classList.add('open');
        this.sidebar.classList.remove('closed');
        this.isOpen = true;

        // Atualizar UIStateManager
        if (this.app?.uiStateManager) {
            this.app.uiStateManager.openSidebar();
        }

        console.log('📂 Sidebar aberta');
    }

    /**
     * Fecha sidebar
     */
    close() {
        if (!this.sidebar) return;

        this.sidebar.classList.remove('open');
        this.sidebar.classList.add('closed');
        this.isOpen = false;

        // Atualizar UIStateManager
        if (this.app?.uiStateManager) {
            this.app.uiStateManager.closeSidebar();
        }

        console.log('📂 Sidebar fechada');
    }

    /**
     * Alterna sidebar
     */
    toggle() {
        if (this.isOpen) {
            this.close();
        } else {
            this.open();
        }
    }

    /**
     * Colapsa sidebar (modo mini)
     */
    collapse() {
        if (!this.sidebar) return;

        this.sidebar.classList.add('collapsed');
        this.isCollapsed = true;

        // Atualizar UIStateManager
        if (this.app?.uiStateManager) {
            this.app.uiStateManager.setSidebarCollapsed(true);
        }

        console.log('📂 Sidebar colapsada');
    }

    /**
     * Expande sidebar
     */
    expand() {
        if (!this.sidebar) return;

        this.sidebar.classList.remove('collapsed');
        this.isCollapsed = false;

        // Atualizar UIStateManager
        if (this.app?.uiStateManager) {
            this.app.uiStateManager.setSidebarCollapsed(false);
        }

        console.log('📂 Sidebar expandida');
    }

    /**
     * Debug info
     * @returns {Object}
     */
    getDebugInfo() {
        return {
            isOpen: this.isOpen,
            isCollapsed: this.isCollapsed,
            navLinksCount: this.navLinks.length
        };
    }
}

// Expor globalmente
if (typeof window !== 'undefined') {
    window.SidebarManager = SidebarManager;
}

// Exportar para Node.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SidebarManager;
}
