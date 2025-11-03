/**
 * CustomTooltip.js
 * Sistema de tooltips customizados que seguem o mouse
 */

class CustomTooltip {
    constructor() {
        this.tooltip = null;
        this.currentTarget = null;
        this.hideTimeout = null;
        this.init();
    }

    init() {
        // Criar elemento do tooltip
        this.tooltip = document.createElement('div');
        this.tooltip.className = 'custom-tooltip';
        this.tooltip.style.cssText = `
            position: fixed;
            background: var(--bg-secondary, #1f2937);
            color: var(--text-primary, #f9fafb);
            padding: 12px 16px;
            border-radius: 8px;
            font-size: 14px;
            line-height: 1.6;
            max-width: 320px;
            box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3), 0 2px 8px rgba(0, 0, 0, 0.2);
            pointer-events: none;
            z-index: 10000;
            opacity: 0;
            transform: translateY(8px);
            transition: opacity 0.2s ease, transform 0.2s ease;
            border: 1px solid var(--border-color, rgba(255, 255, 255, 0.1));
        `;
        document.body.appendChild(this.tooltip);

        // Adicionar evento global de mouse move
        document.addEventListener('mousemove', this.handleMouseMove.bind(this));
    }

    /**
     * Ativa tooltip para um elemento
     * @param {HTMLElement} element - Elemento que terá tooltip
     * @param {string|Object} content - Conteúdo do tooltip (string simples ou objeto com título e descrição)
     */
    attach(element, content) {
        element.addEventListener('mouseenter', (e) => {
            this.show(content, e);
            this.currentTarget = element;
        });

        element.addEventListener('mouseleave', () => {
            this.hide();
            this.currentTarget = null;
        });
    }

    /**
     * Exibe o tooltip
     * @param {string|Object} content - Conteúdo do tooltip
     * @param {MouseEvent} event - Evento do mouse
     */
    show(content, event) {
        clearTimeout(this.hideTimeout);

        // Formatar conteúdo
        if (typeof content === 'string') {
            this.tooltip.innerHTML = `<div>${content}</div>`;
        } else if (content.title && content.description) {
            this.tooltip.innerHTML = `
                <div style="font-weight: 600; margin-bottom: 6px; color: var(--primary, #3b82f6);">
                    ${content.title}
                </div>
                <div style="font-size: 13px; opacity: 0.9;">
                    ${content.description}
                </div>
            `;
        } else if (content.html) {
            this.tooltip.innerHTML = content.html;
        }

        // Posicionar tooltip
        this.position(event.clientX, event.clientY);

        // Animar entrada
        requestAnimationFrame(() => {
            this.tooltip.style.opacity = '1';
            this.tooltip.style.transform = 'translateY(0)';
        });
    }

    /**
     * Esconde o tooltip
     */
    hide() {
        this.hideTimeout = setTimeout(() => {
            this.tooltip.style.opacity = '0';
            this.tooltip.style.transform = 'translateY(8px)';
        }, 100);
    }

    /**
     * Posiciona o tooltip perto do mouse
     * @param {number} x - Posição X do mouse
     * @param {number} y - Posição Y do mouse
     */
    position(x, y) {
        const offset = 16;
        const tooltipRect = this.tooltip.getBoundingClientRect();
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;

        let left = x + offset;
        let top = y + offset;

        // Ajustar se sair da tela pela direita
        if (left + tooltipRect.width > viewportWidth - 10) {
            left = x - tooltipRect.width - offset;
        }

        // Ajustar se sair da tela por baixo
        if (top + tooltipRect.height > viewportHeight - 10) {
            top = y - tooltipRect.height - offset;
        }

        // Garantir que não saia pela esquerda
        left = Math.max(10, left);
        
        // Garantir que não saia por cima
        top = Math.max(10, top);

        this.tooltip.style.left = `${left}px`;
        this.tooltip.style.top = `${top}px`;
    }

    /**
     * Handler do movimento do mouse
     * @param {MouseEvent} event - Evento do mouse
     */
    handleMouseMove(event) {
        if (this.currentTarget && this.tooltip.style.opacity === '1') {
            this.position(event.clientX, event.clientY);
        }
    }

    /**
     * Configura tooltips para cards de urgência
     */
    setupUrgencyCards() {
        // Card Crítico
        const criticalCard = document.querySelector('.stat-card.critical');
        if (criticalCard) {
            this.attach(criticalCard, {
                title: '🔴 Urgência Crítica',
                description: 'Servidores que já podem se aposentar mas ainda têm licenças pendentes, ou cujas licenças não cabem no tempo restante até a aposentadoria compulsória (75 anos).'
            });
        }

        // Card Alto
        const highCard = document.querySelector('.stat-card.high');
        if (highCard) {
            this.attach(highCard, {
                title: '🟠 Urgência Alta',
                description: 'Servidores com pouca margem de tempo entre o fim das licenças e a aposentadoria (menos de 2 anos de folga). Requerem atenção prioritária no planejamento.'
            });
        }

        // Card Moderado
        const moderateCard = document.querySelector('.stat-card.moderate');
        if (moderateCard) {
            this.attach(moderateCard, {
                title: '🟡 Urgência Moderada',
                description: 'Servidores com licenças ainda não agendadas ou que precisam organizar melhor o cronograma. Há tempo suficiente, mas requer planejamento.'
            });
        }

        // Card Problemas
        const errorCard = document.querySelector('.stat-card.error');
        if (errorCard) {
            this.attach(errorCard, {
                title: '⚠️ Problemas de Interpretação',
                description: 'Cronogramas que não puderam ser interpretados automaticamente devido a formato ambíguo ou incompatível. Clique para ver a lista completa e revisar manualmente.'
            });
        }
    }

    /**
     * Configura tooltips para filtros
     */
    setupFilters() {
        // Busca
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            this.attach(searchInput, {
                title: '🔍 Busca Inteligente',
                description: 'Digite para filtrar servidores por nome, cargo ou lotação. A busca é instantânea e não diferencia maiúsculas/minúsculas.'
            });
        }

        // Idade Mínima
        const minAge = document.getElementById('minAge');
        if (minAge) {
            this.attach(minAge, {
                title: '📅 Idade Mínima',
                description: 'Filtra apenas servidores com idade igual ou superior ao valor especificado. Útil para focar em servidores próximos da aposentadoria.'
            });
        }

        // Idade Máxima
        const maxAge = document.getElementById('maxAge');
        if (maxAge) {
            this.attach(maxAge, {
                title: '📅 Idade Máxima',
                description: 'Filtra apenas servidores com idade igual ou inferior ao valor especificado. Útil para análises demográficas.'
            });
        }

        // Filtro de Mês
        const mesFilter = document.getElementById('mesFilter');
        if (mesFilter) {
            this.attach(mesFilter, {
                title: '📆 Filtro por Mês',
                description: 'Selecione um mês para visualizar apenas os servidores que têm licenças agendadas naquele período específico.'
            });
        }

        // Botão Limpar
        const clearBtn = document.getElementById('clearFiltersBtn');
        if (clearBtn) {
            this.attach(clearBtn, {
                title: '🧹 Limpar Filtros',
                description: 'Remove todos os filtros aplicados e restaura a visualização completa de todos os servidores.'
            });
        }
    }

    /**
     * Configura tooltips para navegação
     */
    setupNavigation() {
        const navItems = [
            {
                selector: 'a[href="#home"]',
                title: '🏠 Dashboard Principal',
                description: 'Visão geral com estatísticas, gráficos de urgência e tabela completa de todos os servidores cadastrados.'
            },
            {
                selector: 'a[href="#calendar"]',
                title: '📅 Calendário Anual',
                description: 'Visualização tipo heatmap mostrando a distribuição das licenças ao longo do ano. Identifique períodos de alta concentração de licenças.'
            },
            {
                selector: 'a[href="#timeline"]',
                title: '📊 Linha do Tempo',
                description: 'Visualização cronológica das licenças com opção de agrupamento mensal ou anual. Ideal para planejamento de longo prazo.'
            }
        ];

        navItems.forEach(item => {
            const element = document.querySelector(item.selector);
            if (element) {
                this.attach(element, {
                    title: item.title,
                    description: item.description
                });
            }
        });
    }

    /**
     * Configura tooltips para header
     */
    setupHeader() {
        // Badge de total
        const totalBadge = document.querySelector('.stats-badge');
        if (totalBadge) {
            this.attach(totalBadge, {
                title: '👥 Total de Servidores',
                description: 'Número total de servidores carregados no sistema a partir do arquivo CSV ou Excel importado.'
            });
        }

        // Última atualização
        const lastUpdate = document.getElementById('lastUpdate');
        if (lastUpdate) {
            this.attach(lastUpdate, {
                title: '🕒 Última Atualização',
                description: 'Data e hora do último carregamento de dados. Os dados são mantidos apenas na sessão atual do navegador.'
            });
        }

        // Botão Upload
        const uploadBtn = document.getElementById('uploadBtn');
        if (uploadBtn) {
            this.attach(uploadBtn, {
                title: '📤 Importar Dados',
                description: 'Carrega arquivo CSV ou Excel (.xlsx) com dados dos servidores. Formatos suportados: cronogramas textuais ou períodos específicos de licenças.'
            });
        }

        // Toggle de tema
        const themeToggle = document.getElementById('themeToggle');
        if (themeToggle) {
            this.attach(themeToggle, {
                title: '🎨 Alternar Tema',
                description: 'Alterna entre tema claro e escuro. A preferência é salva automaticamente no navegador.'
            });
        }
    }

    /**
     * Inicializa todos os tooltips
     */
    initAll() {
        this.setupUrgencyCards();
        this.setupFilters();
        this.setupNavigation();
        this.setupHeader();
    }
}

// Exportar para uso global
if (typeof window !== 'undefined') {
    window.CustomTooltip = CustomTooltip;
}
