/**
 * ImprovedTooltipManager.js
 * 
 * Sistema avançado de tooltips com acessibilidade WCAG 2.1
 * 
 * Funcionalidades:
 * - Tooltips customizados com melhor UX que os nativos
 * - Suporte para posicionamento inteligente (auto-ajuste)
 * - Acessível via teclado e leitores de tela
 * - Suporte para rich content (HTML)
 * - Animações suaves com redução de movimento
 * - Tooltips persistentes para elementos focados
 * - Atraso configurável para evitar poluição visual
 * 
 * @author Dashboard Licenças Premium
 * @version 3.0.0
 */

class ImprovedTooltipManager {
    constructor(dashboard) {
        this.dashboard = dashboard;
        
        // Configurações
        this.config = {
            showDelay: 500,        // ms para mostrar tooltip
            hideDelay: 200,        // ms para esconder tooltip
            offset: 10,            // px de distância do elemento
            maxWidth: 300,         // px largura máxima
            zIndex: 10000,
            animationDuration: 200 // ms duração da animação
        };
        
        // Estado
        this.activeTooltip = null;
        this.showTimeout = null;
        this.hideTimeout = null;
        this.hoveredElement = null;
        
        // Container de tooltips
        this.container = null;
        
        // Preferências de acessibilidade
        this.prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        
        this.init();
    }
    
    /**
     * Inicializa o gerenciador de tooltips
     */
    async init() {
        console.log('💬 Inicializando ImprovedTooltipManager...');
        
        try {
            // Cria container
            this.createContainer();
            
            // Inicializa tooltips existentes
            this.initializeTooltips();
            
            // Registra listeners globais
            this.registerGlobalListeners();
            
            // Observer para novos elementos
            this.observeDOM();
            
            console.log('✅ ImprovedTooltipManager inicializado');
            
        } catch (error) {
            console.error('❌ Erro ao inicializar ImprovedTooltipManager:', error);
        }
    }
    
    /**
     * Cria container para tooltips
     */
    createContainer() {
        if (document.getElementById('improved-tooltips-container')) {
            this.container = document.getElementById('improved-tooltips-container');
            return;
        }
        
        this.container = document.createElement('div');
        this.container.id = 'improved-tooltips-container';
        this.container.className = 'improved-tooltips-container';
        this.container.setAttribute('role', 'region');
        this.container.setAttribute('aria-live', 'polite');
        
        document.body.appendChild(this.container);
        
        console.log('📦 Container de tooltips criado');
    }
    
    /**
     * Inicializa tooltips em elementos existentes
     */
    initializeTooltips() {
        // Elementos com data-tooltip
        const elements = document.querySelectorAll('[data-tooltip]');
        
        elements.forEach(element => {
            this.attachTooltip(element);
        });
        
        // Também suporta title nativo (migra para data-tooltip)
        const elementsWithTitle = document.querySelectorAll('[title]:not([data-tooltip])');
        
        elementsWithTitle.forEach(element => {
            const title = element.getAttribute('title');
            if (title) {
                element.setAttribute('data-tooltip', title);
                element.removeAttribute('title'); // Remove para evitar tooltip nativo
                this.attachTooltip(element);
            }
        });
        
        console.log(`📌 ${elements.length + elementsWithTitle.length} tooltips inicializados`);
    }
    
    /**
     * Anexa tooltip a um elemento
     */
    attachTooltip(element) {
        // Verifica se já tem listeners
        if (element.hasAttribute('data-tooltip-attached')) {
            return;
        }
        
        // Mouse events
        element.addEventListener('mouseenter', (e) => this.handleMouseEnter(e));
        element.addEventListener('mouseleave', (e) => this.handleMouseLeave(e));
        element.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        
        // Keyboard events (acessibilidade)
        element.addEventListener('focus', (e) => this.handleFocus(e));
        element.addEventListener('blur', (e) => this.handleBlur(e));
        
        // Touch events (mobile)
        element.addEventListener('touchstart', (e) => this.handleTouchStart(e), { passive: true });
        element.addEventListener('touchend', (e) => this.handleTouchEnd(e), { passive: true });
        
        // Marca como attached
        element.setAttribute('data-tooltip-attached', 'true');
        
        // ARIA
        element.setAttribute('aria-describedby', this.getTooltipId(element));
    }
    
    /**
     * Gera ID único para tooltip
     */
    getTooltipId(element) {
        let id = element.getAttribute('data-tooltip-id');
        if (!id) {
            id = `tooltip-${Math.random().toString(36).substr(2, 9)}`;
            element.setAttribute('data-tooltip-id', id);
        }
        return id;
    }
    
    /**
     * Handler para mouse enter
     */
    handleMouseEnter(event) {
        const element = event.currentTarget;
        this.hoveredElement = element;
        
        // Cancela hide anterior
        if (this.hideTimeout) {
            clearTimeout(this.hideTimeout);
            this.hideTimeout = null;
        }
        
        // Agenda mostrar com delay
        this.showTimeout = setTimeout(() => {
            this.showTooltip(element, event);
        }, this.config.showDelay);
    }
    
    /**
     * Handler para mouse leave
     */
    handleMouseLeave(event) {
        const element = event.currentTarget;
        this.hoveredElement = null;
        
        // Cancela show agendado
        if (this.showTimeout) {
            clearTimeout(this.showTimeout);
            this.showTimeout = null;
        }
        
        // Agenda hide com delay
        this.hideTimeout = setTimeout(() => {
            this.hideTooltip();
        }, this.config.hideDelay);
    }
    
    /**
     * Handler para mouse move (atualiza posição)
     */
    handleMouseMove(event) {
        if (this.activeTooltip && this.activeTooltip.element === event.currentTarget) {
            this.updatePosition(event);
        }
    }
    
    /**
     * Handler para focus (acessibilidade)
     */
    handleFocus(event) {
        const element = event.currentTarget;
        
        // Mostra imediatamente ao focar
        this.showTooltip(element, event);
    }
    
    /**
     * Handler para blur
     */
    handleBlur(event) {
        // Esconde imediatamente ao perder foco
        this.hideTooltip();
    }
    
    /**
     * Handler para touch start (mobile)
     */
    handleTouchStart(event) {
        const element = event.currentTarget;
        
        // Toggle tooltip em touch
        if (this.activeTooltip && this.activeTooltip.element === element) {
            this.hideTooltip();
        } else {
            this.showTooltip(element, event);
        }
    }
    
    /**
     * Handler para touch end
     */
    handleTouchEnd(event) {
        // Esconde após 3 segundos em mobile
        setTimeout(() => {
            if (this.activeTooltip && this.activeTooltip.element === event.currentTarget) {
                this.hideTooltip();
            }
        }, 3000);
    }
    
    /**
     * Mostra tooltip
     */
    showTooltip(element, event) {
        // Verifica se elemento ainda está no DOM
        if (!document.body.contains(element)) {
            return;
        }
        
        // Pega conteúdo
        const content = element.getAttribute('data-tooltip');
        if (!content) {
            return;
        }
        
        // Pega opções
        const position = element.getAttribute('data-tooltip-position') || 'top';
        const theme = element.getAttribute('data-tooltip-theme') || 'dark';
        const html = element.hasAttribute('data-tooltip-html');
        
        // Esconde tooltip anterior
        if (this.activeTooltip) {
            this.hideTooltip();
        }
        
        // Cria elemento do tooltip
        const tooltipElement = this.createTooltipElement(element, content, theme, html);
        
        // Adiciona ao container
        this.container.appendChild(tooltipElement);
        
        // Calcula e aplica posição
        this.positionTooltip(tooltipElement, element, position, event);
        
        // Anima entrada
        requestAnimationFrame(() => {
            tooltipElement.classList.add('show');
        });
        
        // Salva referência
        this.activeTooltip = {
            element: element,
            tooltipElement: tooltipElement,
            position: position
        };
        
        console.log('💬 Tooltip mostrado:', content.substring(0, 50));
    }
    
    /**
     * Cria elemento DOM do tooltip
     */
    createTooltipElement(targetElement, content, theme, allowHtml) {
        const tooltip = document.createElement('div');
        tooltip.className = `improved-tooltip improved-tooltip-${theme}`;
        tooltip.id = this.getTooltipId(targetElement);
        tooltip.setAttribute('role', 'tooltip');
        
        // Conteúdo
        if (allowHtml) {
            tooltip.innerHTML = content;
        } else {
            tooltip.textContent = content;
        }
        
        // Arrow
        const arrow = document.createElement('div');
        arrow.className = 'improved-tooltip-arrow';
        tooltip.appendChild(arrow);
        
        return tooltip;
    }
    
    /**
     * Posiciona tooltip de forma inteligente
     */
    positionTooltip(tooltipElement, targetElement, preferredPosition, event) {
        // Pega dimensões
        const targetRect = targetElement.getBoundingClientRect();
        const tooltipRect = tooltipElement.getBoundingClientRect();
        const viewport = {
            width: window.innerWidth,
            height: window.innerHeight
        };
        
        // Tenta posição preferida
        let position = this.calculatePosition(
            preferredPosition,
            targetRect,
            tooltipRect,
            viewport
        );
        
        // Se não couber, tenta outras posições
        if (!this.fitsInViewport(position, tooltipRect, viewport)) {
            const positions = ['top', 'bottom', 'left', 'right'];
            
            for (const pos of positions) {
                if (pos === preferredPosition) continue;
                
                const testPosition = this.calculatePosition(
                    pos,
                    targetRect,
                    tooltipRect,
                    viewport
                );
                
                if (this.fitsInViewport(testPosition, tooltipRect, viewport)) {
                    position = testPosition;
                    preferredPosition = pos;
                    break;
                }
            }
        }
        
        // Aplica posição
        tooltipElement.style.left = `${position.left}px`;
        tooltipElement.style.top = `${position.top}px`;
        
        // Atualiza classe de posicionamento para arrow
        tooltipElement.setAttribute('data-position', preferredPosition);
    }
    
    /**
     * Calcula posição para um lado específico
     */
    calculatePosition(side, targetRect, tooltipRect, viewport) {
        const offset = this.config.offset;
        let left, top;
        
        switch (side) {
            case 'top':
                left = targetRect.left + (targetRect.width / 2) - (tooltipRect.width / 2);
                top = targetRect.top - tooltipRect.height - offset;
                break;
                
            case 'bottom':
                left = targetRect.left + (targetRect.width / 2) - (tooltipRect.width / 2);
                top = targetRect.bottom + offset;
                break;
                
            case 'left':
                left = targetRect.left - tooltipRect.width - offset;
                top = targetRect.top + (targetRect.height / 2) - (tooltipRect.height / 2);
                break;
                
            case 'right':
                left = targetRect.right + offset;
                top = targetRect.top + (targetRect.height / 2) - (tooltipRect.height / 2);
                break;
                
            default:
                left = targetRect.left;
                top = targetRect.top;
        }
        
        // Ajusta para não sair da viewport
        left = Math.max(10, Math.min(left, viewport.width - tooltipRect.width - 10));
        top = Math.max(10, Math.min(top, viewport.height - tooltipRect.height - 10));
        
        return { left, top };
    }
    
    /**
     * Verifica se tooltip cabe na viewport
     */
    fitsInViewport(position, tooltipRect, viewport) {
        return (
            position.left >= 0 &&
            position.top >= 0 &&
            position.left + tooltipRect.width <= viewport.width &&
            position.top + tooltipRect.height <= viewport.height
        );
    }
    
    /**
     * Atualiza posição do tooltip (para mouse move)
     */
    updatePosition(event) {
        if (!this.activeTooltip) return;
        
        this.positionTooltip(
            this.activeTooltip.tooltipElement,
            this.activeTooltip.element,
            this.activeTooltip.position,
            event
        );
    }
    
    /**
     * Esconde tooltip
     */
    hideTooltip() {
        if (!this.activeTooltip) return;
        
        const { tooltipElement } = this.activeTooltip;
        
        // Anima saída
        tooltipElement.classList.remove('show');
        
        // Remove após animação
        setTimeout(() => {
            if (tooltipElement.parentNode) {
                tooltipElement.parentNode.removeChild(tooltipElement);
            }
        }, this.prefersReducedMotion ? 0 : this.config.animationDuration);
        
        this.activeTooltip = null;
        
        console.log('💬 Tooltip escondido');
    }
    
    /**
     * Registra listeners globais
     */
    registerGlobalListeners() {
        // Esconde tooltip ao scroll
        window.addEventListener('scroll', () => {
            if (this.activeTooltip) {
                this.hideTooltip();
            }
        }, { passive: true });
        
        // Esconde tooltip ao resize
        window.addEventListener('resize', () => {
            if (this.activeTooltip) {
                this.hideTooltip();
            }
        });
        
        // Esconde tooltip ao pressionar ESC
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.activeTooltip) {
                this.hideTooltip();
            }
        });
        
        console.log('👂 Listeners globais registrados');
    }
    
    /**
     * Observa DOM para novos elementos
     */
    observeDOM() {
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                mutation.addedNodes.forEach((node) => {
                    if (node.nodeType === 1) { // Element node
                        // Verifica o próprio node
                        if (node.hasAttribute('data-tooltip') || node.hasAttribute('title')) {
                            if (node.hasAttribute('title')) {
                                const title = node.getAttribute('title');
                                node.setAttribute('data-tooltip', title);
                                node.removeAttribute('title');
                            }
                            this.attachTooltip(node);
                        }
                        
                        // Verifica filhos
                        const children = node.querySelectorAll('[data-tooltip], [title]');
                        children.forEach(child => {
                            if (child.hasAttribute('title')) {
                                const title = child.getAttribute('title');
                                child.setAttribute('data-tooltip', title);
                                child.removeAttribute('title');
                            }
                            this.attachTooltip(child);
                        });
                    }
                });
            });
        });
        
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
        
        console.log('👁️ DOM Observer ativado');
    }
    
    /**
     * Cria tooltip programaticamente
     * @param {HTMLElement} element - Elemento alvo
     * @param {string} content - Conteúdo do tooltip
     * @param {Object} options - Opções adicionais
     */
    createTooltip(element, content, options = {}) {
        element.setAttribute('data-tooltip', content);
        
        if (options.position) {
            element.setAttribute('data-tooltip-position', options.position);
        }
        
        if (options.theme) {
            element.setAttribute('data-tooltip-theme', options.theme);
        }
        
        if (options.html) {
            element.setAttribute('data-tooltip-html', 'true');
        }
        
        this.attachTooltip(element);
        
        console.log('✨ Tooltip criado programaticamente');
    }
    
    /**
     * Remove tooltip de um elemento
     * @param {HTMLElement} element - Elemento alvo
     */
    removeTooltip(element) {
        element.removeAttribute('data-tooltip');
        element.removeAttribute('data-tooltip-attached');
        element.removeAttribute('data-tooltip-id');
        element.removeAttribute('data-tooltip-position');
        element.removeAttribute('data-tooltip-theme');
        element.removeAttribute('data-tooltip-html');
        element.removeAttribute('aria-describedby');
        
        if (this.activeTooltip && this.activeTooltip.element === element) {
            this.hideTooltip();
        }
        
        console.log('🗑️ Tooltip removido');
    }
    
    /**
     * Atualiza configurações
     */
    updateConfig(newConfig) {
        this.config = { ...this.config, ...newConfig };
        console.log('⚙️ Configurações atualizadas:', this.config);
    }
    
    /**
     * Limpa recursos
     */
    destroy() {
        if (this.activeTooltip) {
            this.hideTooltip();
        }
        
        if (this.container) {
            this.container.remove();
        }
        
        if (this.showTimeout) {
            clearTimeout(this.showTimeout);
        }
        
        if (this.hideTimeout) {
            clearTimeout(this.hideTimeout);
        }
        
        console.log('🗑️ ImprovedTooltipManager destruído');
    }
}

// Exporta para uso global
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ImprovedTooltipManager;
}
