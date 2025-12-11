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
        this.selectedColumns = new Set(['nome', 'cargo', 'idade', 'lotacao', 'urgencia', 'periodoLicenca']);
        this.showAllPeriods = true; // true = visão completa, false = apenas filtradas
        this.reportTitle = 'Relatório de Licenças';
        this.columnSearchTerm = '';

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
            nome: { label: 'Nome', extract: (s) => s.servidor || s.nome || 'Não informado' },
            cpf: { label: 'CPF', extract: (s) => s.cpf || '' },
            matricula: { label: 'Matrícula', extract: (s) => s.matricula || '' },
            cargo: { label: 'Cargo', extract: (s) => s.cargo || 'Não informado' },
            idade: { label: 'Idade', extract: (s) => s.idade || '' },

            // Localização
            lotacao: { label: 'Lotação', extract: (s) => s.lotacao || 'Não informada' },
            superintendencia: { label: 'Superintendência', extract: (s) => s.superintendencia || '' },
            subsecretaria: { label: 'Subsecretaria', extract: (s) => s.subsecretaria || '' },

            // Informações da Licença
            urgencia: { label: 'Urgência', extract: (s) => s.urgencia || 'Não calculada' },
            periodoLicenca: { label: 'Período da Licença', extract: (s) => this._formatPeriodoLicenca(s) },
            dataInicio: { label: 'Data Início', extract: (s) => this._formatDate(s.dataInicio) },
            dataFim: { label: 'Data Fim', extract: (s) => this._formatDate(s.dataFim) },
            diasLicenca: { label: 'Dias de Licença', extract: (s) => s.diasLicenca || '' },
            mesesLicenca: { label: 'Meses de Licença', extract: (s) => s.mesesLicenca || '' }
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
    _selectAllColumns(selectAll) {
        // Atualizar estado
        if (selectAll) {
            this.selectedColumns = new Set(Object.keys(this.columnMapping));
        } else {
            this.selectedColumns.clear();
        }

        // Atualizar checkboxes no DOM
        if (this.elements.columnsAccordion) {
            const checkboxes = this.elements.columnsAccordion.querySelectorAll('input[type="checkbox"]');
            checkboxes.forEach(cb => {
                cb.checked = selectAll;
            });
        }
    }

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
        if (this.showAllPeriods) {
            // Visão Completa: Todas as licenças de cada servidor
            // Se servidor tem múltiplas licenças, criar uma linha por licença
            const expandedData = [];

            servidores.forEach(servidor => {
                // Verificar se servidor tem múltiplas licenças
                if (servidor.licencas && Array.isArray(servidor.licencas) && servidor.licencas.length > 0) {
                    // Criar uma linha por licença
                    servidor.licencas.forEach(licenca => {
                        expandedData.push({
                            ...servidor,
                            // Substituir campos de licença por dados específicos desta licença
                            dataInicio: licenca.inicio,
                            dataFim: licenca.fim,
                            diasLicenca: licenca.dias,
                            mesesLicenca: licenca.meses,
                            periodoLicenca: licenca
                        });
                    });
                } else {
                    // Servidor sem licenças ou sem array de licenças
                    expandedData.push(servidor);
                }
            });

            return expandedData;
        } else {
            // Apenas Filtradas: Usar dados como vieram do filtro
            // (FilterManager já aplicou os filtros de período)
            return servidores;
        }
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
        const previewData = data.slice(0, 15);
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
        const headers = Array.from(this.selectedColumns)
            .filter(col => this.columnMapping[col])
            .map(col => this.columnMapping[col].label);

        // Corpo
        const rows = data.map(servidor => {
            const cells = Array.from(this.selectedColumns)
                .filter(col => this.columnMapping[col])
                .map(col => {
                    const extractor = this.columnMapping[col].extract;
                    const value = extractor(servidor);
                    return this._escapeHtml(String(value));
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

            Array.from(this.selectedColumns)
                .filter(col => this.columnMapping[col])
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
     * Formata período de licença para exibição
     * @private
     * @param {Object} servidor - Objeto servidor
     * @returns {string} Período formatado
     */
    _formatPeriodoLicenca(servidor) {
        // Se tem objeto periodoLicenca específico (visão expandida)
        if (servidor.periodoLicenca && typeof servidor.periodoLicenca === 'object') {
            const licenca = servidor.periodoLicenca;
            const inicio = this._formatDate(licenca.inicio);
            const fim = this._formatDate(licenca.fim);

            if (inicio && fim) {
                return `${inicio} - ${fim}`;
            }

            if (inicio) {
                return inicio;
            }

            return licenca.descricao || 'Não informado';
        }

        // Fallback: usar dataInicio e dataFim do servidor
        const inicio = this._formatDate(servidor.dataInicio);
        const fim = this._formatDate(servidor.dataFim);

        if (inicio && fim) {
            return `${inicio} - ${fim}`;
        }

        if (inicio) {
            return inicio;
        }

        return 'Não informado';
    }

    /**
     * Formata data para exibição (DD/MM/YYYY)
     * @private
     * @param {Date|string|null} date - Data a formatar
     * @returns {string} Data formatada
     */
    _formatDate(date) {
        if (!date) return '';

        const d = typeof date === 'string' ? new Date(date) : date;

        if (!(d instanceof Date) || isNaN(d)) return '';

        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const year = d.getFullYear();

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
                cb.checked = this.selectedColumns.has(cb.value);
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
        this.selectedColumns = new Set(columns);

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
