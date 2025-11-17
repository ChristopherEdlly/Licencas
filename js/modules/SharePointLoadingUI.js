/**
 * SharePointLoadingUI - Gerencia estados de loading visuais para integração SharePoint
 * Fornece feedback visual moderno durante autenticação e carregamento de dados
 */

class SharePointLoadingUI {
    constructor() {
        this.progressContainer = null;
        this.currentProgress = 0;
        this.isShowing = false;
    }

    /**
     * Mostra o overlay de loading global com mensagem customizada
     */
    showGlobalLoading(message = 'Carregando...') {
        const overlay = document.getElementById('globalLoadingOverlay');
        const loadingText = overlay?.querySelector('.loading-text');

        if (overlay) {
            if (loadingText) {
                loadingText.textContent = message;
            }
            overlay.style.display = 'flex';
            overlay.setAttribute('aria-hidden', 'false');

            // Adiciona classe para animação suave
            setTimeout(() => {
                overlay.style.opacity = '1';
            }, 10);
        }
    }

    /**
     * Esconde o overlay de loading global
     */
    hideGlobalLoading() {
        const overlay = document.getElementById('globalLoadingOverlay');

        if (overlay) {
            overlay.style.opacity = '0';

            setTimeout(() => {
                overlay.style.display = 'none';
                overlay.setAttribute('aria-hidden', 'true');
            }, 300);
        }
    }

    /**
     * Cria e mostra uma barra de progresso de upload/download
     */
    showProgressBar(options = {}) {
        const {
            title = 'Carregando arquivo...',
            initialProgress = 0
        } = options;

        // Remove barra existente se houver
        this.hideProgressBar();

        // Cria container de progresso
        this.progressContainer = document.createElement('div');
        this.progressContainer.className = 'upload-progress';
        this.progressContainer.innerHTML = `
            <div class="upload-progress-header">
                <span class="upload-progress-title">${title}</span>
                <button class="upload-progress-close" aria-label="Fechar">
                    <i class="bi bi-x"></i>
                </button>
            </div>
            <div class="upload-progress-bar">
                <div class="upload-progress-fill" style="width: ${initialProgress}%"></div>
            </div>
            <div class="upload-progress-text">${initialProgress}% concluído</div>
        `;

        // Adiciona ao body
        document.body.appendChild(this.progressContainer);
        this.isShowing = true;
        this.currentProgress = initialProgress;

        // Handler para fechar
        const closeBtn = this.progressContainer.querySelector('.upload-progress-close');
        closeBtn.addEventListener('click', () => this.hideProgressBar());

        return this;
    }

    /**
     * Atualiza o progresso da barra
     */
    updateProgress(progress, text = null) {
        if (!this.progressContainer) return this;

        this.currentProgress = Math.min(100, Math.max(0, progress));

        const fill = this.progressContainer.querySelector('.upload-progress-fill');
        const progressText = this.progressContainer.querySelector('.upload-progress-text');

        if (fill) {
            fill.style.width = `${this.currentProgress}%`;
        }

        if (progressText) {
            progressText.textContent = text || `${this.currentProgress}% concluído`;
        }

        return this;
    }

    /**
     * Esconde e remove a barra de progresso
     */
    hideProgressBar() {
        if (this.progressContainer) {
            this.progressContainer.style.animation = 'slideOutDown 0.3s ease';

            setTimeout(() => {
                if (this.progressContainer && this.progressContainer.parentNode) {
                    this.progressContainer.parentNode.removeChild(this.progressContainer);
                }
                this.progressContainer = null;
                this.isShowing = false;
                this.currentProgress = 0;
            }, 300);
        }

        return this;
    }

    /**
     * Mostra mensagem de sucesso temporária
     */
    showSuccess(message = 'Operação concluída com sucesso!', duration = 3000) {
        this.showToast(message, 'success', duration);
    }

    /**
     * Mostra mensagem de erro temporária
     */
    showError(message = 'Ocorreu um erro. Tente novamente.', duration = 5000) {
        this.showToast(message, 'error', duration);
    }

    /**
     * Mostra toast notification moderna
     */
    showToast(message, type = 'info', duration = 3000) {
        // Remove toast existente
        const existingToast = document.querySelector('.modern-toast');
        if (existingToast) {
            existingToast.remove();
        }

        // Define ícones e cores por tipo
        const icons = {
            success: 'bi-check-circle-fill',
            error: 'bi-x-circle-fill',
            warning: 'bi-exclamation-triangle-fill',
            info: 'bi-info-circle-fill'
        };

        const colors = {
            success: 'var(--success)',
            error: 'var(--danger)',
            warning: 'var(--warning)',
            info: 'var(--info)'
        };

        // Cria toast
        const toast = document.createElement('div');
        toast.className = `modern-toast modern-toast-${type}`;
        toast.innerHTML = `
            <div class="modern-toast-content">
                <i class="bi ${icons[type] || icons.info}"></i>
                <span>${message}</span>
            </div>
            <button class="modern-toast-close" aria-label="Fechar">
                <i class="bi bi-x"></i>
            </button>
        `;

        // Adiciona estilos inline para garantir visibilidade
        Object.assign(toast.style, {
            position: 'fixed',
            bottom: '2rem',
            right: '2rem',
            minWidth: '320px',
            maxWidth: '480px',
            padding: '1rem 1.25rem',
            background: 'var(--bg-primary)',
            border: `2px solid ${colors[type] || colors.info}`,
            borderRadius: 'var(--radius-lg)',
            boxShadow: 'var(--shadow-elevated)',
            zIndex: '10000',
            animation: 'slideInUp 0.3s ease',
            display: 'flex',
            alignItems: 'center',
            gap: '1rem'
        });

        const content = toast.querySelector('.modern-toast-content');
        Object.assign(content.style, {
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            flex: '1',
            color: 'var(--text-primary)',
            fontSize: '0.9375rem',
            fontWeight: '500'
        });

        const icon = content.querySelector('i');
        Object.assign(icon.style, {
            fontSize: '1.25rem',
            color: colors[type] || colors.info
        });

        const closeBtn = toast.querySelector('.modern-toast-close');
        Object.assign(closeBtn.style, {
            background: 'none',
            border: 'none',
            color: 'var(--text-tertiary)',
            cursor: 'pointer',
            padding: '0',
            fontSize: '1.125rem',
            transition: 'color 0.2s'
        });

        // Adiciona ao body
        document.body.appendChild(toast);

        // Handler para fechar
        closeBtn.addEventListener('click', () => {
            toast.style.animation = 'slideOutDown 0.3s ease';
            setTimeout(() => toast.remove(), 300);
        });

        // Auto-remove após duração
        if (duration > 0) {
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.style.animation = 'slideOutDown 0.3s ease';
                    setTimeout(() => toast.remove(), 300);
                }
            }, duration);
        }
    }

    /**
     * Mostra skeleton loading para dados do SharePoint
     */
    showSkeletonLoading(container) {
        if (!container) return;

        const skeleton = document.createElement('div');
        skeleton.className = 'sharepoint-loading-skeleton';
        skeleton.innerHTML = `
            <div class="skeleton-line"></div>
            <div class="skeleton-line medium"></div>
            <div class="skeleton-line short"></div>
            <div class="skeleton-line"></div>
            <div class="skeleton-line medium"></div>
        `;

        // Limpa container e adiciona skeleton
        container.innerHTML = '';
        container.appendChild(skeleton);
    }

    /**
     * Remove skeleton loading
     */
    hideSkeletonLoading(container) {
        if (!container) return;

        const skeleton = container.querySelector('.sharepoint-loading-skeleton');
        if (skeleton) {
            skeleton.remove();
        }
    }

    /**
     * Simula progresso automático (útil para operações sem callback de progresso)
     */
    simulateProgress(duration = 5000, callback = null) {
        if (!this.progressContainer) return;

        const startTime = Date.now();
        const startProgress = this.currentProgress;
        const targetProgress = 90; // Para em 90% até operação real completar

        const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(
                startProgress + ((targetProgress - startProgress) * elapsed / duration),
                targetProgress
            );

            this.updateProgress(Math.floor(progress));

            if (progress < targetProgress && this.isShowing) {
                requestAnimationFrame(animate);
            } else if (callback) {
                callback();
            }
        };

        requestAnimationFrame(animate);
    }

    /**
     * Workflow completo de autenticação
     */
    async authenticateWorkflow(authCallback) {
        this.showGlobalLoading('Conectando à Microsoft...');

        try {
            const result = await authCallback();

            this.hideGlobalLoading();

            if (result.success) {
                this.showSuccess('Autenticado com sucesso!');
            }

            return result;
        } catch (error) {
            this.hideGlobalLoading();
            this.showError(error.message || 'Falha na autenticação');
            throw error;
        }
    }

    /**
     * Workflow completo de carregamento de arquivo
     */
    async loadFileWorkflow(loadCallback, fileName = 'arquivo') {
        this.showProgressBar({
            title: `Carregando ${fileName}...`,
            initialProgress: 0
        });

        // Simula progresso enquanto carrega
        this.simulateProgress(4000);

        try {
            const result = await loadCallback((progress) => {
                // Callback de progresso real se disponível
                if (typeof progress === 'number') {
                    this.updateProgress(progress);
                }
            });

            // Completa progresso
            this.updateProgress(100, 'Concluído!');

            setTimeout(() => {
                this.hideProgressBar();
                this.showSuccess('Arquivo carregado com sucesso!');
            }, 500);

            return result;
        } catch (error) {
            this.hideProgressBar();
            this.showError(error.message || 'Erro ao carregar arquivo');
            throw error;
        }
    }
}

// Cria instância global
window.sharePointLoadingUI = new SharePointLoadingUI();

// Adiciona animações CSS necessárias se não existirem
if (!document.getElementById('sharepoint-loading-animations')) {
    const style = document.createElement('style');
    style.id = 'sharepoint-loading-animations';
    style.textContent = `
        @keyframes slideOutDown {
            from {
                opacity: 1;
                transform: translateY(0);
            }
            to {
                opacity: 0;
                transform: translateY(20px);
            }
        }
    `;
    document.head.appendChild(style);
}
