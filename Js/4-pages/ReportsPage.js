/**
 * ReportsPage - Controller da página de relatórios
 *
 * Responsabilidades:
 * - Gerenciar seleção de colunas para exportação
 * - Controlar toggle de visualização (todas licenças vs apenas filtradas)
 * - Renderizar preview da tabela de exportação
 * - Coordenar ExportService para exportação Excel/PDF
 * - Responder a eventos de filtros e busca
 *
 * @class ReportsPage
 */
class ReportsPage {
    /**
     * @param {Object} app - Referência ao App principal
     */
    constructor(app) {
        this.app = app;

        // Estado da página
        this.isActive = false;
        this.isInitialized = false;

        // Estado do relatório
        this.selectedColumns = new Set(['nome', 'cargo', 'lotacao', 'periodoLicenca', 'urgencia']);
        this.showAllPeriods = true; // true = visão completa, false = apenas filtradas
        this.reportTitle = 'Relatório de Licenças';
        this.columnSearchTerm = '';

        // Fixed columns order (sem dataInicio/dataFim - informação está em periodoLicenca)
        this.columnsOrder = ['nome','cpf','matricula','cargo','idade','lotacao','superintendencia','subsecretaria','urgencia','periodoLicenca','diasLicenca','mesesLicenca'];

        // Columns with data available in current dataset
        this.availableColumns = new Set();

        // Referências aos managers (serão inicializados no init)
        this.dataStateManager = null;
        this.exportService = null;
        this.reportsManager = null;

        // Elementos do DOM (lazy loading)
        this.elements = {
            page: null,

            // Informações do Relatório
            reportTitleInput: null,

            // Toggle de Visualização
            licenseViewToggle: null,
            toggleLabelComplete: null,
            toggleLabelFiltered: null,
            toggleDescriptionText: null,

            // Seleção de Colunas
            columnSearchInput: null,
            clearColumnSearch: null,
            selectAllColumns: null,
            unselectAllColumns: null,
            columnsAccordion: null,
            columnsEmptyState: null,

            // Preview
            previewTitleRedesign: null,
            previewTimestampRedesign: null,
            previewCountRedesign: null,
            previewTableRedesign: null,

            // Botões de Exportação
            exportXlsxBtn: null,
            generatePdfBtn: null
        };

        // Mapeamento de colunas para extração de dados
        this.columnMapping = {
            // Dados do Servidor
            nome: { label: 'Nome', extract: (s) => this._getField(s, ['^nome$', '^servidor$', 'NOME', 'SERVIDOR']) || 'Não informado' },
            cpf: { label: 'CPF', extract: (s) => this._getField(s, ['cpf', 'CPF']) || '' },
            matricula: { label: 'Matrícula', extract: (s) => this._getField(s, ['matricula', 'MATRICULA', 'matr']) || '' },
            cargo: { label: 'Cargo', extract: (s) => this._getField(s, ['^cargo$', 'CARGO']) || 'Não informado' },
            idade: { label: 'Idade', extract: (s) => this._extractAge(s) || '' },

            // Localização
            lotacao: {
                label: 'Lotação',
                extract: (s) => {
                    const resultado = this._getField(s, ['lotac', 'lotação', 'LOTACAO', 'lotacao']) || 'Não informada';
                    if (window._reportDebugCount !== undefined && window._reportDebugCount < 3) {
                        console.log(`   🏢 Lotação extraída: "${resultado}" (de ${s.nome || s.servidor})`);
                    }
                    return resultado;
                }
            },
            superintendencia: { label: 'Superintendência', extract: (s) => this._getField(s, ['super', 'superintend', 'SUPERINTENDENCIA']) || '' },
            subsecretaria: { label: 'Subsecretaria', extract: (s) => this._getField(s, ['subsec', 'subsecret', 'subsecretaria', 'SUBSECRETARIA']) || '' },

            // Informações da Licença
            urgencia: { label: 'Urgência', extract: (s) => this._getField(s, ['urg', 'urgencia', 'nivelUrgencia']) || '' },
            periodoLicenca: { label: 'Períodos de Licença', extract: (s) => this._formatPeriodoLicenca(s) },
            // dataInicio e dataFim removidas - informação consolidada em periodoLicenca
            diasLicenca: { label: 'Dias de Licença', extract: (s) => this._getField(s, ['dias', 'DIAS', 'diasLicenca', 'dias_licenca']) || '' },
            mesesLicenca: { label: 'Meses de Licença', extract: (s) => this._getField(s, ['meses', 'MESES', 'mesesLicenca']) || '' }
        };

        // Event listeners registrados (para cleanup)
        this.eventListeners = [];

        console.log('✅ ReportsPage instanciado');
    }

    /**
     * Inicializa a página e seus managers
     * Deve ser chamado apenas uma vez
     */
    init() {
        if (this.isInitialized) {
            console.warn('⚠️ ReportsPage já foi inicializado');
            return;
        }

        console.log('🔧 Inicializando ReportsPage...');

        // 1. Cache de elementos do DOM
        this._cacheElements();

        // 2. Obter referências aos managers do App
        this._initManagers();

        // 3. Setup de event listeners
        this._setupEventListeners();

        // 4. Setup de controles de colunas
        this._setupColumnControls();

        // 5. Inicializar estado do toggle
        this._updateToggleState();

        this.isInitialized = true;
        console.log('✅ ReportsPage inicializado');
    }

    /**
     * Faz cache dos elementos do DOM
     * @private
     */
    _cacheElements() {
        this.elements.page = document.getElementById('reportsPage');

        // Informações do Relatório
        this.elements.reportTitleInput = document.getElementById('reportTitleRedesign');

        // Toggle de Visualização
        this.elements.licenseViewToggle = document.getElementById('licenseViewToggle');
        this.elements.toggleLabelComplete = document.getElementById('toggleLabelComplete');
        this.elements.toggleLabelFiltered = document.getElementById('toggleLabelFiltered');
        this.elements.toggleDescriptionText = document.getElementById('toggleDescriptionText');

        // Seleção de Colunas
        this.elements.columnSearchInput = document.getElementById('columnSearchInput');
        this.elements.clearColumnSearch = document.getElementById('clearColumnSearch');
        this.elements.selectAllColumns = document.getElementById('selectAllColumns');
        this.elements.unselectAllColumns = document.getElementById('unselectAllColumns');
        this.elements.columnsAccordion = document.getElementById('columnsAccordion');
        this.elements.columnsEmptyState = document.getElementById('columnsEmptyState');

        // Preview
        this.elements.previewTitleRedesign = document.getElementById('previewTitleRedesign');
        this.elements.previewTimestampRedesign = document.getElementById('previewTimestampRedesign');
        this.elements.previewCountRedesign = document.getElementById('previewCountRedesign');
        this.elements.previewTableRedesign = document.getElementById('previewTableRedesign');

        // Botões de Exportação
        this.elements.exportXlsxBtn = document.getElementById('exportXlsxRedesignFooter');
        this.elements.generatePdfBtn = document.getElementById('generatePdfRedesignFooter');

        // Validar elementos críticos
        if (!this.elements.page) {
            console.error('❌ Elemento #reportsPage não encontrado no DOM');
        }
        if (!this.elements.previewTableRedesign) {
            console.error('❌ Elemento #previewTableRedesign não encontrado no DOM');
        }
    }

    /**
     * Inicializa referências aos managers do App
     * @private
     */
    _initManagers() {
        // Managers de estado
        this.dataStateManager = this.app.dataStateManager;

        // Services
        this.exportService = this.app.exportService;

        // Managers de UI
        this.reportsManager = this.app.reportsManager;

        // Validar managers críticos
        if (!this.dataStateManager) {
            console.error('❌ DataStateManager não disponível');
        }
        if (!this.exportService) {
            console.warn('⚠️ ExportService não disponível');
        }
    }

    /**
     * Setup de event listeners
     * @private
     */
    _setupEventListeners() {
        // Listener para mudanças no DataStateManager (Observer Pattern)
        if (this.dataStateManager) {
            const dataChangeHandler = () => {
                if (this.isActive) {
                    this.render();
                }
            };

            document.addEventListener('filtered-data-changed', dataChangeHandler);

            this.eventListeners.push({
                element: document,
                event: 'filtered-data-changed',
                handler: dataChangeHandler
            });
        }

        // Listener para mudanças nos filtros
        const filterChangeHandler = () => {
            if (this.isActive) {
                this.render();
            }
        };

        document.addEventListener('filters-changed', filterChangeHandler);

        this.eventListeners.push({
            element: document,
            event: 'filters-changed',
            handler: filterChangeHandler
        });

        // Toggle de visualização de licenças
        if (this.elements.licenseViewToggle) {
            const toggleHandler = (e) => {
                this.showAllPeriods = !e.target.checked; // unchecked = visão completa
                this._updateToggleState();
                this.render();
            };

            this.elements.licenseViewToggle.addEventListener('change', toggleHandler);

            this.eventListeners.push({
                element: this.elements.licenseViewToggle,
                event: 'change',
                handler: toggleHandler
            });
        }

        // Título do relatório
        if (this.elements.reportTitleInput) {
            const titleHandler = (e) => {
                this.reportTitle = e.target.value || 'Relatório de Licenças';
                if (this.elements.previewTitleRedesign) {
                    this.elements.previewTitleRedesign.textContent = this.reportTitle;
                }
            };

            this.elements.reportTitleInput.addEventListener('input', titleHandler);

            this.eventListeners.push({
                element: this.elements.reportTitleInput,
                event: 'input',
                handler: titleHandler
            });
        }

        // Busca de colunas
        if (this.elements.columnSearchInput) {
            const searchHandler = (e) => {
                this.columnSearchTerm = e.target.value.toLowerCase();
                this._filterColumnsList();
                this._updateClearSearchButton();
            };

            this.elements.columnSearchInput.addEventListener('input', searchHandler);

            this.eventListeners.push({
                element: this.elements.columnSearchInput,
                event: 'input',
                handler: searchHandler
            });
        }

        // Limpar busca
        if (this.elements.clearColumnSearch) {
            const clearHandler = () => {
                this.columnSearchTerm = '';
                if (this.elements.columnSearchInput) {
                    this.elements.columnSearchInput.value = '';
                }
                this._filterColumnsList();
                this._updateClearSearchButton();
            };

            this.elements.clearColumnSearch.addEventListener('click', clearHandler);

            this.eventListeners.push({
                element: this.elements.clearColumnSearch,
                event: 'click',
                handler: clearHandler
            });
        }

        // Botões de Exportação
        if (this.elements.exportXlsxBtn) {
            const xlsxHandler = () => {
                this._exportToExcel();
            };

            this.elements.exportXlsxBtn.addEventListener('click', xlsxHandler);

            this.eventListeners.push({
                element: this.elements.exportXlsxBtn,
                event: 'click',
                handler: xlsxHandler
            });
        }

        if (this.elements.generatePdfBtn) {
            const pdfHandler = () => {
                this._exportToPDF();
            };

            this.elements.generatePdfBtn.addEventListener('click', pdfHandler);

            this.eventListeners.push({
                element: this.elements.generatePdfBtn,
                event: 'click',
                handler: pdfHandler
            });
        }

        console.log('✅ Event listeners configurados');
    }

    /**
     * Setup de controles de colunas (checkboxes, grupos, select all/unselect all)
     * @private
     */
    _setupColumnControls() {
        // Marcar todas as colunas
        if (this.elements.selectAllColumns) {
            const selectAllHandler = () => {
                this._selectAllColumns(true);
                this.render();
            };

            this.elements.selectAllColumns.addEventListener('click', selectAllHandler);

            this.eventListeners.push({
                element: this.elements.selectAllColumns,
                event: 'click',
                handler: selectAllHandler
            });
        }

        // Desmarcar todas as colunas
        if (this.elements.unselectAllColumns) {
            const unselectAllHandler = () => {
                this._selectAllColumns(false);
                this.render();
            };

            this.elements.unselectAllColumns.addEventListener('click', unselectAllHandler);

            this.eventListeners.push({
                element: this.elements.unselectAllColumns,
                event: 'click',
                handler: unselectAllHandler
            });
        }

        // Event delegation para checkboxes de colunas
        if (this.elements.columnsAccordion) {
            const checkboxHandler = (e) => {
                if (e.target.type === 'checkbox') {
                    const columnValue = e.target.value;

                    if (e.target.checked) {
                        this.selectedColumns.add(columnValue);
                    } else {
                        this.selectedColumns.delete(columnValue);
                    }

                    this.render();
                }
            };

            this.elements.columnsAccordion.addEventListener('change', checkboxHandler);

            this.eventListeners.push({
                element: this.elements.columnsAccordion,
                event: 'change',
                handler: checkboxHandler
            });
        }

        // Event delegation para grupos (acordeão)
        if (this.elements.columnsAccordion) {
            const accordionHandler = (e) => {
                const header = e.target.closest('.column-group-header');
                if (header) {
                    const group = header.parentElement;
                    group.classList.toggle('active');
                }
            };

            this.elements.columnsAccordion.addEventListener('click', accordionHandler);

            this.eventListeners.push({
                element: this.elements.columnsAccordion,
                event: 'click',
                handler: accordionHandler
            });
        }

        console.log('✅ Controles de colunas configurados');
    }

    /**
     * Retorna colunas selecionadas respeitando a ordem fixa definida em `this.columnsOrder`.
     * @returns {Array<string>}
     */
    _orderedSelectedColumns() {
        return this.columnsOrder.filter(col => this.selectedColumns.has(col) && this.columnMapping[col]);
    }

    /**
     * Atualiza `availableColumns` baseado nos dados fornecidos e ajusta checkboxes no DOM
     * @param {Array} servidores
     */
    _updateAvailableColumns(servidores) {
        const available = new Set();
        const sample = servidores || this._getFilteredData() || [];

        // If there is no data yet, consider all columns available (avoid disabling everything by default)
        if (!Array.isArray(sample) || sample.length === 0) {
            Object.keys(this.columnMapping).forEach(col => available.add(col));
            this.availableColumns = available;

            // Ensure checkboxes are enabled when no data (do not disable UI controls before data loads)
            if (this.elements.columnsAccordion) {
                const checkboxes = this.elements.columnsAccordion.querySelectorAll('input[type="checkbox"]');
                checkboxes.forEach(cb => {
                    cb.disabled = false;
                    cb.closest('.column-checkbox')?.classList.remove('disabled');
                });
            }

            return;
        }
        // For each defined column, check if at least one non-empty value exists
        Object.keys(this.columnMapping).forEach(col => {
            const extractor = this.columnMapping[col].extract;
            if (!extractor) return;
            const has = sample.some(s => {
                try {
                    const v = extractor(s);
                    return v !== null && v !== undefined && String(v).trim() !== '';
                } catch (e) { return false; }
            });
            if (has) available.add(col);
        });

        this.availableColumns = available;

        // Update DOM checkboxes: disable those not available
        if (this.elements.columnsAccordion) {
            const checkboxes = this.elements.columnsAccordion.querySelectorAll('input[type="checkbox"]');
            checkboxes.forEach(cb => {
                const val = cb.value;
                if (!available.has(val)) {
                    cb.disabled = true;
                    // visually indicate disabled
                    cb.closest('.column-checkbox')?.classList.add('disabled');
                    // ensure not selected
                    if (this.selectedColumns.has(val)) this.selectedColumns.delete(val);
                    cb.checked = false;
                } else {
                    cb.disabled = false;
                    cb.closest('.column-checkbox')?.classList.remove('disabled');
                }
            });
        }
    }

    /**
     * Seleciona/desseleciona todas as colunas disponíveis (respeita `availableColumns`)
     * @param {boolean} selectAll
     */
    _selectAllColumns(selectAll) {
        if (selectAll) {
            this.selectedColumns = new Set(Array.from(this.availableColumns));
        } else {
            this.selectedColumns.clear();
        }

        // Atualizar checkboxes no DOM
        if (this.elements.columnsAccordion) {
            const checkboxes = this.elements.columnsAccordion.querySelectorAll('input[type="checkbox"]');
            checkboxes.forEach(cb => {
                cb.checked = this.selectedColumns.has(cb.value);
            });
        }
    }

    /**
     * Helper: busca um campo tolerante a variações de nome/acento
     * @param {Object} obj
     * @param {Array<string>} patterns - array de regex-like patterns (strings)
     * @returns {*} valor encontrado ou empty string
     */
    _getField(obj, patterns) {
        if (!obj || !patterns || !Array.isArray(patterns)) return '';
        const keys = Object.keys(obj || {});
        for (const p of patterns) {
            try {
                const re = new RegExp(p, 'i');
                const k = keys.find(k => re.test(k));
                if (k) return obj[k];
            } catch (e) {
                // if pattern isn't a valid regex, fallback to simple match
                const k = keys.find(k => (k || '').toLowerCase().includes(String(p).toLowerCase()));
                if (k) return obj[k];
            }
        }
        return '';
    }

    /**
     * Extrai idade do servidor: tenta campo direto ou calcula a partir da data de nascimento
     * @param {Object} s
     * @returns {number|string}
     */
    _extractAge(s) {
        if (!s) return '';
        // try direct fields
        const ageVal = this._getField(s, ['idade', 'IDADE', 'age']);
        if (ageVal !== '' && ageVal !== null && ageVal !== undefined) {
            const n = Number(String(ageVal).replace(/\D/g, ''));
            if (!isNaN(n) && n > 0 && n < 150) return n;
        }

        // try birth date fields
        const birth = this._getField(s, ['nasc', 'nascimento', 'data_nasc', 'dataNascimento', 'dt_nasc', 'NASCIMENTO']);
        if (birth) {
            const d = (typeof birth === 'string') ? (new Date(birth)) : (birth instanceof Date ? birth : null);
            if (d instanceof Date && !isNaN(d)) {
                const diff = Date.now() - d.getTime();
                return Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25));
            }
            // try DD/MM/YYYY format
            const m = String(birth).match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
            if (m) {
                const dt = new Date(parseInt(m[3]), parseInt(m[2]) - 1, parseInt(m[1]));
                if (!isNaN(dt)) {
                    const diff = Date.now() - dt.getTime();
                    return Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25));
                }
            }
        }

        return '';
    }

    /**
     * Atualiza estado visual do toggle
     * @private
     */
    _updateToggleState() {
        if (!this.elements.licenseViewToggle) return;

        // Atualizar checkbox
        this.elements.licenseViewToggle.checked = !this.showAllPeriods;

        // Atualizar labels (destaque)
        if (this.elements.toggleLabelComplete) {
            this.elements.toggleLabelComplete.style.fontWeight = this.showAllPeriods ? 'bold' : 'normal';
        }

        if (this.elements.toggleLabelFiltered) {
            this.elements.toggleLabelFiltered.style.fontWeight = !this.showAllPeriods ? 'bold' : 'normal';
        }

        // Atualizar descrição
        if (this.elements.toggleDescriptionText) {
            this.elements.toggleDescriptionText.textContent = this.showAllPeriods
                ? 'Exibindo todas as licenças dos servidores encontrados'
                : 'Exibindo apenas as licenças que correspondem aos filtros ativos';
        }
    }

    /**
     * Filtra lista de colunas por termo de busca
     * @private
     */
    _filterColumnsList() {
        if (!this.elements.columnsAccordion) return;

        const term = this.columnSearchTerm.toLowerCase();

        // Se termo vazio, mostrar todas
        if (!term) {
            const allGroups = this.elements.columnsAccordion.querySelectorAll('.column-group');
            allGroups.forEach(group => {
                group.style.display = 'block';
                const checkboxes = group.querySelectorAll('.column-checkbox');
                checkboxes.forEach(cb => cb.style.display = 'flex');
            });

            if (this.elements.columnsEmptyState) {
                this.elements.columnsEmptyState.style.display = 'none';
            }

            return;
        }

        // Filtrar colunas
        let visibleCount = 0;

        const allGroups = this.elements.columnsAccordion.querySelectorAll('.column-group');

        allGroups.forEach(group => {
            const checkboxes = group.querySelectorAll('.column-checkbox');
            let groupVisibleCount = 0;

            checkboxes.forEach(cb => {
                const columnName = cb.querySelector('span').textContent.toLowerCase();

                if (columnName.includes(term)) {
                    cb.style.display = 'flex';
                    groupVisibleCount++;
                    visibleCount++;
                } else {
                    cb.style.display = 'none';
                }
            });

            // Mostrar grupo apenas se tiver colunas visíveis
            group.style.display = groupVisibleCount > 0 ? 'block' : 'none';
        });

        // Mostrar empty state se nada encontrado
        if (this.elements.columnsEmptyState) {
            this.elements.columnsEmptyState.style.display = visibleCount === 0 ? 'flex' : 'none';
        }
    }

    /**
     * Atualiza visibilidade do botão de limpar busca
     * @private
     */
    _updateClearSearchButton() {
        if (!this.elements.clearColumnSearch) return;

        this.elements.clearColumnSearch.style.display = this.columnSearchTerm ? 'flex' : 'none';
    }

    /**
     * Marcar ou desmarcar todas as colunas
     * @private
     * @param {boolean} selectAll - true para marcar todas, false para desmarcar
     */
    

    /**
     * Renderiza a página com os dados atuais
     * Chamado quando a página é ativada ou quando dados mudam
     */
    render() {
        if (!this.isInitialized) {
            console.warn('⚠️ ReportsPage não foi inicializado. Chamando init()...');
            this.init();
        }

        console.log('🎨 Renderizando ReportsPage...');

        // 1. Obter dados filtrados do DataStateManager
        const servidores = this._getFilteredData();

        // 2. Processar dados conforme toggle (todas licenças vs apenas filtradas)
        const processedData = this._processDataForExport(servidores);

        // Update available columns based on processed data (disable columns without data)
        try { this._updateAvailableColumns(processedData); } catch (e) { console.warn('Erro ao atualizar coluna disponível:', e); }

        // Debug helper: inspect processed object for 'ABILIO' if present (temporary)
        try {
            const ab = processedData.find(s => (s.nome || s.NOME || '').toString().toUpperCase().includes('ABILIO'));
            if (ab) {
                console.debug('ReportsPage: processed object for ABILIO:', ab, 'keys=', Object.keys(ab));
            }
        } catch (e) {
            /* ignore */
        }

        // 3. Renderizar preview da tabela
        this._renderPreview(processedData);

        console.log(`✅ ReportsPage renderizado com ${processedData.length} registros`);
    }

    /**
     * Obtém dados filtrados do DataStateManager
     * @private
     * @returns {Array} Array de servidores filtrados
     */
    _getFilteredData() {
        if (!this.dataStateManager) {
            return [];
        }

        // Obter dados filtrados (já aplicados pelo FilterStateManager)
        return this.dataStateManager.getFilteredData() || [];
    }

    /**
     * Processa dados para exportação conforme toggle
     * @private
     * @param {Array} servidores - Array de servidores
     * @returns {Array} Array de dados processados
     */
    _processDataForExport(servidores) {
        // Detect legacy shape: many rows where each row is a license (CSV raw rows)
        let input = servidores || [];

        if (input.length > 0) {
            const sample = input[0];
            const hasLicenseFields = Object.keys(sample).some(k => /A_PARTIR|TERMINO|GOZO|NOME|LOTACAO|AQUISITIVO/i.test(k));
            const lacksLicencasArray = !sample.hasOwnProperty('licencas');

            if (hasLicenseFields && lacksLicencasArray) {
                // Attempt to normalize: group by servidor and enrich
                try {
                    if (typeof DataParser !== 'undefined' && typeof DataParser.groupByServidor === 'function') {
                        console.log('🔁 ReportsPage detected raw-license rows — grouping by servidor');
                        input = DataParser.groupByServidor(input);
                    }

                    if (typeof DataTransformer !== 'undefined' && typeof DataTransformer.enrichServidoresBatch === 'function') {
                        input = DataTransformer.enrichServidoresBatch(input);
                        console.log('🔁 ReportsPage: enriched grouped servidores');
                    }
                } catch (e) {
                    console.warn('⚠️ ReportsPage: failed to normalize legacy rows, proceeding with original input', e);
                }
            }
        }

        // Always produce one row per servidor (aggregate license periods)
        const aggregated = input.map(servidor => {
            const licencas = this._getLicenses(servidor) || [];

            // If the UI is set to show only filtered periods, apply active period filter
            let effectiveLicencas = licencas;
            if (!this.showAllPeriods) {
                try {
                    const active = (this.reportsManager && typeof this.reportsManager.getActivePeriodFilter === 'function')
                        ? this.reportsManager.getActivePeriodFilter()
                        : (this.app && this.app.getActivePeriodFilter ? this.app.getActivePeriodFilter() : null);

                    if (active && (active.dataInicio || active.dataFim || active.start || active.end)) {
                        const toDate = v => {
                            if (!v) return null;
                            if (v instanceof Date) return v;
                            if (typeof v === 'number') return new Date(v);
                            if (typeof v === 'string') {
                                const s = v.trim();
                                // Try DD/MM/YYYY or D/M/YYYY (Brazilian format)
                                const m = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})(.*)$/);
                                if (m) {
                                    const day = Number(m[1]);
                                    const month = Number(m[2]) - 1;
                                    const year = Number(m[3]);
                                    const d = new Date(year, month, day);
                                    if (!isNaN(d.getTime())) return d;
                                }
                                // Fallback to Date parser (ISO, timestamps, etc.)
                                const iso = new Date(s);
                                if (!isNaN(iso.getTime())) return iso;
                                return null;
                            }
                            return null;
                        };

                        let start = toDate(active.dataInicio || active.start || active.dataInicioStr || active.startDate) || null;
                        let end = toDate(active.dataFim || active.end || active.dataFimStr || active.endDate) || null;

                        // Normalize to full local days: start at 00:00:00.000, end at 23:59:59.999
                        if (start) start = new Date(start.getFullYear(), start.getMonth(), start.getDate(), 0, 0, 0, 0);
                        if (end) end = new Date(end.getFullYear(), end.getMonth(), end.getDate(), 23, 59, 59, 999);

                        // Debug: log what we received and parsed to help diagnose toggle/filter issues
                        try {
                            console.debug('ReportsPage: active-period raw=', active, 'parsed start=', start, 'end=', end, 'showAllPeriods=', this.showAllPeriods);
                        } catch (e) {
                            // ignore in environments without console
                        }

                        if (start || end) {
                            effectiveLicencas = (licencas || []).filter(l => {
                                const li = toDate(l.inicio || l.INICIO || l.A_PARTIR || l.aPartir || l.dataInicio || l.DATA_INICIO) || null;
                                const lf = toDate(l.fim || l.FIM || l.TERMINO || l.termino || l.dataFim || l.DATA_FIM) || null;

                                // If license has neither date, exclude
                                if (!li && !lf) return false;

                                // Treat missing end as same as start
                                const licStart = li || lf;
                                const licEnd = lf || li;

                                // Compare intervals: overlap if not (licEnd < start || licStart > end)
                                if (start && licEnd && licEnd < start) return false;
                                if (end && licStart && licStart > end) return false;
                                return true;
                            });
                        }
                    }
                } catch (e) {
                    console.warn('⚠️ ReportsPage: failed to apply active-period filter, falling back to all periods', e);
                }
            }

            const ag = this._aggregateLicenses(effectiveLicencas);

            // Ensure lotacao is populated: prefer servidor.lotacao, then unidade, then try to lookup in full dataset
            let lotacaoFinal = this._getField(servidor, ['lotacao', 'LOTACAO', 'Lotacao']) || servidor.lotacao || servidor.LOTACAO || servidor.unidade || servidor.UNIDADE || '';
            if ((!lotacaoFinal || String(lotacaoFinal).trim() === '') && this.dataStateManager && typeof this.dataStateManager.getAllServidores === 'function') {
                try {
                    const all = this.dataStateManager.getAllServidores() || [];
                    const nomeAlvo = (servidor.nome || servidor.NOME || servidor.servidor || '').toString().trim().toLowerCase();
                    if (nomeAlvo) {
                        const match = all.find(s => ((s.nome || s.NOME || s.servidor) || '').toString().trim().toLowerCase() === nomeAlvo && (s.lotacao || s.LOTACAO || s.unidade || s.UNIDADE));
                        if (match) {
                            lotacaoFinal = match.lotacao || match.LOTACAO || match.unidade || match.UNIDADE || lotacaoFinal;
                        }
                    }
                } catch (e) {
                    // ignore
                }
            }

            const enrichedLot = lotacaoFinal || '';
            // if DataTransformer.normalizeForSearch exists, compute normalized form
            let lotacaoNormalizada = '';
            try {
                if (typeof DataTransformer !== 'undefined' && typeof DataTransformer.normalizeForSearch === 'function') {
                    lotacaoNormalizada = DataTransformer.normalizeForSearch(enrichedLot);
                }
            } catch (e) { /* ignore */ }

            return {
                ...servidor,
                // ensure the renderer/formatters see the filtered licencas
                licencas: effectiveLicencas,
                lotacao: enrichedLot,
                _lotacaoNormalizada: lotacaoNormalizada,
                // aggregated summary fields
                periodoLicenca: ag.periodSummary,
                periodosDetalhados: ag.periods, // array of {inicio,fim}
                totalLicencas: ag.count,
                diasLicenca: ag.totalDays || '',
                mesesLicenca: ag.maxMonths || ''
            };
        });

        return aggregated;
    }

    /**
     * Agrega array de licenças em um resumo: períodos concatenados, total, soma dias, maior meses
     * @param {Array} licencas
     * @returns {Object}
     */
    _aggregateLicenses(licencas) {
        if (!licencas || licencas.length === 0) return { periodSummary: '', periods: [], count: 0, totalDays: 0, maxMonths: '' };

        const periods = licencas.map(l => {
            const inicio = l.inicio || l.INICIO || l.A_PARTIR || l.aPartir || l.dataInicio || l.DATA_INICIO || '';
            const fim = l.fim || l.FIM || l.TERMINO || l.termino || l.dataFim || l.DATA_FIM || '';
            return { inicio, fim };
        }).filter(p => p.inicio || p.fim);

        // build human-readable summary: up to 3 periods joined, plus count
        const summaryParts = periods.slice(0, 3).map(p => {
            const si = this._formatDate(p.inicio) || '';
            const sf = this._formatDate(p.fim) || '';
            if (si && sf) return `${si} – ${sf}`;
            if (si) return si;
            if (sf) return sf;
            return '';
        }).filter(Boolean);

        const periodSummary = summaryParts.join('\n') + (periods.length > 3 ? `\n... (+${periods.length - 3})` : '') || '';

        // total days and max months
        let totalDays = 0;
        let maxMonths = null;
        licencas.forEach(l => {
            const dias = Number(l.dias || l.DIAS || l.days || 0) || 0;
            totalDays += dias;
            const meses = Number(l.meses || l.MESES || l.months || 0) || 0;
            if (meses && (maxMonths === null || meses > maxMonths)) maxMonths = meses;
        });

        return { periodSummary, periods, count: licencas.length, totalDays: totalDays || '', maxMonths: maxMonths || '' };
    }

    /**
     * Renderiza preview da tabela de exportação
     * @private
     * @param {Array} data - Dados processados
     */
    _renderPreview(data) {
        if (!this.elements.previewTableRedesign) {
            console.warn('⚠️ Elemento de preview não disponível');
            return;
        }

        // Atualizar título
        if (this.elements.previewTitleRedesign) {
            this.elements.previewTitleRedesign.textContent = this.reportTitle;
        }

        // Atualizar timestamp
        if (this.elements.previewTimestampRedesign) {
            const now = new Date();
            this.elements.previewTimestampRedesign.textContent = this._formatDateTime(now);
        }

        // Atualizar contador
        if (this.elements.previewCountRedesign) {
            this.elements.previewCountRedesign.textContent = `${data.length} registro${data.length !== 1 ? 's' : ''}`;
        }

        // Se não há dados ou não há colunas selecionadas, mostrar placeholder
        if (data.length === 0 || this.selectedColumns.size === 0) {
            this.elements.previewTableRedesign.innerHTML = this._renderEmptyState(data.length, this.selectedColumns.size);
            return;
        }

        // Renderizar tabela (máximo 15 linhas no preview)
        // Evitar repetição de servidores na pré-visualização (agrupar por CPF/Matrícula/Nome)
        const previewData = [];
        const seen = new Set();
        for (const row of data) {
            const key = this._getServerKey(row);
            if (!key) {
                // fallback: include if no key
                previewData.push(row);
            } else if (!seen.has(key)) {
                seen.add(key);
                previewData.push(row);
            }
            if (previewData.length >= 15) break;
        }
        const tableHtml = this._renderPreviewTable(previewData);
        this.elements.previewTableRedesign.innerHTML = tableHtml;
    }

    /**
     * Renderiza placeholder quando não há dados
     * @private
     * @param {number} dataLength - Quantidade de dados disponíveis
     * @param {number} columnsCount - Quantidade de colunas selecionadas
     * @returns {string} HTML do placeholder
     */
    _renderEmptyState(dataLength, columnsCount) {
        if (dataLength === 0) {
            return `
                <div class="preview-placeholder">
                    <i class="bi bi-inbox"></i>
                    <h3>Nenhum Registro Encontrado</h3>
                    <p>Não há servidores que correspondam aos filtros ativos.</p>
                </div>
            `;
        }

        if (columnsCount === 0) {
            return `
                <div class="preview-placeholder">
                    <i class="bi bi-layout-three-columns"></i>
                    <h3>Selecione Colunas</h3>
                    <p>Selecione pelo menos uma coluna para visualizar o relatório.</p>
                </div>
            `;
        }

        return `
            <div class="preview-placeholder">
                <i class="bi bi-file-earmark-text"></i>
                <h3>Prévia do Relatório</h3>
                <p>Configure o título e selecione as colunas para visualizar a prévia.</p>
            </div>
        `;
    }

    /**
     * Renderiza HTML da tabela de preview
     * @private
     * @param {Array} data - Dados a renderizar (máx 15 linhas)
     * @returns {string} HTML da tabela
     */
    _renderPreviewTable(data) {
        // Cabeçalhos
        const headers = this._orderedSelectedColumns()
            .map(col => this.columnMapping[col].label);

        // Corpo
        const rows = data.map(servidor => {
            const cells = this._orderedSelectedColumns()
                .map(col => {
                    const extractor = this.columnMapping[col].extract;
                    let value = extractor(servidor);

                    // Show friendly fallback for urgencia only at render time
                    if ((value === null || value === undefined || value === '') && col === 'urgencia') {
                        value = 'Não calculada';
                    }

                    // Preserve multi-line values: render each period as a non-breaking line
                    if (typeof value === 'string' && value.includes('\n')) {
                        return value.split('\n').map(line => `
                            <div style="white-space:nowrap">${this._escapeHtml(line)}</div>`
                        ).join('');
                    }

                    return this._escapeHtml(String(value ?? ''));
                });

            return `<tr>${cells.map(cell => `<td>${cell}</td>`).join('')}</tr>`;
        }).join('');

        return `
            <div class="preview-table-scroll">
                <table class="preview-table">
                    <thead>
                        <tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr>
                    </thead>
                    <tbody>
                        ${rows}
                    </tbody>
                </table>
            </div>
        `;
    }

    /**
     * Exporta relatório para Excel
     * @private
     */
    _exportToExcel() {
        console.log('📊 Exportando para Excel...');

        // Obter dados completos (não limitado a 15 linhas)
        const servidores = this._getFilteredData();
        const processedData = this._processDataForExport(servidores);

        if (processedData.length === 0) {
            this._showNotification('Nenhum dado para exportar', 'warning');
            return;
        }

        // Preparar dados para exportação
        const exportData = this._prepareDataForExport(processedData);

        // Delegar para ExportService ou ReportsManager
        if (this.exportService && typeof this.exportService.exportToExcel === 'function') {
            this.exportService.exportToExcel(exportData, this.reportTitle);
        } else if (this.reportsManager && typeof this.reportsManager.exportToExcel === 'function') {
            this.reportsManager.exportToExcel(exportData, this.reportTitle);
        } else {
            console.error('❌ ExportService ou ReportsManager não disponível para exportação Excel');
            this._showNotification('Erro ao exportar: serviço não disponível', 'error');
        }
    }

    /**
     * Exporta relatório para PDF
     * @private
     */
    _exportToPDF() {
        console.log('📄 Exportando para PDF...');

        // Obter dados completos (não limitado a 15 linhas)
        const servidores = this._getFilteredData();
        const processedData = this._processDataForExport(servidores);

        if (processedData.length === 0) {
            this._showNotification('Nenhum dado para exportar', 'warning');
            return;
        }

        // Preparar dados para exportação
        const exportData = this._prepareDataForExport(processedData);

        // Delegar para ExportService ou ReportsManager
        if (this.exportService && typeof this.exportService.exportToPDF === 'function') {
            this.exportService.exportToPDF(exportData, this.reportTitle);
        } else if (this.reportsManager && typeof this.reportsManager.exportToPDF === 'function') {
            this.reportsManager.exportToPDF(exportData, this.reportTitle);
        } else {
            console.error('❌ ExportService ou ReportsManager não disponível para exportação PDF');
            this._showNotification('Erro ao exportar: serviço não disponível', 'error');
        }
    }

    /**
     * Prepara dados para exportação (converte para array de objetos simples)
     * @private
     * @param {Array} data - Dados processados
     * @returns {Array} Array de objetos para exportação
     */
    _prepareDataForExport(data) {
        return data.map(servidor => {
            const row = {};

            this._orderedSelectedColumns()
                .forEach(col => {
                    const { label, extract } = this.columnMapping[col];
                    row[label] = extract(servidor);
                });

            return row;
        });
    }

    /**
     * Mostra notificação para o usuário
     * @private
     * @param {string} message - Mensagem
     * @param {string} type - Tipo (success, warning, error)
     */
    _showNotification(message, type = 'info') {
        // Usar NotificationService do app se disponível
        if (this.app.notificationService && typeof this.app.notificationService.show === 'function') {
            this.app.notificationService.show(message, type);
        } else {
            // Fallback: console
            console.log(`[${type.toUpperCase()}] ${message}`);
        }
    }

    /**
     * Formata período de licença para exibição (TODAS as licenças)
     * SIMPLIFICADO: Dados já vêm normalizados do DataTransformer
     * @private
     * @param {Object} servidor - Objeto servidor (dados já normalizados)
     * @returns {string} Período formatado (múltiplas linhas se houver várias licenças)
     */
    _formatPeriodoLicenca(servidor) {
        // Dados JÁ vêm normalizados: servidor.licencas = Array<{inicio: Date, fim: Date}>
        const licencas = servidor.licencas || [];

        // Fallback: se não há licenças, tentar reconstruir a partir do dataset (compatibilidade)
        let effectiveLicencas = Array.isArray(licencas) ? licencas : [];
        if (effectiveLicencas.length === 0) {
            try {
                const all = this.dataStateManager?.getAllServidores?.() || [];
                if (all && all.length > 0) {
                    const nomeAlvo = (servidor.nome || servidor.servidor || '').toString().trim().toLowerCase();
                    if (nomeAlvo) {
                        const matches = all.filter(r => {
                            const n = (r.nome || r.NOME || r.servidor || '').toString().trim().toLowerCase();
                            return n === nomeAlvo;
                        });

                        if (matches.length > 0) {
                            effectiveLicencas = matches.map(m => {
                                const inicioRaw = m.inicio || m.INICIO || m.A_PARTIR || m['A_PARTIR'] || m.dataInicio || m.DATA_INICIO;
                                const fimRaw = m.fim || m.FIM || m.TERMINO || m.termino || m.dataFim || m.DATA_FIM;
                                let inicio = null;
                                let fim = null;
                                try {
                                    if (typeof DataTransformer !== 'undefined' && DataTransformer.enrichLicenca) {
                                        // use transformer helpers indirectly by enriching a minimal lic object
                                        const enriched = DataTransformer.enrichLicenca({ inicio: inicioRaw, fim: fimRaw });
                                        inicio = enriched?.dataInicio || enriched?.inicio || enriched?.dataInicio;
                                        fim = enriched?.dataFim || enriched?.fim || enriched?.dataFim;
                                    }
                                } catch (e) {
                                    // fallback to Date parsing
                                    inicio = inicioRaw ? new Date(inicioRaw) : null;
                                    fim = fimRaw ? new Date(fimRaw) : (inicio || null);
                                }

                                return { inicio, fim };
                            }).filter(l => l.inicio);
                        }
                    }
                }
            } catch (e) {
                console.warn('⚠️ ReportsPage: fallback reconstruction of licenças failed', e);
            }
        }

        if (effectiveLicencas.length === 0) {
            return 'Não informado';
        }

        // Apenas FORMATAR (não parsear!)
        const periodos = effectiveLicencas.map(lic => {
            if (!lic || !lic.inicio) return null;

            const inicio = this._formatDate(lic.inicio instanceof Date ? lic.inicio : new Date(lic.inicio));
            const fimVal = lic.fim instanceof Date ? lic.fim : (lic.fim ? new Date(lic.fim) : lic.inicio);
            const fim = this._formatDate(fimVal);

            return `${inicio} - ${fim}`;
        }).filter(Boolean); // Remove nulls

        return periodos.length > 0 ? periodos.join('\n') : 'Não informado';
    }

    /**
     * Formata data para exibição (DD/MM/YYYY)
     * @private
     * @param {Date} date - Date object
     * @returns {string} Data formatada
     */
    _formatDate(date) {
        if (!date || !(date instanceof Date) || isNaN(date.getTime())) {
            return '';
        }

        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();

        return `${day}/${month}/${year}`;
    }

    /**
     * Formata data e hora para timestamp (DD/MM/YYYY HH:MM)
     * @private
     * @param {Date} date - Data a formatar
     * @returns {string} Data e hora formatada
     */
    _formatDateTime(date) {
        if (!(date instanceof Date) || isNaN(date)) return '';

        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');

        return `${day}/${month}/${year} ${hours}:${minutes}`;
    }

    /**
     * Escapa HTML para prevenir XSS
     * @private
     * @param {string} text - Texto a escapar
     * @returns {string} Texto escapado
     */
    _escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * Gera chave única para um servidor baseada em CPF, matrícula ou nome (fallback).
     * @param {Object} s
     * @returns {string}
     */
    _getServerKey(s) {
        if (!s) return '';
        const cpf = this._getField(s, ['cpf', 'CPF']);
        if (cpf) return String(cpf).replace(/\D/g, '').trim();
        const matr = this._getField(s, ['matricula', 'matr', 'MATRICULA']);
        if (matr) return `M:${String(matr).trim()}`;
        const nome = this._getField(s, ['^nome$', '^servidor$', 'NOME', 'SERVIDOR']);
        if (nome) return `N:${String(nome).trim().toLowerCase()}`;
        return '';
    }

    /**
     * Compatibilidade: retorna array de licenças de um servidor.
     * Prefere `reportsManager.getAllLicenses` quando disponível, senão usa `servidor.licencas`.
     * @private
     * @param {Object} servidor
     * @returns {Array<Object>}
     */
    _getLicenses(servidor) {
        if (!servidor) return [];

        try {
            if (this.reportsManager && typeof this.reportsManager.getAllLicenses === 'function') {
                const fromManager = this.reportsManager.getAllLicenses(servidor);
                if (Array.isArray(fromManager)) return fromManager;
            }
        } catch (e) {
            console.warn('ReportsPage: erro ao chamar reportsManager.getAllLicenses', e);
        }

        if (Array.isArray(servidor.licencas)) return servidor.licencas;

        // Backward-compat: try common alternative keys
        if (Array.isArray(servidor.licencasPremio)) return servidor.licencasPremio;
        if (Array.isArray(servidor.lic)) return servidor.lic;

        return [];
    }

    /**
     * Ativa a página (torna visível)
     * Chamado pelo Router quando usuário navega para Reports
     */
    show() {
        if (!this.isInitialized) {
            this.init();
        }

        console.log('👁️ Mostrando ReportsPage');

        // Tornar página visível
        if (this.elements.page) {
            this.elements.page.classList.add('active');
        }

        this.isActive = true;

        // Renderizar com dados atuais
        this.render();
    }

    /**
     * Desativa a página (esconde)
     * Chamado pelo Router quando usuário navega para outra página
     */
    hide() {
        console.log('🙈 Escondendo ReportsPage');

        // Esconder página
        if (this.elements.page) {
            this.elements.page.classList.remove('active');
        }

        this.isActive = false;
    }

    /**
     * Reseta seleção de colunas para padrão
     */
    resetColumnSelection() {
        this.selectedColumns = new Set(['nome', 'cargo', 'idade', 'lotacao', 'urgencia', 'periodoLicenca']);

        // Atualizar checkboxes no DOM
        if (this.elements.columnsAccordion) {
            const checkboxes = this.elements.columnsAccordion.querySelectorAll('input[type="checkbox"]');
            checkboxes.forEach(cb => {
                // respect availableColumns if computed
                const allowed = this.availableColumns.size ? this.availableColumns.has(cb.value) : true;
                cb.checked = this.selectedColumns.has(cb.value) && allowed;
            });
        }

        if (this.isActive) {
            this.render();
        }
    }

    /**
     * Define colunas selecionadas
     * @param {Array<string>} columns - Array de IDs de colunas
     */
    setSelectedColumns(columns) {
        // respect availableColumns if present
        if (this.availableColumns && this.availableColumns.size) {
            this.selectedColumns = new Set(columns.filter(c => this.availableColumns.has(c)));
        } else {
            this.selectedColumns = new Set(columns);
        }

        // Atualizar checkboxes no DOM
        if (this.elements.columnsAccordion) {
            const checkboxes = this.elements.columnsAccordion.querySelectorAll('input[type="checkbox"]');
            checkboxes.forEach(cb => {
                cb.checked = this.selectedColumns.has(cb.value);
            });
        }

        if (this.isActive) {
            this.render();
        }
    }

    /**
     * Obtém colunas atualmente selecionadas
     * @returns {Array<string>} Array de IDs de colunas
     */
    getSelectedColumns() {
        return Array.from(this.selectedColumns);
    }

    /**
     * Define modo de visualização
     * @param {boolean} showAll - true para mostrar todas licenças, false para apenas filtradas
     */
    setViewMode(showAll) {
        this.showAllPeriods = showAll;

        if (this.elements.licenseViewToggle) {
            this.elements.licenseViewToggle.checked = !showAll;
        }

        this._updateToggleState();

        if (this.isActive) {
            this.render();
        }
    }

    /**
     * Cleanup - Remove event listeners
     * Chamado quando a página é destruída (se necessário)
     */
    destroy() {
        console.log('🧹 Destruindo ReportsPage...');

        // Remover todos os event listeners registrados
        this.eventListeners.forEach(({ element, event, handler }) => {
            element.removeEventListener(event, handler);
        });

        this.eventListeners = [];
        this.isInitialized = false;
        this.isActive = false;

        console.log('✅ ReportsPage destruído');
    }
}

// Exportar para uso no App
if (typeof window !== 'undefined') {
    window.ReportsPage = ReportsPage;
}

// Exportar para Node.js (testes)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ReportsPage;
}
