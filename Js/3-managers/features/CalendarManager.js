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
        // Cache simples para parsing de datas (melhora performance com muitos registros)
        this._parseCache = new Map();
        // Limite inicial de itens mostrados no modal do dia (evita travar a UI)
        this._dayModalInitialLimit = 200;
        this.intensityColors = ['#f0f0f0', '#c6e48b', '#7bc96f', '#239a3b', '#196127'];
        this._anonServidorCounter = 1;
        this._servidorWeakMap = new WeakMap();
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

        // Calcular máximo global por ano (contagem de servidores únicos por dia)
        const yearDaySets = {}; // 'YYYY-MM-DD' -> Set(keys)
        const yearStart = new Date(year, 0, 1);
        const yearEnd = new Date(year, 11, 31);
        servidores.forEach(servidor => {
            const licenses = this._getLicensesForServidor(servidor);
            const servidorKey = this._getServidorKey(servidor);
            licenses.forEach(licenca => {
                const start = this._parseDate(licenca.inicio || licenca.dataInicio || licenca.INICIO || licenca.AQUISITIVO_INICIO || licenca.inicioLicenca || licenca.dataInicioRaw || licenca.Emissao || licenca.EMISSAO || licenca.A_PARTIR);
                let end = this._parseDate(licenca.fim || licenca.dataFim || licenca.TERMINO || licenca.AQUISITIVO_FIM || licenca.fimLicenca) || null;
                if (!start || isNaN(start)) return;
                if (!end) { const tmp = new Date(start); tmp.setMonth(tmp.getMonth()+1); tmp.setDate(tmp.getDate()-1); end = tmp; }

                // Intersect with year
                const s = start <= yearStart ? yearStart : start;
                const e = end >= yearEnd ? yearEnd : end;
                if (s > e) return;

                let cur = new Date(s);
                while (cur <= e) {
                    const key = `${cur.getFullYear()}-${String(cur.getMonth()+1).padStart(2,'0')}-${String(cur.getDate()).padStart(2,'0')}`;
                    if (!yearDaySets[key]) yearDaySets[key] = new Set();
                    yearDaySets[key].add(servidorKey);
                    cur.setDate(cur.getDate()+1);
                }
            });
        });

        let globalMax = 0;
        Object.keys(yearDaySets).forEach(k => { globalMax = Math.max(globalMax, yearDaySets[k].size); });

        for (let m = 0; m < 12; m++) {
            monthsContainer.appendChild(this.createMonthHeatmap(year, m, servidores, globalMax));
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
    createMonthHeatmap(year, month, servidores, globalMax = null) {
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

        // Para evitar contar múltiplas linhas/licenças do mesmo servidor
        // usamos um conjunto por dia com um identificador único do servidor
        const daySets = {}; // day -> Set(ids)

        servidores.forEach(servidor => {
            const licenses = this._getLicensesForServidor(servidor);
            const servidorKey = this._getServidorKey(servidor);
            licenses.forEach(licenca => {
                const start = this._parseDate(licenca.inicio || licenca.dataInicio || licenca.INICIO || licenca.AQUISITIVO_INICIO || licenca.inicioLicenca || licenca.dataInicioRaw || licenca.Emissao || licenca.EMISSAO || licenca.A_PARTIR);
                let end = this._parseDate(licenca.fim || licenca.dataFim || licenca.TERMINO || licenca.AQUISITIVO_FIM || licenca.fimLicenca) || null;
                if (!start || isNaN(start)) return;
                if (!end) { const tmp = new Date(start); tmp.setMonth(tmp.getMonth() + 1); tmp.setDate(tmp.getDate() - 1); end = tmp; }

                const monthStart = new Date(year, month, 1);
                const monthEnd = new Date(year, month + 1, 0);

                if (start <= monthEnd && end >= monthStart) {
                    let sDay = (start <= monthStart) ? 1 : start.getDate();
                    let eDay = (end >= monthEnd) ? monthEnd.getDate() : end.getDate();
                    if (servidor && servidor.tipoTabela === 'licenca-premio') {
                        if (start <= monthStart) sDay = 1;
                        if (end >= monthEnd) eDay = monthEnd.getDate();
                    }
                    for (let d = sDay; d <= eDay; d++) {
                        if (!daySets[d]) daySets[d] = new Set();
                        daySets[d].add(servidorKey);
                    }
                }
            });
        });
        // convert sets to counts
        const dayCounts = {};
        Object.keys(daySets).forEach(k => { dayCounts[k] = daySets[k].size; });

        for (let i = 0; i < firstDay; i++) { const empty = document.createElement('div'); empty.className='day-cell empty'; calendarGrid.appendChild(empty); }

        // compute max count to scale levels dynamically per month
        const counts = Object.values(dayCounts);
        const monthMax = counts.length ? Math.max(...counts) : 0;
        const maxCount = (typeof globalMax === 'number' && globalMax > 0) ? globalMax : monthMax;

        // Optional debug output when window.DEBUG_CALENDAR is true
        try {
            if (typeof window !== 'undefined' && window.DEBUG_CALENDAR) {
                console.log('[CalendarManager] Heatmap debug', { year, month, dayCounts, monthMax, maxCount });
            }
        } catch (e) {
            // ignore
        }

        for (let day = 1; day <= daysInMonth; day++) {
            const cell = document.createElement('div');
            cell.className = 'day-cell';
            const count = dayCounts[day] || 0;

            // Fixed legend (follow explicit HTML legend):
            // 0 -> Nenhuma
            // 1 -> Baixa
            // 2-3 -> Moderada
            // 4-5 -> Alta
            // 6+ -> Muito Alta
            let level = 0;
            if (count === 0) level = 0;
            else if (count === 1) level = 1;
            else if (count >= 2 && count <= 3) level = 2;
            else if (count >= 4 && count <= 5) level = 3;
            else if (count >= 6) level = 4;

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
        // Encontrar todas as entradas (cada linha/registro) que ocupam o dia
        const entradasNoDia = [];
        servidores.forEach(servidor => {
            const licenses = this._getLicensesForServidor(servidor);
            licenses.forEach(lic => {
                const s = this._parseDate(lic.inicio || lic.dataInicio || lic.INICIO || lic.A_PARTIR || lic.AQUISITIVO_INICIO || lic.inicioLicenca || lic.Emissao || lic.EMISSAO);
                let e = this._parseDate(lic.fim || lic.dataFim || lic.TERMINO || lic.AQUISITIVO_FIM || lic.fimLicenca) || null;
                if (!s) return;
                if (!e) { const t = new Date(s); t.setMonth(t.getMonth()+1); t.setDate(t.getDate()-1); e = t; }
                if (targetDate >= s && targetDate <= e) {
                    entradasNoDia.push({ servidor, lic });
                }
            });
        });

        // Agrupar por servidor (nome normalizado) para evitar mostrar duplicados quando cada linha é uma licença)
        const grupos = new Map();
        entradasNoDia.forEach(({ servidor }) => {
            const nomeRaw = (servidor.nome || servidor.NOME || servidor.servidor || servidor.SERVIDOR || '').trim();
            const key = nomeRaw ? nomeRaw.toLowerCase() : `__anon_${Math.random().toString(36).slice(2,9)}`;
            if (!grupos.has(key)) grupos.set(key, []);
            grupos.get(key).push(servidor);
        });

        const uniqueCount = grupos.size;
        const entriesCount = entradasNoDia.length;

        const dateStr = targetDate.toLocaleDateString('pt-BR', { weekday:'long', year:'numeric', month:'long', day:'numeric'});
        // Construir modal de forma incremental para evitar criar uma string enorme
        const modalId = 'calendarDayModal';
        const mm = (this.app && this.app.modalManager) ? this.app.modalManager : (window.ModalManager || null);

        const headerHtml = `
            <div class="calendar-day-details">
                <div class="day-header">
                    <h4>${dateStr}</h4>
                    <p>${uniqueCount} servidor(es) ( ${entriesCount} entradas )</p>
                </div>
                <div class="servidores-list" id="${modalId}-list">
                </div>
            </div>
        `;

        // Helpers e lista de representantes (pré-calculados) para uso tanto no modal legado quanto no dinâmico
        const getName = (s) => (s.nome || s.NOME || s.servidor || s.SERVIDOR || '').trim() || 'N/A';
        const getCargo = (s) => (s.cargo || s.CARGO || s.funcao || '').trim() || 'N/A';

        const createItemHtml = (servidor, idx) => {
            const urg = (servidor.urgencia || servidor.URGENCIA || (this.app && this.app.calcularUrgencia ? this.app.calcularUrgencia(servidor) : 'baixa')) || 'baixa';
            const nomeText = getName(servidor);
            const nome = this.escapeHtml(nomeText);
            const cargo = this.escapeHtml(getCargo(servidor));
            // Gerar iniciais para avatar (2 letras)
            const initials = (nomeText.split(' ').map(w => w[0]).join('').substring(0,2) || '??').toUpperCase();

            return `
                <div class="servidor-item" data-index="${idx}">
                    <div class="server-avatar">${initials}</div>
                    <div class="servidor-info">
                        <strong class="servidor-nome">${nome}</strong>
                        <div class="servidor-meta">
                            <span class="meta-item">
                                <i class="bi bi-briefcase"></i>
                                <span>${cargo}</span>
                            </span>
                        </div>
                        ${servidor.licenseInfo ? `
                            <div class="servidor-licenca">
                                <i class="bi bi-calendar-check"></i>
                                <span>${this.escapeHtml(servidor.licenseInfo)}</span>
                            </div>
                        ` : ''}
                    </div>
                    <div class="servidor-details">
                        <button class="btn-icon btn-eye" data-index="${idx}" title="Ver detalhes">
                            <i class="bi bi-eye"></i>
                        </button>
                    </div>
                </div>
            `;
        };

        // Preparar lista deduplicada de representantes (um por nome) com licenseInfo calculado
        const representantes = [];
        grupos.forEach((arr) => {
            const base = arr[0];
            let licenseInfo = '';
            for (let i = 0; i < arr.length; i++) {
                const registro = arr[i];
                const licencas = this._getLicensesForServidor(registro);
                const active = licencas.find(l => {
                    const s = this._parseDate(l.inicio || l.dataInicio || l.A_PARTIR || l.AQUISITIVO_INICIO || l.INICIO);
                    let e = this._parseDate(l.fim || l.dataFim || l.TERMINO || l.AQUISITIVO_FIM || l.FIM) || null;
                    if (!s) return false;
                    if (!e) { const t = new Date(s); t.setMonth(t.getMonth()+1); t.setDate(t.getDate()-1); e = t; }
                    return targetDate >= s && targetDate <= e;
                });
                if (active) {
                    const s = this._parseDate(active.inicio || active.dataInicio || active.A_PARTIR || active.AQUISITIVO_INICIO || active.INICIO);
                    const e = this._parseDate(active.fim || active.dataFim || active.TERMINO || active.AQUISITIVO_FIM || active.FIM) || null;
                    const sStr = s ? s.toLocaleDateString('pt-BR') : '-';
                    const eStr = e ? e.toLocaleDateString('pt-BR') : '-';
                    licenseInfo = `${sStr} até ${eStr}`;
                    break;
                }
            }
            representantes.push(Object.assign({}, base, { licenseInfo }));
        });

        if (mm) {
            // Prefer legacy modal element if present in DOM (index.html)
            const legacyModal = document.getElementById('calendarDayModal');
            if (legacyModal) {
                // Use existing modal structure from index.html
                const modalTitleEl = document.getElementById('calendarDayTitle');
                const modalBodyEl = document.getElementById('calendarServersList');
                if (modalTitleEl) modalTitleEl.textContent = dateStr;

                // Build section HTML for licenças
                const sectionHtml = `
                    <div class="modal-section">
                        <div class="section-header">
                            <i class="bi bi-calendar-check section-icon"></i>
                            <h4 class="section-title">Licenças</h4>
                            <span class="section-badge success">${uniqueCount}</span>
                        </div>
                        <div class="section-content" id="licencasList"></div>
                    </div>
                `;

                if (modalBodyEl) {
                    modalBodyEl.innerHTML = sectionHtml;
                    const licencasList = document.getElementById('licencasList');
                    if (licencasList) {
                        // populate representatives (deduplicated) inside legacy wrapper
                        licencasList.innerHTML = `<div class="servidores-list">${representantes.map((s, i) => createItemHtml(s, i)).join('')}</div>`;
                        // Delegated click handler on the wrapper (attach once, remove previous)
                        const wrapper = licencasList.querySelector('.servidores-list');
                        if (wrapper) {
                            if (wrapper._calendarClickHandler) wrapper.removeEventListener('click', wrapper._calendarClickHandler);
                            wrapper._representantes = representantes;
                            wrapper._calendarClickHandler = (ev) => {
                                const eye = ev.target.closest('.btn-eye');
                                if (eye) {
                                    ev.stopPropagation();
                                    const idx = parseInt(eye.getAttribute('data-index'), 10);
                                    const representante = wrapper._representantes[idx];
                                    if (!representante) return;
                                    const nomeToShow = (representante.nome || representante.NOME || representante.servidor || representante.SERVIDOR || '').trim();
                                    if (this.app && this.app.modalManager && typeof this.app.modalManager.showServidorDetails === 'function') {
                                        this.app.modalManager.showServidorDetails(nomeToShow);
                                    } else if (window.ModalManager && typeof window.ModalManager.showServidorDetails === 'function') {
                                        window.ModalManager.showServidorDetails(nomeToShow);
                                    }
                                    return;
                                }

                                const card = ev.target.closest('.servidor-item');
                                if (!card) return;
                                const idx = parseInt(card.getAttribute('data-index'), 10);
                                const representante = wrapper._representantes[idx];
                                if (!representante) return;
                                const nomeToShow = (representante.nome || representante.NOME || representante.servidor || representante.SERVIDOR || '').trim();
                                if (this.app && this.app.modalManager && typeof this.app.modalManager.showServidorDetails === 'function') {
                                    this.app.modalManager.showServidorDetails(nomeToShow);
                                } else if (window.ModalManager && typeof window.ModalManager.showServidorDetails === 'function') {
                                    window.ModalManager.showServidorDetails(nomeToShow);
                                }
                            };
                            wrapper.addEventListener('click', wrapper._calendarClickHandler);
                        }
                    }
                }
                // Open the legacy modal via ModalManager if available
                if (this.app && this.app.modalManager && typeof this.app.modalManager.open === 'function') {
                    this.app.modalManager.open('calendarDayModal');
                } else {
                    legacyModal.style.display = 'flex';
                }

                return;
            }

            // Fallback: create a dynamic modal as before
            if (!document.getElementById(modalId)) {
                mm.createModal({ id: modalId, title: 'Licenças do Dia', content: headerHtml, size: 'large', closeButton: true });
            } else {
                mm.updateTitle(modalId, 'Licenças do Dia');
                mm.updateContent(modalId, headerHtml);
            }

            // Abrir modal
            mm.open(modalId);

            // Depois de aberto, popular lista de servidores de forma paginada / incremental
            setTimeout(() => {
                const modalEl = document.getElementById(modalId);
                if (!modalEl) return;
                const listContainer = modalEl.querySelector(`#${modalId}-list`);
                if (!listContainer) return;

                // Popula primeiros itens (por representantes)
                const initial = Math.min(representantes.length, this._dayModalInitialLimit);
                let remaining = representantes.length - initial;
                const fragment = document.createElement('div');
                fragment.innerHTML = representantes.slice(0, initial).map((s, i) => createItemHtml(s, i)).join('');
                // Limpar e inserir
                listContainer.innerHTML = '';
                listContainer.appendChild(fragment);

                // Anexar handlers para abrir detalhes (delegation)
                // Delegated click handler (ensure single attachment)
                if (listContainer._calendarClickHandler) listContainer.removeEventListener('click', listContainer._calendarClickHandler);
                listContainer._representantes = representantes;
                listContainer._calendarClickHandler = (ev) => {
                    const card = ev.target.closest('.servidor-item');
                    if (!card) return;
                    const idx = parseInt(card.getAttribute('data-index'), 10);
                    const representante = listContainer._representantes[idx];
                    if (!representante) return;
                    const nomeToShow = (representante.nome || representante.NOME || representante.servidor || representante.SERVIDOR || '').trim();
                    if (this.app && this.app.modalManager && typeof this.app.modalManager.showServidorDetails === 'function') {
                        this.app.modalManager.showServidorDetails(nomeToShow);
                    } else if (window.ModalManager && typeof window.ModalManager.showServidorDetails === 'function') {
                        window.ModalManager.showServidorDetails(nomeToShow);
                    }
                };
                listContainer.addEventListener('click', listContainer._calendarClickHandler);

                // Se houver mais representantes, adicionar botão "Mostrar mais"
                if (remaining > 0) {
                    const moreBtn = document.createElement('button');
                    moreBtn.className = 'btn btn-link';
                    moreBtn.textContent = `Mostrar mais (${remaining})`;
                    moreBtn.style.margin = '1rem 0';
                    moreBtn.addEventListener('click', () => {
                        const moreFragment = document.createElement('div');
                                        moreFragment.innerHTML = representantes.slice(initial).map((s, i) => createItemHtml(s, initial + i)).join('');
                        listContainer.appendChild(moreFragment);
                        moreBtn.remove();
                    });
                    listContainer.parentNode.appendChild(moreBtn);
                }
            }, 50);
        } else {
            // Fallback simples: alert com contagem
            alert(`${dateStr} - ${uniqueCount} servidor(es) de licença`);
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
        // Cache lookup
        if (this._parseCache.has(str)) return this._parseCache.get(str);
        // Prefer core DateUtils if present
        try {
            if (typeof DateUtils !== 'undefined' && typeof DateUtils.parseDate === 'function') {
                const d = DateUtils.parseDate(str);
                if (d) { this._parseCache.set(str, d); return d; }
            }
            if (typeof window !== 'undefined' && window.DateUtils && typeof window.DateUtils.parseDate === 'function') {
                const d2 = window.DateUtils.parseDate(str);
                if (d2) { this._parseCache.set(str, d2); return d2; }
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
        const final = isNaN(nativeDate) ? null : nativeDate;
        if (final) this._parseCache.set(str, final);
        return final;
    }

    // Helpers ----------------------------------------------------
    getMonthName(month) { return ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'][month]; }
    escapeHtml(text) { const d=document.createElement('div'); d.textContent = text || ''; return d.innerHTML; }
    escapeJs(text) { if (text === null || text === undefined) return ''; return String(text).replace(/\\/g,'\\\\').replace(/'/g,"\\'").replace(/\"/g,'\\"'); }

    // Retorna uma chave estável para identificar um servidor (prioriza id/cpf/matricula, depois nome, depois WeakMap anon)
    _getServidorKey(s) {
        if (!s) return `anon:${this._anonServidorCounter++}`;
        const id = s.matricula || s.MATRICULA || s.id || s.ID || s.cpf || s.CPF;
        if (id) return `id:${String(id)}`;
        const name = (s.nome || s.NOME || s.servidor || s.SERVIDOR || '').toString().trim();
        if (name) return `name:${name.toLowerCase()}`;
        if (this._servidorWeakMap.has(s)) return this._servidorWeakMap.get(s);
        const anon = `anon:${this._anonServidorCounter++}`;
        this._servidorWeakMap.set(s, anon);
        return anon;
    }
}

if (typeof window !== 'undefined') window.CalendarManager = CalendarManager;
if (typeof module !== 'undefined' && module.exports) module.exports = CalendarManager;
