/**
 * Custom Modal System
 * Substitui alert() e confirm() do navegador com modais customizados
 */

window.customModal = {
    /**
     * Mostra um modal de confirmação
     * @param {Object} options - Configurações do modal
     * @param {string} options.title - Título do modal
     * @param {string} options.message - Mensagem do modal
     * @param {string} options.type - Tipo: 'info', 'warning', 'danger', 'success'
     * @param {string} options.confirmText - Texto do botão confirmar
     * @param {string} options.cancelText - Texto do botão cancelar
     * @returns {Promise<boolean>} - true se confirmado, false se cancelado
     */
    confirm: function(options) {
        return new Promise((resolve) => {
            const {
                title = 'Confirmação',
                message = 'Tem certeza?',
                type = 'warning',
                confirmText = 'Confirmar',
                cancelText = 'Cancelar'
            } = typeof options === 'string' ? { message: options } : options;

            const overlay = document.getElementById('customModalOverlay');
            const modal = document.getElementById('customModal');
            const titleEl = document.getElementById('customModalTitle');
            const messageEl = document.getElementById('customModalMessage');
            const confirmBtn = document.getElementById('customModalConfirm');
            const cancelBtn = document.getElementById('customModalCancel');
            const iconEl = modal.querySelector('.custom-modal-icon');

            // Configurar conteúdo
            titleEl.textContent = title;
            messageEl.textContent = message;
            confirmBtn.querySelector('span').textContent = confirmText;
            cancelBtn.querySelector('span').textContent = cancelText;

            // Configurar ícone e estilo baseado no tipo
            iconEl.className = 'custom-modal-icon bi';
            confirmBtn.className = 'custom-modal-btn custom-modal-btn-primary';

            switch(type) {
                case 'warning':
                    iconEl.classList.add('bi-exclamation-triangle', 'warning');
                    break;
                case 'danger':
                    iconEl.classList.add('bi-x-octagon', 'danger');
                    confirmBtn.classList.add('danger');
                    break;
                case 'success':
                    iconEl.classList.add('bi-check-circle', 'success');
                    break;
                default:
                    iconEl.classList.add('bi-question-circle');
            }

            // Mostrar modal
            overlay.style.display = 'flex';

            // Focus no botão cancelar por padrão
            setTimeout(() => cancelBtn.focus(), 100);

            // Handlers
            const handleConfirm = () => {
                cleanup();
                resolve(true);
            };

            const handleCancel = () => {
                cleanup();
                resolve(false);
            };

            const handleEscape = (e) => {
                if (e.key === 'Escape') {
                    handleCancel();
                }
            };

            const cleanup = () => {
                overlay.style.display = 'none';
                confirmBtn.removeEventListener('click', handleConfirm);
                cancelBtn.removeEventListener('click', handleCancel);
                overlay.removeEventListener('click', handleOverlayClick);
                document.removeEventListener('keydown', handleEscape);
            };

            const handleOverlayClick = (e) => {
                if (e.target === overlay) {
                    handleCancel();
                }
            };

            // Event listeners
            confirmBtn.addEventListener('click', handleConfirm);
            cancelBtn.addEventListener('click', handleCancel);
            overlay.addEventListener('click', handleOverlayClick);
            document.addEventListener('keydown', handleEscape);
        });
    },

    /**
     * Mostra um alert customizado (apenas botão OK)
     * @param {Object} options - Configurações do modal
     * @param {string} options.title - Título do modal
     * @param {string} options.message - Mensagem do modal
     * @param {string} options.type - Tipo: 'info', 'warning', 'danger', 'success'
     * @returns {Promise<void>}
     */
    alert: function(options) {
        return new Promise((resolve) => {
            const {
                title = 'Aviso',
                message = '',
                type = 'info'
            } = typeof options === 'string' ? { message: options } : options;

            const overlay = document.getElementById('customModalOverlay');
            const modal = document.getElementById('customModal');
            const titleEl = document.getElementById('customModalTitle');
            const messageEl = document.getElementById('customModalMessage');
            const confirmBtn = document.getElementById('customModalConfirm');
            const cancelBtn = document.getElementById('customModalCancel');
            const iconEl = modal.querySelector('.custom-modal-icon');

            // Configurar conteúdo
            titleEl.textContent = title;
            messageEl.textContent = message;
            confirmBtn.querySelector('span').textContent = 'OK';

            // Esconder botão cancelar
            cancelBtn.style.display = 'none';

            // Configurar ícone baseado no tipo
            iconEl.className = 'custom-modal-icon bi';
            confirmBtn.className = 'custom-modal-btn custom-modal-btn-primary';

            switch(type) {
                case 'warning':
                    iconEl.classList.add('bi-exclamation-triangle', 'warning');
                    break;
                case 'danger':
                    iconEl.classList.add('bi-x-octagon', 'danger');
                    confirmBtn.classList.add('danger');
                    break;
                case 'success':
                    iconEl.classList.add('bi-check-circle', 'success');
                    break;
                default:
                    iconEl.classList.add('bi-info-circle');
            }

            // Mostrar modal
            overlay.style.display = 'flex';

            // Focus no botão OK
            setTimeout(() => confirmBtn.focus(), 100);

            // Handlers
            const handleOk = () => {
                cleanup();
                resolve();
            };

            const handleEscape = (e) => {
                if (e.key === 'Escape') {
                    handleOk();
                }
            };

            const cleanup = () => {
                overlay.style.display = 'none';
                cancelBtn.style.display = 'flex'; // Restaurar para próxima vez
                confirmBtn.removeEventListener('click', handleOk);
                overlay.removeEventListener('click', handleOverlayClick);
                document.removeEventListener('keydown', handleEscape);
            };

            const handleOverlayClick = (e) => {
                if (e.target === overlay) {
                    handleOk();
                }
            };

            // Event listeners
            confirmBtn.addEventListener('click', handleOk);
            overlay.addEventListener('click', handleOverlayClick);
            document.addEventListener('keydown', handleEscape);
        });
    }
};
