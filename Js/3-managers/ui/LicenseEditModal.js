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

    async open({ mode = 'edit', row = null, rowIndex = null } = {}) {
        this.mode = mode;
        this.currentRow = row;
        this.currentRowIndex = rowIndex;

        // Ensure modal exists
        if (!this.modal) this.init();

        // Load columns from DataStateManager source metadata
        const meta = this.app && this.app.dataStateManager && this.app.dataStateManager.getSourceMetadata ? this.app.dataStateManager.getSourceMetadata() : null;
        this.columns = (meta && meta.tableInfo && Array.isArray(meta.tableInfo.columns)) ? meta.tableInfo.columns.map(c => c.name) : [];

        // Render form
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
            const input = document.createElement('input');
            input.type = 'text';
            input.id = `${this.modalId}-field-${col}`;
            input.name = col;
            input.value = (row && row[col]) != null ? row[col] : '';
            wrapper.appendChild(label);
            wrapper.appendChild(input);
            form.appendChild(wrapper);
        });

        body.appendChild(form);
        this.form = form;

        // Update title
        const title = this.modal.querySelector(`#${this.modalId}-title`);
        title.textContent = mode === 'edit' ? 'Editar registro' : 'Novo registro';

        this.app.modalManager.open(this.modalId);
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
