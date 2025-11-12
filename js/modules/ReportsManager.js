/**
 * ReportsManager - Gerenciamento de Relatórios em PDF
 * Responsável por: Configuração, preview e geração de relatórios em PDF
 */

class ReportsManager {
    constructor(dashboard) {
        this.dashboard = dashboard;
        this.defaultColumns = ['nome', 'cargo', 'lotacao', 'periodoLicenca', 'urgencia'];
        this.reportConfig = {
            title: 'Relatório de Licenças',
            type: 'complete',
            orientation: 'landscape',
            includeCharts: true,
            includeStats: true,
            includeLogo: true,
            columns: [...this.defaultColumns],
            dateStart: null,
            dateEnd: null,
            urgencyFilter: '',
            cargoFilter: '',
            limit: 'all'
        };
        
        this.columnLabels = {
            nome: 'Nome',
            cpf: 'CPF',
            matricula: 'Matrícula',
            cargo: 'Cargo',
            lotacao: 'Lotação',
            superintendencia: 'Superintendência',
            subsecretaria: 'Subsecretaria',
            idade: 'Idade',
            urgencia: 'Urgência',
            periodoLicenca: 'Período da Licença',
            dataInicio: 'Início',
            dataFim: 'Fim',
            diasLicenca: 'Dias de Licença',
            mesesLicenca: 'Meses de Licença'
        };
        
        this.hasPreview = false;
        this.lastCargoOptionsHash = '';
        this.isExportingXlsx = false;
        this.livePreviewEnabled = true;
        this.previewDebounce = null;
        this.lastPreviewAt = null;

        this.reportTypeLabels = {
            complete: 'Completo',
            summary: 'Resumo',
            urgency: 'Por Urgência',
            cargo: 'Por Cargo'
        };
        
        this.init();
    }

    /**
     * Inicialização
     */
    init() {
        this.setupEventListeners();
        this.syncFilterNotice();
        this.updateConfig();
    }

    /**
     * Configurar event listeners
     */
    setupEventListeners() {
        // Botões de ação (novos IDs do redesign)
        const generateBtn = document.getElementById('generatePdfRedesign');
        const exportXlsxBtn = document.getElementById('exportXlsxRedesign');
        const selectAllBtn = document.getElementById('selectAllColumns');
        const editFiltersBtn = document.getElementById('editFiltersFromReports');

        // Botões do footer (compactos)
        const generateBtnFooter = document.getElementById('generatePdfRedesignFooter');
        const exportXlsxBtnFooter = document.getElementById('exportXlsxRedesignFooter');

        if (generateBtn) {
            generateBtn.addEventListener('click', () => this.generatePDF());
        }

        if (exportXlsxBtn) {
            exportXlsxBtn.addEventListener('click', () => this.exportToXLSX(exportXlsxBtn));
        }

        // Conectar botões do footer aos mesmos métodos
        if (generateBtnFooter) {
            generateBtnFooter.addEventListener('click', () => this.generatePDF());
        }

        if (exportXlsxBtnFooter) {
            exportXlsxBtnFooter.addEventListener('click', () => this.exportToXLSX(exportXlsxBtnFooter));
        }

        if (selectAllBtn) {
            selectAllBtn.addEventListener('click', () => this.toggleSelectAllColumns());
        }

        if (editFiltersBtn) {
            editFiltersBtn.addEventListener('click', () => this.openAdvancedFilters());
        }

        // Input de título
        const titleInput = document.getElementById('reportTitleRedesign');
        if (titleInput) {
            titleInput.addEventListener('input', () => this.updateConfig());
        }

        // Listener para mudança de colunas (novo ID do grid)
        const columnCheckboxes = document.querySelectorAll('#columnsGridRedesign input[type="checkbox"]');
        columnCheckboxes.forEach(checkbox => {
            checkbox.addEventListener('change', () => this.updateConfig());
        });
    }

    /**
     * Sincronizar notice de filtros ativos com estado do dashboard
     */
    syncFilterNotice() {
        const noticeText = document.getElementById('filterNoticeText');
        if (!noticeText) return;

        const filtered = this.dashboard.filteredServidores || [];
        const all = this.dashboard.allServidores || [];
        const activeFilters = this.dashboard.currentFilters || {};

        // Contar quantos filtros estão ativos
        let filterCount = 0;
        if (activeFilters.urgencia && activeFilters.urgencia.length > 0) filterCount++;
        if (activeFilters.cargo && activeFilters.cargo.length > 0) filterCount++;
        if (activeFilters.periodo) filterCount++;
        if (activeFilters.busca) filterCount++;

        if (filterCount > 0 || filtered.length < all.length) {
            noticeText.textContent = `${filterCount} filtro${filterCount !== 1 ? 's' : ''} ativo${filterCount !== 1 ? 's' : ''} • ${filtered.length} servidor${filtered.length !== 1 ? 'es' : ''}`;
        } else {
            noticeText.textContent = `Todos os filtros desativados • ${all.length} servidor${all.length !== 1 ? 'es' : ''}`;
        }
    }

    /**
     * Abrir modal de filtros avançados
     */
    openAdvancedFilters() {
        if (this.dashboard.advancedFilterManager) {
            this.dashboard.advancedFilterManager.openModal();
        } else {
            window.customModal?.alert({
                title: 'Indisponível',
                message: 'Sistema de filtros avançados não está disponível.',
                type: 'warning'
            });
        }
    }

    /**
     * Marcar/desmarcar todas as colunas
     */
    toggleSelectAllColumns() {
        const checkboxes = document.querySelectorAll('#columnsGridRedesign input[type="checkbox"]');
        const allChecked = Array.from(checkboxes).every(cb => cb.checked);

        checkboxes.forEach(cb => {
            cb.checked = !allChecked;
        });

        const btn = document.getElementById('selectAllColumns');
        if (btn) {
            btn.textContent = allChecked ? '☑ Marcar Todas' : '☐ Desmarcar Todas';
        }

        this.updateConfig();
    }

    /**
     * Atualizar configuração do relatório
     */
    updateConfig(options = {}) {
        const { skipLivePreview = false } = options;

        this.updateColumnsSelectionState();

        // Coletar colunas selecionadas (novo ID do grid)
        const selectedColumns = [];
        document.querySelectorAll('#columnsGridRedesign input[type="checkbox"]:checked').forEach(checkbox => {
            selectedColumns.push(checkbox.value);
        });

        // Orientação automática baseada em número de colunas
        const orientation = selectedColumns.length <= 5 ? 'portrait' : 'landscape';

        this.reportConfig = {
            title: document.getElementById('reportTitleRedesign')?.value || 'Relatório de Licenças',
            type: 'complete',
            orientation: orientation,
            includeCharts: true,  // Sempre incluído
            includeStats: true,   // Sempre incluído
            includeLogo: true,    // Sempre incluído
            columns: selectedColumns.length > 0 ? selectedColumns : [...this.defaultColumns],
            dateStart: null,      // Usar filtros avançados
            dateEnd: null,        // Usar filtros avançados
            urgencyFilter: '',    // Usar filtros avançados
            cargoFilter: '',      // Usar filtros avançados
            limit: 'all'          // Sempre exportar todos
        };

        if (!skipLivePreview && this.livePreviewEnabled) {
            this.schedulePreview();
        }
    }

    schedulePreview() {
        if (this.previewDebounce) {
            clearTimeout(this.previewDebounce);
        }

        this.previewDebounce = setTimeout(() => {
            this.previewReport({ fromLive: true });
        }, 220);
    }

    updateColumnsSelectionState() {
        const columnsContainer = document.getElementById('columnsGridRedesign');
        if (!columnsContainer) return;

        // Atualizar botão "Marcar Todas"
        const checkboxes = columnsContainer.querySelectorAll('input[type="checkbox"]');
        const allChecked = Array.from(checkboxes).every(cb => cb.checked);
        const btn = document.getElementById('selectAllColumns');
        if (btn) {
            btn.textContent = allChecked ? '☐ Desmarcar Todas' : '☑ Marcar Todas';
        }
    }

    getBaseDataset() {
        const filtered = Array.isArray(this.dashboard.filteredServidores) ? this.dashboard.filteredServidores : [];
        if (filtered.length > 0) {
            return filtered;
        }
        const all = Array.isArray(this.dashboard.allServidores) ? this.dashboard.allServidores : [];
        return all;
    }

    parseDate(value, endOfDay = false) {
        if (!value) return null;
        if (value instanceof Date) {
            return isNaN(value.getTime()) ? null : value;
        }
        const date = new Date(value);
        if (isNaN(date.getTime())) return null;
        if (endOfDay) {
            date.setHours(23, 59, 59, 999);
        } else {
            date.setHours(0, 0, 0, 0);
        }
        return date;
    }

    getAllLicenses(servidor) {
        const licenses = [];

        if (Array.isArray(servidor.licencas)) {
            servidor.licencas.forEach(licenca => {
                const inicio = this.parseDate(licenca?.inicio || licenca?.dataInicio);
                const fim = this.parseDate(licenca?.fim || licenca?.dataFim, true) || inicio;
                const durationDays = this.calculateDurationInDays(inicio, fim);
                const monthsFromSource = typeof licenca?.meses === 'number' ? licenca.meses : (
                    typeof licenca?.mesesLicenca === 'number' ? licenca.mesesLicenca : null
                );
                if (inicio) {
                    licenses.push({
                        inicio,
                        fim,
                        dias: durationDays,
                        meses: monthsFromSource ?? (durationDays ? this.calculateDurationInMonths(durationDays) : null)
                    });
                }
            });
        }

        if (servidor.inicioLicenca || servidor.fimLicenca) {
            const inicio = this.parseDate(servidor.inicioLicenca);
            const fim = this.parseDate(servidor.fimLicenca, true) || inicio;
            const durationDays = this.calculateDurationInDays(inicio, fim);
            if (inicio) {
                licenses.push({
                    inicio,
                    fim,
                    dias: durationDays,
                    meses: servidor.mesesLicenca || (durationDays ? this.calculateDurationInMonths(durationDays) : null)
                });
            }
        }

        if (servidor.proximaLicencaInicio || servidor.proximaLicencaFim) {
            const inicio = this.parseDate(servidor.proximaLicencaInicio);
            const fim = this.parseDate(servidor.proximaLicencaFim, true) || inicio;
            const durationDays = this.calculateDurationInDays(inicio, fim);
            if (inicio) {
                licenses.push({
                    inicio,
                    fim,
                    dias: durationDays,
                    meses: servidor.mesesLicenca || (durationDays ? this.calculateDurationInMonths(durationDays) : null)
                });
            }
        }

        return licenses;
    }

    getPrimaryLicense(servidor) {
        const licenses = this.getAllLicenses(servidor);
        if (licenses.length === 0) return null;
        licenses.sort((a, b) => a.inicio - b.inicio);
        const primary = { ...licenses[0] };
        if (!primary.dias) {
            const dias = this.calculateDurationInDays(primary.inicio, primary.fim);
            if (dias) {
                primary.dias = dias;
            }
        }
        if (!primary.meses && primary.dias) {
            primary.meses = this.calculateDurationInMonths(primary.dias);
        }
        return primary;
    }

    calculateDurationInDays(start, end) {
        if (!start || !end) return null;
        const diffMs = end.getTime() - start.getTime();
        if (diffMs < 0) return null;
        return Math.round(diffMs / (1000 * 60 * 60 * 24)) + 1;
    }

    calculateDurationInMonths(days) {
        if (!days || days <= 0) return null;
        return Math.max(1, Math.round(days / 30));
    }

    normalizeUrgency(value) {
        if (!value) return '';
        const normalized = value
            .toString()
            .toLowerCase()
            .normalize('NFD')
            .replace(/[^a-z]/g, '');
        const map = {
            critica: 'critica',
            critico: 'critica',
            criticos: 'critica',
            urgente: 'critica',
            urgencia: 'critica',
            alta: 'alta',
            alto: 'alta',
            moderada: 'moderada',
            media: 'moderada',
            medio: 'moderada',
            moderado: 'moderada',
            baixo: 'baixa',
            baixa: 'baixa',
            semlicenca: 'semLicenca',
            nenhuma: 'semLicenca'
        };
        return map[normalized] || '';
    }

    formatUrgencyLabel(code) {
        const labels = {
            critica: 'Crítica',
            alta: 'Alta',
            moderada: 'Moderada',
            baixa: 'Baixa',
            semLicenca: 'Sem Licença'
        };
        return labels[code] || 'Indefinida';
    }

    formatUrgencyDisplay(value) {
        const code = this.normalizeUrgency(value);
        return code ? this.formatUrgencyLabel(code) : (value || '-');
    }

    /**
     * Filtrar dados para o relatório
     */
    getFilteredData() {
        let data = [...this.getBaseDataset()];

        // Filtro de data
        const startDate = this.parseDate(this.reportConfig.dateStart);
        const endDate = this.parseDate(this.reportConfig.dateEnd, true);

        if (startDate || endDate) {
            data = data.filter(servidor => {
                const licencas = this.getAllLicenses(servidor);
                if (licencas.length === 0) return false;

                return licencas.some(({ inicio, fim }) => {
                    const fimAjustado = fim || inicio;
                    if (startDate && fimAjustado < startDate) return false;
                    if (endDate && inicio > endDate) return false;
                    return true;
                });
            });
        }

        // Filtro de urgência
        if (this.reportConfig.urgencyFilter) {
            const filterCode = this.normalizeUrgency(this.reportConfig.urgencyFilter);
            data = data.filter(s => this.normalizeUrgency(s.urgencia) === filterCode);
        }

        // Filtro de cargo
        if (this.reportConfig.cargoFilter) {
            data = data.filter(s => s.cargo === this.reportConfig.cargoFilter);
        }

        // Limite de registros
        if (this.reportConfig.limit !== 'all') {
            const limit = parseInt(this.reportConfig.limit, 10);
            if (!Number.isNaN(limit) && limit > 0) {
                data = data.slice(0, limit);
            }
        }

        return data;
    }

    /**
     * Pré-visualizar relatório
     */
    previewReport(options = {}) {
        const { fromLive = false } = options;

        this.updateConfig({ skipLivePreview: true });
        const data = this.getFilteredData();

        const previewContainer = document.getElementById('previewTableRedesign');
        if (!previewContainer) {
            return;
        }

        const countElement = document.getElementById('previewCountRedesign');
        const titleElement = document.getElementById('previewTitleRedesign');
        const timestampElement = document.getElementById('previewTimestampRedesign');

        if (countElement) {
            const suffix = data.length === 1 ? '' : 's';
            countElement.textContent = `${data.length} registro${suffix}`;
        }

        if (titleElement) {
            titleElement.textContent = this.reportConfig.title || 'Relatório de Licenças';
        }

        const now = new Date();
        this.lastPreviewAt = now;

        if (timestampElement) {
            timestampElement.textContent = now.toLocaleString('pt-BR');
        }

        if (data.length === 0) {
            previewContainer.innerHTML = `
                <div class="preview-placeholder">
                    <i class="bi bi-inbox"></i>
                    <p>Nenhum registro encontrado</p>
                    <small>Ajuste os filtros ou selecione colunas</small>
                </div>
            `;
            this.hasPreview = true;
            this.previewDebounce = null;
            return;
        }

        const tableRender = this.renderPreviewTable(data);
        previewContainer.innerHTML = tableRender.tableHtml;
        previewContainer.scrollTop = 0;

        this.hasPreview = true;
        this.previewDebounce = null;
    }

    /**
     * Calcular estatísticas
     */
    calculateStats(data) {
        const urgencyCounts = {
            critica: 0,
            alta: 0,
            moderada: 0,
            baixa: 0,
            semLicenca: 0
        };

        let idadeTotal = 0;
        let idadeContagem = 0;
        const cargos = new Set();

        data.forEach(servidor => {
            const urgencyCode = this.normalizeUrgency(servidor.urgencia);
            if (urgencyCounts.hasOwnProperty(urgencyCode)) {
                urgencyCounts[urgencyCode]++;
            }

            if (Number.isFinite(servidor.idade)) {
                idadeTotal += servidor.idade;
                idadeContagem++;
            }

            if (servidor.cargo) {
                cargos.add(servidor.cargo);
            }
        });

        const avgAge = idadeContagem > 0 ? (idadeTotal / idadeContagem).toFixed(1) : null;

        return {
            total: data.length,
            avgAge,
            cargos: cargos.size,
            urgencyCounts
        };
    }

    renderPreviewSummary(stats) {
        const lines = this.getStatsSummaryLines(stats);
        const listItems = lines.map(line => `
            <li>
                <i class="bi ${line.icon}"></i>
                <span><strong>${line.label}:</strong> ${this.escapeHTML(line.value)}</span>
            </li>
        `).join('');

        return `
            <div class="preview-summary-card">
                <div class="summary-header">
                    <i class="bi bi-bar-chart-line"></i>
                    <span>Resumo Executivo</span>
                </div>
                <ul class="summary-list">
                    ${listItems}
                </ul>
            </div>
        `;
    }

    getStatsSummaryLines(stats) {
        const urgencyParts = [
            `Crítica: ${stats.urgencyCounts.critica || 0}`,
            `Alta: ${stats.urgencyCounts.alta || 0}`,
            `Moderada: ${stats.urgencyCounts.moderada || 0}`,
            `Baixa: ${stats.urgencyCounts.baixa || 0}`
        ];

        if (stats.urgencyCounts.semLicenca) {
            urgencyParts.push(`Sem Licença: ${stats.urgencyCounts.semLicenca}`);
        }

        return [
            { icon: 'bi-people-fill', label: 'Total de Servidores', value: `${stats.total}` },
            { icon: 'bi-person-lines-fill', label: 'Idade Média', value: stats.avgAge !== null ? `${stats.avgAge} anos` : '—' },
            { icon: 'bi-briefcase-fill', label: 'Cargos Diferentes', value: `${stats.cargos}` },
            { icon: 'bi-lightning-charge-fill', label: 'Distribuição de Urgência', value: urgencyParts.join(' | ') }
        ];
    }

    renderPreviewMeta(range, columnLabels) {
        const items = [
            { icon: 'bi-collection', label: 'Tipo', value: this.getReportTypeLabel(this.reportConfig.type) },
            { icon: 'bi-calendar-range', label: 'Período', value: this.getFormattedPeriodRange() },
            { icon: 'bi-lightning-charge', label: 'Urgência', value: this.reportConfig.urgencyFilter || 'Todas' },
            { icon: 'bi-briefcase', label: 'Cargo', value: this.reportConfig.cargoFilter || 'Todos' },
            { icon: 'bi-database', label: 'Registros na Prévia', value: `${range.limit} de ${range.total}` }
        ];

        const itemsHtml = items.map(item => `
            <div class="meta-item">
                <i class="bi ${item.icon}"></i>
                <div>
                    <span class="meta-label">${item.label}</span>
                    <span class="meta-value">${this.escapeHTML(String(item.value))}</span>
                </div>
            </div>
        `).join('');

        const columnChips = columnLabels.length > 0
            ? columnLabels.map(label => `<span class="column-chip">${this.escapeHTML(label)}</span>`).join('')
            : '<span class="meta-value meta-value-empty">Nenhuma coluna selecionada</span>';

        return `
            <div class="meta-grid">${itemsHtml}</div>
            <div class="meta-columns">
                <i class="bi bi-layout-text-window-reverse"></i>
                <div>
                    <span class="meta-label">Colunas Selecionadas</span>
                    <div class="column-chip-group">${columnChips}</div>
                </div>
            </div>
        `;
    }

    getReportTypeLabel(type) {
        return this.reportTypeLabels[type] || 'Personalizado';
    }

    getFormattedPeriodRange() {
        const { dateStart, dateEnd } = this.reportConfig;
        const startDate = this.parseDate(dateStart);
        const endDate = this.parseDate(dateEnd);

        if (!startDate && !endDate) {
            return 'Todos os períodos';
        }

        const startLabel = startDate ? this.formatDate(startDate) : 'Sem início definido';
        const endLabel = endDate ? this.formatDate(endDate) : 'Sem término definido';
        return `${startLabel} até ${endLabel}`;
    }

    escapeHTML(rawValue) {
        if (rawValue === null || rawValue === undefined) return '';
        return String(rawValue).replace(/[&<>'"]/g, char => {
            const map = {
                '&': '&amp;',
                '<': '&lt;',
                '>': '&gt;',
                "'": '&#39;',
                '"': '&quot;'
            };
            return map[char] || char;
        });
    }

    formatPreviewValue(value) {
        if (value === null || value === undefined || value === '') {
            return '<span class="cell-empty">—</span>';
        }

        let normalized = value;

        if (Array.isArray(normalized)) {
            normalized = normalized.join('\n');
        }

        if (typeof normalized !== 'string') {
            normalized = String(normalized);
        }

        return this.escapeHTML(normalized).replace(/\n/g, '<br>');
    }

    getReportMetadataLines(range, columnLabels) {
        return [
            `Tipo de Relatório: ${this.getReportTypeLabel(this.reportConfig.type)}`,
            `Período Selecionado: ${this.getFormattedPeriodRange()}`,
            `Filtro de Urgência: ${this.reportConfig.urgencyFilter || 'Todas'}`,
            `Filtro de Cargo: ${this.reportConfig.cargoFilter || 'Todos'}`,
            `Colunas Selecionadas: ${columnLabels.join(', ') || '-'}`,
            `Registros na Pré-visualização: ${range.limit} de ${range.total}`
        ];
    }

    /**
     * Renderizar tabela no preview
     */
    renderPreviewTable(data) {
        const columns = this.reportConfig.columns;
        const columnLabels = columns.map(col => this.columnLabels[col] || col);
        const limit = Math.min(data.length, 15);

        const headers = columns.map(col => `<th>${this.escapeHTML(this.columnLabels[col] || col)}</th>`).join('');

        const rows = data.slice(0, limit).map(servidor => {
            const cells = columns.map(col => {
                const value = this.getCellValue(servidor, col);
                const displayValue = this.formatPreviewValue(value);
                const classes = [];

                if (col === 'urgencia') {
                    const code = this.normalizeUrgency(servidor.urgencia);
                    if (code) {
                        classes.push(`urgency-${code}`);
                    }
                }

                if (col === 'periodoLicenca') {
                    classes.push('cell-periodo');
                }

                const classAttr = classes.length ? ` class="${classes.join(' ')}"` : '';
                const dataLabel = this.escapeHTML(this.columnLabels[col] || col);

                return `<td${classAttr} data-label="${dataLabel}">${displayValue}</td>`;
            }).join('');

            return `<tr>${cells}</tr>`;
        }).join('');

        const tableHtml = `
            <table class="preview-table">
                <thead>
                    <tr>${headers}</tr>
                </thead>
                <tbody>
                    ${rows}
                </tbody>
            </table>
        `;

        const footnote = data.length > limit
            ? `Exibindo ${limit} de ${data.length} registros filtrados. As exportações incluirão todos os registros.`
            : '';

        return {
            tableHtml,
            range: { limit, total: data.length },
            columnLabels,
            footnote
        };
    }

    /**
     * Obter valor da célula
     */
    getCellValue(servidor, column, options = {}) {
        const { raw = false } = options;
        const primaryLicense = this.getPrimaryLicense(servidor);
        const parseNumeric = (value) => {
            if (value === null || value === undefined || value === '') return null;
            const num = Number(value);
            return Number.isNaN(num) ? null : num;
        };
        const inicioFallback = primaryLicense?.inicio 
            || this.parseDate(servidor.inicioLicenca)
            || this.parseDate(servidor.proximaLicencaInicio);
        const fimFallback = primaryLicense?.fim 
            || this.parseDate(servidor.fimLicenca, true)
            || this.parseDate(servidor.proximaLicencaFim, true);

        const diasServidor = parseNumeric(servidor.diasLicenca);
        const mesesServidor = parseNumeric(servidor.mesesLicenca);

        const diasComputados = Number.isFinite(primaryLicense?.dias) ? primaryLicense.dias : (
            Number.isFinite(diasServidor) ? diasServidor : (
                inicioFallback && fimFallback ? this.calculateDurationInDays(inicioFallback, fimFallback) : null
            )
        );

        const mesesComputados = Number.isFinite(primaryLicense?.meses) ? primaryLicense.meses : (
            Number.isFinite(mesesServidor) ? mesesServidor : (
                diasComputados ? this.calculateDurationInMonths(diasComputados) : null
            )
        );

        const formatDateValue = (value) => this.formatDate(value, { raw });

        switch(column) {
            case 'nome':
                return servidor.nome || '';
            case 'cpf':
                return servidor.cpf || '';
            case 'matricula':
                return servidor.matricula || '';
            case 'cargo':
                return servidor.cargo || '';
            case 'lotacao':
                return servidor.lotacao || '';
            case 'superintendencia':
                return servidor.superintendencia || '';
            case 'subsecretaria':
                return servidor.subsecretaria || '';
            case 'idade': {
                const idadeCalculada = parseNumeric(servidor.idade);
                if (!Number.isFinite(idadeCalculada)) return '';
                return raw ? idadeCalculada : `${idadeCalculada} anos`;
            }
            case 'urgencia': {
                const code = this.normalizeUrgency(servidor.urgencia);
                if (code) {
                    return this.formatUrgencyLabel(code);
                }
                const original = servidor.urgencia ? servidor.urgencia.toString().trim() : '';
                if (!original || /^0\s*anos?$/i.test(original)) {
                    return 'Sem informação';
                }
                return original;
            }
            case 'periodoLicenca': {
                let licenses = this.getAllLicenses(servidor);
                if (licenses.length === 0 && primaryLicense?.inicio) {
                    licenses = [primaryLicense];
                }

                if (licenses.length === 0) {
                    return '';
                }

                licenses.sort((a, b) => (a.inicio?.getTime?.() || 0) - (b.inicio?.getTime?.() || 0));

                const segments = licenses.map(licenca => {
                    const inicio = licenca.inicio ? this.formatDate(licenca.inicio) : '-';
                    const fim = licenca.fim ? this.formatDate(licenca.fim) : inicio;
                    return `${inicio} até ${fim}`;
                });

                const joined = segments.join('\n');
                return joined;
            }
            case 'dataInicio':
                return inicioFallback ? formatDateValue(inicioFallback) : '';
            case 'dataFim':
                return fimFallback ? formatDateValue(fimFallback) : '';
            case 'diasLicenca':
                if (!Number.isFinite(diasComputados)) return '';
                return raw ? diasComputados : `${diasComputados} dias`;
            case 'mesesLicenca':
                if (!Number.isFinite(mesesComputados)) return '';
                return raw ? mesesComputados : `${mesesComputados} meses`;
            default:
                return '';
        }
    }

    /**
     * Formatar data
     */
    formatDate(dateInput, options = {}) {
        if (!dateInput) return options.raw ? '' : '-';
        const { raw = false } = options;
        let date;
        if (dateInput instanceof Date) {
            date = new Date(dateInput.getTime());
        } else if (typeof dateInput === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateInput)) {
            const [year, month, day] = dateInput.split('-').map(Number);
            date = new Date(year, month - 1, day);
        } else {
            date = new Date(dateInput);
        }
        if (Number.isNaN(date.getTime())) {
            return raw ? '' : '-';
        }
        if (raw) {
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        }
        return date.toLocaleDateString('pt-BR');
    }

    /**
     * Gerar PDF
     */
    async generatePDF() {
        this.updateConfig({ skipLivePreview: true });
        const data = this.getFilteredData();

        if (data.length === 0) {
            alert('Nenhum registro encontrado com os filtros aplicados.');
            return;
        }

        if (this.reportConfig.columns.length === 0) {
            alert('Selecione pelo menos uma coluna para incluir no relatório.');
            return;
        }

        try {
            // Mostrar loading
            const btn = document.getElementById('generatePdfRedesign');
            const originalText = btn.innerHTML;
            btn.innerHTML = '<i class="bi bi-hourglass-split"></i> Gerando...';
            btn.disabled = true;

            // Criar documento PDF
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF({
                orientation: this.reportConfig.orientation,
                unit: 'mm',
                format: 'a4'
            });

            const pageWidth = doc.internal.pageSize.getWidth();
            const pageHeight = doc.internal.pageSize.getHeight();
            const margin = 14;
            let yPosition = margin + 6;

            // Cabeçalho
            if (this.reportConfig.includeLogo) {
                doc.setFontSize(18);
                doc.setFont(undefined, 'bold');
                doc.setTextColor(40, 40, 40);
                doc.text(this.reportConfig.title, pageWidth / 2, yPosition, { align: 'center' });
                yPosition += 8;

                doc.setFontSize(9);
                doc.setFont(undefined, 'normal');
                doc.setTextColor(120, 120, 120);
                const dateText = `Gerado em ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}`;
                doc.text(dateText, pageWidth / 2, yPosition, { align: 'center' });
                yPosition += 10;
            }

            // Estatísticas
            if (this.reportConfig.includeStats) {
                const stats = this.calculateStats(data);
                
                doc.setFontSize(11);
                doc.setFont(undefined, 'bold');
                doc.setTextColor(40, 40, 40);
                doc.text('Resumo Executivo', margin, yPosition);
                yPosition += 6;

                doc.setFontSize(9);
                doc.setFont(undefined, 'normal');
                doc.setTextColor(60, 60, 60);
                
                const urgencySummaryParts = [
                    `Crítica: ${stats.urgencyCounts.critica || 0}`,
                    `Alta: ${stats.urgencyCounts.alta || 0}`,
                    `Moderada: ${stats.urgencyCounts.moderada || 0}`,
                    `Baixa: ${stats.urgencyCounts.baixa || 0}`
                ];

                if (stats.urgencyCounts.semLicenca) {
                    urgencySummaryParts.push(`Sem Licença: ${stats.urgencyCounts.semLicenca}`);
                }

                const statsText = [
                    `Total de Servidores: ${stats.total}`,
                    `Idade Média: ${stats.avgAge !== null ? `${stats.avgAge} anos` : '—'}`,
                    `Cargos Diferentes: ${stats.cargos}`,
                    `Urgências - ${urgencySummaryParts.join(' | ')}`
                ];
                
                statsText.forEach(line => {
                    if (yPosition > pageHeight - margin) {
                        doc.addPage();
                        yPosition = margin + 6;
                    }
                    doc.text(line, margin, yPosition);
                    yPosition += 5;
                });
                
                yPosition += 5;
            }

            const columnLabels = this.reportConfig.columns.map(col => this.columnLabels[col] || col);
            const previewRange = {
                limit: Math.min(data.length, 15),
                total: data.length
            };
            const metadataLines = this.getReportMetadataLines(previewRange, columnLabels);

            doc.setFontSize(9);
            doc.setFont(undefined, 'normal');
            doc.setTextColor(70, 70, 70);

            metadataLines.forEach(line => {
                if (yPosition > pageHeight - margin) {
                    doc.addPage();
                    yPosition = margin + 6;
                }
                doc.text(line, margin, yPosition);
                yPosition += 5;
            });

            yPosition += 4;

            // Gráficos
            if (this.reportConfig.includeCharts && data.length > 0) {
                try {
                    const chartImage = await this.generateChartImage(data);
                    if (chartImage) {
                        const imgWidth = pageWidth - (margin * 2);
                        const imgHeight = 50;
                        
                        // Verificar se há espaço na página
                        if (yPosition + imgHeight > pageHeight - margin) {
                            doc.addPage();
                            yPosition = margin + 6;
                        }
                        
                        doc.addImage(chartImage, 'PNG', margin, yPosition, imgWidth, imgHeight);
                        yPosition += imgHeight + 8;
                    }
                } catch (e) {
                    console.warn('Erro ao gerar gráfico:', e);
                }
            }

            // Tabela de dados
            doc.setFontSize(11);
            doc.setFont(undefined, 'bold');
            doc.setTextColor(40, 40, 40);
            doc.text('Dados Detalhados', margin, yPosition);
            yPosition += 6;

            // Preparar dados da tabela
            const columns = this.reportConfig.columns;
            const headers = columns.map(col => this.columnLabels[col] || col);
            
            const tableData = data.map(servidor => {
                return columns.map(col => this.getCellValue(servidor, col));
            });

            doc.autoTable({
                startY: yPosition,
                head: [headers],
                body: tableData,
                styles: {
                    fontSize: 7,
                    cellPadding: 2,
                    overflow: 'linebreak',
                    cellWidth: 'wrap'
                },
                headStyles: {
                    fillColor: [59, 130, 246],
                    textColor: 255,
                    fontStyle: 'bold',
                    halign: 'left'
                },
                alternateRowStyles: {
                    fillColor: [245, 247, 250]
                },
                margin: { left: margin, right: margin },
                theme: 'grid'
            });

            // Rodapé com número de páginas
            const pageCount = doc.internal.getNumberOfPages();
            for (let i = 1; i <= pageCount; i++) {
                doc.setPage(i);
                doc.setFontSize(8);
                doc.setTextColor(150);
                doc.text(
                    `Página ${i} de ${pageCount}`,
                    pageWidth / 2,
                    pageHeight - 10,
                    { align: 'center' }
                );
            }

            // Salvar PDF
            const fileName = `${this.reportConfig.title.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
            doc.save(fileName);

            // Restaurar botão
            btn.innerHTML = originalText;
            btn.disabled = false;

            // Feedback de sucesso
            this.showSuccessMessage(`Relatório "${fileName}" gerado com sucesso!`);

        } catch (error) {
            console.error('Erro ao gerar PDF:', error);
            alert('Erro ao gerar relatório PDF. Verifique o console para mais detalhes.');

            const btn = document.getElementById('generatePdfRedesign');
            btn.innerHTML = '<i class="bi bi-file-pdf"></i> Gerar PDF';
            btn.disabled = false;
        }
    }

    /**
     * Gerar imagem do gráfico para incluir no PDF
     */
    async generateChartImage(data) {
        return new Promise((resolve) => {
            try {
                const stats = this.calculateStats(data);
                
                // Criar canvas temporário
                const canvas = document.createElement('canvas');
                canvas.width = 800;
                canvas.height = 300;
                const ctx = canvas.getContext('2d');

                // Criar gráfico de urgência
                const chart = new Chart(ctx, {
                    type: 'bar',
                    data: {
                        labels: ['Crítica', 'Alta', 'Média', 'Baixa'],
                        datasets: [{
                            label: 'Servidores por Urgência',
                            data: [
                                stats.urgencyCounts['Crítica'],
                                stats.urgencyCounts['Alta'],
                                stats.urgencyCounts['Média'],
                                stats.urgencyCounts['Baixa']
                            ],
                            backgroundColor: [
                                'rgba(239, 68, 68, 0.8)',
                                'rgba(249, 115, 22, 0.8)',
                                'rgba(59, 130, 246, 0.8)',
                                'rgba(34, 197, 94, 0.8)'
                            ],
                            borderColor: [
                                'rgb(239, 68, 68)',
                                'rgb(249, 115, 22)',
                                'rgb(59, 130, 246)',
                                'rgb(34, 197, 94)'
                            ],
                            borderWidth: 2
                        }]
                    },
                    options: {
                        responsive: false,
                        plugins: {
                            legend: {
                                display: false
                            },
                            title: {
                                display: true,
                                text: 'Distribuição por Nível de Urgência',
                                font: {
                                    size: 16,
                                    weight: 'bold'
                                }
                            }
                        },
                        scales: {
                            y: {
                                beginAtZero: true,
                                ticks: {
                                    precision: 0
                                }
                            }
                        }
                    }
                });

                // Aguardar renderização e converter para imagem
                setTimeout(() => {
                    const imageData = canvas.toDataURL('image/png');
                    chart.destroy();
                    resolve(imageData);
                }, 500);
                
            } catch (e) {
                console.error('Erro ao gerar gráfico:', e);
                resolve(null);
            }
        });
    }

    /**
     * Exportar dados filtrados para XLSX respeitando as colunas selecionadas
     */
    async exportToXLSX(button) {
        if (this.isExportingXlsx) return;

        this.updateConfig({ skipLivePreview: true });
        const data = this.getFilteredData();

        if (data.length === 0) {
            alert('Nenhum registro encontrado com os filtros aplicados.');
            return;
        }

        if (this.reportConfig.columns.length === 0) {
            alert('Selecione ao menos uma coluna antes de exportar.');
            return;
        }

        if (typeof XLSX === 'undefined') {
            alert('Biblioteca XLSX não carregada. Verifique as dependências do projeto.');
            return;
        }

        this.isExportingXlsx = true;
        let originalContent = null;

        if (button) {
            originalContent = button.innerHTML;
            button.innerHTML = '<i class="bi bi-arrow-repeat"></i> Exportando...';
            button.disabled = true;
            button.classList.add('loading');
        }

        try {
            const columns = this.reportConfig.columns;
            const header = columns.map(col => this.columnLabels[col] || col);
            const rows = data.map(servidor => {
                return columns.map(col => this.getCellValue(servidor, col, { raw: true }));
            });

            const workbook = XLSX.utils.book_new();
            const worksheet = XLSX.utils.aoa_to_sheet([header, ...rows]);
            XLSX.utils.book_append_sheet(workbook, worksheet, 'Dados');

            const stats = this.calculateStats(data);
            const summarySheet = this.buildSummarySheet(stats);
            if (summarySheet) {
                XLSX.utils.book_append_sheet(workbook, summarySheet, 'Resumo');
            }

            const configSheet = this.buildConfigurationSheet();
            if (configSheet) {
                XLSX.utils.book_append_sheet(workbook, configSheet, 'Configuração');
            }

            const fileName = `${this.slugify(this.reportConfig.title || 'relatorio')}_${new Date().toISOString().split('T')[0]}.xlsx`;
            XLSX.writeFile(workbook, fileName);
            this.showSuccessMessage(`Arquivo exportado: ${fileName}`);
        } catch (error) {
            console.error('Erro ao exportar XLSX:', error);
            alert('Não foi possível exportar o arquivo XLSX. Consulte o console para mais detalhes.');
        } finally {
            this.isExportingXlsx = false;
            if (button) {
                button.classList.remove('loading');
                button.innerHTML = originalContent || '<i class="bi bi-file-earmark-spreadsheet"></i> Baixar XLSX';
                button.disabled = false;
            }
        }
    }

    buildSummarySheet(stats) {
        if (!stats) return null;

        const rows = [
            ['📊 RESUMO DO RELATÓRIO'],
            [],
            ['Total de Servidores', stats.total],
            ['Idade Média', stats.avgAge !== null ? stats.avgAge : '—'],
            ['Cargos Diferentes', stats.cargos],
            [],
            ['Distribuição por Urgência'],
            ['Crítica', stats.urgencyCounts.critica || 0],
            ['Alta', stats.urgencyCounts.alta || 0],
            ['Moderada', stats.urgencyCounts.moderada || 0],
            ['Baixa', stats.urgencyCounts.baixa || 0]
        ];

        if (stats.urgencyCounts.semLicenca) {
            rows.push(['Sem Licença', stats.urgencyCounts.semLicenca]);
        }

        rows.push([]);
        rows.push(['Gerado em', new Date().toLocaleString('pt-BR')]);

        return XLSX.utils.aoa_to_sheet(rows);
    }

    buildConfigurationSheet() {
        const typeLabels = {
            complete: 'Completo',
            summary: 'Resumo',
            urgency: 'Por Urgência',
            cargo: 'Por Cargo'
        };
        const orientationLabel = this.reportConfig.orientation === 'landscape' ? 'Paisagem' : 'Retrato';
        const typeLabel = typeLabels[this.reportConfig.type] || this.reportConfig.type;
        const limitLabel = this.reportConfig.limit === 'all' ? 'Todos' : this.reportConfig.limit;
        const rows = [
            ['⚙️ CONFIGURAÇÃO APLICADA'],
            [],
            ['Título', this.reportConfig.title || 'Relatório de Licenças'],
            ['Tipo', typeLabel],
            ['Orientação', orientationLabel],
            ['Colunas Selecionadas', this.reportConfig.columns.map(col => this.columnLabels[col] || col).join(', ') || '-'],
            ['Período Inicial', this.reportConfig.dateStart ? this.formatDate(this.reportConfig.dateStart) : '-'],
            ['Período Final', this.reportConfig.dateEnd ? this.formatDate(this.reportConfig.dateEnd, { raw: false }) : '-'],
            ['Filtro de Urgência', this.reportConfig.urgencyFilter || 'Todas'],
            ['Filtro de Cargo', this.reportConfig.cargoFilter || 'Todos'],
            ['Limite de Registros', limitLabel || 'Todos'],
            ['Incluir Estatísticas', this.reportConfig.includeStats ? 'Sim' : 'Não'],
            ['Incluir Gráficos', this.reportConfig.includeCharts ? 'Sim' : 'Não'],
            ['Incluir Cabeçalho', this.reportConfig.includeLogo ? 'Sim' : 'Não']
        ];

        return XLSX.utils.aoa_to_sheet(rows);
    }

    slugify(text) {
        return text
            .toString()
            .normalize('NFD')
            .replace(/[^\w\s-]/g, '')
            .trim()
            .replace(/\s+/g, '_')
            .toLowerCase();
    }

    /**
     * Mostrar mensagem de sucesso
     */
    showSuccessMessage(message) {
        // Usar o sistema de notificações se disponível
        if (this.dashboard.notificationManager) {
            this.dashboard.notificationManager.show({
                type: 'success',
                title: 'Relatório Gerado',
                message: message,
                duration: 5000
            });
        } else {
            alert(message);
        }
    }
}
