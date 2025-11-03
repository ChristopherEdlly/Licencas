/**
 * StyleManager.js
 * Gerencia painel de propriedades e estilização
 * @version 6.0.0
 */

export class StyleManager {
    constructor(builder) {
        this.builder = builder;
    }

    renderEmptyState() {
        const container = this.builder.elements.propertiesContent;
        if (!container) return;

        container.innerHTML = `
            <div class="empty-selection">
                <i class="bi bi-mouse"></i>
                <p>Selecione um widget para editar</p>
            </div>
        `;
    }

    renderProperties(widgetId) {
        const widget = this.builder.state.widgets.find(w => w.id === widgetId);
        if (!widget) {
            this.renderEmptyState();
            return;
        }

        const container = this.builder.elements.propertiesContent;
        if (!container) return;

        const widgetInfo = this.builder.widgetLibrary.getWidget(widget.type);

        container.innerHTML = `
            <div class="properties-panel">
                <div class="property-section">
                    <div class="section-header">
                        <i class="bi ${widgetInfo?.icon || 'bi-app'}"></i>
                        <h4>${widgetInfo?.name || 'Widget'}</h4>
                    </div>
                </div>

                <!-- Posição e Tamanho -->
                <div class="property-section">
                    <h5>Posição e Tamanho</h5>
                    <div class="property-grid">
                        <div class="property-field">
                            <label>X</label>
                            <input type="number" id="propX" value="${Math.round(widget.position.x)}" min="0">
                        </div>
                        <div class="property-field">
                            <label>Y</label>
                            <input type="number" id="propY" value="${Math.round(widget.position.y)}" min="0">
                        </div>
                        <div class="property-field">
                            <label>Largura</label>
                            <input type="number" id="propWidth" value="${Math.round(widget.size.width)}" min="50">
                        </div>
                        <div class="property-field">
                            <label>Altura</label>
                            <input type="number" id="propHeight" value="${Math.round(widget.size.height)}" min="50">
                        </div>
                    </div>
                </div>

                <!-- Estilo -->
                <div class="property-section">
                    <h5>Estilo</h5>
                    <div class="property-field">
                        <label>Cor de Fundo</label>
                        <div class="color-input-group">
                            <input type="color" id="propBgColor" value="${widget.style?.backgroundColor || '#0d6efd'}">
                            <input type="text" class="color-hex" value="${widget.style?.backgroundColor || '#0d6efd'}" readonly>
                        </div>
                    </div>
                    <div class="property-field">
                        <label>Cor do Texto</label>
                        <div class="color-input-group">
                            <input type="color" id="propTextColor" value="${widget.style?.textColor || '#ffffff'}">
                            <input type="text" class="color-hex" value="${widget.style?.textColor || '#ffffff'}" readonly>
                        </div>
                    </div>
                    <div class="property-field">
                        <label>Borda Arredondada</label>
                        <input type="range" id="propBorderRadius" min="0" max="50" value="${widget.style?.borderRadius || 8}">
                        <span class="range-value">${widget.style?.borderRadius || 8}px</span>
                    </div>
                    <div class="property-field">
                        <label>Padding</label>
                        <input type="range" id="propPadding" min="0" max="50" value="${widget.style?.padding || 20}">
                        <span class="range-value">${widget.style?.padding || 20}px</span>
                    </div>
                </div>

                <!-- Configurações Específicas -->
                ${this.renderSpecificConfig(widget)}

                <!-- Ações -->
                <div class="property-section">
                    <button class="btn-danger btn-full" id="deleteWidgetBtn">
                        <i class="bi bi-trash"></i>
                        Remover Widget
                    </button>
                </div>
            </div>
        `;

        this.attachPropertyListeners(widgetId);
    }

    renderSpecificConfig(widget) {
        let html = '<div class="property-section"><h5>Configurações</h5>';

        switch (widget.type) {
            case 'stat-card':
                html += `
                    <div class="property-field">
                        <label>Métrica</label>
                        <select id="configMetric" class="property-select">
                            <option value="totalServidores" ${widget.config.metric === 'totalServidores' ? 'selected' : ''}>Total de Servidores</option>
                            <option value="comLicenca" ${widget.config.metric === 'comLicenca' ? 'selected' : ''}>Com Licença</option>
                            <option value="semLicenca" ${widget.config.metric === 'semLicenca' ? 'selected' : ''}>Sem Licença</option>
                            <option value="urgenciasCriticas" ${widget.config.metric === 'urgenciasCriticas' ? 'selected' : ''}>Urgências Críticas</option>
                        </select>
                    </div>
                `;
                break;

            case 'text-title':
                html += `
                    <div class="property-field">
                        <label>Texto</label>
                        <input type="text" id="configText" class="property-input" value="${widget.config.text || ''}">
                    </div>
                    <div class="property-field">
                        <label>Tamanho</label>
                        <select id="configLevel" class="property-select">
                            <option value="h1" ${widget.config.level === 'h1' ? 'selected' : ''}>Grande (H1)</option>
                            <option value="h2" ${widget.config.level === 'h2' ? 'selected' : ''}>Médio (H2)</option>
                            <option value="h3" ${widget.config.level === 'h3' ? 'selected' : ''}>Pequeno (H3)</option>
                        </select>
                    </div>
                `;
                break;

            case 'text-paragraph':
                html += `
                    <div class="property-field">
                        <label>Texto</label>
                        <textarea id="configText" class="property-textarea" rows="4">${widget.config.text || ''}</textarea>
                    </div>
                `;
                break;

            case 'chart-bar':
            case 'chart-line':
            case 'chart-pie':
            case 'chart-doughnut':
                html += `
                    <div class="property-field">
                        <label>Fonte de Dados</label>
                        <select id="configDataSource" class="property-select">
                            <option value="timeline" ${widget.config.dataSource === 'timeline' ? 'selected' : ''}>Timeline Mensal</option>
                            <option value="urgency" ${widget.config.dataSource === 'urgency' ? 'selected' : ''}>Por Urgência</option>
                        </select>
                    </div>
                    <div class="property-field">
                        <label class="checkbox-label">
                            <input type="checkbox" id="configShowLegend" ${widget.config.showLegend !== false ? 'checked' : ''}>
                            <span>Mostrar Legenda</span>
                        </label>
                    </div>
                `;
                break;

            case 'table-servidores':
            case 'table-licencas':
                html += `
                    <div class="property-field">
                        <label>Limite de Linhas</label>
                        <input type="number" id="configLimit" class="property-input" value="${widget.config.limit || 10}" min="1" max="100">
                    </div>
                `;
                break;
        }

        html += '</div>';
        return html;
    }

    attachPropertyListeners(widgetId) {
        const widget = this.builder.state.widgets.find(w => w.id === widgetId);
        if (!widget) return;

        // Posição e tamanho
        const propX = document.getElementById('propX');
        const propY = document.getElementById('propY');
        const propWidth = document.getElementById('propWidth');
        const propHeight = document.getElementById('propHeight');

        propX?.addEventListener('change', (e) => {
            widget.position.x = parseInt(e.target.value);
            this.builder.canvasManager.render();
            this.builder.saveToHistory();
        });

        propY?.addEventListener('change', (e) => {
            widget.position.y = parseInt(e.target.value);
            this.builder.canvasManager.render();
            this.builder.saveToHistory();
        });

        propWidth?.addEventListener('change', (e) => {
            widget.size.width = parseInt(e.target.value);
            this.builder.canvasManager.render();
            this.builder.saveToHistory();
        });

        propHeight?.addEventListener('change', (e) => {
            widget.size.height = parseInt(e.target.value);
            this.builder.canvasManager.render();
            this.builder.saveToHistory();
        });

        // Estilo
        const propBgColor = document.getElementById('propBgColor');
        const propTextColor = document.getElementById('propTextColor');
        const propBorderRadius = document.getElementById('propBorderRadius');
        const propPadding = document.getElementById('propPadding');

        propBgColor?.addEventListener('input', (e) => {
            const color = e.target.value;
            widget.style = { ...widget.style, backgroundColor: color };
            e.target.nextElementSibling.value = color;
            this.builder.canvasManager.render();
        });

        propBgColor?.addEventListener('change', () => {
            this.builder.saveToHistory();
        });

        propTextColor?.addEventListener('input', (e) => {
            const color = e.target.value;
            widget.style = { ...widget.style, textColor: color };
            e.target.nextElementSibling.value = color;
            this.builder.canvasManager.render();
        });

        propTextColor?.addEventListener('change', () => {
            this.builder.saveToHistory();
        });

        propBorderRadius?.addEventListener('input', (e) => {
            const value = parseInt(e.target.value);
            widget.style = { ...widget.style, borderRadius: value };
            e.target.nextElementSibling.textContent = `${value}px`;
            this.builder.canvasManager.render();
        });

        propBorderRadius?.addEventListener('change', () => {
            this.builder.saveToHistory();
        });

        propPadding?.addEventListener('input', (e) => {
            const value = parseInt(e.target.value);
            widget.style = { ...widget.style, padding: value };
            e.target.nextElementSibling.textContent = `${value}px`;
            this.builder.canvasManager.render();
        });

        propPadding?.addEventListener('change', () => {
            this.builder.saveToHistory();
        });

        // Configurações específicas
        const configMetric = document.getElementById('configMetric');
        const configText = document.getElementById('configText');
        const configLevel = document.getElementById('configLevel');
        const configDataSource = document.getElementById('configDataSource');
        const configShowLegend = document.getElementById('configShowLegend');
        const configLimit = document.getElementById('configLimit');

        configMetric?.addEventListener('change', (e) => {
            widget.config.metric = e.target.value;
            this.builder.canvasManager.render();
            this.builder.saveToHistory();
        });

        configText?.addEventListener('input', (e) => {
            widget.config.text = e.target.value;
            this.builder.canvasManager.render();
        });

        configText?.addEventListener('blur', () => {
            this.builder.saveToHistory();
        });

        configLevel?.addEventListener('change', (e) => {
            widget.config.level = e.target.value;
            this.builder.canvasManager.render();
            this.builder.saveToHistory();
        });

        configDataSource?.addEventListener('change', (e) => {
            widget.config.dataSource = e.target.value;
            this.builder.canvasManager.render();
            this.builder.saveToHistory();
        });

        configShowLegend?.addEventListener('change', (e) => {
            widget.config.showLegend = e.target.checked;
            this.builder.canvasManager.render();
            this.builder.saveToHistory();
        });

        configLimit?.addEventListener('change', (e) => {
            widget.config.limit = parseInt(e.target.value);
            this.builder.canvasManager.render();
            this.builder.saveToHistory();
        });

        // Delete button
        const deleteBtn = document.getElementById('deleteWidgetBtn');
        deleteBtn?.addEventListener('click', () => {
            if (confirm('Remover este widget?')) {
                this.builder.removeWidget(widgetId);
            }
        });
    }
}
