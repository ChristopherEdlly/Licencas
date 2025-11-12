/**
 * BreadcrumbsManager.js
 * 
 * Sistema de navegação breadcrumb (migalhas de pão) para melhor UX
 * 
 * Funcionalidades:
 * - Breadcrumbs dinâmicos baseados na navegação do usuário
 * - Histórico de navegação persistente
 * - Integração com filtros e visualizações
 * - Voltar para estado anterior mantendo filtros
 * - Acessível via teclado e leitores de tela
 * - Navegação rápida entre seções
 * 
 * @author Dashboard Licenças Premium
 * @version 3.0.0
 */

class BreadcrumbsManager {
    constructor(dashboard) {
        this.dashboard = dashboard;
        
        // Container do breadcrumb
        this.container = null;
        
        // Histórico de navegação
        this.navigationHistory = [];
        this.maxHistorySize = 10;
        
        // Estado atual
        this.currentPath = [];
        
        // Mapeamento de seções
        this.sections = {
            'dashboard': {
                label: 'Dashboard',
                icon: 'bi-speedometer2',
                link: '#dashboard'
            },
            'servidores': {
                label: 'Servidores',
                icon: 'bi-people',
                link: '#servidores'
            },
            'licencas': {
                label: 'Licenças',
                icon: 'bi-calendar-check',
                link: '#licencas'
            },
            'notificacoes': {
                label: 'Notificações',
                icon: 'bi-bell',
                link: '#notificacoes'
            },
            'estatisticas': {
                label: 'Estatísticas',
                icon: 'bi-bar-chart',
                link: '#estatisticas'
            },
            'configuracoes': {
                label: 'Configurações',
                icon: 'bi-gear',
                link: '#configuracoes'
            },
            'exportar': {
                label: 'Exportar',
                icon: 'bi-download',
                link: '#exportar'
            },
            'filtros': {
                label: 'Filtros',
                icon: 'bi-funnel',
                link: '#filtros'
            },
            'busca': {
                label: 'Busca',
                icon: 'bi-search',
                link: '#busca'
            },
            'relatorios': {
                label: 'Relatórios',
                icon: 'bi-kanban',
                link: '#relatorios'
            }
        };
        
        this.init();
    }
    
    /**
     * Inicializa o gerenciador de breadcrumbs
     */
    async init() {
        
        try {
            // Cria container
            this.createContainer();
            
            // Carrega histórico salvo
            this.loadHistory();
            
            // Define path inicial
            this.setPath(['dashboard']);
            
            // Registra listeners
            this.registerListeners();
            
            // Integra com navegação
            this.integrateWithNavigation();
            
            
        } catch (error) {
            console.error('❌ Erro ao inicializar BreadcrumbsManager:', error);
        }
    }
    
    /**
     * Cria container do breadcrumb
     */
    createContainer() {
        // Verifica se já existe
        if (document.getElementById('breadcrumbsContainer')) {
            this.container = document.getElementById('breadcrumbsContainer');
            return;
        }
        
        // Cria container
        this.container = document.createElement('nav');
        this.container.id = 'breadcrumbsContainer';
        this.container.className = 'breadcrumbs-container';
        this.container.setAttribute('aria-label', 'Navegação de localização');
        
        // Cria ol (ordered list)
        const ol = document.createElement('ol');
        ol.className = 'breadcrumb';
        ol.setAttribute('role', 'list');
        
        this.container.appendChild(ol);
        
        // Insere no início do conteúdo principal
        const mainContent = document.querySelector('.container-fluid');
        if (mainContent && mainContent.firstChild) {
            mainContent.insertBefore(this.container, mainContent.firstChild);
        }
        
    }
    
    /**
     * Define o caminho atual
     */
    setPath(path, options = {}) {
        // Valida path
        if (!Array.isArray(path) || path.length === 0) {
            console.warn('⚠️ Path inválido:', path);
            return;
        }
        
        // Salva no histórico
        this.addToHistory(path, options);
        
        // Atualiza path atual
        this.currentPath = path;
        
        // Renderiza
        this.render();
        
    }
    
    /**
     * Adiciona item ao path atual
     */
    addToPath(sectionId, options = {}) {
        const newPath = [...this.currentPath, sectionId];
        this.setPath(newPath, options);
    }
    
    /**
     * Remove últimos N itens do path
     */
    removeFromPath(count = 1) {
        if (this.currentPath.length <= 1) {
            console.warn('⚠️ Não é possível remover item raiz');
            return;
        }
        
        const newPath = this.currentPath.slice(0, -count);
        this.setPath(newPath);
    }
    
    /**
     * Navega para um nível específico do breadcrumb
     */
    navigateToLevel(index) {
        if (index < 0 || index >= this.currentPath.length) {
            console.warn('⚠️ Índice inválido:', index);
            return;
        }
        
        const newPath = this.currentPath.slice(0, index + 1);
        this.setPath(newPath);
        
        // Dispara evento de navegação
        this.dispatchNavigationEvent(newPath);
    }
    
    /**
     * Renderiza breadcrumb na UI
     */
    render() {
        const ol = this.container.querySelector('.breadcrumb');
        if (!ol) return;
        
        // Limpa conteúdo anterior
        ol.innerHTML = '';
        
        // Renderiza cada item do path
        this.currentPath.forEach((sectionId, index) => {
            const section = this.sections[sectionId];
            
            if (!section) {
                console.warn(`⚠️ Seção não encontrada: ${sectionId}`);
                return;
            }
            
            const li = this.createBreadcrumbItem(section, index, index === this.currentPath.length - 1);
            ol.appendChild(li);
        });
        
        // Adiciona dropdown de histórico se houver
        if (this.navigationHistory.length > 1) {
            const historyItem = this.createHistoryDropdown();
            ol.appendChild(historyItem);
        }
    }
    
    /**
     * Cria item do breadcrumb
     */
    createBreadcrumbItem(section, index, isLast) {
        const li = document.createElement('li');
        li.className = 'breadcrumb-item';
        
        if (isLast) {
            li.classList.add('active');
            li.setAttribute('aria-current', 'page');
        }
        
        if (isLast) {
            // Item ativo - sem link
            li.innerHTML = `
                <i class="bi ${section.icon} me-1"></i>
                <span>${section.label}</span>
            `;
        } else {
            // Item navegável - com link
            const link = document.createElement('a');
            link.href = section.link || '#';
            link.className = 'breadcrumb-link';
            link.innerHTML = `
                <i class="bi ${section.icon} me-1"></i>
                <span>${section.label}</span>
            `;
            
            // Click handler
            link.addEventListener('click', (e) => {
                e.preventDefault();
                this.navigateToLevel(index);
            });
            
            // Keyboard navigation
            link.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    this.navigateToLevel(index);
                }
            });
            
            li.appendChild(link);
        }
        
        return li;
    }
    
    /**
     * Cria dropdown de histórico
     */
    createHistoryDropdown() {
        const li = document.createElement('li');
        li.className = 'breadcrumb-item breadcrumb-history';
        
        const button = document.createElement('button');
        button.className = 'btn btn-link breadcrumb-history-btn';
        button.innerHTML = '<i class="bi bi-clock-history"></i>';
        button.title = 'Histórico de navegação (Alt+H)';
        button.setAttribute('aria-label', 'Abrir histórico de navegação');
        button.setAttribute('data-bs-toggle', 'dropdown');
        button.setAttribute('aria-expanded', 'false');
        
        const dropdown = document.createElement('ul');
        dropdown.className = 'dropdown-menu dropdown-menu-end breadcrumb-history-menu';
        
        // Header do dropdown
        const header = document.createElement('li');
        header.className = 'dropdown-header';
        header.innerHTML = '<i class="bi bi-clock-history me-2"></i>Histórico Recente';
        dropdown.appendChild(header);
        
        const divider = document.createElement('li');
        divider.innerHTML = '<hr class="dropdown-divider">';
        dropdown.appendChild(divider);
        
        // Itens do histórico (mais recentes primeiro)
        const recentHistory = [...this.navigationHistory].reverse().slice(0, 5);
        
        recentHistory.forEach((entry, index) => {
            const item = document.createElement('li');
            const link = document.createElement('a');
            link.className = 'dropdown-item';
            link.href = '#';
            
            // Label do histórico
            const label = entry.path.map(id => this.sections[id]?.label || id).join(' > ');
            const timeAgo = this.getTimeAgo(entry.timestamp);
            
            link.innerHTML = `
                <div class="history-item">
                    <div class="history-label">${label}</div>
                    <div class="history-time">${timeAgo}</div>
                </div>
            `;
            
            link.addEventListener('click', (e) => {
                e.preventDefault();
                this.setPath(entry.path, entry.options);
                this.dispatchNavigationEvent(entry.path);
            });
            
            item.appendChild(link);
            dropdown.appendChild(item);
        });
        
        // Botão de limpar histórico
        if (this.navigationHistory.length > 0) {
            const divider2 = document.createElement('li');
            divider2.innerHTML = '<hr class="dropdown-divider">';
            dropdown.appendChild(divider2);
            
            const clearItem = document.createElement('li');
            const clearLink = document.createElement('a');
            clearLink.className = 'dropdown-item text-danger';
            clearLink.href = '#';
            clearLink.innerHTML = '<i class="bi bi-trash me-2"></i>Limpar Histórico';
            
            clearLink.addEventListener('click', (e) => {
                e.preventDefault();
                this.clearHistory();
            });
            
            clearItem.appendChild(clearLink);
            dropdown.appendChild(clearItem);
        }
        
        li.appendChild(button);
        li.appendChild(dropdown);
        
        return li;
    }
    
    /**
     * Adiciona entrada ao histórico
     */
    addToHistory(path, options = {}) {
        const entry = {
            path: [...path],
            options: { ...options },
            timestamp: Date.now()
        };
        
        // Adiciona ao histórico
        this.navigationHistory.push(entry);
        
        // Limita tamanho do histórico
        if (this.navigationHistory.length > this.maxHistorySize) {
            this.navigationHistory.shift();
        }
        
        // Salva no localStorage
        this.saveHistory();
    }
    
    /**
     * Salva histórico no localStorage
     */
    saveHistory() {
        try {
            localStorage.setItem('breadcrumbHistory', JSON.stringify(this.navigationHistory));
        } catch (error) {
            console.warn('⚠️ Erro ao salvar histórico:', error);
        }
    }
    
    /**
     * Carrega histórico do localStorage
     */
    loadHistory() {
        try {
            const saved = localStorage.getItem('breadcrumbHistory');
            if (saved) {
                this.navigationHistory = JSON.parse(saved);
            }
        } catch (error) {
            console.warn('⚠️ Erro ao carregar histórico:', error);
            this.navigationHistory = [];
        }
    }
    
    /**
     * Limpa histórico
     */
    clearHistory() {
        this.navigationHistory = [];
        this.saveHistory();
        this.render();
        
        console.log('🗑️ Histórico de navegação limpo');
        
        // Notificação
        if (window.dashboard && dashboard.notificationManager && typeof dashboard.notificationManager.showToast === 'function') {
            dashboard.notificationManager.showToast({
                title: 'Sucesso',
                message: 'Histórico limpo com sucesso',
                priority: 'low',
                icon: 'bi-check-circle'
            });
        } else {
            alert('Histórico limpo com sucesso');
        }
    }
    
    /**
     * Registra event listeners
     */
    registerListeners() {
        // Atalho Alt+H para abrir histórico
        document.addEventListener('keydown', (e) => {
            if (e.altKey && e.key === 'h') {
                e.preventDefault();
                const historyBtn = this.container.querySelector('.breadcrumb-history-btn');
                if (historyBtn) {
                    historyBtn.click();
                }
            }
        });
        
        // Atalho Alt+Left para voltar
        document.addEventListener('keydown', (e) => {
            if (e.altKey && e.key === 'ArrowLeft') {
                e.preventDefault();
                this.goBack();
            }
        });
        
    }
    
    /**
     * Integra com sistema de navegação do dashboard
     */
    integrateWithNavigation() {
        // Observa mudanças na URL hash
        window.addEventListener('hashchange', () => {
            const hash = window.location.hash.substring(1);
            if (hash && this.sections[hash]) {
                this.setPath([hash]);
            }
        });
        
        // Integra com clicks em links de navegação
        document.querySelectorAll('[data-breadcrumb-section]').forEach(link => {
            link.addEventListener('click', (e) => {
                const section = link.getAttribute('data-breadcrumb-section');
                if (section) {
                    this.setPath([section]);
                }
            });
        });
        
    }
    
    /**
     * Volta para o estado anterior
     */
    goBack() {
        if (this.navigationHistory.length < 2) {
            console.warn('⚠️ Não há histórico para voltar');
            return;
        }
        
        // Remove entrada atual
        this.navigationHistory.pop();
        
        // Pega entrada anterior
        const previous = this.navigationHistory[this.navigationHistory.length - 1];
        
        // Navega sem adicionar ao histórico novamente
        this.currentPath = previous.path;
        this.render();
        this.dispatchNavigationEvent(previous.path);
        
        console.log('⬅️ Voltou para:', previous.path.join(' > '));
    }
    
    /**
     * Dispara evento personalizado de navegação
     */
    dispatchNavigationEvent(path) {
        window.dispatchEvent(new CustomEvent('breadcrumbNavigation', {
            detail: {
                path: path,
                section: path[path.length - 1]
            }
        }));
    }
    
    /**
     * Formata tempo relativo
     */
    getTimeAgo(timestamp) {
        const seconds = Math.floor((Date.now() - timestamp) / 1000);
        
        if (seconds < 60) return 'Agora';
        if (seconds < 3600) return `${Math.floor(seconds / 60)}m atrás`;
        if (seconds < 86400) return `${Math.floor(seconds / 3600)}h atrás`;
        return `${Math.floor(seconds / 86400)}d atrás`;
    }
    
    /**
     * Adiciona seção customizada
     */
    addSection(id, config) {
        this.sections[id] = {
            label: config.label || id,
            icon: config.icon || 'bi-circle',
            link: config.link || `#${id}`
        };
        
        console.log(`➕ Seção adicionada: ${id}`);
    }
    
    /**
     * Remove seção
     */
    removeSection(id) {
        delete this.sections[id];
        console.log(`➖ Seção removida: ${id}`);
    }
    
    /**
     * Obtém path atual
     */
    getCurrentPath() {
        return [...this.currentPath];
    }
    
    /**
     * Obtém seção atual
     */
    getCurrentSection() {
        return this.currentPath[this.currentPath.length - 1];
    }
    
    /**
     * Verifica se está em uma seção específica
     */
    isInSection(sectionId) {
        return this.currentPath.includes(sectionId);
    }
    
    /**
     * Exporta histórico
     */
    exportHistory() {
        return {
            history: this.navigationHistory,
            currentPath: this.currentPath,
            timestamp: Date.now()
        };
    }
    
    /**
     * Importa histórico
     */
    importHistory(data) {
        if (data.history) {
            this.navigationHistory = data.history;
            this.saveHistory();
        }
        
        if (data.currentPath) {
            this.setPath(data.currentPath);
        }
        
    }
    
    /**
     * Limpa recursos
     */
    destroy() {
        if (this.container) {
            this.container.remove();
        }
        
        this.navigationHistory = [];
        this.currentPath = [];
        
        console.log('🗑️ BreadcrumbsManager destruído');
    }
}

// Exporta para uso global
if (typeof module !== 'undefined' && module.exports) {
    module.exports = BreadcrumbsManager;
}
