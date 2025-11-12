/**
 * LoadingSkeletons.js
 * Gerencia skeleton screens para melhorar percepção de performance
 * Substitui spinners genéricos por layouts que antecipam o conteúdo
 * 
 * Tipos de skeleton:
 * - Table skeleton (para tabela de servidores)
 * - Card skeleton (para cards de estatísticas)
 * - Chart skeleton (para gráficos)
 * - Modal skeleton (para modais com conteúdo)
 */

class LoadingSkeletons {
    constructor() {
        this.activeSkeletons = new Set();
        this.config = {
            animationDuration: 1.5, // segundos
            pulseEffect: true,
            shimmerEffect: true
        };
        
    }

    /**
     * Mostra skeleton para tabela de servidores
     * 
     * @param {string|HTMLElement} container - Container ou seletor
     * @param {number} rows - Número de linhas skeleton (padrão: 10)
     */
    showTableSkeleton(container, rows = 10) {
        const containerEl = this.getElement(container);
        if (!containerEl) return null;
        
        const skeletonHTML = `
            <div class="skeleton-table" data-skeleton-type="table">
                <div class="skeleton-table-header">
                    ${this.generateTableHeaderSkeleton()}
                </div>
                <div class="skeleton-table-body">
                    ${Array(rows).fill(null).map(() => this.generateTableRowSkeleton()).join('')}
                </div>
            </div>
        `;
        
        containerEl.innerHTML = skeletonHTML;
        this.activeSkeletons.add(containerEl);
        
        return containerEl.querySelector('.skeleton-table');
    }

    /**
     * Gera skeleton para header da tabela
     */
    generateTableHeaderSkeleton() {
        const columns = [
            { width: '25%' },  // Nome
            { width: '8%' },   // Idade
            { width: '20%' },  // Lotação
            { width: '15%' },  // Cargo
            { width: '17%' },  // Próxima Licença
            { width: '15%' }   // Urgência
        ];
        
        return `
            <div class="skeleton-row skeleton-header-row">
                ${columns.map(col => `
                    <div class="skeleton-cell" style="width: ${col.width}">
                        <div class="skeleton-box skeleton-shimmer" style="width: 80%; height: 16px;"></div>
                    </div>
                `).join('')}
            </div>
        `;
    }

    /**
     * Gera skeleton para linha da tabela
     */
    generateTableRowSkeleton() {
        const cells = [
            { width: '25%', contentWidth: '90%' },
            { width: '8%', contentWidth: '60%' },
            { width: '20%', contentWidth: '85%' },
            { width: '15%', contentWidth: '75%' },
            { width: '17%', contentWidth: '80%' },
            { width: '15%', contentWidth: '70%' }
        ];
        
        return `
            <div class="skeleton-row">
                ${cells.map(cell => `
                    <div class="skeleton-cell" style="width: ${cell.width}">
                        <div class="skeleton-box skeleton-shimmer" style="width: ${cell.contentWidth}; height: 14px;"></div>
                    </div>
                `).join('')}
            </div>
        `;
    }

    /**
     * Mostra skeleton para cards de estatísticas
     * 
     * @param {string|HTMLElement} container
     * @param {number} count - Número de cards (padrão: 4)
     */
    showStatCardsSkeleton(container, count = 4) {
        const containerEl = this.getElement(container);
        if (!containerEl) return null;
        
        const skeletonHTML = `
            <div class="skeleton-stat-cards" data-skeleton-type="cards">
                ${Array(count).fill(null).map(() => this.generateStatCardSkeleton()).join('')}
            </div>
        `;
        
        containerEl.innerHTML = skeletonHTML;
        this.activeSkeletons.add(containerEl);
        
        return containerEl.querySelector('.skeleton-stat-cards');
    }

    /**
     * Gera skeleton para card de estatística
     */
    generateStatCardSkeleton() {
        return `
            <div class="skeleton-stat-card">
                <div class="skeleton-card-icon">
                    <div class="skeleton-circle skeleton-shimmer" style="width: 48px; height: 48px;"></div>
                </div>
                <div class="skeleton-card-content">
                    <div class="skeleton-box skeleton-shimmer" style="width: 60%; height: 16px; margin-bottom: 8px;"></div>
                    <div class="skeleton-box skeleton-shimmer" style="width: 40%; height: 28px;"></div>
                </div>
            </div>
        `;
    }

    /**
     * Mostra skeleton para gráfico
     * 
     * @param {string|HTMLElement} container
     * @param {string} type - 'bar', 'line', 'pie', 'doughnut'
     */
    showChartSkeleton(container, type = 'bar') {
        const containerEl = this.getElement(container);
        if (!containerEl) return null;
        
        const skeletonHTML = this.generateChartSkeleton(type);
        containerEl.innerHTML = skeletonHTML;
        this.activeSkeletons.add(containerEl);
        
        return containerEl.querySelector('.skeleton-chart');
    }

    /**
     * Gera skeleton para gráfico
     */
    generateChartSkeleton(type) {
        switch (type) {
            case 'bar':
                return this.generateBarChartSkeleton();
            case 'line':
                return this.generateLineChartSkeleton();
            case 'pie':
            case 'doughnut':
                return this.generatePieChartSkeleton();
            default:
                return this.generateBarChartSkeleton();
        }
    }

    /**
     * Gera skeleton para gráfico de barras
     */
    generateBarChartSkeleton() {
        const bars = [60, 80, 45, 95, 70, 55];
        
        return `
            <div class="skeleton-chart skeleton-bar-chart" data-skeleton-type="chart">
                <div class="skeleton-chart-bars">
                    ${bars.map((height, idx) => `
                        <div class="skeleton-bar" style="animation-delay: ${idx * 0.1}s;">
                            <div class="skeleton-bar-fill skeleton-shimmer" style="height: ${height}%;"></div>
                        </div>
                    `).join('')}
                </div>
                <div class="skeleton-chart-legend">
                    ${Array(3).fill(null).map(() => `
                        <div class="skeleton-legend-item">
                            <div class="skeleton-box skeleton-shimmer" style="width: 12px; height: 12px; border-radius: 2px;"></div>
                            <div class="skeleton-box skeleton-shimmer" style="width: 80px; height: 12px;"></div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    /**
     * Gera skeleton para gráfico de linha
     */
    generateLineChartSkeleton() {
        return `
            <div class="skeleton-chart skeleton-line-chart" data-skeleton-type="chart">
                <svg viewBox="0 0 400 200" class="skeleton-svg">
                    <path class="skeleton-line skeleton-shimmer" d="M 0,150 Q 50,100 100,120 T 200,90 T 300,110 L 400,80" />
                    ${Array(8).fill(null).map((_, idx) => `
                        <circle class="skeleton-point skeleton-pulse" cx="${idx * 50 + 20}" cy="${Math.random() * 100 + 50}" r="4" style="animation-delay: ${idx * 0.1}s;" />
                    `).join('')}
                </svg>
            </div>
        `;
    }

    /**
     * Gera skeleton para gráfico de pizza
     */
    generatePieChartSkeleton() {
        return `
            <div class="skeleton-chart skeleton-pie-chart" data-skeleton-type="chart">
                <div class="skeleton-pie-container">
                    <svg viewBox="0 0 100 100" class="skeleton-pie-svg">
                        <circle class="skeleton-pie-slice skeleton-shimmer" cx="50" cy="50" r="40" style="stroke-dasharray: 62.8 188.4; animation-delay: 0s;" />
                        <circle class="skeleton-pie-slice skeleton-shimmer" cx="50" cy="50" r="40" style="stroke-dasharray: 47.1 203.1; stroke-dashoffset: -62.8; animation-delay: 0.2s;" />
                        <circle class="skeleton-pie-slice skeleton-shimmer" cx="50" cy="50" r="40" style="stroke-dasharray: 37.7 212.5; stroke-dashoffset: -109.9; animation-delay: 0.4s;" />
                        <circle class="skeleton-pie-slice skeleton-shimmer" cx="50" cy="50" r="40" style="stroke-dasharray: 31.4 218.8; stroke-dashoffset: -147.6; animation-delay: 0.6s;" />
                    </svg>
                </div>
            </div>
        `;
    }

    /**
     * Mostra skeleton para modal
     * 
     * @param {string|HTMLElement} container
     */
    showModalSkeleton(container) {
        const containerEl = this.getElement(container);
        if (!containerEl) return null;
        
        const skeletonHTML = `
            <div class="skeleton-modal" data-skeleton-type="modal">
                <div class="skeleton-modal-header">
                    <div class="skeleton-box skeleton-shimmer" style="width: 200px; height: 24px;"></div>
                </div>
                <div class="skeleton-modal-body">
                    ${Array(4).fill(null).map(() => `
                        <div class="skeleton-modal-section">
                            <div class="skeleton-box skeleton-shimmer" style="width: 120px; height: 16px; margin-bottom: 8px;"></div>
                            <div class="skeleton-box skeleton-shimmer" style="width: 100%; height: 14px; margin-bottom: 4px;"></div>
                            <div class="skeleton-box skeleton-shimmer" style="width: 90%; height: 14px;"></div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
        
        containerEl.innerHTML = skeletonHTML;
        this.activeSkeletons.add(containerEl);
        
        return containerEl.querySelector('.skeleton-modal');
    }

    /**
     * Mostra skeleton para lista genérica
     * 
     * @param {string|HTMLElement} container
     * @param {number} items - Número de itens
     */
    showListSkeleton(container, items = 5) {
        const containerEl = this.getElement(container);
        if (!containerEl) return null;
        
        const skeletonHTML = `
            <div class="skeleton-list" data-skeleton-type="list">
                ${Array(items).fill(null).map(() => `
                    <div class="skeleton-list-item">
                        <div class="skeleton-circle skeleton-shimmer" style="width: 40px; height: 40px;"></div>
                        <div class="skeleton-list-content">
                            <div class="skeleton-box skeleton-shimmer" style="width: 70%; height: 16px; margin-bottom: 6px;"></div>
                            <div class="skeleton-box skeleton-shimmer" style="width: 50%; height: 12px;"></div>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
        
        containerEl.innerHTML = skeletonHTML;
        this.activeSkeletons.add(containerEl);
        
        return containerEl.querySelector('.skeleton-list');
    }

    /**
     * Mostra skeleton para formulário
     * 
     * @param {string|HTMLElement} container
     * @param {number} fields - Número de campos
     */
    showFormSkeleton(container, fields = 4) {
        const containerEl = this.getElement(container);
        if (!containerEl) return null;
        
        const skeletonHTML = `
            <div class="skeleton-form" data-skeleton-type="form">
                ${Array(fields).fill(null).map(() => `
                    <div class="skeleton-form-field">
                        <div class="skeleton-box skeleton-shimmer" style="width: 100px; height: 14px; margin-bottom: 8px;"></div>
                        <div class="skeleton-box skeleton-shimmer" style="width: 100%; height: 38px;"></div>
                    </div>
                `).join('')}
            </div>
        `;
        
        containerEl.innerHTML = skeletonHTML;
        this.activeSkeletons.add(containerEl);
        
        return containerEl.querySelector('.skeleton-form');
    }

    /**
     * Remove skeleton e restaura conteúdo
     * 
     * @param {string|HTMLElement} container
     * @param {string} content - HTML content ou null
     */
    removeSkeleton(container, content = null) {
        const containerEl = this.getElement(container);
        if (!containerEl) return;
        
        // Remover skeleton
        const skeleton = containerEl.querySelector('[data-skeleton-type]');
        if (skeleton) {
            skeleton.classList.add('skeleton-fade-out');
            
            setTimeout(() => {
                if (content) {
                    containerEl.innerHTML = content;
                } else {
                    containerEl.innerHTML = '';
                }
                
                this.activeSkeletons.delete(containerEl);
            }, 300);
        }
    }

    /**
     * Remove todos os skeletons ativos
     */
    removeAllSkeletons() {
        for (const container of this.activeSkeletons) {
            this.removeSkeleton(container);
        }
        
        this.activeSkeletons.clear();
        console.log('🧹 Todos os skeletons removidos');
    }

    /**
     * Utilitário para obter elemento
     */
    getElement(selector) {
        if (typeof selector === 'string') {
            return document.querySelector(selector);
        }
        return selector;
    }

    /**
     * Atualiza configurações
     * 
     * @param {Object} config
     */
    updateConfig(config) {
        this.config = { ...this.config, ...config };
        console.log('⚙️ Configurações do LoadingSkeletons atualizadas');
    }

    /**
     * Retorna estatísticas
     */
    getStats() {
        return {
            activeSkeletons: this.activeSkeletons.size,
            config: { ...this.config }
        };
    }
}

// Exportar para uso global
if (typeof window !== 'undefined') {
    window.LoadingSkeletons = LoadingSkeletons;
}
