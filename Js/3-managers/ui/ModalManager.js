/**
 * ModalManager - Gerenciamento de modais
 *
 * Responsabilidades:
 * - Abrir/fechar modais
 * - Gerenciar stack de modais
 * - Trap de foco para acessibilidade
 * - Animações de entrada/saída
 * - ESC para fechar
 *
 * @module 3-managers/ui/ModalManager
 */

class ModalManager {
    /**
     * Construtor
     * @param {Object} app - Instância do App/Dashboard
     */
    constructor(app) {
        this.app = app;

        // Stack de modais abertos
        this.modalStack = [];

        // Elemento com foco anterior
        this.previousFocus = null;

        // Event listeners
        this.escapeHandler = null;
        this.clickOutsideHandler = null;

        console.log('✅ ModalManager inicializado');
    }

    /**
     * Inicializa o manager
     */
    init() {
        // Setup global event listeners
        this._setupGlobalListeners();

        // Setup modais existentes
        this._setupExistingModals();

        console.log('📋 Modais configurados');
    }

    /**
     * Abre modal
     * @param {string} modalId - ID do modal
     * @param {Object} options - Opções de abertura
     */
    open(modalId, options = {}) {
        const modal = document.getElementById(modalId);

        if (!modal) {
            console.warn(`Modal ${modalId} não encontrado`);
            return;
        }

        // Salvar foco anterior
        this.previousFocus = document.activeElement;

        // Adicionar ao stack
        this.modalStack.push(modalId);

        // Mostrar modal
        modal.style.display = 'flex';
        modal.setAttribute('aria-hidden', 'false');

        // Animação de entrada
        requestAnimationFrame(() => {
            modal.classList.add('show');
        });

        // Focar no modal
        setTimeout(() => {
            this._trapFocus(modal);
        }, 100);

        // Bloquear scroll do body
        document.body.style.overflow = 'hidden';

        // Callback
        if (options.onOpen) {
            options.onOpen(modal);
        }

        // Atualizar UIStateManager
        if (this.app?.uiStateManager) {
            this.app.uiStateManager.openModal(modalId);
        }

        console.log(`📋 Modal aberto: ${modalId}`);
    }

    /**
     * Fecha modal
     * @param {string} modalId - ID do modal
     * @param {Object} options - Opções de fechamento
     */
    close(modalId, options = {}) {
        const modal = document.getElementById(modalId);

        if (!modal) {
            console.warn(`Modal ${modalId} não encontrado`);
            return;
        }

        // Remover do stack
        this.modalStack = this.modalStack.filter(id => id !== modalId);

        // Animação de saída
        modal.classList.remove('show');

        // Ocultar após animação
        setTimeout(() => {
            modal.style.display = 'none';
            modal.setAttribute('aria-hidden', 'true');

            // Restaurar foco
            if (this.previousFocus && this.modalStack.length === 0) {
                this.previousFocus.focus();
                this.previousFocus = null;
            }

            // Desbloquear scroll se não houver mais modais
            if (this.modalStack.length === 0) {
                document.body.style.overflow = '';
            }

            // Callback
            if (options.onClose) {
                options.onClose(modal);
            }
        }, 300); // Duração da animação CSS

        // Atualizar UIStateManager
        if (this.app?.uiStateManager) {
            this.app.uiStateManager.closeModal(modalId);
        }

        console.log(`📋 Modal fechado: ${modalId}`);
    }

    /**
     * Alterna modal
     * @param {string} modalId - ID do modal
     */
    toggle(modalId) {
        const modal = document.getElementById(modalId);

        if (!modal) {
            console.warn(`Modal ${modalId} não encontrado`);
            return;
        }

        const isOpen = modal.style.display === 'flex';

        if (isOpen) {
            this.close(modalId);
        } else {
            this.open(modalId);
        }
    }

    /**
     * Fecha todos os modais
     */
    closeAll() {
        // Copiar stack para evitar problemas de iteração
        const modalsToClose = [...this.modalStack];

        modalsToClose.forEach(modalId => {
            this.close(modalId);
        });

        console.log('📋 Todos os modais fechados');
    }

    /**
     * Verifica se modal está aberto
     * @param {string} modalId - ID do modal
     * @returns {boolean}
     */
    isOpen(modalId) {
        return this.modalStack.includes(modalId);
    }

    /**
     * Retorna modal do topo do stack
     * @returns {string|null}
     */
    getTopModal() {
        return this.modalStack[this.modalStack.length - 1] || null;
    }

    /**
     * Setup event listeners globais
     * @private
     */
    _setupGlobalListeners() {
        // ESC para fechar modal do topo
        this.escapeHandler = (e) => {
            if (e.key === 'Escape') {
                const topModal = this.getTopModal();
                if (topModal) {
                    this.close(topModal);
                }
            }
        };

        document.addEventListener('keydown', this.escapeHandler);
    }

    /**
     * Setup modais existentes no DOM
     * @private
     */
    _setupExistingModals() {
        const modals = document.querySelectorAll('[role="dialog"], .modal');

        modals.forEach(modal => {
            const modalId = modal.id;

            if (!modalId) return;

            // Botão de fechar (X)
            const closeBtn = modal.querySelector('[data-modal-close], .btn-close, .modal-close');
            if (closeBtn) {
                closeBtn.addEventListener('click', () => {
                    this.close(modalId);
                });
            }

            // Clique fora do modal (backdrop)
            const backdrop = modal.querySelector('.modal-backdrop');
            if (backdrop) {
                backdrop.addEventListener('click', (e) => {
                    if (e.target === backdrop) {
                        this.close(modalId);
                    }
                });
            }

            // Clique no próprio modal (se for overlay)
            if (modal.classList.contains('modal-overlay')) {
                modal.addEventListener('click', (e) => {
                    if (e.target === modal) {
                        this.close(modalId);
                    }
                });
            }

            // Garantir que modal está oculto inicialmente
            modal.style.display = 'none';
            modal.setAttribute('aria-hidden', 'true');
        });
    }

    /**
     * Trap de foco dentro do modal (acessibilidade)
     * @private
     * @param {HTMLElement} modal - Elemento do modal
     */
    _trapFocus(modal) {
        // Elementos focáveis
        const focusableElements = modal.querySelectorAll(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );

        if (focusableElements.length === 0) return;

        const firstFocusable = focusableElements[0];
        const lastFocusable = focusableElements[focusableElements.length - 1];

        // Focar no primeiro elemento
        firstFocusable.focus();

        // Listener para trap de foco
        const trapHandler = (e) => {
            if (e.key !== 'Tab') return;

            if (e.shiftKey) {
                // Shift + Tab
                if (document.activeElement === firstFocusable) {
                    e.preventDefault();
                    lastFocusable.focus();
                }
            } else {
                // Tab
                if (document.activeElement === lastFocusable) {
                    e.preventDefault();
                    firstFocusable.focus();
                }
            }
        };

        modal.addEventListener('keydown', trapHandler);

        // Remover listener ao fechar
        modal.dataset.trapHandler = 'active';
    }

    /**
     * Cria modal dinamicamente
     * @param {Object} config - Configuração do modal
     * @returns {HTMLElement} - Elemento do modal
     */
    createModal(config) {
        const {
            id,
            title,
            content,
            footer,
            size = 'medium', // small, medium, large
            closeButton = true
        } = config;

        const modal = document.createElement('div');
        modal.id = id;
        modal.className = `modal modal-${size}`;
        modal.setAttribute('role', 'dialog');
        modal.setAttribute('aria-modal', 'true');
        modal.setAttribute('aria-labelledby', `${id}-title`);
        modal.style.display = 'none';

        modal.innerHTML = `
            <div class="modal-backdrop"></div>
            <div class="modal-content">
                <div class="modal-header">
                    <div class="modal-title-section">
                        <h3 id="${id}-title">${title}</h3>
                    </div>
                    ${closeButton ? `
                        <button class="btn-close" data-modal-close aria-label="Fechar modal">
                            <i class="bi bi-x"></i>
                        </button>
                    ` : ''}
                </div>
                <div class="modal-body">
                    ${content}
                </div>
                ${footer ? `
                    <div class="modal-footer">
                        ${footer}
                    </div>
                ` : ''}
            </div>
        `;

        document.body.appendChild(modal);
        this._setupExistingModals(); // Re-setup

        console.log(`📋 Modal criado: ${id}`);

        return modal;
    }

    /**
     * Remove modal do DOM
     * @param {string} modalId - ID do modal
     */
    destroyModal(modalId) {
        const modal = document.getElementById(modalId);

        if (!modal) {
            console.warn(`Modal ${modalId} não encontrado`);
            return;
        }

        // Fechar se estiver aberto
        if (this.isOpen(modalId)) {
            this.close(modalId);
        }

        // Remover do DOM
        modal.remove();

        console.log(`📋 Modal removido: ${modalId}`);
    }

    /**
     * Atualiza conteúdo do modal
     * @param {string} modalId - ID do modal
     * @param {string} content - Novo conteúdo HTML
     */
    updateContent(modalId, content) {
        const modal = document.getElementById(modalId);

        if (!modal) {
            console.warn(`Modal ${modalId} não encontrado`);
            return;
        }

        const modalBody = modal.querySelector('.modal-body');

        if (modalBody) {
            modalBody.innerHTML = content;
        }
    }

    /**
     * Atualiza título do modal
     * @param {string} modalId - ID do modal
     * @param {string} title - Novo título
     */
    updateTitle(modalId, title) {
        const modal = document.getElementById(modalId);

        if (!modal) {
            console.warn(`Modal ${modalId} não encontrado`);
            return;
        }

        const titleElement = modal.querySelector('.modal-title-section h3');

        if (titleElement) {
            titleElement.textContent = title;
        }
    }

    /**
     * Cleanup - remove event listeners
     */
    destroy() {
        if (this.escapeHandler) {
            document.removeEventListener('keydown', this.escapeHandler);
        }

        this.closeAll();

        console.log('📋 ModalManager destruído');
    }

    /**
     * Debug info
     * @returns {Object}
     */
    getDebugInfo() {
        return {
            openModals: [...this.modalStack],
            modalCount: this.modalStack.length,
            topModal: this.getTopModal()
        };
    }
}

// Expor globalmente
if (typeof window !== 'undefined') {
    window.ModalManager = ModalManager;
}

// Exportar para Node.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ModalManager;
}
