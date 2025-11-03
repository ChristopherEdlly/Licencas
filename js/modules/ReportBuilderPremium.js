/**
 * ReportBuilderPremium.js - Estilo Figma
 * Canvas livre com drag & drop, redimensionamento e estilização
 * @version 6.0.0
 */

class ReportBuilderPremium {
    constructor(dashboard) {
        this.dashboard = dashboard;
        this.isInitialized = false;
        this.isInitializing = false;

        this.state = {
            title: 'Relatório Personalizado',
            widgets: [],
            selectedWidgetId: null,
            canvasSize: { width: 1200, height: 1600 },
            zoom: 1,
            history: [],
            historyIndex: -1,
            maxHistory: 50,
            gridSize: 10,
            snapToGrid: true
        };

        this.elements = {};
        this.dragState = null;
        this.resizeState = null;
        this.autoSaveTimer = null;

        // Não inicializar automaticamente - será feito quando abrir pela primeira vez
    }

    init() {
        if (this.isInitialized || this.isInitializing) {
            console.log('⚠️ Init já foi chamado, pulando...');
            return; // Já inicializado ou inicializando
        }

        this.isInitializing = true;
        console.log('🎨 Inicializando Report Builder Premium (Figma Style)...');

        try {
            console.log('📦 Carregando managers...');
            this.loadManagers();

            console.log('🏗️ Criando interface...');
            this.createInterface();

            console.log('🎧 Registrando listeners...');
            this.registerListeners();

            console.log('💾 Carregando último estado...');
            this.loadLastState();

            console.log('⏰ Iniciando auto-save...');
            this.startAutoSave();

            this.isInitialized = true;
            console.log('✅ Report Builder Premium inicializado com sucesso!');
        } catch (error) {
            console.error('❌ Erro ao inicializar Premium Builder:', error);
            console.error('Stack trace:', error.stack);
            this.isInitializing = false;
            throw error;
        } finally {
            this.isInitializing = false;
        }
    }

    loadManagers() {
        // Verificar se as classes estão disponíveis
        console.log('Verificando classes disponíveis:', {
            WidgetLibrary: typeof WidgetLibrary,
            CanvasManager: typeof CanvasManager,
            StyleManager: typeof StyleManager,
            ExportEngine: typeof ExportEngine
        });

        // Os módulos já foram carregados via script tags no HTML
        // Apenas instanciar as classes
        this.widgetLibrary = new WidgetLibrary(this);
        this.canvasManager = new CanvasManager(this);
        this.styleManager = new StyleManager(this);
        this.exportEngine = new ExportEngine(this);

        console.log('✅ Managers carregados:', {
            widgetLibrary: !!this.widgetLibrary,
            canvasManager: !!this.canvasManager,
            styleManager: !!this.styleManager,
            exportEngine: !!this.exportEngine
        });
    }

    createInterface() {
        console.log('🔨 createInterface() chamado');
        const reportsPage = document.getElementById('reportsPage');
        console.log('📄 reportsPage encontrado:', !!reportsPage);
        if (!reportsPage) {
            console.error('❌ Elemento #reportsPage não encontrado!');
            return;
        }

        reportsPage.innerHTML = `
            <div class="figma-builder">
                <!-- Top Bar -->
                <div class="figma-topbar">
                    <div class="topbar-left">
                        <button class="icon-btn" id="backBtn" title="Voltar">
                            <i class="bi bi-arrow-left"></i>
                        </button>
                        <input type="text" class="report-title-input" id="reportTitleInput"
                               value="${this.state.title}" placeholder="Nome do relatório">
                    </div>

                    <div class="topbar-center">
                        <button class="icon-btn" id="undoBtn" disabled>
                            <i class="bi bi-arrow-counterclockwise"></i>
                        </button>
                        <button class="icon-btn" id="redoBtn" disabled>
                            <i class="bi bi-arrow-clockwise"></i>
                        </button>
                        <div class="topbar-divider"></div>
                        <button class="icon-btn" id="zoomOutBtn">
                            <i class="bi bi-dash-lg"></i>
                        </button>
                        <span class="zoom-indicator" id="zoomIndicator">100%</span>
                        <button class="icon-btn" id="zoomInBtn">
                            <i class="bi bi-plus-lg"></i>
                        </button>
                    </div>

                    <div class="topbar-right">
                        <button class="btn-secondary" id="templatesBtn">
                            <i class="bi bi-folder"></i>
                            <span>Templates</span>
                        </button>
                        <button class="btn-primary" id="exportBtn">
                            <i class="bi bi-download"></i>
                            <span>Exportar</span>
                        </button>
                    </div>
                </div>

                <!-- Main Layout -->
                <div class="figma-main">
                    <!-- Left Sidebar: Widgets -->
                    <aside class="figma-sidebar left-sidebar" id="widgetsSidebar">
                        <div class="sidebar-toggle" id="toggleWidgetsSidebar">
                            <i class="bi bi-chevron-left"></i>
                        </div>
                        <div class="sidebar-content">
                            <div class="sidebar-header">
                                <h3>Widgets</h3>
                            </div>
                            <div class="sidebar-search">
                                <i class="bi bi-search"></i>
                                <input type="text" id="widgetSearchInput" placeholder="Buscar...">
                            </div>
                            <div class="widgets-list" id="widgetsList"></div>
                        </div>
                        <div class="sidebar-icons" id="widgetsIcons"></div>
                    </aside>

                    <!-- Canvas -->
                    <div class="figma-canvas-area" id="canvasArea">
                        <div class="canvas-controls">
                            <button class="icon-btn" id="gridToggleBtn" title="Toggle Grid">
                                <i class="bi bi-grid"></i>
                            </button>
                            <button class="icon-btn" id="fitCanvasBtn" title="Fit to Screen">
                                <i class="bi bi-arrows-angle-contract"></i>
                            </button>
                        </div>

                        <div class="canvas-wrapper" id="canvasWrapper">
                            <div class="canvas-document" id="canvasDocument"
                                 style="width: ${this.state.canvasSize.width}px; height: ${this.state.canvasSize.height}px;">
                                <div class="canvas-grid" id="canvasGrid"></div>
                                <div class="canvas-widgets" id="canvasWidgets"></div>

                                <!-- Selection Box -->
                                <div class="selection-box" id="selectionBox" style="display: none;"></div>
                            </div>
                        </div>
                    </div>

                    <!-- Right Sidebar: Properties -->
                    <aside class="figma-sidebar right-sidebar" id="propertiesSidebar">
                        <div class="sidebar-toggle" id="togglePropertiesSidebar">
                            <i class="bi bi-chevron-right"></i>
                        </div>
                        <div class="sidebar-content">
                            <div class="sidebar-header">
                                <h3>Propriedades</h3>
                            </div>
                            <div class="properties-content" id="propertiesContent">
                                <div class="empty-selection">
                                    <i class="bi bi-mouse"></i>
                                    <p>Selecione um widget para editar</p>
                                </div>
                            </div>
                        </div>
                    </aside>
                </div>

                <!-- Modals -->
                ${this.getModalsHTML()}
            </div>
        `;

        this.cacheElements();
        this.widgetLibrary.renderSidebar();
        this.canvasManager.init();
    }

    getModalsHTML() {
        return `
            <!-- Templates Modal -->
            <div class="modal-overlay" id="templatesModal">
                <div class="modal-dialog">
                    <div class="modal-header">
                        <h3>Templates</h3>
                        <button class="icon-btn" id="closeTemplatesModal">
                            <i class="bi bi-x-lg"></i>
                        </button>
                    </div>
                    <div class="modal-body" id="templatesBody"></div>
                    <div class="modal-footer">
                        <button class="btn-secondary" id="saveTemplateBtn">
                            <i class="bi bi-save"></i> Salvar Template
                        </button>
                    </div>
                </div>
            </div>

            <!-- Export Modal -->
            <div class="modal-overlay" id="exportModal">
                <div class="modal-dialog">
                    <div class="modal-header">
                        <h3>Exportar Relatório</h3>
                        <button class="icon-btn" id="closeExportModal">
                            <i class="bi bi-x-lg"></i>
                        </button>
                    </div>
                    <div class="modal-body">
                        <div class="export-formats">
                            <label class="format-option">
                                <input type="radio" name="exportFormat" value="pdf" checked>
                                <div class="format-card">
                                    <i class="bi bi-file-earmark-pdf"></i>
                                    <span>PDF</span>
                                </div>
                            </label>
                            <label class="format-option">
                                <input type="radio" name="exportFormat" value="excel">
                                <div class="format-card">
                                    <i class="bi bi-file-earmark-excel"></i>
                                    <span>Excel</span>
                                </div>
                            </label>
                            <label class="format-option">
                                <input type="radio" name="exportFormat" value="html">
                                <div class="format-card">
                                    <i class="bi bi-file-earmark-code"></i>
                                    <span>HTML</span>
                                </div>
                            </label>
                            <label class="format-option">
                                <input type="radio" name="exportFormat" value="image">
                                <div class="format-card">
                                    <i class="bi bi-file-earmark-image"></i>
                                    <span>PNG</span>
                                </div>
                            </label>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button class="btn-secondary" id="cancelExportBtn">Cancelar</button>
                        <button class="btn-primary" id="confirmExportBtn">
                            <i class="bi bi-download"></i> Exportar
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    cacheElements() {
        this.elements = {
            backBtn: document.getElementById('backBtn'),
            reportTitleInput: document.getElementById('reportTitleInput'),
            undoBtn: document.getElementById('undoBtn'),
            redoBtn: document.getElementById('redoBtn'),
            zoomOutBtn: document.getElementById('zoomOutBtn'),
            zoomInBtn: document.getElementById('zoomInBtn'),
            zoomIndicator: document.getElementById('zoomIndicator'),
            templatesBtn: document.getElementById('templatesBtn'),
            exportBtn: document.getElementById('exportBtn'),

            widgetsSidebar: document.getElementById('widgetsSidebar'),
            toggleWidgetsSidebar: document.getElementById('toggleWidgetsSidebar'),
            widgetSearchInput: document.getElementById('widgetSearchInput'),
            widgetsList: document.getElementById('widgetsList'),
            widgetsIcons: document.getElementById('widgetsIcons'),

            canvasArea: document.getElementById('canvasArea'),
            canvasWrapper: document.getElementById('canvasWrapper'),
            canvasDocument: document.getElementById('canvasDocument'),
            canvasGrid: document.getElementById('canvasGrid'),
            canvasWidgets: document.getElementById('canvasWidgets'),
            selectionBox: document.getElementById('selectionBox'),
            gridToggleBtn: document.getElementById('gridToggleBtn'),
            fitCanvasBtn: document.getElementById('fitCanvasBtn'),

            propertiesSidebar: document.getElementById('propertiesSidebar'),
            togglePropertiesSidebar: document.getElementById('togglePropertiesSidebar'),
            propertiesContent: document.getElementById('propertiesContent'),

            templatesModal: document.getElementById('templatesModal'),
            exportModal: document.getElementById('exportModal')
        };
    }

    registerListeners() {
        // Topbar
        this.elements.backBtn?.addEventListener('click', () => this.handleBack());
        this.elements.reportTitleInput?.addEventListener('input', (e) => {
            this.state.title = e.target.value;
            this.saveToHistory();
        });
        this.elements.undoBtn?.addEventListener('click', () => this.undo());
        this.elements.redoBtn?.addEventListener('click', () => this.redo());
        this.elements.zoomOutBtn?.addEventListener('click', () => this.changeZoom(-0.1));
        this.elements.zoomInBtn?.addEventListener('click', () => this.changeZoom(0.1));
        this.elements.templatesBtn?.addEventListener('click', () => this.showTemplatesModal());
        this.elements.exportBtn?.addEventListener('click', () => this.showExportModal());

        // Sidebar toggles
        this.elements.toggleWidgetsSidebar?.addEventListener('click', () => {
            this.elements.widgetsSidebar?.classList.toggle('collapsed');
        });
        this.elements.togglePropertiesSidebar?.addEventListener('click', () => {
            this.elements.propertiesSidebar?.classList.toggle('collapsed');
        });

        // Canvas controls
        this.elements.gridToggleBtn?.addEventListener('click', () => {
            this.state.snapToGrid = !this.state.snapToGrid;
            this.elements.canvasDocument?.classList.toggle('show-grid', this.state.snapToGrid);
        });
        this.elements.fitCanvasBtn?.addEventListener('click', () => this.fitCanvas());

        // Search
        this.elements.widgetSearchInput?.addEventListener('input', (e) => {
            this.widgetLibrary.filter(e.target.value);
        });

        // Modals
        document.getElementById('closeTemplatesModal')?.addEventListener('click', () =>
            this.hideModal('templatesModal'));
        document.getElementById('closeExportModal')?.addEventListener('click', () =>
            this.hideModal('exportModal'));
        document.getElementById('saveTemplateBtn')?.addEventListener('click', () => this.saveTemplate());
        document.getElementById('confirmExportBtn')?.addEventListener('click', () => this.handleExport());
        document.getElementById('cancelExportBtn')?.addEventListener('click', () =>
            this.hideModal('exportModal'));

        // Keyboard
        document.addEventListener('keydown', (e) => this.handleKeyboard(e));

        // Theme changes - ouvir mudanças de tema do ThemeManager
        window.addEventListener('themeChanged', (e) => {
            console.log('🎨 Premium Builder: Tema alterado para', e.detail.theme);
            this.handleThemeChange(e.detail.theme);
        });

        // Click fora fecha modals
        [this.elements.templatesModal, this.elements.exportModal].forEach(modal => {
            modal?.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.classList.remove('show');
                }
            });
        });
    }

    addWidget(widgetType, x = null, y = null) {
        const widget = this.widgetLibrary.createWidget(widgetType);
        if (!widget) return;

        // Posição inicial
        if (x === null || y === null) {
            // Centro do canvas visível
            const canvasRect = this.elements.canvasDocument.getBoundingClientRect();
            const wrapperRect = this.elements.canvasWrapper.getBoundingClientRect();

            x = (wrapperRect.width / 2 - canvasRect.left) / this.state.zoom - widget.size.width / 2;
            y = (wrapperRect.height / 2 - canvasRect.top) / this.state.zoom - widget.size.height / 2;
        }

        widget.position = { x: Math.max(0, x), y: Math.max(0, y) };

        this.state.widgets.push(widget);
        this.saveToHistory();
        this.canvasManager.render();
        this.selectWidget(widget.id);
    }

    removeWidget(widgetId) {
        this.state.widgets = this.state.widgets.filter(w => w.id !== widgetId);

        if (this.state.selectedWidgetId === widgetId) {
            this.state.selectedWidgetId = null;
            this.styleManager.renderEmptyState();
        }

        this.saveToHistory();
        this.canvasManager.render();
    }

    selectWidget(widgetId) {
        this.state.selectedWidgetId = widgetId;
        this.canvasManager.updateSelection();
        this.styleManager.renderProperties(widgetId);
    }

    deselectAll() {
        this.state.selectedWidgetId = null;
        this.canvasManager.updateSelection();
        this.styleManager.renderEmptyState();
    }

    updateWidgetStyle(widgetId, styleUpdates) {
        const widget = this.state.widgets.find(w => w.id === widgetId);
        if (!widget) return;

        widget.style = { ...widget.style, ...styleUpdates };
        this.saveToHistory();
        this.canvasManager.render();
    }

    updateWidgetConfig(widgetId, configUpdates) {
        const widget = this.state.widgets.find(w => w.id === widgetId);
        if (!widget) return;

        widget.config = { ...widget.config, ...configUpdates };
        this.saveToHistory();
        this.canvasManager.render();
    }

    changeZoom(delta) {
        this.state.zoom = Math.max(0.1, Math.min(2, this.state.zoom + delta));
        this.elements.canvasDocument.style.transform = `scale(${this.state.zoom})`;
        this.elements.zoomIndicator.textContent = `${Math.round(this.state.zoom * 100)}%`;
    }

    fitCanvas() {
        const wrapper = this.elements.canvasWrapper;
        const canvas = this.elements.canvasDocument;

        const wrapperRect = wrapper.getBoundingClientRect();
        const canvasRect = canvas.getBoundingClientRect();

        const scaleX = wrapperRect.width / (this.state.canvasSize.width + 100);
        const scaleY = wrapperRect.height / (this.state.canvasSize.height + 100);

        this.state.zoom = Math.min(scaleX, scaleY, 1);
        this.elements.canvasDocument.style.transform = `scale(${this.state.zoom})`;
        this.elements.zoomIndicator.textContent = `${Math.round(this.state.zoom * 100)}%`;
    }

    // History
    saveToHistory() {
        if (this.state.historyIndex < this.state.history.length - 1) {
            this.state.history = this.state.history.slice(0, this.state.historyIndex + 1);
        }

        const snapshot = JSON.parse(JSON.stringify({
            title: this.state.title,
            widgets: this.state.widgets
        }));

        this.state.history.push(snapshot);
        this.state.historyIndex++;

        if (this.state.history.length > this.state.maxHistory) {
            this.state.history.shift();
            this.state.historyIndex--;
        }

        this.updateHistoryButtons();
    }

    undo() {
        if (this.state.historyIndex > 0) {
            this.state.historyIndex--;
            this.restoreFromHistory();
        }
    }

    redo() {
        if (this.state.historyIndex < this.state.history.length - 1) {
            this.state.historyIndex++;
            this.restoreFromHistory();
        }
    }

    restoreFromHistory() {
        const snapshot = this.state.history[this.state.historyIndex];
        this.state.title = snapshot.title;
        this.state.widgets = JSON.parse(JSON.stringify(snapshot.widgets));

        if (this.elements.reportTitleInput) {
            this.elements.reportTitleInput.value = this.state.title;
        }

        this.canvasManager.render();
        this.updateHistoryButtons();
    }

    updateHistoryButtons() {
        if (this.elements.undoBtn) {
            this.elements.undoBtn.disabled = this.state.historyIndex <= 0;
        }
        if (this.elements.redoBtn) {
            this.elements.redoBtn.disabled = this.state.historyIndex >= this.state.history.length - 1;
        }
    }

    // Modals
    showModal(modalId) {
        document.getElementById(modalId)?.classList.add('show');
    }

    hideModal(modalId) {
        document.getElementById(modalId)?.classList.remove('show');
    }

    showTemplatesModal() {
        this.renderTemplates();
        this.showModal('templatesModal');
    }

    renderTemplates() {
        const body = document.getElementById('templatesBody');
        if (!body) return;

        const templates = this.loadTemplates();

        if (templates.length === 0) {
            body.innerHTML = `
                <div class="empty-state">
                    <i class="bi bi-inbox"></i>
                    <p>Nenhum template salvo</p>
                </div>
            `;
            return;
        }

        body.innerHTML = templates.map(t => `
            <div class="template-item">
                <div class="template-info">
                    <h4>${t.name}</h4>
                    <p>${t.widgets?.length || 0} widgets</p>
                </div>
                <div class="template-actions">
                    <button class="btn-sm btn-primary load-template" data-id="${t.id}">Carregar</button>
                    <button class="btn-sm btn-danger delete-template" data-id="${t.id}">
                        <i class="bi bi-trash"></i>
                    </button>
                </div>
            </div>
        `).join('');

        body.querySelectorAll('.load-template').forEach(btn => {
            btn.addEventListener('click', () => {
                this.loadTemplate(btn.dataset.id);
                this.hideModal('templatesModal');
            });
        });

        body.querySelectorAll('.delete-template').forEach(btn => {
            btn.addEventListener('click', () => {
                this.deleteTemplate(btn.dataset.id);
                this.renderTemplates();
            });
        });
    }

    saveTemplate() {
        const name = prompt('Nome do template:');
        if (!name) return;

        const template = {
            id: Date.now().toString(),
            name: name,
            title: this.state.title,
            widgets: JSON.parse(JSON.stringify(this.state.widgets)),
            createdAt: Date.now()
        };

        const templates = this.loadTemplates();
        templates.push(template);
        localStorage.setItem('reportBuilderTemplates', JSON.stringify(templates));

        this.renderTemplates();
        alert('Template salvo!');
    }

    loadTemplate(id) {
        const templates = this.loadTemplates();
        const template = templates.find(t => t.id === id);
        if (!template) return;

        this.state.title = template.title;
        this.state.widgets = JSON.parse(JSON.stringify(template.widgets));

        if (this.elements.reportTitleInput) {
            this.elements.reportTitleInput.value = this.state.title;
        }

        this.saveToHistory();
        this.canvasManager.render();
        this.deselectAll();
    }

    deleteTemplate(id) {
        if (!confirm('Deletar template?')) return;

        const templates = this.loadTemplates();
        const filtered = templates.filter(t => t.id !== id);
        localStorage.setItem('reportBuilderTemplates', JSON.stringify(filtered));
    }

    loadTemplates() {
        try {
            const saved = localStorage.getItem('reportBuilderTemplates');
            return saved ? JSON.parse(saved) : [];
        } catch {
            return [];
        }
    }

    showExportModal() {
        this.showModal('exportModal');
    }

    async handleExport() {
        const format = document.querySelector('input[name="exportFormat"]:checked')?.value || 'pdf';
        this.hideModal('exportModal');

        try {
            await this.exportEngine.export(format, {
                title: this.state.title
            });
        } catch (error) {
            console.error('Erro ao exportar:', error);
            alert('Erro: ' + error.message);
        }
    }

    handleKeyboard(e) {
        // Undo
        if (e.ctrlKey && e.key === 'z' && !e.shiftKey) {
            e.preventDefault();
            this.undo();
        }

        // Redo
        if (e.ctrlKey && (e.key === 'y' || (e.shiftKey && e.key === 'z'))) {
            e.preventDefault();
            this.redo();
        }

        // Delete
        if (e.key === 'Delete' && this.state.selectedWidgetId) {
            e.preventDefault();
            this.removeWidget(this.state.selectedWidgetId);
        }

        // Escape
        if (e.key === 'Escape') {
            this.deselectAll();
            this.hideModal('templatesModal');
            this.hideModal('exportModal');
        }
    }

    handleBack() {
        if (confirm('Sair do builder? Alterações não salvas serão perdidas.')) {
            // Dispara evento de navegação para home
            document.dispatchEvent(new CustomEvent('pageChanged', {
                detail: { page: 'home' }
            }));

            // Clica no link de navegação para home se disponível
            const homeLink = document.querySelector('[data-page="home"]');
            if (homeLink) {
                homeLink.click();
            }
        }
    }

    // Auto-save
    startAutoSave() {
        this.autoSaveTimer = setInterval(() => this.autoSave(), 30000);
    }

    autoSave() {
        try {
            const state = {
                title: this.state.title,
                widgets: this.state.widgets,
                savedAt: Date.now()
            };
            localStorage.setItem('reportBuilderAutoSave', JSON.stringify(state));
        } catch (error) {
            console.warn('Erro no auto-save:', error);
        }
    }

    loadLastState() {
        try {
            const saved = localStorage.getItem('reportBuilderAutoSave');
            if (!saved) return;

            const state = JSON.parse(saved);

            if (state.widgets && state.widgets.length > 0) {
                if (confirm('Restaurar última sessão?')) {
                    this.state.title = state.title;
                    this.state.widgets = state.widgets;

                    if (this.elements.reportTitleInput) {
                        this.elements.reportTitleInput.value = this.state.title;
                    }

                    this.canvasManager.render();
                }
            }
        } catch (error) {
            console.warn('Erro ao carregar estado:', error);
        }
    }

    open() {
        console.log('🚀 open() chamado');
        const reportsPage = document.getElementById('reportsPage');
        console.log('📄 #reportsPage existe?', !!reportsPage);

        // Ocultar outras páginas primeiro
        document.querySelectorAll('.page-content:not(#reportsPage)').forEach(page => {
            page.classList.remove('active');
            page.style.display = 'none';
        });

        // Mostrar loading se ainda não está inicializado
        if (!this.isInitialized) {
            console.log('⏳ Premium Builder não inicializado ainda, inicializando...');

            // Mostrar loading state
            if (reportsPage) {
                reportsPage.style.display = 'block';
                reportsPage.classList.add('active');
                reportsPage.innerHTML = `
                    <div class="builder-loading">
                        <div class="loading-spinner"></div>
                        <p>Carregando Report Builder...</p>
                    </div>
                `;
                console.log('⏳ Loading state mostrado');
            } else {
                console.error('❌ reportsPage não encontrado, não é possível mostrar loading');
            }

            // Inicializar (isso vai chamar createInterface() que substituirá o HTML)
            console.log('🔄 Chamando init()...');
            this.init();
        } else {
            console.log('✅ Já inicializado, apenas mostrando');
            // Já inicializado, apenas mostrar
            if (reportsPage) {
                reportsPage.classList.add('active');
                reportsPage.style.display = 'block';
            }
        }

        console.log('✅ Premium Builder aberto');
    }

    close() {
        const reportsPage = document.getElementById('reportsPage');
        if (reportsPage) {
            reportsPage.classList.remove('active');
            reportsPage.style.display = 'none';
        }
    }

    handleThemeChange(theme) {
        // O CSS já responde automaticamente ao atributo data-theme no html
        // Aqui podemos atualizar widgets renderizados que usam canvas ou SVG

        // Se houver charts renderizados nos widgets, atualizar cores
        if (this.canvasManager && this.canvasManager.charts) {
            const isDark = theme === 'dark';
            const chartColor = isDark ? 'rgba(147, 197, 253, 0.8)' : 'rgba(59, 130, 246, 0.8)';
            const gridColor = isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)';

            Object.values(this.canvasManager.charts || {}).forEach(chart => {
                if (chart && chart.data && chart.data.datasets) {
                    chart.data.datasets.forEach(dataset => {
                        dataset.backgroundColor = chartColor;
                    });
                    chart.options.scales.x.grid.color = gridColor;
                    chart.options.scales.y.grid.color = gridColor;
                    chart.update('none'); // Update sem animação
                }
            });
        }

        // Re-renderizar canvas se necessário para aplicar novas cores
        if (this.canvasManager && this.isInitialized) {
            this.canvasManager.render();
        }

        console.log(`✅ Premium Builder: Tema ${theme} aplicado`);
    }

    destroy() {
        if (this.autoSaveTimer) {
            clearInterval(this.autoSaveTimer);
        }

        // Limpar event listeners
        window.removeEventListener('themeChanged', this.handleThemeChange);

        console.log('🗑️ Premium Builder destruído');
    }

    generateId() {
        return `widget_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
}
