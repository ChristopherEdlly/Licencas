/**
 * KeyboardShortcutsManager.js
 * Gerencia atalhos de teclado para melhorar a acessibilidade e produtividade
 * 
 * Atalhos implementados:
 * - Ctrl+F / Cmd+F: Focar campo de busca
 * - Ctrl+E / Cmd+E: Abrir exportação
 * - Ctrl+U / Cmd+U: Abrir upload de arquivo
 * - ESC: Fechar modais/dropdowns
 * - Ctrl+K / Cmd+K: Abrir atalhos (help)
 * - Tab: Navegação entre elementos interativos
 * - Shift+?: Mostrar ajuda de atalhos
 */

class KeyboardShortcutsManager {
    constructor(dashboard) {
        this.dashboard = dashboard;
        
        // Configurações
        this.config = {
            enabled: true,
            showNotifications: true,
            showHelp: false
        };
        
        // Atalhos registrados
        this.shortcuts = new Map();
        
        // Estado
        this.activeModals = [];
        this.helpModalVisible = false;
        
        // Elementos DOM
        this.searchInput = null;
        this.fileInput = null;
        this.exportButton = null;
        
        this.init();
    }

    /**
     * Inicializa o gerenciador
     */
    init() {
        // Buscar elementos DOM
        this.searchInput = document.getElementById('searchInput');
        this.fileInput = document.getElementById('csvFileInput');
        this.exportButton = document.querySelector('[data-action="export"]');
        
        // Registrar atalhos
        this.registerDefaultShortcuts();
        
        // Setup event listeners
        this.setupKeyboardListeners();
        
        // Criar modal de ajuda
        this.createHelpModal();
        
        // Carregar preferências
        this.loadPreferences();
        
    }

    /**
     * Registra atalhos padrão do sistema
     */
    registerDefaultShortcuts() {
        // Busca
        this.registerShortcut({
            key: 'f',
            ctrl: true,
            description: 'Focar campo de busca',
            action: () => this.focusSearch(),
            category: 'Navegação'
        });
        
        // Exportar
        this.registerShortcut({
            key: 'e',
            ctrl: true,
            description: 'Abrir exportação',
            action: () => this.openExport(),
            category: 'Ações'
        });
        
        // Upload
        this.registerShortcut({
            key: 'u',
            ctrl: true,
            description: 'Abrir upload de arquivo',
            action: () => this.openFileUpload(),
            category: 'Ações'
        });
        
        // Fechar modais
        this.registerShortcut({
            key: 'Escape',
            description: 'Fechar modais/dropdowns',
            action: () => this.closeActiveModals(),
            category: 'Navegação'
        });
        
        // Abrir painel de filtros
        this.registerShortcut({
            key: 'k',
            ctrl: true,
            description: 'Abrir painel de filtros avançados',
            action: () => this.openFiltersPanel(),
            category: 'Filtros'
        });
        
        // Quick search
        this.registerShortcut({
            key: '\\',
            description: 'Quick search (focar busca)',
            action: () => this.focusSearch(),
            category: 'Navegação'
        });
        
        // Ajuda de atalhos
        this.registerShortcut({
            key: '?',
            shift: true,
            description: 'Mostrar ajuda de atalhos',
            action: () => this.toggleHelpModal(),
            category: 'Ajuda'
        });
        
        // Limpar busca
        this.registerShortcut({
            key: 'Escape',
            description: 'Limpar busca (quando foco no campo)',
            action: () => this.clearSearch(),
            category: 'Busca',
            condition: () => document.activeElement === this.searchInput
        });
        
        // Limpar todos os filtros (incluindo sidebar)
        this.registerShortcut({
            key: 'l',
            ctrl: true,
            description: 'Limpar todos os filtros',
            action: () => this.clearAllFilters(),
            category: 'Filtros'
        });
        
        // Recarregar dados
        this.registerShortcut({
            key: 'r',
            ctrl: true,
            shift: true,
            description: 'Recarregar dados do cache',
            action: () => this.reloadFromCache(),
            category: 'Ações'
        });
    }

    /**
     * Registra um novo atalho
     * 
     * @param {Object} shortcut - Configuração do atalho
     */
    registerShortcut(shortcut) {
        const {
            key,
            ctrl = false,
            shift = false,
            alt = false,
            description,
            action,
            category = 'Outros',
            condition = null
        } = shortcut;
        
        const shortcutKey = this.getShortcutKey(key, ctrl, shift, alt);
        
        this.shortcuts.set(shortcutKey, {
            key,
            ctrl,
            shift,
            alt,
            description,
            action,
            category,
            condition
        });
        
    }

    /**
     * Setup dos event listeners
     */
    setupKeyboardListeners() {
        document.addEventListener('keydown', (e) => {
            if (!this.config.enabled) return;
            
            // Ignorar se estiver digitando em input/textarea (exceto ESC e atalhos Ctrl)
            const isInputField = ['INPUT', 'TEXTAREA'].includes(e.target.tagName);
            const isContentEditable = e.target.isContentEditable;
            
            if ((isInputField || isContentEditable) && !e.ctrlKey && !e.metaKey && e.key !== 'Escape') {
                return;
            }
            
            // Montar chave do atalho
            const shortcutKey = this.getShortcutKey(
                e.key,
                e.ctrlKey || e.metaKey,
                e.shiftKey,
                e.altKey
            );
            
            // Verificar se atalho existe
            const shortcut = this.shortcuts.get(shortcutKey);
            
            if (shortcut) {
                // Verificar condição (se houver)
                if (shortcut.condition && !shortcut.condition()) {
                    return;
                }
                
                // Prevenir comportamento padrão
                e.preventDefault();
                
                // Executar ação
                try {
                    shortcut.action();
                    
                    // Mostrar notificação (se habilitado)
                    if (this.config.showNotifications && shortcut.key !== 'Escape') {
                        this.showShortcutNotification(shortcut);
                    }
                } catch (error) {
                    console.error('Erro ao executar atalho:', error);
                }
            }
        });
    }

    /**
     * Gera chave única para o atalho
     * 
     * @param {string} key
     * @param {boolean} ctrl
     * @param {boolean} shift
     * @param {boolean} alt
     * @returns {string}
     */
    getShortcutKey(key, ctrl = false, shift = false, alt = false) {
        const parts = [];
        if (ctrl) parts.push('ctrl');
        if (shift) parts.push('shift');
        if (alt) parts.push('alt');
        parts.push(key.toLowerCase());
        return parts.join('+');
    }

    /**
     * Gera label visual do atalho
     * 
     * @param {string} key
     * @param {boolean} ctrl
     * @param {boolean} shift
     * @param {boolean} alt
     * @returns {string}
     */
    getShortcutLabel(key, ctrl = false, shift = false, alt = false) {
        const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
        const parts = [];
        
        if (ctrl) parts.push(isMac ? '⌘' : 'Ctrl');
        if (shift) parts.push(isMac ? '⇧' : 'Shift');
        if (alt) parts.push(isMac ? '⌥' : 'Alt');
        parts.push(key.length === 1 ? key.toUpperCase() : key);
        
        return parts.join('+');
    }

    /**
     * Ações dos atalhos
     */
    
    focusSearch() {
        if (this.searchInput) {
            this.searchInput.focus();
            this.searchInput.select();
            console.log('🔍 Foco no campo de busca');
        }
    }

    openExport() {
        if (this.dashboard.exportManager) {
            this.dashboard.exportManager.showExportModal('servidores');
            console.log('📤 Modal de exportação aberto');
        } else if (this.exportButton) {
            this.exportButton.click();
        }
    }

    openFileUpload() {
        if (this.fileInput) {
            this.fileInput.click();
            console.log('📁 Seletor de arquivo aberto');
        }
    }

    closeActiveModals() {
        // Fechar modais Bootstrap
        const modals = document.querySelectorAll('.modal.show');
        modals.forEach(modal => {
            const bsModal = bootstrap.Modal.getInstance(modal);
            if (bsModal) {
                bsModal.hide();
            }
        });
        
        // Fechar dropdowns
        const dropdowns = document.querySelectorAll('.dropdown-menu.show');
        dropdowns.forEach(dropdown => {
            dropdown.classList.remove('show');
        });
        
        // Fechar autocomplete
        const autocomplete = document.querySelector('.autocomplete-dropdown');
        if (autocomplete) {
            autocomplete.style.display = 'none';
        }
        
        console.log('❌ Modais e dropdowns fechados');
    }

    clearSearch() {
        if (this.searchInput && document.activeElement === this.searchInput) {
            this.searchInput.value = '';
            this.searchInput.dispatchEvent(new Event('input', { bubbles: true }));
            console.log('🧹 Busca limpa');
        }
    }

    openFiltersPanel() {
        // Tentar abrir modal de filtros avançados
        const filterModal = document.getElementById('advancedFiltersModal');
        if (filterModal) {
            const bsModal = new bootstrap.Modal(filterModal);
            bsModal.show();
            console.log('🎛️ Painel de filtros aberto');
        } else {
            // Se não houver modal, tentar clicar no botão de adicionar filtro
            const addFilterBtn = document.getElementById('addFilterBtn');
            if (addFilterBtn) {
                addFilterBtn.click();
                console.log('🎛️ Botão de filtros clicado');
            }
        }
    }

    clearAllFilters() {
        // Limpar filtros do AdvancedFilterManager
        if (this.dashboard.advancedFilterManager) {
            this.dashboard.advancedFilterManager.clearAll();
        }
        
        // Limpar filtros da sidebar (FilterManager antigo)
        if (this.dashboard.filterManager) {
            // Resetar idade
            const minAge = document.getElementById('minAge');
            const maxAge = document.getElementById('maxAge');
            if (minAge) minAge.value = '';
            if (maxAge) maxAge.value = '';
            
            // Resetar mês
            const monthFilter = document.getElementById('monthFilter');
            if (monthFilter) monthFilter.value = 'all';
            
            // Resetar urgência se existir
            const urgencyFilter = document.querySelector('[name="urgencyFilter"]');
            if (urgencyFilter) {
                const allOption = document.querySelector('[name="urgencyFilter"][value="all"]');
                if (allOption) allOption.checked = true;
            }
        }
        
        // Limpar busca também
        if (this.searchInput) {
            this.searchInput.value = '';
        }
        
        // Aplicar filtros limpos
        if (this.dashboard.applyFilters) {
            this.dashboard.applyFilters();
        }
        
        console.log('🧹 TODOS os filtros limpos (avançados + sidebar + busca)');
    }

    reloadFromCache() {
        if (this.dashboard.cacheManager) {
            this.dashboard.cacheManager.getRecentFiles().then(files => {
                if (files.length > 0) {
                    this.dashboard.cacheManager.loadFileById(files[0].id);
                    console.log('🔄 Dados recarregados do cache');
                }
            });
        }
    }

    /**
     * Mostra notificação do atalho executado
     * 
     * @param {Object} shortcut
     */
    showShortcutNotification(shortcut) {
        // Criar toast simples
        const toast = document.createElement('div');
        toast.className = 'shortcut-toast';
        toast.innerHTML = `
            <div class="shortcut-toast-content">
                <span class="shortcut-key">${this.getShortcutLabel(shortcut.key, shortcut.ctrl, shortcut.shift, shortcut.alt)}</span>
                <span class="shortcut-desc">${shortcut.description}</span>
            </div>
        `;
        
        document.body.appendChild(toast);
        
        // Animar entrada
        setTimeout(() => toast.classList.add('show'), 10);
        
        // Remover após 2s
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, 2000);
    }

    /**
     * Cria modal de ajuda com todos os atalhos
     */
    createHelpModal() {
        const modalHTML = `
            <div class="modal fade" id="keyboardShortcutsModal" tabindex="-1">
                <div class="modal-dialog modal-lg">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">
                                <i class="bi bi-keyboard"></i> Atalhos de Teclado
                            </h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            <div id="shortcutsHelpContent"></div>
                        </div>
                        <div class="modal-footer">
                            <label class="form-check">
                                <input type="checkbox" class="form-check-input" id="showShortcutNotifications" checked>
                                <span class="form-check-label">Mostrar notificações ao usar atalhos</span>
                            </label>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // Adicionar ao DOM se não existir
        if (!document.getElementById('keyboardShortcutsModal')) {
            document.body.insertAdjacentHTML('beforeend', modalHTML);
            
            // Setup checkbox
            const checkbox = document.getElementById('showShortcutNotifications');
            if (checkbox) {
                checkbox.addEventListener('change', (e) => {
                    this.config.showNotifications = e.target.checked;
                    this.savePreferences();
                });
            }
        }
    }

    /**
     * Toggle modal de ajuda
     */
    toggleHelpModal() {
        const modal = document.getElementById('keyboardShortcutsModal');
        if (!modal) return;
        
        // Renderizar conteúdo
        this.renderHelpContent();
        
        // Abrir modal
        const bsModal = new bootstrap.Modal(modal);
        bsModal.show();
        
        console.log('❓ Modal de ajuda aberto');
    }

    /**
     * Renderiza conteúdo do modal de ajuda
     */
    renderHelpContent() {
        const content = document.getElementById('shortcutsHelpContent');
        if (!content) return;
        
        // Agrupar atalhos por categoria
        const categories = new Map();
        
        for (const [key, shortcut] of this.shortcuts) {
            if (!categories.has(shortcut.category)) {
                categories.set(shortcut.category, []);
            }
            categories.get(shortcut.category).push({
                ...shortcut,
                label: this.getShortcutLabel(shortcut.key, shortcut.ctrl, shortcut.shift, shortcut.alt)
            });
        }
        
        // Renderizar HTML
        let html = '';
        
        for (const [category, shortcuts] of categories) {
            html += `
                <div class="shortcuts-category">
                    <h6 class="shortcuts-category-title">${category}</h6>
                    <div class="shortcuts-list">
            `;
            
            for (const shortcut of shortcuts) {
                html += `
                    <div class="shortcut-item">
                        <kbd class="shortcut-kbd">${shortcut.label}</kbd>
                        <span class="shortcut-description">${shortcut.description}</span>
                    </div>
                `;
            }
            
            html += `
                    </div>
                </div>
            `;
        }
        
        content.innerHTML = html;
    }

    /**
     * Salva preferências no localStorage
     */
    savePreferences() {
        try {
            localStorage.setItem('keyboardShortcutsConfig', JSON.stringify(this.config));
        } catch (error) {
            console.warn('Erro ao salvar preferências:', error);
        }
    }

    /**
     * Carrega preferências do localStorage
     */
    loadPreferences() {
        try {
            const stored = localStorage.getItem('keyboardShortcutsConfig');
            if (stored) {
                const config = JSON.parse(stored);
                this.config = { ...this.config, ...config };
                
                // Atualizar checkbox se modal existir
                const checkbox = document.getElementById('showShortcutNotifications');
                if (checkbox) {
                    checkbox.checked = this.config.showNotifications;
                }
            }
        } catch (error) {
            console.warn('Erro ao carregar preferências:', error);
        }
    }

    /**
     * Habilita/Desabilita atalhos
     * 
     * @param {boolean} enabled
     */
    setEnabled(enabled) {
        this.config.enabled = enabled;
        this.savePreferences();
    }

    /**
     * Retorna lista de todos os atalhos
     * 
     * @returns {Array}
     */
    getShortcuts() {
        const shortcuts = [];
        for (const [key, shortcut] of this.shortcuts) {
            shortcuts.push({
                ...shortcut,
                label: this.getShortcutLabel(shortcut.key, shortcut.ctrl, shortcut.shift, shortcut.alt)
            });
        }
        return shortcuts;
    }

    /**
     * Remove um atalho
     * 
     * @param {string} key
     * @param {boolean} ctrl
     * @param {boolean} shift
     * @param {boolean} alt
     */
    unregisterShortcut(key, ctrl = false, shift = false, alt = false) {
        const shortcutKey = this.getShortcutKey(key, ctrl, shift, alt);
        this.shortcuts.delete(shortcutKey);
        console.log(`❌ Atalho removido: ${this.getShortcutLabel(key, ctrl, shift, alt)}`);
    }

    /**
     * Retorna estatísticas
     * 
     * @returns {Object}
     */
    getStats() {
        return {
            enabled: this.config.enabled,
            totalShortcuts: this.shortcuts.size,
            showNotifications: this.config.showNotifications,
            categories: [...new Set([...this.shortcuts.values()].map(s => s.category))]
        };
    }
}

// Exportar para uso global
if (typeof window !== 'undefined') {
    window.KeyboardShortcutsManager = KeyboardShortcutsManager;
}
