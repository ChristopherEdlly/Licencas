/**
 * NotificationService - Sistema de notificações toast
 *
 * Responsabilidades:
 * - Exibir notificações de sucesso, erro, aviso e info
 * - Gerenciar fila de notificações
 * - Auto-dismiss com timeout
 * - Notificações acessíveis (ARIA)
 *
 * @module 2-services/NotificationService
 */

class NotificationService {
    /**
     * Configurações padrão
     */
    static CONFIG = {
        duration: 3000, // 3 segundos
        position: 'top-right', // top-left, top-right, bottom-left, bottom-right
        maxNotifications: 5,
        animationDuration: 300
    };

    /**
     * Fila de notificações ativas
     */
    static activeNotifications = [];

    /**
     * Container de notificações (lazy init)
     */
    static container = null;

    /**
     * Inicializa container de notificações
     * @private
     */
    static _initContainer() {
        if (this.container) {
            return;
        }

        // Criar container
        this.container = document.createElement('div');
        this.container.id = 'notificationContainer';
        this.container.className = `notification-container notification-${this.CONFIG.position}`;
        this.container.setAttribute('aria-live', 'polite');
        this.container.setAttribute('aria-atomic', 'false');

        document.body.appendChild(this.container);

        // Adicionar estilos se não existirem
        this._injectStyles();
    }

    /**
     * Injeta estilos CSS para notificações
     * @private
     */
    static _injectStyles() {
        if (document.getElementById('notification-service-styles')) {
            return;
        }

        const style = document.createElement('style');
        style.id = 'notification-service-styles';
        style.textContent = `
            .notification-container {
                position: fixed;
                z-index: 10000;
                display: flex;
                flex-direction: column;
                gap: 12px;
                max-width: 400px;
            }

            .notification-container.notification-top-right {
                top: 20px;
                right: 20px;
            }

            .notification-container.notification-top-left {
                top: 20px;
                left: 20px;
            }

            .notification-container.notification-bottom-right {
                bottom: 20px;
                right: 20px;
            }

            .notification-container.notification-bottom-left {
                bottom: 20px;
                left: 20px;
            }

            .notification-toast {
                display: flex;
                align-items: start;
                gap: 12px;
                padding: 16px;
                background: white;
                border-radius: 8px;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
                animation: slideIn 0.3s ease-out;
                min-width: 300px;
                max-width: 400px;
            }

            .notification-toast.notification-exit {
                animation: slideOut 0.3s ease-out forwards;
            }

            .notification-toast-icon {
                flex-shrink: 0;
                width: 24px;
                height: 24px;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 14px;
            }

            .notification-toast-content {
                flex: 1;
            }

            .notification-toast-title {
                font-weight: 600;
                font-size: 14px;
                margin-bottom: 4px;
            }

            .notification-toast-message {
                font-size: 13px;
                color: #6b7280;
                line-height: 1.4;
            }

            .notification-toast-close {
                flex-shrink: 0;
                background: none;
                border: none;
                padding: 0;
                cursor: pointer;
                color: #9ca3af;
                font-size: 18px;
                width: 20px;
                height: 20px;
                display: flex;
                align-items: center;
                justify-content: center;
                border-radius: 4px;
                transition: all 0.2s;
            }

            .notification-toast-close:hover {
                background: #f3f4f6;
                color: #374151;
            }

            /* Variantes de cor */
            .notification-toast.notification-success .notification-toast-icon {
                background: #dcfce7;
                color: #16a34a;
            }

            .notification-toast.notification-error .notification-toast-icon {
                background: #fee2e2;
                color: #dc2626;
            }

            .notification-toast.notification-warning .notification-toast-icon {
                background: #fef3c7;
                color: #ca8a04;
            }

            .notification-toast.notification-info .notification-toast-icon {
                background: #dbeafe;
                color: #2563eb;
            }

            /* Animações */
            @keyframes slideIn {
                from {
                    transform: translateX(100%);
                    opacity: 0;
                }
                to {
                    transform: translateX(0);
                    opacity: 1;
                }
            }

            @keyframes slideOut {
                from {
                    transform: translateX(0);
                    opacity: 1;
                }
                to {
                    transform: translateX(100%);
                    opacity: 0;
                }
            }

            /* Modo escuro */
            [data-theme="dark"] .notification-toast {
                background: #1f2937;
                color: #f3f4f6;
            }

            [data-theme="dark"] .notification-toast-message {
                color: #d1d5db;
            }

            [data-theme="dark"] .notification-toast-close {
                color: #6b7280;
            }

            [data-theme="dark"] .notification-toast-close:hover {
                background: #374151;
                color: #f3f4f6;
            }
        `;

        document.head.appendChild(style);
    }

    /**
     * Mostra notificação
     * @param {string} message - Mensagem a exibir
     * @param {string} type - Tipo: success, error, warning, info
     * @param {Object} options - Opções adicionais
     */
    static show(message, type = 'info', options = {}) {
        this._initContainer();

        // Limitar número de notificações
        if (this.activeNotifications.length >= this.CONFIG.maxNotifications) {
            this._removeOldest();
        }

        const config = {
            ...this.CONFIG,
            ...options
        };

        // Criar notificação
        const notification = this._createNotification(message, type, config);

        // Adicionar ao container
        this.container.appendChild(notification.element);
        this.activeNotifications.push(notification);

        // Auto-dismiss
        if (config.duration > 0) {
            notification.timeoutId = setTimeout(() => {
                this.dismiss(notification.id);
            }, config.duration);
        }

        return notification.id;
    }

    /**
     * Atalho para notificação de sucesso
     */
    static success(message, options = {}) {
        return this.show(message, 'success', options);
    }

    /**
     * Atalho para notificação de erro
     */
    static error(message, options = {}) {
        return this.show(message, 'error', { duration: 5000, ...options });
    }

    /**
     * Atalho para notificação de aviso
     */
    static warning(message, options = {}) {
        return this.show(message, 'warning', options);
    }

    /**
     * Atalho para notificação informativa
     */
    static info(message, options = {}) {
        return this.show(message, 'info', options);
    }

    /**
     * Dispensa notificação específica
     * @param {string} id - ID da notificação
     */
    static dismiss(id) {
        const notification = this.activeNotifications.find(n => n.id === id);
        if (!notification) return;

        // Animação de saída
        notification.element.classList.add('notification-exit');

        // Remover após animação
        setTimeout(() => {
            if (notification.element.parentNode) {
                notification.element.remove();
            }

            // Limpar timeout se existir
            if (notification.timeoutId) {
                clearTimeout(notification.timeoutId);
            }

            // Remover da lista
            this.activeNotifications = this.activeNotifications.filter(n => n.id !== id);
        }, this.CONFIG.animationDuration);
    }

    /**
     * Dispensa todas as notificações
     */
    static dismissAll() {
        this.activeNotifications.forEach(notification => {
            this.dismiss(notification.id);
        });
    }

    /**
     * Cria elemento de notificação
     * @private
     */
    static _createNotification(message, type, config) {
        const id = `notification-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

        const element = document.createElement('div');
        element.className = `notification-toast notification-${type}`;
        element.setAttribute('role', 'alert');
        element.setAttribute('aria-live', type === 'error' ? 'assertive' : 'polite');

        // Ícone
        const icons = {
            success: '✓',
            error: '✕',
            warning: '⚠',
            info: 'ℹ'
        };

        // Títulos
        const titles = {
            success: 'Sucesso',
            error: 'Erro',
            warning: 'Aviso',
            info: 'Informação'
        };

        element.innerHTML = `
            <div class="notification-toast-icon">${icons[type]}</div>
            <div class="notification-toast-content">
                ${config.title ? `<div class="notification-toast-title">${config.title}</div>` : ''}
                <div class="notification-toast-message">${message}</div>
            </div>
            <button class="notification-toast-close" type="button" aria-label="Fechar notificação">
                ×
            </button>
        `;

        // Event listener para botão de fechar
        const closeBtn = element.querySelector('.notification-toast-close');
        closeBtn.addEventListener('click', () => {
            this.dismiss(id);
        });

        return {
            id,
            element,
            timeoutId: null
        };
    }

    /**
     * Remove notificação mais antiga
     * @private
     */
    static _removeOldest() {
        if (this.activeNotifications.length > 0) {
            const oldest = this.activeNotifications[0];
            this.dismiss(oldest.id);
        }
    }
}

// Expor globalmente (browser)
if (typeof window !== 'undefined') {
    window.NotificationService = NotificationService;
}

// Exportar para Node.js (testes)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = NotificationService;
}
