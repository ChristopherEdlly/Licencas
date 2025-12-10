/**
 * TipsPage - Controller da página de dicas e atalhos
 *
 * Responsabilidades:
 * - Renderizar lista de atalhos de teclado dinamicamente
 * - Exibir dicas de uso do sistema
 * - Coordenar KeyboardShortcutsManager para exibir atalhos disponíveis
 * - Gerenciar glossário de termos
 *
 * @class TipsPage
 */
class TipsPage {
    /**
     * @param {Object} app - Referência ao App principal
     */
    constructor(app) {
        this.app = app;

        // Estado da página
        this.isActive = false;
        this.isInitialized = false;

        // Referências aos managers (serão inicializados no init)
        this.keyboardShortcutsManager = null;

        // Elementos do DOM (lazy loading)
        this.elements = {
            page: null,
            keyboardShortcutsGrid: null
        };

        // Dicas de uso (conteúdo estático)
        this.usageTips = [
            {
                icon: 'bi-funnel',
                title: 'Filtros Avançados',
                description: 'Use os filtros avançados na sidebar para refinar sua busca por cargo, lotação, superintendência e nível de urgência.'
            },
            {
                icon: 'bi-calendar3',
                title: 'Calendário Visual',
                description: 'Clique em qualquer dia no calendário para ver todos os servidores em licença naquela data.'
            },
            {
                icon: 'bi-clock-history',
                title: 'Timeline',
                description: 'Use a timeline para visualizar licenças distribuídas ao longo do tempo. Escolha entre visualização mensal, trimestral ou anual.'
            },
            {
                icon: 'bi-download',
                title: 'Exportação',
                description: 'Exporte seus dados filtrados em PDF, Excel ou CSV para análise offline.'
            },
            {
                icon: 'bi-search',
                title: 'Busca Inteligente',
                description: 'A busca na sidebar procura por nome, cargo e lotação automaticamente. Use o autocomplete para resultados mais rápidos.'
            },
            {
                icon: 'bi-moon-stars',
                title: 'Modo Escuro',
                description: 'Alterne entre modo claro e escuro usando o botão no canto superior direito ou o atalho Ctrl+D.'
            }
        ];

        // Glossário de termos
        this.glossary = [
            {
                term: 'Urgência Crítica',
                description: 'Licença termina ≤ 2 anos antes da aposentadoria'
            },
            {
                term: 'Urgência Alta',
                description: 'Licença termina entre 2-5 anos antes da aposentadoria'
            },
            {
                term: 'Urgência Moderada',
                description: 'Licença termina entre 5-7 anos antes da aposentadoria'
            },
            {
                term: 'Urgência Baixa',
                description: 'Licença termina > 7 anos antes da aposentadoria'
            }
        ];

        console.log('✅ TipsPage instanciado');
    }

    /**
     * Inicializa a página e seus managers
     * Deve ser chamado apenas uma vez
     */
    init() {
        if (this.isInitialized) {
            console.warn('⚠️ TipsPage já foi inicializado');
            return;
        }

        console.log('🔧 Inicializando TipsPage...');

        // 1. Cache de elementos do DOM
        this._cacheElements();

        // 2. Obter referências aos managers do App
        this._initManagers();

        // 3. Renderizar conteúdo estático (se necessário)
        // (A maior parte do conteúdo já está no HTML)

        this.isInitialized = true;
        console.log('✅ TipsPage inicializado');
    }

    /**
     * Faz cache dos elementos do DOM
     * @private
     */
    _cacheElements() {
        this.elements.page = document.getElementById('tipsPage');
        this.elements.keyboardShortcutsGrid = document.getElementById('keyboardShortcutsGrid');

        // Validar elementos críticos
        if (!this.elements.page) {
            console.error('❌ Elemento #tipsPage não encontrado no DOM');
        }
    }

    /**
     * Inicializa referências aos managers do App
     * @private
     */
    _initManagers() {
        // Managers de features
        this.keyboardShortcutsManager = this.app.keyboardShortcutsManager;

        // Validar managers críticos
        if (!this.keyboardShortcutsManager) {
            console.warn('⚠️ KeyboardShortcutsManager não disponível');
        }
    }

    /**
     * Renderiza a página com os dados atuais
     * Chamado quando a página é ativada
     */
    render() {
        if (!this.isInitialized) {
            console.warn('⚠️ TipsPage não foi inicializado. Chamando init()...');
            this.init();
        }

        console.log('🎨 Renderizando TipsPage...');

        // 1. Renderizar atalhos de teclado
        this._renderKeyboardShortcuts();

        console.log('✅ TipsPage renderizado');
    }

    /**
     * Renderiza grid de atalhos de teclado
     * @private
     */
    _renderKeyboardShortcuts() {
        if (!this.elements.keyboardShortcutsGrid) {
            console.warn('⚠️ Elemento keyboardShortcutsGrid não disponível');
            return;
        }

        // Se KeyboardShortcutsManager disponível, delegar renderização
        if (this.keyboardShortcutsManager && typeof this.keyboardShortcutsManager.renderShortcutsGrid === 'function') {
            this.keyboardShortcutsManager.renderShortcutsGrid(this.elements.keyboardShortcutsGrid);
            return;
        }

        // Fallback: renderizar manualmente lista de atalhos básicos
        const shortcuts = this._getDefaultShortcuts();

        const html = shortcuts.map(shortcut => `
            <div class="shortcut-item">
                <div class="shortcut-keys">
                    ${this._renderShortcutKeys(shortcut.keys)}
                </div>
                <div class="shortcut-description">
                    ${this._escapeHtml(shortcut.description)}
                </div>
            </div>
        `).join('');

        this.elements.keyboardShortcutsGrid.innerHTML = html;
    }

    /**
     * Obtém lista padrão de atalhos de teclado
     * @private
     * @returns {Array} Array de objetos de atalho
     */
    _getDefaultShortcuts() {
        return [
            {
                keys: ['Ctrl', 'K'],
                description: 'Focar no campo de busca'
            },
            {
                keys: ['Ctrl', 'D'],
                description: 'Alternar modo escuro/claro'
            },
            {
                keys: ['Ctrl', 'F'],
                description: 'Abrir filtros avançados'
            },
            {
                keys: ['Ctrl', 'Alt', 'H'],
                description: 'Alternar modo alto contraste'
            },
            {
                keys: ['Ctrl', '1'],
                description: 'Ir para página Inicial'
            },
            {
                keys: ['Ctrl', '2'],
                description: 'Ir para página Calendário'
            },
            {
                keys: ['Ctrl', '3'],
                description: 'Ir para página Timeline'
            },
            {
                keys: ['Ctrl', '4'],
                description: 'Ir para página Relatórios'
            },
            {
                keys: ['Ctrl', '5'],
                description: 'Ir para página Configurações'
            },
            {
                keys: ['?'],
                description: 'Mostrar ajuda de atalhos'
            },
            {
                keys: ['Escape'],
                description: 'Fechar modais e diálogos'
            }
        ];
    }

    /**
     * Renderiza teclas de atalho com formatação
     * @private
     * @param {Array} keys - Array de teclas
     * @returns {string} HTML das teclas
     */
    _renderShortcutKeys(keys) {
        return keys.map(key => `<kbd>${this._escapeHtml(key)}</kbd>`).join(' + ');
    }

    /**
     * Escapa HTML para prevenir XSS
     * @private
     * @param {string} text - Texto a escapar
     * @returns {string} Texto escapado
     */
    _escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * Ativa a página (torna visível)
     * Chamado pelo Router quando usuário navega para Tips
     */
    show() {
        if (!this.isInitialized) {
            this.init();
        }

        console.log('👁️ Mostrando TipsPage');

        // Tornar página visível
        if (this.elements.page) {
            this.elements.page.classList.add('active');
        }

        this.isActive = true;

        // Renderizar com dados atuais
        this.render();
    }

    /**
     * Desativa a página (esconde)
     * Chamado pelo Router quando usuário navega para outra página
     */
    hide() {
        console.log('🙈 Escondendo TipsPage');

        // Esconder página
        if (this.elements.page) {
            this.elements.page.classList.remove('active');
        }

        this.isActive = false;
    }

    /**
     * Obtém lista de dicas de uso
     * @returns {Array} Array de objetos de dica
     */
    getUsageTips() {
        return this.usageTips;
    }

    /**
     * Obtém glossário de termos
     * @returns {Array} Array de objetos de termo
     */
    getGlossary() {
        return this.glossary;
    }

    /**
     * Adiciona dica customizada (útil para extensões)
     * @param {Object} tip - Objeto com {icon, title, description}
     */
    addCustomTip(tip) {
        if (!tip || !tip.title || !tip.description) {
            console.warn('⚠️ Dica inválida:', tip);
            return;
        }

        this.usageTips.push({
            icon: tip.icon || 'bi-info-circle',
            title: tip.title,
            description: tip.description
        });

        // Re-renderizar se página estiver ativa
        if (this.isActive) {
            this.render();
        }
    }

    /**
     * Adiciona termo ao glossário (útil para extensões)
     * @param {Object} term - Objeto com {term, description}
     */
    addGlossaryTerm(term) {
        if (!term || !term.term || !term.description) {
            console.warn('⚠️ Termo inválido:', term);
            return;
        }

        this.glossary.push({
            term: term.term,
            description: term.description
        });

        // Re-renderizar se página estiver ativa
        if (this.isActive) {
            this.render();
        }
    }

    /**
     * Cleanup - Remove event listeners
     * Chamado quando a página é destruída (se necessário)
     */
    destroy() {
        console.log('🧹 Destruindo TipsPage...');

        this.isInitialized = false;
        this.isActive = false;

        console.log('✅ TipsPage destruído');
    }
}

// Exportar para uso no App
if (typeof window !== 'undefined') {
    window.TipsPage = TipsPage;
}

// Exportar para Node.js (testes)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TipsPage;
}
