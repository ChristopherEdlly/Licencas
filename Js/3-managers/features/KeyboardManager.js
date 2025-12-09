/**
 * KeyboardManager - Gerenciamento de atalhos de teclado
 *
 * Responsabilidades:
 * - Registrar atalhos de teclado
 * - Detectar combinações de teclas
 * - Prevenir conflitos
 * - Ativar/desativar atalhos
 * - Ajuda de atalhos
 *
 * @module 3-managers/features/KeyboardManager
 */

class KeyboardManager {
    /**
     * Construtor
     * @param {Object} app - Referência à aplicação
     */
    constructor(app) {
        this.app = app;

        // Atalhos registrados
        this.shortcuts = new Map();

        // Estado
        this.enabled = true;
        this.modalOpen = false;

        // Teclas pressionadas (para combinações)
        this.pressedKeys = new Set();

        // Atalhos predefinidos
        this._registerDefaultShortcuts();

        // Event listener
        this._attachListeners();

        console.log('✅ KeyboardManager criado');
    }

    // ==================== INICIALIZAÇÃO ====================

    /**
     * Registra atalhos padrão
     * @private
     */
    _registerDefaultShortcuts() {
        // Navegação
        this.register('Ctrl+1', 'Ir para página Home', () => this._navigateTo('home'));
        this.register('Ctrl+2', 'Ir para página Calendário', () => this._navigateTo('calendar'));
        this.register('Ctrl+3', 'Ir para página Timeline', () => this._navigateTo('timeline'));
        this.register('Ctrl+4', 'Ir para página Relatórios', () => this._navigateTo('reports'));
        this.register('Ctrl+5', 'Ir para página Configurações', () => this._navigateTo('settings'));

        // Ações
        this.register('Ctrl+K', 'Focar busca', () => this._focusSearch());
        this.register('Ctrl+F', 'Abrir filtros', () => this._openFilters());
        this.register('Ctrl+D', 'Alternar tema', () => this._toggleTheme());
        this.register('Ctrl+H', 'Alternar alto contraste', () => this._toggleHighContrast());
        this.register('Ctrl+/', 'Exibir atalhos', () => this.showHelp());

        // Modais
        this.register('Escape', 'Fechar modal', () => this._closeModal());

        // Exportação
        this.register('Ctrl+E', 'Exportar dados', () => this._export());
        this.register('Ctrl+P', 'Imprimir', () => this._print());

        // Seleção
        this.register('Ctrl+A', 'Selecionar tudo', (e) => this._selectAll(e));

        console.log(`⌨️ ${this.shortcuts.size} atalhos registrados`);
    }

    /**
     * Anexa event listeners
     * @private
     */
    _attachListeners() {
        if (typeof document === 'undefined') return;

        document.addEventListener('keydown', (e) => this._handleKeyDown(e));
        document.addEventListener('keyup', (e) => this._handleKeyUp(e));

        // Detectar quando modal está aberto
        if (typeof MutationObserver !== 'undefined') {
            const observer = new MutationObserver(() => {
                this.modalOpen = document.querySelector('.modal.show') !== null;
            });

            observer.observe(document.body, {
                attributes: true,
                subtree: true,
                attributeFilter: ['class']
            });
        }
    }

    // ==================== REGISTRO DE ATALHOS ====================

    /**
     * Registra novo atalho
     * @param {string} keys - Combinação de teclas (ex: 'Ctrl+K', 'Alt+S')
     * @param {string} description - Descrição do atalho
     * @param {Function} callback - Função a executar
     * @param {Object} options - Opções (preventDefault, stopPropagation)
     */
    register(keys, description, callback, options = {}) {
        const normalizedKeys = this._normalizeKeys(keys);

        if (this.shortcuts.has(normalizedKeys)) {
            console.warn(`Atalho já registrado: ${normalizedKeys}`);
            return;
        }

        this.shortcuts.set(normalizedKeys, {
            keys: normalizedKeys,
            originalKeys: keys,
            description,
            callback,
            preventDefault: options.preventDefault !== false,
            stopPropagation: options.stopPropagation || false,
            enabled: true
        });

        console.log(`⌨️ Atalho registrado: ${keys}`);
    }

    /**
     * Remove atalho
     * @param {string} keys - Combinação de teclas
     */
    unregister(keys) {
        const normalizedKeys = this._normalizeKeys(keys);

        if (this.shortcuts.delete(normalizedKeys)) {
            console.log(`🗑️ Atalho removido: ${keys}`);
        }
    }

    /**
     * Ativa/desativa atalho específico
     * @param {string} keys - Combinação de teclas
     * @param {boolean} enabled - Ativado
     */
    setShortcutEnabled(keys, enabled) {
        const normalizedKeys = this._normalizeKeys(keys);
        const shortcut = this.shortcuts.get(normalizedKeys);

        if (shortcut) {
            shortcut.enabled = enabled;
            console.log(`⌨️ Atalho ${enabled ? 'ativado' : 'desativado'}: ${keys}`);
        }
    }

    // ==================== MANIPULAÇÃO DE EVENTOS ====================

    /**
     * Manipula keydown
     * @private
     */
    _handleKeyDown(e) {
        if (!this.enabled) return;

        // Adicionar tecla ao set
        this.pressedKeys.add(e.key.toLowerCase());

        // Construir combinação atual
        const combination = this._buildCombination(e);

        // Verificar se existe atalho registrado
        const shortcut = this.shortcuts.get(combination);

        if (shortcut && shortcut.enabled) {
            // Verificar contexto
            if (this._shouldIgnoreShortcut(e, shortcut)) {
                return;
            }

            // Prevenir comportamento padrão
            if (shortcut.preventDefault) {
                e.preventDefault();
            }

            if (shortcut.stopPropagation) {
                e.stopPropagation();
            }

            // Executar callback
            try {
                shortcut.callback(e);
                console.log(`⌨️ Atalho executado: ${shortcut.originalKeys}`);
            } catch (error) {
                console.error(`Erro ao executar atalho ${shortcut.originalKeys}:`, error);
            }
        }
    }

    /**
     * Manipula keyup
     * @private
     */
    _handleKeyUp(e) {
        this.pressedKeys.delete(e.key.toLowerCase());
    }

    /**
     * Constrói combinação de teclas a partir do evento
     * @private
     */
    _buildCombination(e) {
        const parts = [];

        if (e.ctrlKey || e.metaKey) parts.push('ctrl');
        if (e.altKey) parts.push('alt');
        if (e.shiftKey) parts.push('shift');

        // Adicionar tecla principal (não modificadora)
        const key = e.key.toLowerCase();
        if (!['control', 'alt', 'shift', 'meta'].includes(key)) {
            parts.push(key);
        }

        return parts.join('+');
    }

    /**
     * Normaliza string de teclas
     * @private
     */
    _normalizeKeys(keys) {
        return keys
            .toLowerCase()
            .replace(/\s+/g, '')
            .split('+')
            .sort()
            .join('+');
    }

    /**
     * Verifica se deve ignorar atalho no contexto atual
     * @private
     */
    _shouldIgnoreShortcut(e, shortcut) {
        // Ignorar se estiver em input/textarea (exceto Escape)
        const target = e.target;
        const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;

        if (isInput && shortcut.keys !== 'escape') {
            return true;
        }

        return false;
    }

    // ==================== AÇÕES PREDEFINIDAS ====================

    /**
     * Navega para página
     * @private
     */
    _navigateTo(page) {
        if (this.app && typeof this.app.navigateToPage === 'function') {
            this.app.navigateToPage(page);
        } else {
            console.warn('Método navigateToPage não disponível');
        }
    }

    /**
     * Foca campo de busca
     * @private
     */
    _focusSearch() {
        const searchInput = document.querySelector('#searchInput, .search-input, input[type="search"]');
        if (searchInput) {
            searchInput.focus();
            searchInput.select();
        }
    }

    /**
     * Abre filtros
     * @private
     */
    _openFilters() {
        const filterBtn = document.querySelector('#filterBtn, .filter-btn');
        if (filterBtn) {
            filterBtn.click();
        }
    }

    /**
     * Alterna tema
     * @private
     */
    _toggleTheme() {
        if (typeof window.themeManager !== 'undefined') {
            window.themeManager.toggleTheme();
        }
    }

    /**
     * Alterna alto contraste
     * @private
     */
    _toggleHighContrast() {
        if (typeof window.themeManager !== 'undefined') {
            window.themeManager.toggleHighContrast();
        }
    }

    /**
     * Fecha modal
     * @private
     */
    _closeModal() {
        if (!this.modalOpen) return;

        const modal = document.querySelector('.modal.show');
        if (modal) {
            const closeBtn = modal.querySelector('.close, .btn-close, [data-dismiss="modal"]');
            if (closeBtn) {
                closeBtn.click();
            }
        }
    }

    /**
     * Exporta dados
     * @private
     */
    _export() {
        const exportBtn = document.querySelector('#exportBtn, .export-btn');
        if (exportBtn) {
            exportBtn.click();
        }
    }

    /**
     * Imprime
     * @private
     */
    _print() {
        if (typeof window !== 'undefined') {
            window.print();
        }
    }

    /**
     * Seleciona tudo
     * @private
     */
    _selectAll(e) {
        // Permitir comportamento padrão em inputs
        const target = e.target;
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
            return;
        }

        // Selecionar todas as linhas da tabela
        e.preventDefault();
        const checkboxes = document.querySelectorAll('table input[type="checkbox"]');
        checkboxes.forEach(cb => cb.checked = true);
    }

    // ==================== AJUDA ====================

    /**
     * Exibe modal com lista de atalhos
     */
    showHelp() {
        if (typeof document === 'undefined') return;

        // Verificar se modal já existe
        let modal = document.getElementById('keyboardShortcutsModal');
        if (!modal) {
            modal = this._createHelpModal();
            document.body.appendChild(modal);
        }

        // Mostrar modal
        modal.style.display = 'flex';
        modal.classList.add('show');
    }

    /**
     * Cria modal de ajuda
     * @private
     */
    _createHelpModal() {
        const modal = document.createElement('div');
        modal.id = 'keyboardShortcutsModal';
        modal.className = 'modal';
        modal.style.cssText = `
            display: none;
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.5);
            z-index: 10000;
            align-items: center;
            justify-content: center;
        `;

        const content = document.createElement('div');
        content.style.cssText = `
            background: var(--card-bg, #fff);
            padding: 30px;
            border-radius: 8px;
            max-width: 600px;
            max-height: 80vh;
            overflow-y: auto;
            box-shadow: 0 4px 12px rgba(0,0,0,0.2);
        `;

        // Cabeçalho
        content.innerHTML = `
            <h2 style="margin-top: 0;">⌨️ Atalhos de Teclado</h2>
            <p>Use os atalhos abaixo para navegar mais rapidamente:</p>
        `;

        // Lista de atalhos
        const list = document.createElement('div');
        list.style.cssText = 'display: flex; flex-direction: column; gap: 10px; margin: 20px 0;';

        // Agrupar por categoria
        const categories = {
            'Navegação': [],
            'Ações': [],
            'Modais': [],
            'Outros': []
        };

        this.shortcuts.forEach(shortcut => {
            let category = 'Outros';
            if (shortcut.description.includes('página')) category = 'Navegação';
            else if (shortcut.description.includes('modal')) category = 'Modais';
            else if (['busca', 'filtros', 'tema', 'contraste', 'exportar'].some(w => shortcut.description.toLowerCase().includes(w))) {
                category = 'Ações';
            }

            categories[category].push(shortcut);
        });

        Object.keys(categories).forEach(category => {
            if (categories[category].length === 0) return;

            const categoryTitle = document.createElement('h4');
            categoryTitle.textContent = category;
            categoryTitle.style.cssText = 'margin: 15px 0 5px 0; color: var(--primary-color, #007bff);';
            list.appendChild(categoryTitle);

            categories[category].forEach(shortcut => {
                const item = document.createElement('div');
                item.style.cssText = `
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 8px;
                    background: var(--bg-secondary, #f8f9fa);
                    border-radius: 4px;
                `;

                const keys = document.createElement('kbd');
                keys.textContent = shortcut.originalKeys;
                keys.style.cssText = `
                    background: #fff;
                    border: 1px solid #ccc;
                    border-radius: 3px;
                    padding: 2px 6px;
                    font-family: monospace;
                    font-size: 0.9rem;
                `;

                const desc = document.createElement('span');
                desc.textContent = shortcut.description;
                desc.style.flex = '1';
                desc.style.marginRight = '10px';

                item.appendChild(desc);
                item.appendChild(keys);
                list.appendChild(item);
            });
        });

        content.appendChild(list);

        // Botão fechar
        const closeBtn = document.createElement('button');
        closeBtn.textContent = 'Fechar';
        closeBtn.className = 'btn btn-primary';
        closeBtn.style.cssText = 'width: 100%; margin-top: 10px;';
        closeBtn.onclick = () => {
            modal.style.display = 'none';
            modal.classList.remove('show');
        };

        content.appendChild(closeBtn);
        modal.appendChild(content);

        // Fechar ao clicar fora
        modal.onclick = (e) => {
            if (e.target === modal) {
                modal.style.display = 'none';
                modal.classList.remove('show');
            }
        };

        return modal;
    }

    // ==================== CONTROLE ====================

    /**
     * Ativa gerenciador
     */
    enable() {
        this.enabled = true;
        console.log('⌨️ Atalhos de teclado ativados');
    }

    /**
     * Desativa gerenciador
     */
    disable() {
        this.enabled = false;
        console.log('⌨️ Atalhos de teclado desativados');
    }

    /**
     * Verifica se está ativo
     * @returns {boolean}
     */
    isEnabled() {
        return this.enabled;
    }

    /**
     * Retorna todos os atalhos registrados
     * @returns {Array<Object>}
     */
    getAllShortcuts() {
        return Array.from(this.shortcuts.values()).map(s => ({
            keys: s.originalKeys,
            description: s.description,
            enabled: s.enabled
        }));
    }

    /**
     * Informações de debug
     * @returns {Object}
     */
    getDebugInfo() {
        return {
            enabled: this.enabled,
            shortcutsCount: this.shortcuts.size,
            modalOpen: this.modalOpen,
            pressedKeys: Array.from(this.pressedKeys)
        };
    }

    /**
     * Destrói o gerenciador
     */
    destroy() {
        if (typeof document !== 'undefined') {
            document.removeEventListener('keydown', this._handleKeyDown);
            document.removeEventListener('keyup', this._handleKeyUp);
        }

        this.shortcuts.clear();
        this.pressedKeys.clear();

        console.log('🗑️ KeyboardManager destruído');
    }
}

// Expor classe
if (typeof window !== 'undefined') {
    window.KeyboardManager = KeyboardManager;
}

// Exportar para Node.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = KeyboardManager;
}
