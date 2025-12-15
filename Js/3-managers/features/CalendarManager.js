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


    // Lógica legada portada de js - old/modules/CalendarManager.js
    class CalendarManager {
        constructor(app) {
            this.app = app;
            this.currentYear = new Date().getFullYear();
        }

        updateYearlyHeatmap(year = null) {
            if (!year) {
                const yearElement = document.getElementById('currentCalendarYear');
                year = yearElement ? parseInt(yearElement.textContent) : this.currentYear;
            }

            const container = document.getElementById('yearlyHeatmap');
            if (!container) return;

            const currentYearElement = document.getElementById('currentCalendarYear');
            if (currentYearElement) currentYearElement.textContent = year;

            // Adaptar: obter dados filtrados do DataStateManager via app
            const servidores = this.app && this.app.dataStateManager ? this.app.dataStateManager.getFilteredData() : [];
            if (!servidores || servidores.length === 0) {
                container.innerHTML = '<p style="text-align: center; padding: 2rem; color: var(--text-muted);">Nenhum dado disponível para visualização.</p>';
                return;
            }

            container.innerHTML = '';
            const monthsContainer = document.createElement('div');
            monthsContainer.className = 'months-grid';

            for (let month = 0; month < 12; month++) {
                const monthDiv = this.createMonthHeatmap(year, month, servidores);
                monthsContainer.appendChild(monthDiv);
            }

            container.appendChild(monthsContainer);
        }

        changeCalendarYear(direction) {
            const currentYearElement = document.getElementById('currentCalendarYear');
            if (!currentYearElement) return;

            const currentYear = parseInt(currentYearElement.textContent);
            const newYear = currentYear + direction;

            if (newYear >= 2020 && newYear <= 2030) {
                currentYearElement.textContent = newYear;
                this.updateYearlyHeatmap(newYear);
            }
        }

        createMonthHeatmap(year, month, servidores) {
            const monthDiv = document.createElement('div');
            monthDiv.className = 'month-heatmap';

            const monthHeader = document.createElement('div');
            monthHeader.className = 'month-header';
            monthHeader.textContent = this.getMonthName(month);
            monthDiv.appendChild(monthHeader);

            const daysHeader = document.createElement('div');
            daysHeader.className = 'days-header';
            const dayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
            dayNames.forEach(day => {
                const dayEl = document.createElement('div');
                dayEl.className = 'day-name';
                dayEl.textContent = day;
                daysHeader.appendChild(dayEl);
            });
            monthDiv.appendChild(daysHeader);

            const calendarGrid = document.createElement('div');
            calendarGrid.className = 'calendar-grid';

            const firstDay = new Date(year, month, 1).getDay();
            const daysInMonth = new Date(year, month + 1, 0).getDate();

            const dayData = {};
            servidores.forEach(servidor => {
                if (!servidor.licencas) return;
                servidor.licencas.forEach(licenca => {
                    const licenseStart = new Date(licenca.inicio);
                    let licenseEnd = licenca.fim ? new Date(licenca.fim) : null;
                    if (!licenseEnd) {
                        const nextMonth = new Date(licenseStart);
                        nextMonth.setMonth(nextMonth.getMonth() + 1);
                        nextMonth.setDate(nextMonth.getDate() - 1);
                        licenseEnd = nextMonth;
                    }

                    const monthStart = new Date(year, month, 1);
                    const monthEnd = new Date(year, month + 1, 0);

                    if (licenseStart <= monthEnd && licenseEnd >= monthStart) {
                        let startDay, endDay;

                        if (servidor.tipoTabela === 'licenca-premio') {
                            if (licenseStart <= monthStart) {
                                startDay = 1;
                            } else {
                                startDay = licenseStart.getDate();
                            }

                            if (licenseEnd >= monthEnd) {
                                endDay = new Date(year, month + 1, 0).getDate();
                            } else {
                                endDay = licenseEnd.getDate();
                            }
                        } else {
                            startDay = Math.max(1, licenseStart.getMonth() === month && licenseStart.getFullYear() === year ? licenseStart.getDate() : 1);
                            endDay = Math.min(
                                new Date(year, month + 1, 0).getDate(),
                                licenseEnd.getMonth() === month && licenseEnd.getFullYear() === year ? licenseEnd.getDate() : new Date(year, month + 1, 0).getDate()
                            );
                        }

                        for (let day = startDay; day <= endDay; day++) {
                            dayData[day] = (dayData[day] || 0) + 1;
                        }
                    }
                });
            });

            for (let i = 0; i < firstDay; i++) {
                const emptyCell = document.createElement('div');
                emptyCell.className = 'day-cell empty';
                calendarGrid.appendChild(emptyCell);
            }

            for (let day = 1; day <= daysInMonth; day++) {
                const dayCell = document.createElement('div');
                dayCell.className = 'day-cell';

                const count = dayData[day] || 0;
                let level = 0;
                if (count > 0) {
                    if (count === 1) level = 1;
                    else if (count <= 3) level = 2;
                    else if (count <= 5) level = 3;
                    else level = 4;
                }

                dayCell.classList.add(`level-${level}`);
                dayCell.textContent = day;
                dayCell.title = `${day}/${month + 1}/${year}: ${count} licenças`;

                if (count > 0) {
                    dayCell.addEventListener('click', () => {
                        this.showCalendarDayDetails(year, month, day, count, servidores);
                    });
                    dayCell.style.cursor = 'pointer';
                }

                calendarGrid.appendChild(dayCell);
            }

            monthDiv.appendChild(calendarGrid);
            return monthDiv;
        }

        showCalendarDayDetails(year, month, day, count, servidores) {
            const targetDate = new Date(year, month, day);
            const dateStr = targetDate.toLocaleDateString('pt-BR', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });

            const servidoresNoDia = servidores.filter(servidor => {
                return (servidor.licencas || []).some(licenca => {
                    const licenseStart = new Date(licenca.inicio);
                    let licenseEnd = licenca.fim ? new Date(licenca.fim) : null;
                    if (!licenseEnd) {
                        const nextMonth = new Date(licenseStart);
                        nextMonth.setMonth(nextMonth.getMonth() + 1);
                        nextMonth.setDate(nextMonth.getDate() - 1);
                        licenseEnd = nextMonth;
                    }
                    return targetDate >= licenseStart && targetDate <= licenseEnd;
                });
            });

            let content = `
                <div class="calendar-day-details">
                    <div class="day-header">
                        <h4>${dateStr}</h4>
                        <p>${count} servidor(es) de licença</p>
                    </div>
                    <div class="servidores-list">
            `;

            servidoresNoDia.forEach(servidor => {
                const urgencia = servidor.urgencia || (this.app && this.app.calcularUrgencia ? this.app.calcularUrgencia(servidor) : 'baixa');
                content += `
                    <div class="servidor-card" onclick="if(window.ModalManager) ModalManager.showServidorDetails('${this.escapeHtml(servidor.nome)}')">
                        <div class="servidor-info">
                            <div class="servidor-nome">${servidor.nome}</div>
                            <div class="servidor-cargo">${servidor.cargo || 'N/A'}</div>
                        </div>
                        <div class="servidor-urgencia urgency-${urgencia.toLowerCase()}">${urgencia}</div>
                    </div>
                `;
            });

            content += `</div></div>`;
            if (this.app && this.app.modalManager) {
                this.app.modalManager.showModal('Licenças do Dia', content, 'calendar-day-modal');
            } else if (window.ModalManager) {
                window.ModalManager.showModal('Licenças do Dia', content, 'calendar-day-modal');
            }
        }

        getMonthName(month) {
            const monthNames = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
                               'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
            return monthNames[month];
        }

        escapeHtml(text) {
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        }
    }

    if (typeof window !== 'undefined') {
        window.CalendarManager = CalendarManager;
    }

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = CalendarManager;
    }
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
