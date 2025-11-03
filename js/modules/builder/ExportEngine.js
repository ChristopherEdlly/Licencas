/**
 * ExportEngine.js
 *
 * Sistema de exportação de relatórios
 * Suporta: PDF, Excel, HTML, Imagem
 *
 * @version 5.0.0
 */

export class ExportEngine {
    constructor(builder) {
        this.builder = builder;
    }

    /**
     * Exporta relatório no formato especificado
     */
    async export(format, options = {}) {
        console.log(`📤 Exportando relatório em formato ${format}...`);

        try {
            switch (format) {
                case 'pdf':
                    await this.exportToPDF(options);
                    break;
                case 'excel':
                    await this.exportToExcel(options);
                    break;
                case 'html':
                    await this.exportToHTML(options);
                    break;
                case 'image':
                    await this.exportToImage(options);
                    break;
                default:
                    throw new Error(`Formato desconhecido: ${format}`);
            }

            console.log('✅ Exportação concluída');

            // Notifica sucesso
            if (this.builder.dashboard.notificationManager) {
                this.builder.dashboard.notificationManager.showToast({
                    title: 'Exportação Concluída',
                    message: `Relatório exportado em ${format.toUpperCase()}`,
                    priority: 'success',
                    icon: 'bi-check-circle'
                });
            }

        } catch (error) {
            console.error('❌ Erro na exportação:', error);

            if (this.builder.dashboard.notificationManager) {
                this.builder.dashboard.notificationManager.showToast({
                    title: 'Erro na Exportação',
                    message: error.message,
                    priority: 'high',
                    icon: 'bi-exclamation-triangle'
                });
            }

            throw error;
        }
    }

    /**
     * Exporta para PDF
     */
    async exportToPDF(options) {
        // Verifica se jsPDF está disponível
        if (typeof window.jspdf === 'undefined' && typeof jsPDF === 'undefined') {
            // Fallback: usa print do browser
            console.warn('jsPDF não disponível, usando print do browser');
            window.print();
            return;
        }

        const previewContent = this.builder.elements.previewContent;
        if (!previewContent) {
            throw new Error('Preview não encontrado');
        }

        // Aguarda html2canvas carregar se necessário
        await this.ensureLibrary('html2canvas');

        try {
            // Captura preview como canvas
            const canvas = await html2canvas(previewContent, {
                scale: 2,
                logging: false,
                useCORS: true
            });

            // Cria PDF
            const { jsPDF } = window.jspdf || window;
            const pdf = new jsPDF({
                orientation: 'portrait',
                unit: 'mm',
                format: 'a4'
            });

            const imgWidth = 210; // A4 width in mm
            const imgHeight = (canvas.height * imgWidth) / canvas.width;
            const imgData = canvas.toDataURL('image/png');

            pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);

            // Download
            const filename = this.sanitizeFilename(`${options.title || 'relatorio'}.pdf`);
            pdf.save(filename);

        } catch (error) {
            console.error('Erro ao gerar PDF:', error);
            // Fallback para print
            window.print();
        }
    }

    /**
     * Exporta para Excel
     */
    async exportToExcel(options) {
        // Verifica se XLSX está disponível
        if (typeof XLSX === 'undefined') {
            throw new Error('Biblioteca XLSX não carregada');
        }

        const workbook = XLSX.utils.book_new();
        const widgets = this.builder.state.widgets;

        // Cria uma aba para cada tabela encontrada
        let sheetIndex = 1;

        widgets.forEach(widget => {
            if (widget.type.startsWith('table-')) {
                const data = this.extractTableData(widget);
                if (data && data.length > 0) {
                    const worksheet = XLSX.utils.json_to_sheet(data);
                    const sheetName = `Tabela_${sheetIndex}`;
                    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
                    sheetIndex++;
                }
            }
        });

        // Se não há tabelas, cria uma aba com resumo
        if (sheetIndex === 1) {
            const summary = this.createSummarySheet();
            const worksheet = XLSX.utils.json_to_sheet(summary);
            XLSX.utils.book_append_sheet(workbook, worksheet, 'Resumo');
        }

        // Download
        const filename = this.sanitizeFilename(`${options.title || 'relatorio'}.xlsx`);
        XLSX.writeFile(workbook, filename);
    }

    /**
     * Exporta para HTML standalone
     */
    async exportToHTML(options) {
        const previewContent = this.builder.elements.previewContent;
        if (!previewContent) {
            throw new Error('Preview não encontrado');
        }

        // Gera HTML completo standalone
        const html = this.generateStandaloneHTML(previewContent.innerHTML, options);

        // Cria blob e download
        const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = this.sanitizeFilename(`${options.title || 'relatorio'}.html`);
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);

        URL.revokeObjectURL(url);
    }

    /**
     * Exporta como imagem PNG
     */
    async exportToImage(options) {
        await this.ensureLibrary('html2canvas');

        const previewContent = this.builder.elements.previewContent;
        if (!previewContent) {
            throw new Error('Preview não encontrado');
        }

        try {
            const canvas = await html2canvas(previewContent, {
                scale: 2,
                logging: false,
                useCORS: true,
                backgroundColor: '#ffffff'
            });

            // Converte para blob
            canvas.toBlob((blob) => {
                const url = URL.createObjectURL(blob);

                const a = document.createElement('a');
                a.href = url;
                a.download = this.sanitizeFilename(`${options.title || 'relatorio'}.png`);
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);

                URL.revokeObjectURL(url);
            }, 'image/png', 1.0);

        } catch (error) {
            console.error('Erro ao capturar imagem:', error);
            throw error;
        }
    }

    /**
     * Extrai dados de uma tabela
     */
    extractTableData(widget) {
        const servidores = this.builder.dashboard.allServidores || [];

        switch (widget.type) {
            case 'table-servidores': {
                const columns = widget.config.columns || ['nome', 'cargo', 'lotacao', 'urgencia'];
                const limit = widget.config.limit || 10;

                return servidores.slice(0, limit).map(s => {
                    const row = {};
                    columns.forEach(col => {
                        row[col] = s[col] || '-';
                    });
                    return row;
                });
            }

            case 'table-licencas': {
                const licencas = [];
                servidores.forEach(servidor => {
                    if (servidor.licencas && servidor.licencas.length > 0) {
                        servidor.licencas.forEach(licenca => {
                            licencas.push({
                                servidor: servidor.nome,
                                dataInicio: licenca.dataInicio ? new Date(licenca.dataInicio).toLocaleDateString('pt-BR') : '-',
                                dias: licenca.dias || '-',
                                periodo: licenca.periodo || '-'
                            });
                        });
                    }
                });

                return licencas.slice(0, widget.config.limit || 15);
            }

            case 'table-summary': {
                const groupBy = widget.config.groupBy || 'cargo';
                const groups = {};

                servidores.forEach(servidor => {
                    const key = servidor[groupBy] || 'Não informado';
                    if (!groups[key]) {
                        groups[key] = {
                            [groupBy]: key,
                            total: 0,
                            comLicenca: 0,
                            semLicenca: 0,
                            urgenciasCriticas: 0
                        };
                    }

                    groups[key].total++;

                    if (servidor.licencas && servidor.licencas.length > 0) {
                        groups[key].comLicenca++;
                    } else {
                        groups[key].semLicenca++;
                    }

                    if (servidor.urgencia === 'Crítica') {
                        groups[key].urgenciasCriticas++;
                    }
                });

                return Object.values(groups);
            }

            default:
                return [];
        }
    }

    /**
     * Cria aba de resumo para Excel
     */
    createSummarySheet() {
        const servidores = this.builder.dashboard.allServidores || [];

        return [{
            'Métrica': 'Total de Servidores',
            'Valor': servidores.length
        }, {
            'Métrica': 'Com Licença Agendada',
            'Valor': servidores.filter(s => s.licencas && s.licencas.length > 0).length
        }, {
            'Métrica': 'Sem Licença Agendada',
            'Valor': servidores.filter(s => !s.licencas || s.licencas.length === 0).length
        }, {
            'Métrica': 'Urgências Críticas',
            'Valor': servidores.filter(s => s.urgencia === 'Crítica').length
        }];
    }

    /**
     * Gera HTML standalone completo
     */
    generateStandaloneHTML(content, options) {
        return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${options.title || 'Relatório'}</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.10.0/font/bootstrap-icons.css" rel="stylesheet">
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            line-height: 1.6;
            color: #333;
            background: #f8f9fa;
            padding: 20px;
        }

        .report-document {
            max-width: 1200px;
            margin: 0 auto;
            background: white;
            padding: 40px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            border-radius: 8px;
        }

        .report-header-section {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 30px;
            padding-bottom: 20px;
            border-bottom: 2px solid #e9ecef;
        }

        .report-title-section h1 {
            font-size: 28px;
            color: #212529;
            margin-bottom: 10px;
        }

        .report-date {
            color: #6c757d;
            font-size: 14px;
        }

        .widget-section {
            margin-bottom: 30px;
        }

        table.report-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 15px;
        }

        table.report-table th,
        table.report-table td {
            padding: 12px;
            text-align: left;
            border-bottom: 1px solid #dee2e6;
        }

        table.report-table th {
            background: #f8f9fa;
            font-weight: 600;
            color: #495057;
        }

        table.report-table tbody tr:hover {
            background: #f8f9fa;
        }

        .stat-card-widget {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px;
            border-radius: 10px;
            text-align: center;
        }

        .stat-value {
            font-size: 48px;
            font-weight: 700;
            margin-bottom: 10px;
        }

        .stat-label {
            font-size: 16px;
            opacity: 0.9;
        }

        .badge {
            display: inline-block;
            padding: 4px 10px;
            border-radius: 4px;
            font-size: 12px;
            font-weight: 600;
        }

        .bg-danger { background: #dc3545; color: white; }
        .bg-warning { background: #ffc107; color: #212529; }
        .bg-info { background: #0dcaf0; color: #212529; }
        .bg-success { background: #198754; color: white; }

        .report-footer-section {
            margin-top: 40px;
            padding-top: 20px;
            border-top: 2px solid #e9ecef;
            text-align: center;
            color: #6c757d;
            font-size: 12px;
        }

        @media print {
            body {
                background: white;
                padding: 0;
            }

            .report-document {
                box-shadow: none;
                padding: 0;
            }
        }
    </style>
</head>
<body>
    ${content}
</body>
</html>`;
    }

    /**
     * Garante que biblioteca externa está carregada
     */
    async ensureLibrary(libName) {
        if (libName === 'html2canvas') {
            if (typeof html2canvas !== 'undefined') {
                return Promise.resolve();
            }

            return new Promise((resolve, reject) => {
                const script = document.createElement('script');
                script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
                script.onload = () => resolve();
                script.onerror = () => reject(new Error('Falha ao carregar html2canvas'));
                document.head.appendChild(script);
            });
        }

        if (libName === 'jspdf') {
            if (typeof window.jspdf !== 'undefined' || typeof jsPDF !== 'undefined') {
                return Promise.resolve();
            }

            return new Promise((resolve, reject) => {
                const script = document.createElement('script');
                script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
                script.onload = () => resolve();
                script.onerror = () => reject(new Error('Falha ao carregar jsPDF'));
                document.head.appendChild(script);
            });
        }

        return Promise.resolve();
    }

    /**
     * Sanitiza nome de arquivo
     */
    sanitizeFilename(filename) {
        return filename
            .replace(/[^a-z0-9_\-\.]/gi, '_')
            .replace(/_{2,}/g, '_')
            .toLowerCase();
    }
}
