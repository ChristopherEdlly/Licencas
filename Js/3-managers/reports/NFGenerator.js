/**
 * NFGenerator - Gerador de Notificação de Licença Prêmio (NF) em PDF
 *
 * Gera documento PDF baseado no modelo de NF da SEFAZ/SE
 * seguindo o layout oficial da Notificação de Licença Prêmio
 */
class NFGenerator {
    constructor() {
        this.fontSize = {
            header: 14,
            title: 12,
            body: 11,
            small: 9
        };

        this.margins = {
            top: 20,
            left: 30,
            right: 30,
            bottom: 20
        };
    }

    /**
     * Gera a NF em PDF e retorna como blob
     * @param {Object} data - Dados do registro de licença
     * @returns {Promise<Blob>} - PDF gerado como blob
     */
    async generatePDF(data) {
        const { jsPDF } = window.jspdf;

        // A4: 210mm x 297mm
        const doc = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: 'a4'
        });

        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();

        let y = 40; // Começar mais abaixo para dar espaço ao cabeçalho

        // === CABEÇALHO ===
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');

        const headerText1 = 'GOVERNO DE SERGIPE';
        const headerText2 = 'SECRETARIA DE ESTADO DA FAZENDA';

        doc.text(headerText1, pageWidth / 2, y, { align: 'center' });
        y += 5;
        doc.text(headerText2, pageWidth / 2, y, { align: 'center' });
        y += 15;

        // === NÚMERO DA NF (canto superior direito) ===
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text(data.NUMERO || '', pageWidth - this.margins.right, y, { align: 'right' });
        y += 20;

        // === DADOS DO CABEÇALHO ===
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');

        // EMISSÃO (sem dois pontos duplicados)
        const emissaoFormatada = this._formatDate(data.EMISSAO);
        doc.setFont('helvetica', 'bold');
        doc.text('EMISSÃO:', this.margins.left, y);
        doc.setFont('helvetica', 'normal');
        doc.text(emissaoFormatada, this.margins.left + 25, y);
        y += 8;

        // UNIDADE e LOTAÇÃO na mesma linha
        const unidade = data.UNIDADE || 'SECRETARIA DE ESTADO DA FAZENDA';
        const lotacao = data.LOTACAO || '';

        doc.setFont('helvetica', 'bold');
        doc.text('UNIDADE:', this.margins.left, y);
        doc.setFont('helvetica', 'normal');
        doc.text(unidade, this.margins.left + 22, y);

        doc.setFont('helvetica', 'bold');
        doc.text('LOTAÇÃO:', pageWidth / 2 + 10, y);
        doc.setFont('helvetica', 'normal');
        doc.text(lotacao, pageWidth / 2 + 33, y);
        y += 8;

        // NOME DO/A SERVIDOR/A
        doc.setFont('helvetica', 'bold');
        doc.text('NOME DO/A SERVIDOR/A:', this.margins.left, y);
        doc.setFont('helvetica', 'normal');
        doc.text(data.NOME || '', this.margins.left + 55, y);
        y += 8;

        // CARGO e REF
        const cargo = data.CARGO || '';
        const ref = data.REF || '';

        doc.setFont('helvetica', 'bold');
        doc.text('CARGO:', this.margins.left, y);
        doc.setFont('helvetica', 'normal');
        doc.text(cargo, this.margins.left + 18, y);

        doc.setFont('helvetica', 'bold');
        doc.text('REF:', pageWidth / 2 + 10, y);
        doc.setFont('helvetica', 'normal');
        doc.text(ref, pageWidth / 2 + 20, y);
        y += 8;

        // CPF e RG
        const cpf = data.CPF || '';
        const rg = data.RG || '';

        doc.setFont('helvetica', 'bold');
        doc.text('CPF:', this.margins.left, y);
        doc.setFont('helvetica', 'normal');
        doc.text(cpf, this.margins.left + 12, y);

        doc.setFont('helvetica', 'bold');
        doc.text('RG:', pageWidth / 2 + 10, y);
        doc.setFont('helvetica', 'normal');
        doc.text(rg, pageWidth / 2 + 15, y);
        y += 20;

        // === CORPO DO TEXTO ===
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');

        // Linha introdutória
        const intro = 'NA CONFORMIDADE DO § 3º DO ART.96 DA LEI COMPLEMENTAR Nº 16/94, INFORMAMOS QUE';
        doc.text(intro, this.margins.left, y);
        y += 8;

        // VOSSA SENHORIA ENTRARÁ EM GOZO...
        const gozoDias = data.GOZO || '0';
        doc.text('VOSSA SENHORIA ENTRARÁ EM GOZO DE LICENÇA PRÊMIO POR', this.margins.left, y);

        // Dias em negrito
        doc.setFont('helvetica', 'bold');
        const textWidth1 = doc.getTextWidth('VOSSA SENHORIA ENTRARÁ EM GOZO DE LICENÇA PRÊMIO POR ');
        doc.text(gozoDias, this.margins.left + textWidth1, y);

        doc.setFont('helvetica', 'normal');
        const textWidth2 = doc.getTextWidth(gozoDias);
        doc.text(' DIAS', this.margins.left + textWidth1 + textWidth2, y);
        y += 8;

        // REFERENTE AO PERÍODO AQUISITIVO DE...
        const aquisitivoInicio = this._formatDate(data.AQUISITIVO_INICIO);
        const aquisitivoFim = this._formatDate(data.AQUISITIVO_FIM);

        doc.text('REFERENTE AO PERÍODO AQUISITIVO DE', this.margins.left, y);

        doc.setFont('helvetica', 'bold');
        const textWidth3 = doc.getTextWidth('REFERENTE AO PERÍODO AQUISITIVO DE ');
        doc.text(aquisitivoInicio, this.margins.left + textWidth3, y);

        doc.setFont('helvetica', 'normal');
        const textWidth4 = doc.getTextWidth(aquisitivoInicio);
        doc.text(' A ', this.margins.left + textWidth3 + textWidth4, y);

        doc.setFont('helvetica', 'bold');
        const textWidth5 = doc.getTextWidth(' A ');
        doc.text(aquisitivoFim, this.margins.left + textWidth3 + textWidth4 + textWidth5, y);
        y += 8;

        // A PARTIR DE...
        const aPartir = this._formatDate(data.A_PARTIR);
        doc.setFont('helvetica', 'normal');
        doc.text('A PARTIR DE', this.margins.left, y);

        doc.setFont('helvetica', 'bold');
        const textWidth6 = doc.getTextWidth('A PARTIR DE ');
        doc.text(aPartir, this.margins.left + textWidth6, y);

        doc.setFont('helvetica', 'normal');
        const textWidth7 = doc.getTextWidth(aPartir);
        doc.text(', RETORNANDO NO PRIMEIRO DIA ÚTIL APÓS', this.margins.left + textWidth6 + textWidth7, y);
        y += 8;

        // TÉRMINO e RESTANDO
        const termino = this._formatDate(data.TERMINO);
        const restante = data.RESTANDO || '0';

        doc.setFont('helvetica', 'bold');
        doc.text(termino, this.margins.left, y);

        doc.setFont('helvetica', 'normal');
        const textWidth8 = doc.getTextWidth(termino);
        doc.text(' RESTANDO PARA GOZO POSTERIOR ', this.margins.left + textWidth8, y);

        doc.setFont('helvetica', 'bold');
        const textWidth9 = doc.getTextWidth(' RESTANDO PARA GOZO POSTERIOR ');
        doc.text(`${restante} (DIAS)`, this.margins.left + textWidth8 + textWidth9, y);

        doc.setFont('helvetica', 'normal');
        const textWidth10 = doc.getTextWidth(`${restante} (DIAS)`);
        doc.text(' DO', this.margins.left + textWidth8 + textWidth9 + textWidth10, y);
        y += 8;

        // QUINQUÊNIO ACIMA
        doc.text('QUINQUÊNIO ACIMA.', this.margins.left, y);

        // Retornar como blob
        const pdfBlob = doc.output('blob');
        return pdfBlob;
    }

    /**
     * Gera preview HTML da NF (para visualização antes do download)
     * @param {Object} data - Dados do registro
     * @returns {string} - HTML formatado
     */
    generatePreviewHTML(data) {
        const emissao = this._formatDate(data.EMISSAO);
        const aquisitivoInicio = this._formatDate(data.AQUISITIVO_INICIO);
        const aquisitivoFim = this._formatDate(data.AQUISITIVO_FIM);
        const aPartir = this._formatDate(data.A_PARTIR);
        const termino = this._formatDate(data.TERMINO);

        return `
            <div class="nf-preview-container">
                <div class="nf-document">
                    <div class="nf-header">
                        <div class="nf-header-text">
                            <div><strong>GOVERNO DE SERGIPE</strong></div>
                            <div><strong>SECRETARIA DE ESTADO DA FAZENDA</strong></div>
                        </div>
                        <div class="nf-numero-header">
                            <strong>${data.NUMERO || ''}</strong>
                        </div>
                    </div>

                    <div class="nf-info-section">
                        <div class="nf-info-line">
                            <span class="nf-label">EMISSÃO:</span>
                            <span class="nf-value">${emissao}</span>
                        </div>

                        <div class="nf-info-line">
                            <span class="nf-label">UNIDADE:</span>
                            <span class="nf-value">${data.UNIDADE || 'SECRETARIA DE ESTADO DA FAZENDA'}</span>
                            <span class="nf-label" style="margin-left: 40px;">LOTAÇÃO:</span>
                            <span class="nf-value">${data.LOTACAO || ''}</span>
                        </div>

                        <div class="nf-info-line">
                            <span class="nf-label">NOME DO/A SERVIDOR/A:</span>
                            <span class="nf-value">${data.NOME || ''}</span>
                        </div>

                        <div class="nf-info-line">
                            <span class="nf-label">CARGO:</span>
                            <span class="nf-value">${data.CARGO || ''}</span>
                            <span class="nf-label" style="margin-left: 40px;">REF:</span>
                            <span class="nf-value">${data.REF || ''}</span>
                        </div>

                        <div class="nf-info-line">
                            <span class="nf-label">CPF:</span>
                            <span class="nf-value">${data.CPF || ''}</span>
                            <span class="nf-label" style="margin-left: 40px;">RG:</span>
                            <span class="nf-value">${data.RG || ''}</span>
                        </div>
                    </div>

                    <div class="nf-body">
                        <p>NA CONFORMIDADE DO § 3º DO ART.96 DA LEI COMPLEMENTAR Nº 16/94, INFORMAMOS QUE</p>

                        <p>VOSSA SENHORIA ENTRARÁ EM GOZO DE LICENÇA PRÊMIO POR <strong>${data.GOZO || '0'}</strong> DIAS</p>

                        <p>REFERENTE AO PERÍODO AQUISITIVO DE <strong>${aquisitivoInicio}</strong> A <strong>${aquisitivoFim}</strong></p>

                        <p>A PARTIR DE <strong>${aPartir}</strong>, RETORNANDO NO PRIMEIRO DIA ÚTIL APÓS</p>

                        <p><strong>${termino}</strong> RESTANDO PARA GOZO POSTERIOR <strong>${data.RESTANDO || '0'} (DIAS)</strong> DO</p>

                        <p>QUINQUÊNIO ACIMA.</p>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Formata data para o padrão brasileiro DD/MM/YYYY
     * @param {string|Date} date - Data a ser formatada
     * @returns {string} - Data formatada
     */
    _formatDate(date) {
        if (!date) return '';

        // Se já é uma string no formato DD/MM/YYYY, retorna como está
        if (typeof date === 'string' && date.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
            return date;
        }

        // Se é string ISO (YYYY-MM-DD)
        if (typeof date === 'string' && date.match(/^\d{4}-\d{2}-\d{2}/)) {
            const [year, month, day] = date.split('-');
            return `${day}/${month}/${year}`;
        }

        // Se é Date object
        if (date instanceof Date) {
            const day = String(date.getDate()).padStart(2, '0');
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const year = date.getFullYear();
            return `${day}/${month}/${year}`;
        }

        return String(date);
    }

    /**
     * Gera nome do arquivo PDF baseado nos dados
     * @param {Object} data - Dados do registro
     * @returns {string} - Nome do arquivo
     */
    generateFileName(data) {
        const nomeServidor = (data.NOME || 'servidor').replace(/[^a-zA-Z0-9\s]/g, '').trim().replace(/\s+/g, '_');
        const numero = (data.NUMERO || '').replace(/\//g, '-');
        return `NF-${nomeServidor}-${numero}.pdf`;
    }
}

// Exportar para uso global
if (typeof window !== 'undefined') {
    window.NFGenerator = NFGenerator;
}
