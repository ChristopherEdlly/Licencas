/**
 * CanvasManager.js
 * Gerencia canvas, drag & drop e renderização de widgets
 * @version 6.0.0
 */

export class CanvasManager {
    constructor(builder) {
        this.builder = builder;
        this.isDragging = false;
        this.isResizing = false;
        this.draggedWidget = null;
        this.dragOffset = { x: 0, y: 0 };
    }

    init() {
        this.registerCanvasListeners();
        console.log('✅ CanvasManager iniciado');
    }

    registerCanvasListeners() {
        const canvasWidgets = this.builder.elements.canvasWidgets;
        const canvasDocument = this.builder.elements.canvasDocument;

        if (!canvasWidgets || !canvasDocument) return;

        // Click no canvas vazio = deselect
        canvasDocument.addEventListener('click', (e) => {
            if (e.target === canvasDocument || e.target === canvasWidgets) {
                this.builder.deselectAll();
            }
        });

        // Drop da sidebar
        canvasDocument.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'copy';
        });

        canvasDocument.addEventListener('drop', (e) => {
            e.preventDefault();

            try {
                const data = e.dataTransfer.getData('application/json');
                if (!data) return;

                const { widgetType } = JSON.parse(data);
                if (!widgetType) return;

                // Calcula posição relativa ao canvas
                const rect = canvasDocument.getBoundingClientRect();
                const x = (e.clientX - rect.left) / this.builder.state.zoom;
                const y = (e.clientY - rect.top) / this.builder.state.zoom;

                this.builder.addWidget(widgetType, x, y);
            } catch (error) {
                console.error('Erro no drop:', error);
            }
        });
    }

    render() {
        const container = this.builder.elements.canvasWidgets;
        if (!container) return;

        // Limpa
        container.innerHTML = '';

        // Renderiza cada widget
        this.builder.state.widgets.forEach(widget => {
            const element = this.createWidgetElement(widget);
            container.appendChild(element);
        });

        this.updateSelection();
    }

    createWidgetElement(widget) {
        const div = document.createElement('div');
        div.className = 'canvas-widget';
        div.dataset.widgetId = widget.id;

        // Posição e tamanho
        div.style.left = `${widget.position.x}px`;
        div.style.top = `${widget.position.y}px`;
        div.style.width = `${widget.size.width}px`;
        div.style.height = `${widget.size.height}px`;

        // Estilo customizado
        if (widget.style) {
            if (widget.style.backgroundColor) {
                div.style.backgroundColor = widget.style.backgroundColor;
            }
            if (widget.style.borderRadius) {
                div.style.borderRadius = `${widget.style.borderRadius}px`;
            }
            if (widget.style.padding) {
                div.style.padding = `${widget.style.padding}px`;
            }
        }

        // Conteúdo do widget
        div.innerHTML = this.renderWidgetContent(widget);

        // Listeners
        div.addEventListener('mousedown', (e) => this.handleWidgetMouseDown(e, widget, div));
        div.addEventListener('click', (e) => {
            e.stopPropagation();
            this.builder.selectWidget(widget.id);
        });

        return div;
    }

    renderWidgetContent(widget) {
        const widgetInfo = this.builder.widgetLibrary.getWidget(widget.type);
        if (!widgetInfo) return '<div>Widget desconhecido</div>';

        let content = '';

        switch (widget.type) {
            case 'stat-card':
                const value = this.getMetricValue(widget.config.metric || 'totalServidores');
                const label = this.formatMetricLabel(widget.config.metric || 'totalServidores');
                content = `
                    <div class="widget-stat-card">
                        <div class="stat-value" style="color: ${widget.style?.textColor || '#fff'}">${value}</div>
                        <div class="stat-label" style="color: ${widget.style?.textColor || '#fff'}">${label}</div>
                    </div>
                `;
                break;

            case 'text-title':
                content = `
                    <${widget.config.level || 'h2'} style="margin: 0; color: ${widget.style?.textColor || '#000'};">
                        ${widget.config.text || 'Título'}
                    </${widget.config.level || 'h2'}>
                `;
                break;

            case 'text-paragraph':
                content = `
                    <p style="margin: 0; color: ${widget.style?.textColor || '#000'};">
                        ${widget.config.text || 'Parágrafo...'}
                    </p>
                `;
                break;

            case 'chart-bar':
            case 'chart-line':
            case 'chart-pie':
            case 'chart-doughnut':
                content = `
                    <div class="widget-chart-placeholder">
                        <i class="bi ${widgetInfo.icon}" style="font-size: 48px; opacity: 0.3;"></i>
                        <p style="margin-top: 10px; font-size: 14px; opacity: 0.6;">Gráfico ${widgetInfo.name}</p>
                    </div>
                `;
                break;

            case 'table-servidores':
            case 'table-licencas':
                content = `
                    <div class="widget-table-placeholder">
                        <i class="bi bi-table" style="font-size: 48px; opacity: 0.3;"></i>
                        <p style="margin-top: 10px; font-size: 14px; opacity: 0.6;">${widgetInfo.name}</p>
                    </div>
                `;
                break;

            case 'divider':
                content = `<hr style="margin: 0; border: none; border-top: ${widget.style?.borderWidth || 1}px solid ${widget.style?.borderColor || '#ccc'};">`;
                break;

            default:
                content = `
                    <div style="text-align: center; padding: 20px;">
                        <i class="bi ${widgetInfo.icon}" style="font-size: 32px; opacity: 0.5;"></i>
                        <p style="margin-top: 8px; font-size: 12px; opacity: 0.6;">${widgetInfo.name}</p>
                    </div>
                `;
        }

        // Adiciona resize handles
        content += `
            <div class="widget-resize-handles">
                <div class="resize-handle nw"></div>
                <div class="resize-handle ne"></div>
                <div class="resize-handle sw"></div>
                <div class="resize-handle se"></div>
            </div>
        `;

        return content;
    }

    handleWidgetMouseDown(e, widget, element) {
        // Check se clicou em resize handle
        if (e.target.classList.contains('resize-handle')) {
            e.stopPropagation();
            this.startResize(e, widget, element, e.target.classList[1]);
            return;
        }

        // Senão, inicia drag
        e.stopPropagation();
        this.startDrag(e, widget, element);
    }

    startDrag(e, widget, element) {
        this.isDragging = true;
        this.draggedWidget = { widget, element };

        const rect = element.getBoundingClientRect();
        const canvasRect = this.builder.elements.canvasDocument.getBoundingClientRect();

        this.dragOffset = {
            x: (e.clientX - rect.left) / this.builder.state.zoom,
            y: (e.clientY - rect.top) / this.builder.state.zoom
        };

        element.classList.add('dragging');

        const onMouseMove = (e) => this.handleDragMove(e, canvasRect);
        const onMouseUp = () => {
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
            this.endDrag();
        };

        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
    }

    handleDragMove(e, canvasRect) {
        if (!this.isDragging || !this.draggedWidget) return;

        let x = (e.clientX - canvasRect.left) / this.builder.state.zoom - this.dragOffset.x;
        let y = (e.clientY - canvasRect.top) / this.builder.state.zoom - this.dragOffset.y;

        // Snap to grid
        if (this.builder.state.snapToGrid) {
            const gridSize = this.builder.state.gridSize;
            x = Math.round(x / gridSize) * gridSize;
            y = Math.round(y / gridSize) * gridSize;
        }

        // Limites do canvas
        x = Math.max(0, Math.min(x, this.builder.state.canvasSize.width - this.draggedWidget.widget.size.width));
        y = Math.max(0, Math.min(y, this.builder.state.canvasSize.height - this.draggedWidget.widget.size.height));

        this.draggedWidget.element.style.left = `${x}px`;
        this.draggedWidget.element.style.top = `${y}px`;

        this.draggedWidget.widget.position = { x, y };
    }

    endDrag() {
        if (this.draggedWidget) {
            this.draggedWidget.element.classList.remove('dragging');
            this.builder.saveToHistory();
            this.draggedWidget = null;
        }
        this.isDragging = false;
    }

    startResize(e, widget, element, handle) {
        this.isResizing = true;

        const startX = e.clientX;
        const startY = e.clientY;
        const startWidth = widget.size.width;
        const startHeight = widget.size.height;
        const startLeft = widget.position.x;
        const startTop = widget.position.y;

        element.classList.add('resizing');

        const onMouseMove = (e) => {
            const deltaX = (e.clientX - startX) / this.builder.state.zoom;
            const deltaY = (e.clientY - startY) / this.builder.state.zoom;

            let newWidth = startWidth;
            let newHeight = startHeight;
            let newX = startLeft;
            let newY = startTop;

            // Aplica resize baseado no handle
            if (handle.includes('e')) {
                newWidth = Math.max(100, startWidth + deltaX);
            }
            if (handle.includes('w')) {
                newWidth = Math.max(100, startWidth - deltaX);
                newX = startLeft + (startWidth - newWidth);
            }
            if (handle.includes('s')) {
                newHeight = Math.max(80, startHeight + deltaY);
            }
            if (handle.includes('n')) {
                newHeight = Math.max(80, startHeight - deltaY);
                newY = startTop + (startHeight - newHeight);
            }

            // Snap to grid
            if (this.builder.state.snapToGrid) {
                const gridSize = this.builder.state.gridSize;
                newWidth = Math.round(newWidth / gridSize) * gridSize;
                newHeight = Math.round(newHeight / gridSize) * gridSize;
                newX = Math.round(newX / gridSize) * gridSize;
                newY = Math.round(newY / gridSize) * gridSize;
            }

            widget.size = { width: newWidth, height: newHeight };
            widget.position = { x: newX, y: newY };

            element.style.width = `${newWidth}px`;
            element.style.height = `${newHeight}px`;
            element.style.left = `${newX}px`;
            element.style.top = `${newY}px`;
        };

        const onMouseUp = () => {
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
            element.classList.remove('resizing');
            this.builder.saveToHistory();
            this.builder.styleManager.renderProperties(widget.id);
            this.isResizing = false;
        };

        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
    }

    updateSelection() {
        const selectedId = this.builder.state.selectedWidgetId;

        // Remove seleção anterior
        this.builder.elements.canvasWidgets?.querySelectorAll('.canvas-widget').forEach(el => {
            el.classList.remove('selected');
        });

        // Adiciona nova seleção
        if (selectedId) {
            const selected = this.builder.elements.canvasWidgets?.querySelector(`[data-widget-id="${selectedId}"]`);
            selected?.classList.add('selected');
        }
    }

    // Utilitários
    getMetricValue(metric) {
        const servidores = this.builder.dashboard.allServidores || [];

        switch (metric) {
            case 'totalServidores':
                return servidores.length;
            case 'comLicenca':
                return servidores.filter(s => s.licencas && s.licencas.length > 0).length;
            case 'semLicenca':
                return servidores.filter(s => !s.licencas || s.licencas.length === 0).length;
            case 'urgenciasCriticas':
                return servidores.filter(s => s.urgencia === 'Crítica').length;
            default:
                return 0;
        }
    }

    formatMetricLabel(metric) {
        const labels = {
            totalServidores: 'Total de Servidores',
            comLicenca: 'Com Licença',
            semLicenca: 'Sem Licença',
            urgenciasCriticas: 'Urgências Críticas'
        };
        return labels[metric] || metric;
    }
}
