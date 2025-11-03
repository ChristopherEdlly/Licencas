class CalendarManager {
    constructor(dashboard) {
        this.dashboard = dashboard;
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

        if (!this.dashboard.filteredServidores || this.dashboard.filteredServidores.length === 0) {
            container.innerHTML = '<p style="text-align: center; padding: 2rem; color: var(--text-muted);">Nenhum dado disponível para visualização.</p>';
            return;
        }

        container.innerHTML = '';
        const monthsContainer = document.createElement('div');
        monthsContainer.className = 'months-grid';

        for (let month = 0; month < 12; month++) {
            const monthDiv = this.createMonthHeatmap(year, month);
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

    createMonthHeatmap(year, month) {
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
        this.dashboard.filteredServidores.forEach(servidor => {
            servidor.licencas.forEach(licenca => {
                const licenseStart = licenca.inicio;
                let licenseEnd = licenca.fim;
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
                    this.showCalendarDayDetails(year, month, day, count);
                });
                dayCell.style.cursor = 'pointer';
            }

            calendarGrid.appendChild(dayCell);
        }

        monthDiv.appendChild(calendarGrid);
        return monthDiv;
    }

    showCalendarDayDetails(year, month, day, count) {
        const targetDate = new Date(year, month, day);
        const dateStr = targetDate.toLocaleDateString('pt-BR', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });

        const servidores = this.dashboard.filteredServidores.filter(servidor => {
            return servidor.licencas.some(licenca => {
                const licenseStart = licenca.inicio;
                let licenseEnd = licenca.fim;
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

        servidores.forEach(servidor => {
            const urgencia = this.dashboard.calcularUrgencia(servidor);
            content += `
                <div class="servidor-card" onclick="dashboard.modalManager.showServidorDetails('${this.escapeHtml(servidor.nome)}')">
                    <div class="servidor-info">
                        <div class="servidor-nome">${servidor.nome}</div>
                        <div class="servidor-cargo">${servidor.cargo || 'N/A'}</div>
                    </div>
                    <div class="servidor-urgencia urgency-${urgencia.toLowerCase()}">${urgencia}</div>
                </div>
            `;
        });

        content += `</div></div>`;
        this.dashboard.modalManager.showModal('Licenças do Dia', content, 'calendar-day-modal');
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
