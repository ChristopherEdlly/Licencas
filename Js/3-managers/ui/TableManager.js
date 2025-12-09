/**
 * TableManager - Gerenciamento de tabelas
 *
 * Responsabilidades:
 * - Renderizar tabela de servidores
 * - Ordenação de colunas
 * - Paginação
 * - Seleção de linhas
 * - Ações em lote
 *
 * @module 3-managers/ui/TableManager
 */

class TableManager {
    /**
     * Construtor
     * @param {Object} app - Instância do App/Dashboard
     */
    constructor(app) {
        this.app = app;

        // Referências DOM
        this.tableElement = null;
        this.tableBody = null;

        // Estado da tabela
        this.sortColumn = null;
        this.sortDirection = 'asc';
        this.selectedRows = new Set();

        // Paginação
        this.currentPage = 1;
        this.rowsPerPage = 50;
        this.totalPages = 1;

        // Colunas visíveis
        this.visibleColumns = [
            'servidor',
            'cargo',
            'lotacao',
            'urgencia',
            'proximaLicenca'
        ];

        console.log('✅ TableManager inicializado');
    }

    /**
     * Inicializa o manager
     * @param {string} tableId - ID da tabela
     */
    init(tableId = 'servidoresTable') {
        this.tableElement = document.getElementById(tableId);

        if (!this.tableElement) {
            console.warn(`Tabela ${tableId} não encontrada`);
            return;
        }

        this.tableBody = this.tableElement.querySelector('tbody');

        if (!this.tableBody) {
            console.warn('tbody não encontrado na tabela');
            return;
        }

        this._setupEventListeners();

        console.log(`📊 Tabela ${tableId} inicializada`);
    }

    /**
     * Renderiza tabela com dados
     * @param {Array<Object>} data - Dados dos servidores
     */
    render(data) {
        if (!this.tableBody) {
            console.warn('Tabela não inicializada');
            return;
        }

        // Limpar tabela
        this.tableBody.innerHTML = '';

        // Se não houver dados
        if (!data || data.length === 0) {
            this._renderEmptyState();
            return;
        }

        // Aplicar ordenação
        const sortedData = this._sortData(data);

        // Calcular paginação
        this.totalPages = Math.ceil(sortedData.length / this.rowsPerPage);
        const startIndex = (this.currentPage - 1) * this.rowsPerPage;
        const endIndex = startIndex + this.rowsPerPage;
        const pageData = sortedData.slice(startIndex, endIndex);

        // Renderizar linhas
        pageData.forEach((servidor, index) => {
            const row = this._createRow(servidor, startIndex + index);
            this.tableBody.appendChild(row);
        });

        // Atualizar controles de paginação
        this._updatePaginationControls(data.length);

        console.log(`📊 Tabela renderizada: ${pageData.length} de ${data.length} registros`);
    }

    /**
     * Cria linha da tabela
     * @private
     * @param {Object} servidor - Dados do servidor
     * @param {number} index - Índice do servidor
     * @returns {HTMLElement} - Elemento tr
     */
    _createRow(servidor, index) {
        const row = document.createElement('tr');
        row.dataset.index = index;
        row.dataset.cpf = servidor.cpf || '';

        // Adicionar classe de urgência
        if (servidor.urgencia) {
            row.classList.add(`urgencia-${servidor.urgencia}`);
        }

        // Checkbox de seleção
        if (this.visibleColumns.includes('checkbox')) {
            const checkboxCell = document.createElement('td');
            checkboxCell.innerHTML = `
                <input type="checkbox"
                       class="row-checkbox"
                       data-index="${index}"
                       ${this.selectedRows.has(index) ? 'checked' : ''}>
            `;
            row.appendChild(checkboxCell);
        }

        // Células de dados
        this.visibleColumns.forEach(column => {
            if (column === 'checkbox') return;

            const cell = document.createElement('td');
            cell.innerHTML = this._formatCellValue(servidor, column);
            row.appendChild(cell);
        });

        // Célula de ações
        const actionsCell = document.createElement('td');
        actionsCell.className = 'actions-cell';
        actionsCell.innerHTML = this._createActionsButtons(servidor);
        row.appendChild(actionsCell);

        // Event listener para clique na linha
        row.addEventListener('click', (e) => {
            if (!e.target.matches('input[type="checkbox"]') &&
                !e.target.closest('.actions-cell')) {
                this._handleRowClick(servidor, row);
            }
        });

        return row;
    }

    /**
     * Formata valor da célula
     * @private
     * @param {Object} servidor - Dados do servidor
     * @param {string} column - Nome da coluna
     * @returns {string} - HTML formatado
     */
    _formatCellValue(servidor, column) {
        switch (column) {
            case 'servidor':
                return `<strong>${servidor.servidor || 'N/A'}</strong>`;

            case 'cargo':
                return servidor.cargo || 'N/A';

            case 'lotacao':
                return servidor.lotacao || 'N/A';

            case 'idade':
                return servidor.idade || 'N/A';

            case 'urgencia':
                return this._formatUrgencia(servidor.urgencia);

            case 'proximaLicenca':
                return this._formatDate(servidor.proximaLicenca);

            case 'aposentadoria':
                return this._formatDate(servidor.aposentadoria?.maiorData);

            case 'mesesLicenca':
                const total = (servidor.mesesConcedidos || 0) + (servidor.mesesAConceder || 0);
                return total > 0 ? `${total} meses` : 'N/A';

            default:
                return servidor[column] || 'N/A';
        }
    }

    /**
     * Formata urgência com badge
     * @private
     * @param {string} urgencia - Nível de urgência
     * @returns {string} - HTML do badge
     */
    _formatUrgencia(urgencia) {
        if (!urgencia) return '<span class="badge badge-secondary">N/A</span>';

        const badges = {
            'critica': '<span class="badge badge-critical">Crítica</span>',
            'alta': '<span class="badge badge-high">Alta</span>',
            'moderada': '<span class="badge badge-moderate">Moderada</span>',
            'baixa': '<span class="badge badge-low">Baixa</span>'
        };

        return badges[urgencia] || '<span class="badge badge-secondary">N/A</span>';
    }

    /**
     * Formata data
     * @private
     * @param {Date|string} date - Data
     * @returns {string} - Data formatada
     */
    _formatDate(date) {
        if (!date) return 'N/A';

        try {
            const d = date instanceof Date ? date : new Date(date);
            return d.toLocaleDateString('pt-BR');
        } catch {
            return 'N/A';
        }
    }

    /**
     * Cria botões de ações
     * @private
     * @param {Object} servidor - Dados do servidor
     * @returns {string} - HTML dos botões
     */
    _createActionsButtons(servidor) {
        return `
            <div class="action-buttons">
                <button class="btn-action btn-view"
                        title="Ver detalhes"
                        data-action="view">
                    <i class="bi bi-eye"></i>
                </button>
                <button class="btn-action btn-export"
                        title="Exportar"
                        data-action="export">
                    <i class="bi bi-download"></i>
                </button>
            </div>
        `;
    }

    /**
     * Renderiza estado vazio
     * @private
     */
    _renderEmptyState() {
        this.tableBody.innerHTML = `
            <tr class="empty-state">
                <td colspan="10">
                    <div class="empty-state-content">
                        <i class="bi bi-inbox"></i>
                        <p>Nenhum servidor encontrado</p>
                        <small>Tente ajustar os filtros ou importe um arquivo</small>
                    </div>
                </td>
            </tr>
        `;
    }

    /**
     * Ordena dados
     * @private
     * @param {Array<Object>} data - Dados a ordenar
     * @returns {Array<Object>} - Dados ordenados
     */
    _sortData(data) {
        if (!this.sortColumn) {
            return data;
        }

        return [...data].sort((a, b) => {
            let valueA = a[this.sortColumn];
            let valueB = b[this.sortColumn];

            // Tratar valores nulos
            if (valueA == null) return 1;
            if (valueB == null) return -1;

            // Comparar
            if (valueA < valueB) return this.sortDirection === 'asc' ? -1 : 1;
            if (valueA > valueB) return this.sortDirection === 'asc' ? 1 : -1;
            return 0;
        });
    }

    /**
     * Configura event listeners
     * @private
     */
    _setupEventListeners() {
        // Event delegation para ações
        if (this.tableBody) {
            this.tableBody.addEventListener('click', (e) => {
                const actionButton = e.target.closest('[data-action]');
                if (actionButton) {
                    const action = actionButton.dataset.action;
                    const row = actionButton.closest('tr');
                    const index = parseInt(row.dataset.index);
                    this._handleAction(action, index);
                }

                // Checkbox de seleção
                const checkbox = e.target.closest('.row-checkbox');
                if (checkbox) {
                    const index = parseInt(checkbox.dataset.index);
                    this._toggleRowSelection(index);
                }
            });
        }

        // Ordenação de colunas
        const headers = this.tableElement?.querySelectorAll('th[data-sortable]');
        headers?.forEach(header => {
            header.addEventListener('click', () => {
                const column = header.dataset.column;
                this._handleSort(column);
            });
        });
    }

    /**
     * Manipula clique em linha
     * @private
     * @param {Object} servidor - Dados do servidor
     * @param {HTMLElement} row - Elemento da linha
     */
    _handleRowClick(servidor, row) {
        // Remover seleção anterior
        this.tableElement?.querySelectorAll('tr.selected').forEach(r => {
            r.classList.remove('selected');
        });

        // Selecionar linha atual
        row.classList.add('selected');

        // Emitir evento
        if (this.app && this.app.onRowClick) {
            this.app.onRowClick(servidor);
        }
    }

    /**
     * Manipula ação
     * @private
     * @param {string} action - Ação (view, export, etc)
     * @param {number} index - Índice do servidor
     */
    _handleAction(action, index) {
        const servidor = this.app?.dataStateManager?.getServidorByIndex(index);

        if (!servidor) {
            console.warn('Servidor não encontrado:', index);
            return;
        }

        switch (action) {
            case 'view':
                this._viewDetails(servidor);
                break;
            case 'export':
                this._exportServidor(servidor);
                break;
            default:
                console.warn('Ação desconhecida:', action);
        }
    }

    /**
     * Ver detalhes do servidor
     * @private
     * @param {Object} servidor - Dados do servidor
     */
    _viewDetails(servidor) {
        if (this.app && this.app.showServidorDetails) {
            this.app.showServidorDetails(servidor);
        }
    }

    /**
     * Exportar servidor
     * @private
     * @param {Object} servidor - Dados do servidor
     */
    _exportServidor(servidor) {
        // Implementar exportação individual
        console.log('Exportar servidor:', servidor.servidor);
    }

    /**
     * Manipula ordenação
     * @private
     * @param {string} column - Coluna a ordenar
     */
    _handleSort(column) {
        if (this.sortColumn === column) {
            // Alternar direção
            this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
        } else {
            // Nova coluna
            this.sortColumn = column;
            this.sortDirection = 'asc';
        }

        // Re-renderizar com dados filtrados
        const data = this.app?.dataStateManager?.getFilteredServidores() || [];
        this.render(data);

        // Atualizar indicadores visuais
        this._updateSortIndicators();
    }

    /**
     * Atualiza indicadores de ordenação
     * @private
     */
    _updateSortIndicators() {
        const headers = this.tableElement?.querySelectorAll('th[data-sortable]');

        headers?.forEach(header => {
            const column = header.dataset.column;
            header.classList.remove('sort-asc', 'sort-desc');

            if (column === this.sortColumn) {
                header.classList.add(`sort-${this.sortDirection}`);
            }
        });
    }

    /**
     * Alterna seleção de linha
     * @private
     * @param {number} index - Índice da linha
     */
    _toggleRowSelection(index) {
        if (this.selectedRows.has(index)) {
            this.selectedRows.delete(index);
        } else {
            this.selectedRows.add(index);
        }

        // Emitir evento
        this._notifySelectionChanged();
    }

    /**
     * Seleciona todas as linhas
     */
    selectAll() {
        const data = this.app?.dataStateManager?.getFilteredServidores() || [];
        data.forEach((_, index) => this.selectedRows.add(index));
        this.render(data);
        this._notifySelectionChanged();
    }

    /**
     * Limpa seleção
     */
    clearSelection() {
        this.selectedRows.clear();
        const data = this.app?.dataStateManager?.getFilteredServidores() || [];
        this.render(data);
        this._notifySelectionChanged();
    }

    /**
     * Notifica mudança de seleção
     * @private
     */
    _notifySelectionChanged() {
        if (this.app && this.app.onSelectionChanged) {
            this.app.onSelectionChanged(Array.from(this.selectedRows));
        }
    }

    /**
     * Atualiza controles de paginação
     * @private
     * @param {number} totalRecords - Total de registros
     */
    _updatePaginationControls(totalRecords) {
        // Implementar controles de paginação se existirem no DOM
        const pageInfo = document.getElementById('tablePageInfo');
        if (pageInfo) {
            const start = (this.currentPage - 1) * this.rowsPerPage + 1;
            const end = Math.min(start + this.rowsPerPage - 1, totalRecords);
            pageInfo.textContent = `${start}-${end} de ${totalRecords}`;
        }
    }

    /**
     * Vai para página
     * @param {number} page - Número da página
     */
    goToPage(page) {
        if (page < 1 || page > this.totalPages) return;

        this.currentPage = page;
        const data = this.app?.dataStateManager?.getFilteredServidores() || [];
        this.render(data);
    }

    /**
     * Define colunas visíveis
     * @param {Array<string>} columns - Lista de colunas
     */
    setVisibleColumns(columns) {
        this.visibleColumns = columns;
        const data = this.app?.dataStateManager?.getFilteredServidores() || [];
        this.render(data);
    }
}

// Expor globalmente
if (typeof window !== 'undefined') {
    window.TableManager = TableManager;
}

// Exportar para Node.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TableManager;
}
