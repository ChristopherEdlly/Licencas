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
/**
 * CalendarManager - Gerenciamento de calendário (heatmap)
 * Compatível com DataStateManager e CalendarPage
 */
class CalendarManager {
    constructor(app) {
        this.app = app;
        this.currentYear = new Date().getFullYear();
        this.currentMonth = new Date().getMonth();
        this.viewMode = 'year';
        this.container = null;
        this.licensesByDate = new Map();
        this.intensityColors = ['#f0f0f0', '#c6e48b', '#7bc96f', '#239a3b', '#196127'];
    }

    // Public API -------------------------------------------------

    init(container) {
        if (typeof container === 'string') this.container = document.getElementById(container);
        else this.container = container;
    }

    /**
     * Atualiza o heatmap anual para o ano especificado
     */
    updateYearlyHeatmap(year = null) {
        if (!year) year = this.currentYear;
        this.currentYear = year;

        const container = document.getElementById('yearlyHeatmap') || this.container;
        if (!container) return;

        // Obter dados filtrados
        const servidores = this.app && this.app.dataStateManager ? this.app.dataStateManager.getFilteredData() : [];

        if (!servidores || servidores.length === 0) {
            container.innerHTML = '<p style="text-align:center;padding:2rem;color:var(--text-muted);">Nenhum dado disponível para visualização.</p>';
            return;
        }

        container.innerHTML = '';
        const monthsContainer = document.createElement('div');
        monthsContainer.className = 'months-grid';

        for (let m = 0; m < 12; m++) {
            monthsContainer.appendChild(this.createMonthHeatmap(year, m, servidores));
        }

        container.appendChild(monthsContainer);
    }

    changeCalendarYear(direction) {
        const newYear = this.currentYear + direction;
        this.currentYear = newYear;
        const yearEl = document.getElementById('currentCalendarYear');
        if (yearEl) yearEl.textContent = newYear;
        this.updateYearlyHeatmap(newYear);
    }

    // Legacy-like month renderer --------------------------------
    createMonthHeatmap(year, month, servidores) {
        const monthDiv = document.createElement('div');
        monthDiv.className = 'month-heatmap';

        const monthHeader = document.createElement('div');
        monthHeader.className = 'month-header';
        monthHeader.textContent = this.getMonthName(month);
        monthDiv.appendChild(monthHeader);

        const daysHeader = document.createElement('div');
        daysHeader.className = 'days-header';
        ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'].forEach(d => {
            const el = document.createElement('div'); el.className = 'day-name'; el.textContent = d; daysHeader.appendChild(el);
        });
        monthDiv.appendChild(daysHeader);

        const calendarGrid = document.createElement('div');
        calendarGrid.className = 'calendar-grid';

        const firstDay = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();

        const dayData = {};
        servidores.forEach(servidor => {
            const licenses = this._getLicensesForServidor(servidor);
            licenses.forEach(licenca => {
                const start = this._parseDate(licenca.inicio || licenca.dataInicio || licenca.INICIO || licenca.AQUISITIVO_INICIO || licenca.inicioLicenca || licenca.dataInicioRaw || licenca.Emissao || licenca.EMISSAO || licenca.AQUISITIVO_INICIO);
                let end = this._parseDate(licenca.fim || licenca.dataFim || licenca.TERMINO || licenca.AQUISITIVO_FIM || licenca.fimLicenca) || null;

                if (!start || isNaN(start)) return;

                if (!end) {
                    const tmp = new Date(start);
                    tmp.setMonth(tmp.getMonth() + 1);
                    tmp.setDate(tmp.getDate() - 1);
                    end = tmp;
                }

                const monthStart = new Date(year, month, 1);
                const monthEnd = new Date(year, month + 1, 0);

                if (start <= monthEnd && end >= monthStart) {
                    let sDay = (start <= monthStart) ? 1 : start.getDate();
                    let eDay = (end >= monthEnd) ? monthEnd.getDate() : end.getDate();

                    if (servidor.tipoTabela === 'licenca-premio') {
                        if (start <= monthStart) sDay = 1;
                        if (end >= monthEnd) eDay = monthEnd.getDate();
                    }

                    for (let d = sDay; d <= eDay; d++) dayData[d] = (dayData[d] || 0) + 1;
                }
            });
        });

        for (let i = 0; i < firstDay; i++) { const empty = document.createElement('div'); empty.className='day-cell empty'; calendarGrid.appendChild(empty); }

        // compute max count to scale levels dynamically per month
        const counts = Object.values(dayData);
        const maxCount = counts.length ? Math.max(...counts) : 0;

        for (let day = 1; day <= daysInMonth; day++) {
            const cell = document.createElement('div');
            cell.className = 'day-cell';
            const count = dayData[day] || 0;

            let level = 0;
            if (count > 0 && maxCount > 0) {
                // scale to 1..4 based on relative frequency
                level = Math.ceil((count / maxCount) * 4);
                if (level < 1) level = 1;
                if (level > 4) level = 4;
            }

            cell.classList.add(`level-${level}`);
            cell.textContent = day;
            cell.title = `${day}/${month+1}/${year}: ${count} licenças`;
            if (count > 0) {
                cell.style.cursor = 'pointer';
                cell.addEventListener('click', (e) => {
                    try {
                        console.log('[CalendarManager] Day click', { year, month, day, count });
                        this._handleDayClick(year, month, day);
                    } catch (err) {
                        console.error('[CalendarManager] Error handling day click', err);
                    }
                });
            }

            calendarGrid.appendChild(cell);
        }

        monthDiv.appendChild(calendarGrid);
        return monthDiv;
    }

    _handleDayClick(year, month, day) {
        const servidores = this.app && this.app.dataStateManager ? this.app.dataStateManager.getFilteredData() : [];
        const targetDate = new Date(year, month, day);
        const servidoresNoDia = servidores.filter(servidor => {
            const licenses = this._getLicensesForServidor(servidor);
            return licenses.some(lic => {
                const s = this._parseDate(lic.inicio || lic.dataInicio || lic.INICIO || lic.AQUISITIVO_INICIO || lic.inicioLicenca);
                let e = this._parseDate(lic.fim || lic.dataFim || lic.TERMINO || lic.AQUISITIVO_FIM || lic.fimLicenca) || null;
                if (!s) return false;
                if (!e) { const t = new Date(s); t.setMonth(t.getMonth()+1); t.setDate(t.getDate()-1); e = t; }
                return targetDate >= s && targetDate <= e;
            });
        });

        const count = servidoresNoDia.length;
        const dateStr = targetDate.toLocaleDateString('pt-BR', { weekday:'long', year:'numeric', month:'long', day:'numeric'});
        let content = `
            <div class="calendar-day-details">
                <div class="day-header">
                    <h4>${dateStr}</h4>
                    <p>${count} servidor(es) de licença</p>
                </div>
                <div class="servidores-list">
        `;

        servidoresNoDia.forEach(servidor => {
            const urg = (servidor.urgencia || (this.app && this.app.calcularUrgencia ? this.app.calcularUrgencia(servidor) : 'baixa')) || 'baixa';
            const nome = this.escapeHtml(servidor.nome || servidor.servidor || '');
            const cargo = this.escapeHtml(servidor.cargo || 'N/A');
            const nomeJs = this.escapeJs(servidor.nome || servidor.servidor || '');

            content += `
                <div class="servidor-card" onclick="window.app && window.app.modalManager && window.app.modalManager.showServidorDetails('${nomeJs}')">
                    <div class="servidor-info">
                        <div class="servidor-nome">${nome}</div>
                        <div class="servidor-cargo">${cargo}</div>
                    </div>
                    <div class="servidor-urgencia urgency-${String(urg).toLowerCase()}">${this.escapeHtml(urg)}</div>
                </div>
            `;
        });

        content += `</div></div>`;
        const modalId = 'calendar-day-modal';
        if (this.app && this.app.modalManager) {
            const mm = this.app.modalManager;
            if (document.getElementById(modalId)) {
                mm.updateTitle(modalId, 'Licenças do Dia');
                mm.updateContent(modalId, content);
            } else {
                mm.createModal({ id: modalId, title: 'Licenças do Dia', content: content, size: 'medium', closeButton: true });
                // createModal already appends and setups listeners
            }
            mm.open(modalId);
        } else if (window.ModalManager && typeof window.ModalManager.createModal === 'function') {
            // Fallback to global ModalManager-like API
            if (!document.getElementById(modalId)) {
                window.ModalManager.createModal({ id: modalId, title: 'Licenças do Dia', content: content, size: 'medium', closeButton: true });
            } else {
                if (typeof window.ModalManager.updateContent === 'function') window.ModalManager.updateContent(modalId, content);
                if (typeof window.ModalManager.updateTitle === 'function') window.ModalManager.updateTitle(modalId, 'Licenças do Dia');
            }
            if (typeof window.ModalManager.open === 'function') window.ModalManager.open(modalId);
        }
    }

    // Normalize: return array of license-like objects for a servidor
    _getLicensesForServidor(servidor) {
        if (!servidor) return [];
        if (Array.isArray(servidor.licencas) && servidor.licencas.length > 0) return servidor.licencas;
        // Legacy: treat the record itself as a license object
        return [servidor];
    }

    // Robust date parsing using DateUtils if available
    _parseDate(value) {
        if (!value && value !== 0) return null;
        if (value instanceof Date) return isNaN(value) ? null : value;
        const str = String(value).trim();
        if (!str) return null;
        // Prefer core DateUtils if present
        try {
            if (typeof DateUtils !== 'undefined' && typeof DateUtils.parseDate === 'function') {
                const d = DateUtils.parseDate(str);
                if (d) return d;
            }
            if (typeof window !== 'undefined' && window.DateUtils && typeof window.DateUtils.parseDate === 'function') {
                const d2 = window.DateUtils.parseDate(str);
                if (d2) return d2;
            }
        } catch (err) {
            // fall through to native parsing
        }

        // Try ISO-friendly parsing
        const iso = str.replace(' ', 'T');
        const cand = new Date(iso);
        if (!isNaN(cand)) return cand;

        // Last resort: Date constructor
        const nativeDate = new Date(str);
        return isNaN(nativeDate) ? null : nativeDate;
    }

    // Helpers ----------------------------------------------------
    getMonthName(month) { return ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'][month]; }
    escapeHtml(text) { const d=document.createElement('div'); d.textContent = text || ''; return d.innerHTML; }
    escapeJs(text) { if (text === null || text === undefined) return ''; return String(text).replace(/\\/g,'\\\\').replace(/'/g,"\\'").replace(/\"/g,'\\"'); }
}

if (typeof window !== 'undefined') window.CalendarManager = CalendarManager;
if (typeof module !== 'undefined' && module.exports) module.exports = CalendarManager;
