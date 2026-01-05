/**
 * LicenseEditModal - Modal para criar/editar linhas da tabela Excel no SharePoint
 */
class LicenseEditModal {
    constructor(app) {
        this.app = app;
        this.modalId = 'licenseEditModal';
        this.modal = null;
        this.form = null;
        this.mode = 'edit';
        this.currentRow = null;
        this.currentRowIndex = null;
        this.columns = [];

        if (typeof window !== 'undefined') window.LicenseEditModal = LicenseEditModal;
    }

    init() {
        if (!this.app || !this.app.modalManager) return;

        // Create modal DOM if not present
        const existing = document.getElementById(this.modalId);
        if (existing) {
            this.modal = existing;
            return;
        }

        const content = document.createElement('div');
        content.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3 id="${this.modalId}-title">Editar registro</h3>
                    <button class="btn-close" data-modal-close>×</button>
                </div>
                <div class="modal-body" id="${this.modalId}-body"></div>
                <div class="modal-footer">
                    <button class="btn" id="${this.modalId}-cancel">Cancelar</button>
                    <button class="btn btn-primary" id="${this.modalId}-save">Salvar</button>
                </div>
            </div>
        `;

        const modal = this.app.modalManager.createModal({ id: this.modalId, title: 'Editar registro', content: content.innerHTML, size: 'medium' });
        document.body.appendChild(modal);
        this.modal = modal;

        // Bind buttons
        const saveBtn = modal.querySelector(`#${this.modalId}-save`);
        const cancelBtn = modal.querySelector(`#${this.modalId}-cancel`);

        saveBtn.addEventListener('click', () => this._onSave());
        cancelBtn.addEventListener('click', () => this.app.modalManager.close(this.modalId));
    }

    /**
     * Renderiza modal de seleção de período
     * @private
     * @param {Object} servidor - Servidor com múltiplos períodos
     * @returns {Promise<number>} - __rowIndex do período escolhido
     */
    async _renderPeriodSelector(servidor) {
        return new Promise((resolve, reject) => {
            // Obter todos os registros com mesmo nome
            const allData = this.app?.dataStateManager?.getAllServidores() || [];
            const servidorName = servidor.servidor || servidor.SERVIDOR || servidor.nome;
            const allPeriods = allData.filter(s =>
                (s.servidor || s.SERVIDOR || s.nome) === servidorName
            );

            if (allPeriods.length <= 1) {
                // Só um período, retorna direto
                resolve(servidor.__rowIndex);
                return;
            }

            // Renderizar lista de períodos
            const bodyEl = this.modal.querySelector(`#${this.modalId}-body`);
            bodyEl.innerHTML = `
                <p style="margin-bottom: 1rem; color: var(--text-secondary);">
                    Este servidor possui <strong>${allPeriods.length} períodos</strong> cadastrados.
                    Selecione qual deseja editar:
                </p>
                <div class="period-selector" id="periodSelectorList"></div>
            `;

            const listEl = document.getElementById('periodSelectorList');

            allPeriods.forEach((period, index) => {
                const periodStart = period.AQUISITIVO_INICIO || period.aquisitivo_inicio || '?';
                const periodEnd = period.AQUISITIVO_FIM || period.aquisitivo_fim || '?';
                const gozo = period.GOZO || period.gozo || 0;
                const restando = period.RESTANDO || period.restando || 0;

                const item = document.createElement('div');
                item.className = 'period-selector-item';
                item.dataset.rowIndex = period.__rowIndex;
                item.innerHTML = `
                    <input type="radio" name="period" value="${period.__rowIndex}" id="period-${index}">
                    <label for="period-${index}" class="period-info">
                        <div class="period-info-title">
                            Período ${index + 1}: ${periodStart} a ${periodEnd}
                        </div>
                        <div class="period-info-subtitle">
                            Gozo: ${gozo} dias • Restando: ${restando} dias
                        </div>
                    </label>
                `;

                // Click no item seleciona o radio
                item.addEventListener('click', () => {
                    const radio = item.querySelector('input[type="radio"]');
                    radio.checked = true;

                    // Marcar visualmente
                    listEl.querySelectorAll('.period-selector-item').forEach(el =>
                        el.classList.remove('selected')
                    );
                    item.classList.add('selected');
                });

                listEl.appendChild(item);
            });

            // Atualizar título
            const titleEl = this.modal.querySelector(`#${this.modalId}-title`);
            titleEl.textContent = `Selecionar Período - ${servidorName}`;

            // Configurar botões
            const saveBtn = this.modal.querySelector(`#${this.modalId}-save`);
            const cancelBtn = this.modal.querySelector(`#${this.modalId}-cancel`);

            saveBtn.textContent = 'Avançar';

            const handleSave = () => {
                const selected = listEl.querySelector('input[type="radio"]:checked');
                if (!selected) {
                    alert('Por favor, selecione um período para editar.');
                    return;
                }

                cleanup();
                resolve(parseInt(selected.value));
            };

            const handleCancel = () => {
                cleanup();
                this.app.modalManager.close(this.modalId);
                reject(new Error('Cancelado pelo usuário'));
            };

            const cleanup = () => {
                saveBtn.removeEventListener('click', handleSave);
                cancelBtn.removeEventListener('click', handleCancel);
                saveBtn.textContent = 'Salvar'; // Restaurar texto original
            };

            saveBtn.addEventListener('click', handleSave);
            cancelBtn.addEventListener('click', handleCancel);
        });
    }

    /**
     * Renderiza formulário de edição
     * @private
     */
    _renderForm(row) {
        const body = this.modal.querySelector(`#${this.modalId}-body`);
        body.innerHTML = '';

        const form = document.createElement('form');
        form.id = `${this.modalId}-form`;

        this.columns.forEach(col => {
            const wrapper = document.createElement('div');
            wrapper.className = 'form-row';

            const label = document.createElement('label');
            label.textContent = col;
            label.htmlFor = `${this.modalId}-field-${col}`;

            const colLower = col.toLowerCase();
            const isNameField = colLower === 'servidor' || colLower === 'nome';

            if (isNameField && this.mode === 'create') {
                // Campo nome com autocomplete
                wrapper.classList.add('autocomplete-wrapper');

                const input = document.createElement('input');
                input.type = 'text';
                input.id = `${this.modalId}-field-${col}`;
                input.name = col;
                input.value = (row && row[col]) != null ? row[col] : '';
                input.placeholder = 'Digite o nome do servidor...';
                input.autocomplete = 'off';

                // Criar container de sugestões
                const suggestions = document.createElement('div');
                suggestions.className = 'autocomplete-suggestions';
                suggestions.id = `autocomplete-${col}`;

                // Listener de input
                input.addEventListener('input', (e) => {
                    this._handleAutocomplete(e.target.value, suggestions, col);
                });

                // Listener de seleção
                suggestions.addEventListener('click', (e) => {
                    const item = e.target.closest('.autocomplete-suggestion-item');
                    if (item) {
                        input.value = item.dataset.value;
                        suggestions.classList.remove('show');
                    }
                });

                wrapper.appendChild(label);
                wrapper.appendChild(input);
                wrapper.appendChild(suggestions);
            } else {
                // Campo normal
                const input = document.createElement('input');
                input.type = 'text';
                input.id = `${this.modalId}-field-${col}`;
                input.name = col;
                input.value = (row && row[col]) != null ? row[col] : '';

                wrapper.appendChild(label);
                wrapper.appendChild(input);
            }

            form.appendChild(wrapper);
        });

        body.appendChild(form);
        this.form = form;

        // Update title
        const title = this.modal.querySelector(`#${this.modalId}-title`);
        const servidorName = row ? (row.servidor || row.SERVIDOR || row.nome || '') : '';
        if (this.mode === 'edit' && servidorName) {
            title.textContent = `Editar registro - ${servidorName}`;
        } else {
            title.textContent = this.mode === 'edit' ? 'Editar registro' : 'Novo registro';
        }
    }

    /**
     * Lida com autocomplete de nome de servidor
     * @private
     */
    _handleAutocomplete(query, suggestionsEl, columnName) {
        if (!query || query.length < 2) {
            suggestionsEl.classList.remove('show');
            return;
        }

        const allData = this.app?.dataStateManager?.getAllServidores() || [];

        // Obter nomes únicos
        const uniqueNames = new Set();
        allData.forEach(s => {
            const name = s[columnName] || s[columnName.toLowerCase()] || s[columnName.toUpperCase()];
            if (name) uniqueNames.add(String(name));
        });

        // Filtrar por query
        const queryLower = query.toLowerCase();
        const matches = Array.from(uniqueNames).filter(name =>
            name.toLowerCase().includes(queryLower)
        ).slice(0, 10); // Máximo 10 sugestões

        if (matches.length === 0) {
            suggestionsEl.classList.remove('show');
            return;
        }

        // Renderizar sugestões
        suggestionsEl.innerHTML = matches.map(name => {
            // Destacar parte que deu match
            const regex = new RegExp(`(${query})`, 'gi');
            const highlighted = name.replace(regex, '<strong>$1</strong>');

            return `<div class="autocomplete-suggestion-item" data-value="${name}">${highlighted}</div>`;
        }).join('');

        suggestionsEl.classList.add('show');
    }

    async open({ mode = 'edit', row = null, rowIndex = null } = {}) {
        this.mode = mode;
        this.currentRow = row;

        // Ensure modal exists
        if (!this.modal) this.init();

        // Load columns from DataStateManager source metadata
        const meta = this.app && this.app.dataStateManager && this.app.dataStateManager.getSourceMetadata ? this.app.dataStateManager.getSourceMetadata() : null;
        this.columns = (meta && meta.tableInfo && Array.isArray(meta.tableInfo.columns)) ? meta.tableInfo.columns.map(c => c.name) : [];

        // Open modal first
        this.app.modalManager.open(this.modalId);

        if (mode === 'edit' && row) {
            try {
                // Se múltiplos períodos, mostrar seletor
                const selectedRowIndex = await this._renderPeriodSelector(row);

                // Buscar dados do período selecionado
                const allData = this.app?.dataStateManager?.getAllServidores() || [];
                const selectedPeriod = allData.find(s => s.__rowIndex === selectedRowIndex);

                if (!selectedPeriod) {
                    throw new Error('Período não encontrado');
                }

                this.currentRow = selectedPeriod;
                this.currentRowIndex = selectedRowIndex;

                // Renderizar formulário do período escolhido
                this._renderForm(selectedPeriod);

            } catch (error) {
                console.error('Erro ao selecionar período:', error);
                this.app.modalManager.close(this.modalId);
                return;
            }
        } else {
            // Modo create ou sem seletor
            this.currentRowIndex = rowIndex;
            this._renderForm(row);
        }
    }

    async _onSave() {
        try {
            if (!this.form) return;

            const formData = new FormData(this.form);
            const valuesObj = {};
            this.columns.forEach(col => {
                valuesObj[col] = formData.get(col);
            });

            const meta = this.app && this.app.dataStateManager && this.app.dataStateManager.getSourceMetadata ? this.app.dataStateManager.getSourceMetadata() : null;
            if (!meta || !meta.fileId || !meta.tableName) throw new Error('Fonte de dados SharePoint não configurada');

            if (this.mode === 'edit') {
                // Ensure permission
                if (typeof PermissionsService !== 'undefined' && !(await PermissionsService.canEdit(meta.fileId))) {
                    throw new Error('Usuário não tem permissão para editar este arquivo');
                }
                // Update: use updateTableRow with rowIndex
                await SharePointExcelService.updateTableRow(meta.fileId, meta.tableName, this.currentRowIndex, valuesObj);
            } else {
                // Ensure permission
                if (typeof PermissionsService !== 'undefined' && !(await PermissionsService.canEdit(meta.fileId))) {
                    throw new Error('Usuário não tem permissão para adicionar linhas neste arquivo');
                }
                // Create: build array in column order
                const rowArr = this.columns.map(c => valuesObj[c]);
                await SharePointExcelService.addTableRow(meta.fileId, meta.tableName, rowArr);
            }

            // Reload data
            const refreshed = await DataLoader.loadFromSharePointExcel(meta.fileId, meta.tableName);
            if (refreshed && refreshed.state === 'success' && refreshed.data) {
                if (this.app && this.app.dataStateManager) {
                    this.app.dataStateManager.setAllServidores(refreshed.data);
                    this.app.dataStateManager.setFilteredServidores(refreshed.data);
                }
            }

            this.app.modalManager.close(this.modalId);
            if (this.app && this.app.notificationService) this.app.notificationService.success('Registro salvo com sucesso');
        } catch (error) {
            console.error('Erro ao salvar registro:', error);
            if (this.app && this.app.notificationService) this.app.notificationService.error('Erro ao salvar: ' + (error.message || error));
            else alert('Erro ao salvar: ' + (error.message || error));
        }
    }
}

if (typeof module !== 'undefined' && module.exports) module.exports = LicenseEditModal;
