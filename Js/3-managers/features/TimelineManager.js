/**
 * TimelineManager - Gerenciamento de timeline de licenças
 *
 * Responsabilidades:
 * - Visualização temporal de licenças
 * - Timeline horizontal/vertical
 * - Agrupamento por período (dia/semana/mês/ano)
 * - Detecção de sobreposições/conflitos
 * - Zoom e navegação temporal
 *
 * @module 3-managers/features/TimelineManager
 */

class TimelineManager {
    /**
     * Construtor
     * @param {Object} app - Referência à aplicação
     */
    constructor(app) {
        this.app = app;

        // Estado da timeline
        this.viewMode = 'month'; // 'day', 'week', 'month', 'year'
        this.currentDate = new Date();

        // Container
        this.container = null;

        // Dados processados
        this.timelineData = [];

        // Cores por urgência
        this.urgencyColors = {
            critica: '#dc3545',
            alta: '#fd7e14',
            moderada: '#ffc107',
            baixa: '#28a745',
            null: '#6c757d'
        };

        console.log('✅ TimelineManager criado');
    }

    // ==================== INICIALIZAÇÃO ====================

    /**
     * Inicializa timeline em container
     * @param {HTMLElement|string} container - Container ou ID
     */
    init(container) {
        if (typeof container === 'string') {
            this.container = document.getElementById(container);
        } else {
            this.container = container;
        }

        if (!this.container) {
            console.error('Container da timeline não encontrado');
            return;
        }

        this.render();
        console.log('📊 Timeline inicializada');
    }

    // ==================== CARREGAMENTO DE DADOS ====================

    /**
     * Carrega dados de servidores
     * @param {Array<Object>} servidores - Dados dos servidores
     */
    loadData(servidores) {
        if (!servidores || !Array.isArray(servidores)) {
            console.warn('TimelineManager: servidores invalido/vazio, carregando vazio', servidores);
            this.timelineData = [];
            this.render(); // Ensure clear render
            return;
        }

        if (servidores.length === 0) {
            this.timelineData = [];
            this.render();
            return;
        }

        // Processar dados para timeline
        this.timelineData = servidores
            .filter(s => s.licencas && s.licencas.length > 0)
            .map(servidor => {
                return {
                    servidor: servidor.servidor,
                    cpf: servidor.cpf,
                    cargo: servidor.cargo,
                    lotacao: servidor.lotacao,
                    urgencia: servidor.urgencia,
                    licencas: servidor.licencas.map(lic => ({
                        inicio: new Date(lic.inicio),
                        fim: new Date(lic.fim),
                        tipo: lic.tipo,
                        meses: lic.meses
                    }))
                };
            });

        console.log(`📊 ${this.timelineData.length} servidores carregados na timeline`);
        this.render();
    }

    // ==================== RENDERIZAÇÃO ====================

    /**
     * Renderiza timeline
     */
    render() {
        if (!this.container) {
            console.warn('TimelineManager: Tentativa de renderizar sem container definido');
            return;
        }

        this.container.innerHTML = '';

        // Cabeçalho
        this._renderHeader();

        // Timeline principal
        this._renderTimeline();

        // Legenda
        this._renderLegend();
    }

    /**
     * Renderiza cabeçalho
     * @private
     */
    _renderHeader() {
        const header = document.createElement('div');
        header.className = 'timeline-header';
        header.style.cssText = `
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 20px;
            padding: 15px;
            background: var(--card-bg, #fff);
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        `;

        // Botões de navegação
        const btnPrev = document.createElement('button');
        btnPrev.innerHTML = '← Anterior';
        btnPrev.className = 'btn btn-secondary';
        btnPrev.onclick = () => this.navigatePrevious();

        const btnNext = document.createElement('button');
        btnNext.innerHTML = 'Próximo →';
        btnNext.className = 'btn btn-secondary';
        btnNext.onclick = () => this.navigateNext();

        const btnToday = document.createElement('button');
        btnToday.textContent = 'Hoje';
        btnToday.className = 'btn btn-primary';
        btnToday.onclick = () => this.goToToday();

        // Seletor de visualização
        const viewSelect = document.createElement('select');
        viewSelect.className = 'form-control';
        viewSelect.style.width = 'auto';
        viewSelect.innerHTML = `
            <option value="day" ${this.viewMode === 'day' ? 'selected' : ''}>Diário</option>
            <option value="week" ${this.viewMode === 'week' ? 'selected' : ''}>Semanal</option>
            <option value="month" ${this.viewMode === 'month' ? 'selected' : ''}>Mensal</option>
            <option value="year" ${this.viewMode === 'year' ? 'selected' : ''}>Anual</option>
        `;
        viewSelect.onchange = (e) => {
            this.viewMode = e.target.value;
            this.render();
        };

        // Título com período atual
        const title = document.createElement('h4');
        title.style.margin = '0';
        title.textContent = this._getPeriodTitle();

        const navGroup = document.createElement('div');
        navGroup.style.cssText = 'display: flex; gap: 10px; align-items: center;';
        navGroup.appendChild(btnPrev);
        navGroup.appendChild(btnToday);
        navGroup.appendChild(btnNext);

        header.appendChild(navGroup);
        header.appendChild(title);
        header.appendChild(viewSelect);

        this.container.appendChild(header);
    }

    /**
     * Renderiza timeline principal
     * @private
     */
    _renderTimeline() {
        const timelineContainer = document.createElement('div');
        timelineContainer.className = 'timeline-container';
        timelineContainer.style.cssText = `
            background: var(--card-bg, #fff);
            border-radius: 8px;
            padding: 20px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            overflow-x: auto;
        `;

        if (this.timelineData.length === 0) {
            timelineContainer.innerHTML = '<p style="text-align: center; color: #666;">Nenhuma licença para exibir</p>';
            this.container.appendChild(timelineContainer);
            return;
        }

        // Calcular range de datas
        const { startDate, endDate } = this._getDateRange();

        // Renderizar eixo de tempo
        const timeAxis = this._renderTimeAxis(startDate, endDate);
        timelineContainer.appendChild(timeAxis);

        // Renderizar barras de licenças
        const licensesBars = this._renderLicenseBars(startDate, endDate);
        timelineContainer.appendChild(licensesBars);

        this.container.appendChild(timelineContainer);

        // Estatísticas
        this._renderStats();
    }

    /**
     * Renderiza eixo de tempo
     * @private
     */
    _renderTimeAxis(startDate, endDate) {
        const axis = document.createElement('div');
        axis.className = 'timeline-axis';
        axis.style.cssText = `
            display: flex;
            border-bottom: 2px solid var(--border-color, #ddd);
            margin-bottom: 10px;
            padding-bottom: 5px;
        `;

        const labels = this._getTimeLabels(startDate, endDate);

        labels.forEach(label => {
            const tick = document.createElement('div');
            tick.style.cssText = `
                flex: 1;
                text-align: center;
                font-size: 0.75rem;
                color: var(--text-muted, #666);
                font-weight: bold;
            `;
            tick.textContent = label;
            axis.appendChild(tick);
        });

        return axis;
    }

    /**
     * Renderiza barras de licenças
     * @private
     */
    _renderLicenseBars(startDate, endDate) {
        const barsContainer = document.createElement('div');
        barsContainer.className = 'timeline-bars';
        barsContainer.style.cssText = `
            display: flex;
            flex-direction: column;
            gap: 5px;
            max-height: 600px;
            overflow-y: auto;
        `;

        const totalDays = this._daysBetween(startDate, endDate);

        this.timelineData.forEach(item => {
            item.licencas.forEach(licenca => {
                // Verificar se licença está no range
                if (licenca.fim < startDate || licenca.inicio > endDate) {
                    return;
                }

                const bar = this._createLicenseBar(item, licenca, startDate, totalDays);
                barsContainer.appendChild(bar);
            });
        });

        return barsContainer;
    }

    /**
     * Cria barra de licença
     * @private
     */
    _createLicenseBar(servidor, licenca, rangeStart, totalDays) {
        const container = document.createElement('div');
        container.style.cssText = `
            display: flex;
            align-items: center;
            min-height: 30px;
            position: relative;
        `;

        // Nome do servidor (fixo à esquerda)
        const nameLabel = document.createElement('div');
        nameLabel.style.cssText = `
            width: 200px;
            padding-right: 10px;
            font-size: 0.85rem;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
            flex-shrink: 0;
        `;
        nameLabel.textContent = servidor.servidor;
        nameLabel.title = `${servidor.servidor} - ${servidor.cargo}`;

        // Timeline bar (flexível)
        const timeline = document.createElement('div');
        timeline.style.cssText = `
            flex: 1;
            position: relative;
            height: 25px;
            background: var(--bg-secondary, #f8f9fa);
            border-radius: 4px;
        `;

        // Barra de licença
        const startOffset = Math.max(0, this._daysBetween(rangeStart, licenca.inicio));
        const duration = this._daysBetween(licenca.inicio, licenca.fim);
        const leftPercent = (startOffset / totalDays) * 100;
        const widthPercent = (duration / totalDays) * 100;

        const bar = document.createElement('div');
        bar.style.cssText = `
            position: absolute;
            left: ${leftPercent}%;
            width: ${widthPercent}%;
            height: 100%;
            background: ${this.urgencyColors[servidor.urgencia] || this.urgencyColors.null};
            border-radius: 4px;
            cursor: pointer;
            transition: opacity 0.2s;
        `;

        bar.onmouseenter = () => {
            bar.style.opacity = '0.8';
            this._showTooltip(bar, servidor, licenca);
        };

        bar.onmouseleave = () => {
            bar.style.opacity = '1';
            this._hideTooltip();
        };

        timeline.appendChild(bar);
        container.appendChild(nameLabel);
        container.appendChild(timeline);

        return container;
    }

    /**
     * Renderiza estatísticas
     * @private
     */
    _renderStats() {
        const stats = document.createElement('div');
        stats.className = 'timeline-stats';
        stats.style.cssText = `
            margin-top: 20px;
            padding: 15px;
            background: var(--card-bg, #fff);
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
            gap: 15px;
        `;

        const totalLicenses = this.timelineData.reduce((sum, item) => sum + item.licencas.length, 0);
        const totalServidores = this.timelineData.length;

        const { startDate, endDate } = this._getDateRange();
        const conflitos = this._detectConflicts(startDate, endDate);

        const statsData = [
            { label: 'Servidores', value: totalServidores },
            { label: 'Licenças', value: totalLicenses },
            { label: 'Período', value: this._formatPeriod(startDate, endDate) },
            { label: 'Sobreposições', value: conflitos }
        ];

        statsData.forEach(item => {
            const statCard = document.createElement('div');
            statCard.style.textAlign = 'center';
            statCard.innerHTML = `
                <div style="font-size: 1.5rem; font-weight: bold; color: var(--primary-color, #007bff);">${item.value}</div>
                <div style="font-size: 0.85rem; color: var(--text-muted, #666);">${item.label}</div>
            `;
            stats.appendChild(statCard);
        });

        this.container.appendChild(stats);
    }

    /**
     * Renderiza legenda
     * @private
     */
    _renderLegend() {
        const legend = document.createElement('div');
        legend.className = 'timeline-legend';
        legend.style.cssText = `
            margin-top: 20px;
            padding: 15px;
            background: var(--card-bg, #fff);
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            text-align: center;
        `;

        legend.innerHTML = '<strong>Urgência:</strong><br>';

        const items = document.createElement('div');
        items.style.cssText = `
            display: flex;
            justify-content: center;
            gap: 20px;
            margin-top: 10px;
            flex-wrap: wrap;
        `;

        const urgencies = [
            { key: 'critica', label: 'Crítica' },
            { key: 'alta', label: 'Alta' },
            { key: 'moderada', label: 'Moderada' },
            { key: 'baixa', label: 'Baixa' }
        ];

        urgencies.forEach(urg => {
            const item = document.createElement('div');
            item.style.cssText = 'display: flex; align-items: center; gap: 5px;';
            item.innerHTML = `
                <div style="width: 20px; height: 20px; background: ${this.urgencyColors[urg.key]}; border-radius: 3px;"></div>
                <span style="font-size: 0.85rem;">${urg.label}</span>
            `;
            items.appendChild(item);
        });

        legend.appendChild(items);
        this.container.appendChild(legend);
    }

    // ==================== TOOLTIPS ====================

    /**
     * Mostra tooltip
     * @private
     */
    _showTooltip(element, servidor, licenca) {
        this._hideTooltip();

        const tooltip = document.createElement('div');
        tooltip.id = 'timeline-tooltip';
        tooltip.style.cssText = `
            position: fixed;
            background: rgba(0, 0, 0, 0.9);
            color: white;
            padding: 10px;
            border-radius: 6px;
            font-size: 0.85rem;
            z-index: 10000;
            max-width: 300px;
            pointer-events: none;
        `;

        tooltip.innerHTML = `
            <strong>${servidor.servidor}</strong><br>
            <small>${servidor.cargo} - ${servidor.lotacao}</small><br>
            <br>
            <strong>Licença:</strong><br>
            ${this._formatDate(licenca.inicio)} - ${this._formatDate(licenca.fim)}<br>
            <small>${licenca.meses} meses (${this._daysBetween(licenca.inicio, licenca.fim)} dias)</small>
        `;

        document.body.appendChild(tooltip);

        const rect = element.getBoundingClientRect();
        tooltip.style.left = rect.left + 'px';
        tooltip.style.top = (rect.bottom + 5) + 'px';
    }

    /**
     * Esconde tooltip
     * @private
     */
    _hideTooltip() {
        const tooltip = document.getElementById('timeline-tooltip');
        if (tooltip) {
            tooltip.remove();
        }
    }

    // ==================== NAVEGAÇÃO ====================

    /**
     * Navega para período anterior
     */
    navigatePrevious() {
        switch (this.viewMode) {
            case 'day':
                this.currentDate.setDate(this.currentDate.getDate() - 1);
                break;
            case 'week':
                this.currentDate.setDate(this.currentDate.getDate() - 7);
                break;
            case 'month':
                this.currentDate.setMonth(this.currentDate.getMonth() - 1);
                break;
            case 'year':
                this.currentDate.setFullYear(this.currentDate.getFullYear() - 1);
                break;
        }
        this.render();
    }

    /**
     * Navega para próximo período
     */
    navigateNext() {
        switch (this.viewMode) {
            case 'day':
                this.currentDate.setDate(this.currentDate.getDate() + 1);
                break;
            case 'week':
                this.currentDate.setDate(this.currentDate.getDate() + 7);
                break;
            case 'month':
                this.currentDate.setMonth(this.currentDate.getMonth() + 1);
                break;
            case 'year':
                this.currentDate.setFullYear(this.currentDate.getFullYear() + 1);
                break;
        }
        this.render();
    }

    /**
     * Vai para hoje
     */
    goToToday() {
        this.currentDate = new Date();
        this.render();
    }

    // ==================== UTILITÁRIOS ====================

    /**
     * Calcula range de datas baseado no modo de visualização
     * @private
     * @returns {{startDate: Date, endDate: Date}}
     */
    _getDateRange() {
        const start = new Date(this.currentDate);
        const end = new Date(this.currentDate);

        switch (this.viewMode) {
            case 'day':
                start.setHours(0, 0, 0, 0);
                end.setHours(23, 59, 59, 999);
                break;
            case 'week':
                start.setDate(start.getDate() - start.getDay());
                end.setDate(start.getDate() + 6);
                break;
            case 'month':
                start.setDate(1);
                end.setMonth(end.getMonth() + 1, 0);
                break;
            case 'year':
                start.setMonth(0, 1);
                end.setMonth(11, 31);
                break;
        }

        return { startDate: start, endDate: end };
    }

    /**
     * Gera labels do eixo de tempo
     * @private
     */
    _getTimeLabels(startDate, endDate) {
        const labels = [];

        switch (this.viewMode) {
            case 'day':
                for (let h = 0; h < 24; h++) {
                    labels.push(`${h}h`);
                }
                break;
            case 'week':
                const days = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
                for (let i = 0; i < 7; i++) {
                    const date = new Date(startDate);
                    date.setDate(date.getDate() + i);
                    labels.push(`${days[date.getDay()]} ${date.getDate()}`);
                }
                break;
            case 'month':
                const daysInMonth = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 0).getDate();
                for (let d = 1; d <= daysInMonth; d++) {
                    if (d === 1 || d % 5 === 0 || d === daysInMonth) {
                        labels.push(d.toString());
                    }
                }
                break;
            case 'year':
                const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
                months.forEach(m => labels.push(m));
                break;
        }

        return labels;
    }

    /**
     * Título do período atual
     * @private
     */
    _getPeriodTitle() {
        const date = this.currentDate;

        switch (this.viewMode) {
            case 'day':
                return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
            case 'week':
                const { startDate, endDate } = this._getDateRange();
                return `${this._formatDate(startDate)} - ${this._formatDate(endDate)}`;
            case 'month':
                return date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
            case 'year':
                return date.getFullYear().toString();
            default:
                return '';
        }
    }

    /**
     * Calcula dias entre datas
     * @private
     */
    _daysBetween(start, end) {
        const diffTime = Math.abs(end - start);
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }

    /**
     * Formata data
     * @private
     */
    _formatDate(date) {
        return new Date(date).toLocaleDateString('pt-BR');
    }

    /**
     * Formata período
     * @private
     */
    _formatPeriod(start, end) {
        const days = this._daysBetween(start, end);
        return `${days} dias`;
    }

    /**
     * Detecta conflitos/sobreposições
     * @private
     */
    _detectConflicts(startDate, endDate) {
        let conflicts = 0;
        const dateMap = new Map();

        this.timelineData.forEach(item => {
            item.licencas.forEach(licenca => {
                if (licenca.fim < startDate || licenca.inicio > endDate) {
                    return;
                }

                for (let d = new Date(licenca.inicio); d <= licenca.fim; d.setDate(d.getDate() + 1)) {
                    const key = d.toISOString().split('T')[0];
                    dateMap.set(key, (dateMap.get(key) || 0) + 1);
                }
            });
        });

        dateMap.forEach(count => {
            if (count > 1) conflicts++;
        });

        return conflicts;
    }

    /**
     * Renderiza timeline (método wrapper para compatibilidade)
     * @param {Array<Object>} servidores - Dados dos servidores
     * @param {HTMLElement|string} container - Container ou ID
     * @param {string} viewMode - Modo de visualização (opcional)
     */
    renderTimeline(servidores, container, viewMode = 'month') {
        // Configurar modo de visualização
        if (viewMode) {
            this.viewMode = viewMode;
        }

        // Carregar dados
        this.loadData(servidores);

        // Inicializar no container
        this.init(container);
    }

    /**
     * Informações de debug
     * @returns {Object}
     */
    getDebugInfo() {
        return {
            viewMode: this.viewMode,
            currentDate: this.currentDate.toISOString(),
            dataCount: this.timelineData.length
        };
    }
}

// Expor classe
if (typeof window !== 'undefined') {
    window.TimelineManager = TimelineManager;
}

// Exportar para Node.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TimelineManager;
}
