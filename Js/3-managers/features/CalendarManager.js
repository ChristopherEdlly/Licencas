/**
 * CalendarManager - Gerenciamento de calendário interativo
 *
 * Responsabilidades:
 * - Renderizar calendário de licenças
 * - Heatmap de intensidade de licenças
 * - Navegação por meses/anos
 * - Tooltips com informações detalhadas
 * - Visualização de conflitos
 *
 * @module 3-managers/features/CalendarManager
 */

class CalendarManager {
    /**
     * Construtor
     * @param {Object} app - Referência à aplicação
     */
    constructor(app) {
        this.app = app;

        // Estado do calendário
        this.currentYear = new Date().getFullYear();
        this.currentMonth = new Date().getMonth(); // 0-11

        // Visualização
        this.viewMode = 'year'; // 'year' ou 'month'

        // Container
        this.container = null;

        // Dados de licenças por data
        this.licensesByDate = new Map(); // date string -> array of servidores

        // Cores para intensidade
        this.intensityColors = [
            '#f0f0f0', // 0 licenças
            '#c6e48b', // 1-2
            '#7bc96f', // 3-5
            '#239a3b', // 6-10
            '#196127'  // 11+
        ];

        console.log('✅ CalendarManager criado');
    }

    // ==================== INICIALIZAÇÃO ====================

    /**
     * Inicializa calendário em container
     * @param {HTMLElement|string} container - Container ou ID
     */
    init(container) {
        if (typeof container === 'string') {
            this.container = document.getElementById(container);
        } else {
            this.container = container;
        }

        if (!this.container) {
            console.error('Container do calendário não encontrado');
            return;
        }

        this.render();
        console.log('📅 Calendário inicializado');
    }

    // ==================== CARREGAMENTO DE DADOS ====================

    /**
     * Carrega dados de licenças
     * @param {Array<Object>} servidores - Dados dos servidores
     */
    loadData(servidores) {
        this.licensesByDate.clear();

        // Robust check: if invalid, treat as empty
        if (!servidores || !Array.isArray(servidores)) {
            console.warn('CalendarManager: servidores invalido/vazio, carregando vazio', servidores);
            servidores = [];
        }

        if (servidores.length === 0) {
            this.render(); // Ensure clear render
            return;
        }

        // Mapear licenças por data
        servidores.forEach(servidor => {
            if (!servidor.licencas || servidor.licencas.length === 0) {
                return;
            }

            servidor.licencas.forEach(licenca => {
                if (!licenca.inicio || !licenca.fim) return;

                const start = new Date(licenca.inicio);
                const end = new Date(licenca.fim);

                // Iterar por cada dia da licença
                for (let date = new Date(start); date <= end; date.setDate(date.getDate() + 1)) {
                    const dateKey = this._formatDateKey(date);

                    if (!this.licensesByDate.has(dateKey)) {
                        this.licensesByDate.set(dateKey, []);
                    }

                    this.licensesByDate.get(dateKey).push({
                        servidor: servidor.servidor,
                        cargo: servidor.cargo,
                        lotacao: servidor.lotacao,
                        urgencia: servidor.urgencia,
                        licenca: licenca
                    });
                }
            });
        });

        console.log(`📊 ${this.licensesByDate.size} datas com licenças carregadas`);
        this.render();
    }

    /**
     * Formata data como chave (YYYY-MM-DD)
     * @private
     */
    _formatDateKey(date) {
        const d = new Date(date);
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    // ==================== RENDERIZAÇÃO ====================

    /**
     * Renderiza calendário
     */
    render() {
        if (!this.container) {
            console.warn('CalendarManager: Tentativa de renderizar sem container definido');
            return;
        }

        this.container.innerHTML = '';

        // Cabeçalho com navegação
        this._renderHeader();

        // Calendário
        if (this.viewMode === 'year') {
            this._renderYearView();
        } else {
            this._renderMonthView();
        }
    }

    /**
     * Renderiza cabeçalho
     * @private
     */
    _renderHeader() {
        const header = document.createElement('div');
        header.className = 'calendar-header';
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

        // Botão anterior
        const btnPrev = document.createElement('button');
        btnPrev.innerHTML = '← Anterior';
        btnPrev.className = 'btn btn-secondary';
        btnPrev.onclick = () => this.navigatePrevious();

        // Título
        const title = document.createElement('h3');
        title.style.margin = '0';
        if (this.viewMode === 'year') {
            title.textContent = this.currentYear;
        } else {
            const monthName = new Date(this.currentYear, this.currentMonth).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
            title.textContent = monthName.charAt(0).toUpperCase() + monthName.slice(1);
        }

        // Botões de modo de visualização
        const viewToggle = document.createElement('div');
        viewToggle.style.display = 'flex';
        viewToggle.style.gap = '5px';

        const btnYear = document.createElement('button');
        btnYear.textContent = 'Ano';
        btnYear.className = `btn ${this.viewMode === 'year' ? 'btn-primary' : 'btn-secondary'}`;
        btnYear.onclick = () => {
            this.viewMode = 'year';
            this.render();
        };

        const btnMonth = document.createElement('button');
        btnMonth.textContent = 'Mês';
        btnMonth.className = `btn ${this.viewMode === 'month' ? 'btn-primary' : 'btn-secondary'}`;
        btnMonth.onclick = () => {
            this.viewMode = 'month';
            this.render();
        };

        viewToggle.appendChild(btnYear);
        viewToggle.appendChild(btnMonth);

        // Botão próximo
        const btnNext = document.createElement('button');
        btnNext.innerHTML = 'Próximo →';
        btnNext.className = 'btn btn-secondary';
        btnNext.onclick = () => this.navigateNext();

        header.appendChild(btnPrev);
        header.appendChild(title);
        header.appendChild(viewToggle);
        header.appendChild(btnNext);

        this.container.appendChild(header);
    }

    /**
     * Renderiza visualização anual
     * @private
     */
    _renderYearView() {
        const yearContainer = document.createElement('div');
        yearContainer.className = 'calendar-year-view';
        yearContainer.style.cssText = `
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px;
        `;

        // Renderizar 12 meses
        for (let month = 0; month < 12; month++) {
            const monthCard = this._renderMonthCard(this.currentYear, month);
            yearContainer.appendChild(monthCard);
        }

        this.container.appendChild(yearContainer);

        // Legenda
        this._renderLegend();
    }

    /**
     * Renderiza card de mês
     * @private
     */
    _renderMonthCard(year, month) {
        const card = document.createElement('div');
        card.className = 'calendar-month-card';
        card.style.cssText = `
            background: var(--card-bg, #fff);
            border-radius: 8px;
            padding: 15px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        `;

        // Nome do mês
        const monthName = new Date(year, month).toLocaleDateString('pt-BR', { month: 'long' });
        const title = document.createElement('h4');
        title.textContent = monthName.charAt(0).toUpperCase() + monthName.slice(1);
        title.style.cssText = 'margin: 0 0 10px 0; text-align: center;';
        card.appendChild(title);

        // Grid de dias
        const grid = document.createElement('div');
        grid.style.cssText = `
            display: grid;
            grid-template-columns: repeat(7, 1fr);
            gap: 3px;
        `;

        // Cabeçalho (dias da semana)
        const weekDays = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];
        weekDays.forEach(day => {
            const dayLabel = document.createElement('div');
            dayLabel.textContent = day;
            dayLabel.style.cssText = `
                text-align: center;
                font-weight: bold;
                font-size: 0.8rem;
                color: var(--text-muted, #666);
            `;
            grid.appendChild(dayLabel);
        });

        // Primeiro dia do mês
        const firstDay = new Date(year, month, 1).getDay();

        // Espaços vazios antes do primeiro dia
        for (let i = 0; i < firstDay; i++) {
            const empty = document.createElement('div');
            grid.appendChild(empty);
        }

        // Dias do mês
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        for (let day = 1; day <= daysInMonth; day++) {
            const date = new Date(year, month, day);
            const dateKey = this._formatDateKey(date);
            const licenses = this.licensesByDate.get(dateKey) || [];
            const intensity = this._getIntensityLevel(licenses.length);

            const dayCell = document.createElement('div');
            dayCell.textContent = day;
            dayCell.style.cssText = `
                aspect-ratio: 1;
                display: flex;
                align-items: center;
                justify-content: center;
                background: ${this.intensityColors[intensity]};
                border-radius: 3px;
                font-size: 0.75rem;
                cursor: pointer;
                transition: transform 0.2s;
            `;

            dayCell.onmouseenter = () => {
                dayCell.style.transform = 'scale(1.1)';
                if (licenses.length > 0) {
                    this._showTooltip(dayCell, date, licenses);
                }
            };

            dayCell.onmouseleave = () => {
                dayCell.style.transform = 'scale(1)';
                this._hideTooltip();
            };

            dayCell.onclick = () => {
                if (licenses.length > 0) {
                    this._showDayDetail(date, licenses);
                }
            };

            grid.appendChild(dayCell);
        }

        card.appendChild(grid);
        return card;
    }

    /**
     * Renderiza visualização mensal (detalhada)
     * @private
     */
    _renderMonthView() {
        const monthContainer = document.createElement('div');
        monthContainer.className = 'calendar-month-detail';

        // Renderizar mês único com mais detalhes
        const monthCard = this._renderMonthCard(this.currentYear, this.currentMonth);
        monthCard.style.maxWidth = '800px';
        monthCard.style.margin = '0 auto';

        monthContainer.appendChild(monthCard);
        this.container.appendChild(monthContainer);

        // Lista de licenças do mês
        this._renderMonthLicenseList();

        // Legenda
        this._renderLegend();
    }

    /**
     * Renderiza lista de licenças do mês
     * @private
     */
    _renderMonthLicenseList() {
        const list = document.createElement('div');
        list.className = 'calendar-month-licenses';
        list.style.cssText = `
            margin-top: 30px;
            padding: 20px;
            background: var(--card-bg, #fff);
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        `;

        const title = document.createElement('h4');
        title.textContent = 'Licenças do Mês';
        list.appendChild(title);

        // Coletar todas as licenças do mês
        const licenses = [];
        const daysInMonth = new Date(this.currentYear, this.currentMonth + 1, 0).getDate();

        for (let day = 1; day <= daysInMonth; day++) {
            const date = new Date(this.currentYear, this.currentMonth, day);
            const dateKey = this._formatDateKey(date);
            const dayLicenses = this.licensesByDate.get(dateKey) || [];

            dayLicenses.forEach(lic => {
                if (!licenses.find(l => l.servidor === lic.servidor)) {
                    licenses.push(lic);
                }
            });
        }

        if (licenses.length === 0) {
            list.innerHTML += '<p>Nenhuma licença neste mês.</p>';
        } else {
            const ul = document.createElement('ul');
            ul.style.listStyle = 'none';
            ul.style.padding = '0';

            licenses.forEach(lic => {
                const li = document.createElement('li');
                li.style.cssText = `
                    padding: 10px;
                    margin-bottom: 5px;
                    background: var(--bg-secondary, #f8f9fa);
                    border-radius: 4px;
                    border-left: 3px solid var(--urgencia-${lic.urgencia}, #999);
                `;
                li.innerHTML = `
                    <strong>${lic.servidor}</strong><br>
                    <small>${lic.cargo} - ${lic.lotacao}</small>
                `;
                ul.appendChild(li);
            });

            list.appendChild(ul);
        }

        this.container.appendChild(list);
    }

    /**
     * Renderiza legenda de cores
     * @private
     */
    _renderLegend() {
        const legend = document.createElement('div');
        legend.className = 'calendar-legend';
        legend.style.cssText = `
            margin-top: 20px;
            padding: 15px;
            background: var(--card-bg, #fff);
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            text-align: center;
        `;

        legend.innerHTML = '<strong>Intensidade de Licenças:</strong><br>';

        const items = document.createElement('div');
        items.style.cssText = `
            display: flex;
            justify-content: center;
            gap: 15px;
            margin-top: 10px;
            flex-wrap: wrap;
        `;

        const labels = ['0', '1-2', '3-5', '6-10', '11+'];
        labels.forEach((label, index) => {
            const item = document.createElement('div');
            item.style.cssText = 'display: flex; align-items: center; gap: 5px;';
            item.innerHTML = `
                <div style="width: 20px; height: 20px; background: ${this.intensityColors[index]}; border-radius: 3px;"></div>
                <span style="font-size: 0.85rem;">${label}</span>
            `;
            items.appendChild(item);
        });

        legend.appendChild(items);
        this.container.appendChild(legend);
    }

    // ==================== TOOLTIPS ====================

    /**
     * Mostra tooltip com informações do dia
     * @private
     */
    _showTooltip(element, date, licenses) {
        this._hideTooltip();

        const tooltip = document.createElement('div');
        tooltip.id = 'calendar-tooltip';
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

        const dateStr = date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
        tooltip.innerHTML = `
            <strong>${dateStr}</strong><br>
            <span>${licenses.length} servidor(es) de licença</span><br>
            <small style="color: #ccc;">Clique para detalhes</small>
        `;

        document.body.appendChild(tooltip);

        // Posicionar tooltip
        const rect = element.getBoundingClientRect();
        tooltip.style.left = rect.left + 'px';
        tooltip.style.top = (rect.bottom + 5) + 'px';
    }

    /**
     * Esconde tooltip
     * @private
     */
    _hideTooltip() {
        const tooltip = document.getElementById('calendar-tooltip');
        if (tooltip) {
            tooltip.remove();
        }
    }

    /**
     * Mostra detalhes de um dia (modal)
     * @private
     */
    _showDayDetail(date, licenses) {
        console.log(`📅 Detalhes do dia ${date.toLocaleDateString('pt-BR')}:`, licenses);

        // Aqui poderia disparar evento para abrir modal com detalhes
        if (this.app && this.app.modalManager) {
            // Exemplo de integração com ModalManager
        }
    }

    // ==================== NAVEGAÇÃO ====================

    /**
     * Navega para período anterior
     */
    navigatePrevious() {
        if (this.viewMode === 'year') {
            this.currentYear--;
        } else {
            this.currentMonth--;
            if (this.currentMonth < 0) {
                this.currentMonth = 11;
                this.currentYear--;
            }
        }
        this.render();
    }

    /**
     * Navega para próximo período
     */
    navigateNext() {
        if (this.viewMode === 'year') {
            this.currentYear++;
        } else {
            this.currentMonth++;
            if (this.currentMonth > 11) {
                this.currentMonth = 0;
                this.currentYear++;
            }
        }
        this.render();
    }

    /**
     * Vai para ano específico
     * @param {number} year - Ano
     */
    goToYear(year) {
        this.currentYear = year;
        this.viewMode = 'year';
        this.render();
    }

    /**
     * Vai para mês específico
     * @param {number} year - Ano
     * @param {number} month - Mês (0-11)
     */
    goToMonth(year, month) {
        this.currentYear = year;
        this.currentMonth = month;
        this.viewMode = 'month';
        this.render();
    }

    /**
     * Vai para hoje
     */
    goToToday() {
        const today = new Date();
        this.currentYear = today.getFullYear();
        this.currentMonth = today.getMonth();
        this.render();
    }

    // ==================== UTILITÁRIOS ====================

    /**
     * Calcula nível de intensidade
     * @private
     * @param {number} count - Número de licenças
     * @returns {number} - Nível 0-4
     */
    _getIntensityLevel(count) {
        if (count === 0) return 0;
        if (count <= 2) return 1;
        if (count <= 5) return 2;
        if (count <= 10) return 3;
        return 4;
    }

    /**
     * Renderiza heatmap anual (método wrapper para compatibilidade)
     * @param {Array<Object>} servidores - Dados dos servidores
     * @param {HTMLElement|string} container - Container ou ID
     */
    renderYearlyHeatmap(servidores, container) {
        // Configurar visualização para ano
        this.viewMode = 'year';

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
            currentYear: this.currentYear,
            currentMonth: this.currentMonth,
            viewMode: this.viewMode,
            datesWithLicenses: this.licensesByDate.size
        };
    }
}

// Expor classe
if (typeof window !== 'undefined') {
    window.CalendarManager = CalendarManager;
}

// Exportar para Node.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CalendarManager;
}
