/**
 * NFPreviewModal - Modal de pré-visualização e download da NF
 *
 * Exibe preview da Notificação de Licença Prêmio e permite download em PDF
 */
class NFPreviewModal {
    constructor() {
        this.modal = null;
        this.nfGenerator = new NFGenerator();
        this.sharePointNFGenerator = null; // Inicializado sob demanda
        this.currentData = null;
    }

    /**
     * Inicializa SharePointNFGenerator se disponível
     */
    _initSharePointGenerator() {
        if (this.sharePointNFGenerator) return;

        // Verificar se SharePointNFGenerator e AuthenticationService estão disponíveis
        if (typeof SharePointNFGenerator !== 'undefined' && typeof AuthenticationService !== 'undefined') {
            try {
                this.sharePointNFGenerator = new SharePointNFGenerator(AuthenticationService);
                console.log('[NFPreviewModal] ✅ SharePointNFGenerator inicializado');
            } catch (error) {
                console.warn('[NFPreviewModal] Falha ao inicializar SharePointNFGenerator:', error);
            }
        }
    }

    /**
     * Abre o modal com os dados da NF
     * @param {Object} data - Dados do registro de licença
     */
    async show(data) {
        this.currentData = data;

        // Criar o modal se não existir
        if (!this.modal) {
            this._createModal();
        }

        // Gerar preview HTML
        const previewHTML = this.nfGenerator.generatePreviewHTML(data);

        // Atualizar conteúdo do modal
        const previewContainer = this.modal.querySelector('.nf-preview-content');
        if (previewContainer) {
            previewContainer.innerHTML = previewHTML;
        }

        // Mostrar modal
        this.modal.classList.add('active');
        document.body.style.overflow = 'hidden';

        // Focus no botão de download
        const downloadBtn = this.modal.querySelector('.nf-download-btn');
        if (downloadBtn) {
            setTimeout(() => downloadBtn.focus(), 100);
        }
    }

    /**
     * Fecha o modal
     */
    close() {
        if (this.modal) {
            this.modal.classList.remove('active');
            document.body.style.overflow = '';
        }
    }

    /**
     * Cria estrutura do modal
     */
    _createModal() {
        const modalHTML = `
            <div class="nf-preview-modal">
                <div class="nf-preview-overlay"></div>
                <div class="nf-preview-dialog">
                    <div class="nf-preview-header">
                        <h3>📄 Notificação de Licença Prêmio</h3>
                        <button class="nf-close-btn" aria-label="Fechar">
                            <i class="bi bi-x-lg"></i>
                        </button>
                    </div>

                    <div class="nf-preview-content">
                        <!-- Preview HTML será inserido aqui -->
                    </div>

                    <div class="nf-preview-footer">
                        <button class="nf-download-btn">
                            <i class="bi bi-download"></i>
                            Baixar PDF
                        </button>
                        <button class="nf-cancel-btn">
                            Fechar
                        </button>
                    </div>
                </div>
            </div>
        `;

        // Adicionar ao body
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = modalHTML;
        this.modal = tempDiv.firstElementChild;
        document.body.appendChild(this.modal);

        // Event listeners
        this._attachEventListeners();
    }

    /**
     * Adiciona event listeners ao modal
     */
    _attachEventListeners() {
        // Botão de fechar (X)
        const closeBtn = this.modal.querySelector('.nf-close-btn');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.close());
        }

        // Botão Cancelar
        const cancelBtn = this.modal.querySelector('.nf-cancel-btn');
        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => this.close());
        }

        // Botão Download
        const downloadBtn = this.modal.querySelector('.nf-download-btn');
        if (downloadBtn) {
            downloadBtn.addEventListener('click', () => this._handleDownload());
        }

        // Overlay (clicar fora fecha)
        const overlay = this.modal.querySelector('.nf-preview-overlay');
        if (overlay) {
            overlay.addEventListener('click', () => this.close());
        }

        // ESC para fechar
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.modal.classList.contains('active')) {
                this.close();
            }
        });
    }

    /**
     * Processa o download do PDF
     */
    async _handleDownload() {
        const downloadBtn = this.modal.querySelector('.nf-download-btn');
        const originalText = downloadBtn.innerHTML;

        try {
            // Mostrar loading
            downloadBtn.disabled = true;
            downloadBtn.innerHTML = '<i class="bi bi-hourglass-split"></i> Gerando PDF...';

            // Tentar usar SharePointNFGenerator primeiro (se disponível e arquivo carregado do SharePoint)
            this._initSharePointGenerator();

            let pdfBlob;
            let fileName;
            let usedSharePoint = false;

            // Debug: verificar condições para usar SharePoint
            console.log('[NFPreviewModal] 🔍 Debug:');
            console.log('  - sharePointNFGenerator:', !!this.sharePointNFGenerator);
            console.log('  - SharePointExcelService:', typeof SharePointExcelService !== 'undefined');
            console.log('  - currentFileId:', SharePointExcelService?.currentFileId);

            if (this.sharePointNFGenerator && typeof SharePointExcelService !== 'undefined' && SharePointExcelService.currentFileId) {
                try {
                    console.log('[NFPreviewModal] 🔄 Usando SharePointNFGenerator...');
                    const result = await this.sharePointNFGenerator.generatePDF(this.currentData);

                    // Verificar tipo de resposta
                    if (result.type === 'pdf-blob') {
                        console.log('[NFPreviewModal] ✅ PDF gerado via Graph API!');
                        pdfBlob = result.blob;
                        fileName = this.sharePointNFGenerator.generateFileName(this.currentData);
                        usedSharePoint = true;

                    } else if (result.type === 'sharepoint-options') {
                        console.log('[NFPreviewModal] ✅ Opções do SharePoint disponíveis!');

                        // Mostrar modal com opções
                        this._showSharePointOptions(result.options);

                        // Restaurar botão
                        downloadBtn.disabled = false;
                        downloadBtn.innerHTML = originalText;
                        return; // Não prosseguir com download automático
                    }

                } catch (spError) {
                    console.warn('[NFPreviewModal] ⚠️ Falha ao usar SharePoint, usando gerador local:', spError);
                    console.warn('[NFPreviewModal] ⚠️ Erro detalhado:', spError.stack);
                    // Fallback para gerador local
                    pdfBlob = await this.nfGenerator.generatePDF(this.currentData);
                    fileName = this.nfGenerator.generateFileName(this.currentData);
                }
            } else {
                // Usar gerador local (jsPDF)
                console.log('[NFPreviewModal] 📄 Usando gerador local (jsPDF)...');
                if (!this.sharePointNFGenerator) {
                    console.log('[NFPreviewModal] ℹ️ Motivo: SharePointNFGenerator não inicializado');
                }
                if (typeof SharePointExcelService === 'undefined') {
                    console.log('[NFPreviewModal] ℹ️ Motivo: SharePointExcelService não disponível');
                }
                if (!SharePointExcelService?.currentFileId) {
                    console.log('[NFPreviewModal] ℹ️ Motivo: Nenhum arquivo SharePoint carregado (currentFileId ausente)');
                }
                pdfBlob = await this.nfGenerator.generatePDF(this.currentData);
                fileName = this.nfGenerator.generateFileName(this.currentData);
            }

            // Trigger download (apenas se for blob local)
            if (pdfBlob) {
                const url = URL.createObjectURL(pdfBlob);
                const a = document.createElement('a');
                a.href = url;
                a.download = fileName;
                a.click();

                // Cleanup
                URL.revokeObjectURL(url);
            }

            // Feedback de sucesso
            downloadBtn.innerHTML = '<i class="bi bi-check-lg"></i> PDF Baixado!';
            downloadBtn.classList.add('success');

            // Restaurar botão após 2s
            setTimeout(() => {
                downloadBtn.disabled = false;
                downloadBtn.innerHTML = originalText;
                downloadBtn.classList.remove('success');
            }, 2000);

        } catch (error) {
            console.error('[NFPreviewModal] Erro ao gerar PDF:', error);

            // Mostrar erro
            downloadBtn.innerHTML = '<i class="bi bi-x-circle"></i> Erro ao gerar';
            downloadBtn.classList.add('error');

            // Restaurar botão após 2s
            setTimeout(() => {
                downloadBtn.disabled = false;
                downloadBtn.innerHTML = originalText;
                downloadBtn.classList.remove('error');
            }, 2000);

            // Notificar usuário
            if (window.dashboard && window.dashboard.notificationManager) {
                window.dashboard.notificationManager.show(
                    'Erro ao gerar PDF: ' + error.message,
                    'error'
                );
            }
        }
    }

    /**
     * Mostra opções de download do SharePoint
     */
    _showSharePointOptions(options) {
        // Fechar o modal atual
        this.close();

        // Criar modal com opções
        const optionsHTML = `
            <div class="sharepoint-options-modal" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.6); display: flex; align-items: center; justify-content: center; z-index: 10001;">
                <div style="background: white; border-radius: 12px; padding: 30px; max-width: 550px; width: 90%;">
                    <h3 style="margin-top: 0; margin-bottom: 15px; color: #333;">
                        <i class="bi bi-check-circle" style="color: #28a745;"></i> NF Atualizada!
                    </h3>
                    <p style="color: #666; margin-bottom: 10px; font-size: 14px;">
                        A célula E9 foi atualizada com <strong>${this.currentData.NUMERO || 'o número do processo'}</strong>.
                    </p>
                    <p style="color: #666; margin-bottom: 20px; font-size: 14px;">
                        Escolha como deseja gerar o PDF:
                    </p>

                    <div style="display: flex; flex-direction: column; gap: 12px;">
                        <!-- Badge de recomendação -->
                        <div style="background: #e7f5e9; border-left: 3px solid #28a745; padding: 10px 12px; border-radius: 6px; margin-bottom: 8px;">
                            <div style="font-size: 13px; color: #1e7e34; font-weight: 600; margin-bottom: 4px;">
                                <i class="bi bi-star-fill" style="font-size: 12px;"></i> Recomendado
                            </div>
                            <div style="font-size: 12px; color: #155724; line-height: 1.4;">
                                Após abrir o Excel Online: <strong>Arquivo → Salvar Como → Baixar uma cópia → PDF</strong>
                            </div>
                        </div>

                        <!-- Opção 1: Abrir no Excel Online -->
                        <button class="sp-option-btn" data-action="open-excel" style="
                            background: linear-gradient(135deg, #217346 0%, #2d9558 100%);
                            color: white;
                            border: none;
                            padding: 15px 20px;
                            border-radius: 8px;
                            font-size: 16px;
                            font-weight: 600;
                            cursor: pointer;
                            display: flex;
                            align-items: center;
                            gap: 10px;
                            transition: transform 0.2s;
                        ">
                            <i class="bi bi-box-arrow-up-right" style="font-size: 20px;"></i>
                            <div style="text-align: left; flex: 1;">
                                <div>Abrir no Excel Online</div>
                                <div style="font-size: 12px; opacity: 0.9; font-weight: normal;">
                                    Formatação perfeita garantida
                                </div>
                            </div>
                        </button>

                        <!-- Opção 2: Download Excel -->
                        <button class="sp-option-btn" data-action="download-excel" style="
                            background: #f0f0f0;
                            color: #333;
                            border: 2px solid #ddd;
                            padding: 15px 20px;
                            border-radius: 8px;
                            font-size: 16px;
                            font-weight: 600;
                            cursor: pointer;
                            display: flex;
                            align-items: center;
                            gap: 10px;
                            transition: all 0.2s;
                        ">
                            <i class="bi bi-download" style="font-size: 20px;"></i>
                            <div style="text-align: left; flex: 1;">
                                <div>Baixar Excel (.xlsx)</div>
                                <div style="font-size: 12px; opacity: 0.7; font-weight: normal;">
                                    Abra localmente e exporte para PDF
                                </div>
                            </div>
                        </button>
                    </div>

                    <button class="sp-cancel-btn" style="
                        background: transparent;
                        color: #666;
                        border: none;
                        padding: 12px;
                        margin-top: 15px;
                        width: 100%;
                        cursor: pointer;
                        font-size: 14px;
                    ">
                        Cancelar
                    </button>
                </div>
            </div>
        `;

        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = optionsHTML;
        const optionsModal = tempDiv.firstElementChild;
        document.body.appendChild(optionsModal);

        // Event listeners
        const openExcelBtn = optionsModal.querySelector('[data-action="open-excel"]');
        const downloadExcelBtn = optionsModal.querySelector('[data-action="download-excel"]');
        const cancelBtn = optionsModal.querySelector('.sp-cancel-btn');

        openExcelBtn.addEventListener('click', () => {
            // Abrir Excel Online em nova aba
            window.open(options.openInExcel.url, '_blank');
            optionsModal.remove();
        });

        downloadExcelBtn.addEventListener('click', async () => {
            try {
                // Download do arquivo Excel
                const response = await fetch(options.downloadExcel.url, {
                    headers: {
                        'Authorization': `Bearer ${options.downloadExcel.token}`
                    }
                });

                if (!response.ok) {
                    throw new Error('Falha ao baixar arquivo');
                }

                const blob = await response.blob();
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = options.downloadExcel.fileName;
                a.click();
                URL.revokeObjectURL(url);

                optionsModal.remove();
            } catch (error) {
                console.error('Erro ao baixar Excel:', error);
                alert('Erro ao baixar arquivo: ' + error.message);
            }
        });

        cancelBtn.addEventListener('click', () => {
            optionsModal.remove();
        });

        // Hover effects
        const buttons = optionsModal.querySelectorAll('.sp-option-btn');
        buttons.forEach(btn => {
            btn.addEventListener('mouseenter', () => {
                btn.style.transform = 'translateY(-2px)';
                btn.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
            });
            btn.addEventListener('mouseleave', () => {
                btn.style.transform = 'translateY(0)';
                btn.style.boxShadow = 'none';
            });
        });
    }

    /**
     * Destrói o modal (cleanup)
     */
    destroy() {
        if (this.modal) {
            this.modal.remove();
            this.modal = null;
        }
    }
}

// Exportar para uso global
if (typeof window !== 'undefined') {
    window.NFPreviewModal = NFPreviewModal;
}
