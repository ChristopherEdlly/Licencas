/**
 * ExportService - Serviço de exportação de dados
 *
 * Responsabilidades:
 * - Exportar dados em PDF
 * - Exportar dados em Excel
 * - Exportar dados em CSV
 * - Exportar gráficos como imagem
 *
 * @module 2-services/ExportService
 */

class ExportService {
    /**
     * Verifica disponibilidade das bibliotecas necessárias
     */
    static checkDependencies() {
        const deps = {
            jsPDF: typeof window.jspdf !== 'undefined',
            xlsx: typeof XLSX !== 'undefined',
            html2canvas: typeof html2canvas !== 'undefined'
        };

        return deps;
    }

    /**
     * Exporta dados como CSV
     * @param {Array<Object>} data - Dados a exportar
     * @param {string} filename - Nome do arquivo
     * @param {Array<string>} columns - Colunas a incluir (opcional)
     */
    static exportAsCSV(data, filename = 'dados.csv', columns = null) {
        if (!data || data.length === 0) {
            throw new Error('Nenhum dado para exportar');
        }

        // Determinar colunas
        const cols = columns || Object.keys(data[0]);

        // Criar cabeçalho
        const header = cols.join(',');

        // Criar linhas
        const rows = data.map(row => {
            return cols.map(col => {
                let value = row[col] ?? '';

                // Formatar datas
                if (value instanceof Date) {
                    value = value.toLocaleDateString('pt-BR');
                }

                // Escapar vírgulas e aspas
                if (typeof value === 'string') {
                    if (value.includes(',') || value.includes('"') || value.includes('\n')) {
                        value = `"${value.replace(/"/g, '""')}"`;
                    }
                }

                return value;
            }).join(',');
        });

        // Combinar
        const csv = [header, ...rows].join('\n');

        // Download
        this._downloadFile(csv, filename, 'text/csv;charset=utf-8;');
    }

    /**
     * Exporta dados como Excel
     * @param {Array<Object>} data - Dados a exportar
     * @param {string} filename - Nome do arquivo
     * @param {string} sheetName - Nome da aba
     */
    static exportAsExcel(data, filename = 'dados.xlsx', sheetName = 'Dados') {
        const deps = this.checkDependencies();
        if (!deps.xlsx) {
            throw new Error('Biblioteca XLSX não carregada');
        }

        if (!data || data.length === 0) {
            throw new Error('Nenhum dado para exportar');
        }

        // Criar workbook
        const wb = XLSX.utils.book_new();

        // Converter dados para worksheet
        const ws = XLSX.utils.json_to_sheet(data);

        // Adicionar worksheet ao workbook
        XLSX.utils.book_append_sheet(wb, ws, sheetName);

        // Gerar arquivo e fazer download
        XLSX.writeFile(wb, filename);
    }

    /**
     * Exporta elemento HTML como PDF
     * @param {HTMLElement} element - Elemento a exportar
     * @param {string} filename - Nome do arquivo
     * @param {Object} options - Opções de exportação
     */
    static async exportAsPDF(element, filename = 'relatorio.pdf', options = {}) {
        const deps = this.checkDependencies();
        if (!deps.jsPDF || !deps.html2canvas) {
            throw new Error('Bibliotecas jsPDF/html2canvas não carregadas');
        }

        const defaultOptions = {
            orientation: 'portrait',
            unit: 'mm',
            format: 'a4',
            scale: 2,
            useCORS: true,
            logging: false,
            ...options
        };

        try {
            // Capturar elemento como imagem
            const canvas = await html2canvas(element, {
                scale: defaultOptions.scale,
                useCORS: defaultOptions.useCORS,
                logging: defaultOptions.logging
            });

            // Criar PDF
            const { jsPDF } = window.jspdf;
            const pdf = new jsPDF({
                orientation: defaultOptions.orientation,
                unit: defaultOptions.unit,
                format: defaultOptions.format
            });

            // Dimensões da página
            const pageWidth = pdf.internal.pageSize.getWidth();
            const pageHeight = pdf.internal.pageSize.getHeight();

            // Dimensões da imagem
            const imgWidth = pageWidth - 20; // Margem de 10mm de cada lado
            const imgHeight = (canvas.height * imgWidth) / canvas.width;

            let heightLeft = imgHeight;
            let position = 10; // Margem superior

            // Adicionar imagem ao PDF
            const imgData = canvas.toDataURL('image/png');
            pdf.addImage(imgData, 'PNG', 10, position, imgWidth, imgHeight);
            heightLeft -= (pageHeight - 20);

            // Adicionar páginas adicionais se necessário
            while (heightLeft > 0) {
                position = heightLeft - imgHeight + 10;
                pdf.addPage();
                pdf.addImage(imgData, 'PNG', 10, position, imgWidth, imgHeight);
                heightLeft -= (pageHeight - 20);
            }

            // Salvar PDF
            pdf.save(filename);

        } catch (error) {
            console.error('Erro ao exportar PDF:', error);
            throw new Error('Erro ao gerar PDF: ' + error.message);
        }
    }

    /**
     * Exporta tabela como PDF usando autoTable
     * @param {Array<Object>} data - Dados da tabela
     * @param {string} filename - Nome do arquivo
     * @param {Object} options - Opções da tabela
     */
    static exportTableAsPDF(data, filename = 'tabela.pdf', options = {}) {
        const deps = this.checkDependencies();
        if (!deps.jsPDF) {
            throw new Error('Biblioteca jsPDF não carregada');
        }

        if (!data || data.length === 0) {
            throw new Error('Nenhum dado para exportar');
        }

        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF({
            orientation: options.orientation || 'landscape',
            unit: 'mm',
            format: 'a4'
        });

        // Preparar colunas e dados
        const columns = options.columns || Object.keys(data[0]).map(key => ({
            header: key,
            dataKey: key
        }));

        const tableData = data.map(row => {
            const formatted = {};
            columns.forEach(col => {
                const value = row[col.dataKey];
                if (value instanceof Date) {
                    formatted[col.dataKey] = value.toLocaleDateString('pt-BR');
                } else {
                    formatted[col.dataKey] = value ?? '';
                }
            });
            return formatted;
        });

        // Título
        if (options.title) {
            pdf.setFontSize(16);
            pdf.text(options.title, 14, 15);
        }

        // Configurar autoTable
        pdf.autoTable({
            columns,
            body: tableData,
            startY: options.title ? 25 : 15,
            headStyles: {
                fillColor: [79, 70, 229], // Indigo
                textColor: 255,
                fontStyle: 'bold'
            },
            styles: {
                fontSize: 9,
                cellPadding: 3
            },
            alternateRowStyles: {
                fillColor: [245, 247, 250]
            },
            ...options.tableOptions
        });

        // Adicionar rodapé com data
        const pageCount = pdf.internal.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
            pdf.setPage(i);
            pdf.setFontSize(8);
            pdf.text(
                `Gerado em ${new Date().toLocaleDateString('pt-BR')} - Página ${i} de ${pageCount}`,
                14,
                pdf.internal.pageSize.height - 10
            );
        }

        // Salvar
        pdf.save(filename);
    }

    /**
     * Exporta gráfico Chart.js como imagem
     * @param {Chart} chartInstance - Instância do Chart.js
     * @param {string} filename - Nome do arquivo
     * @param {string} format - Formato da imagem (png, jpg)
     */
    static exportChartAsImage(chartInstance, filename = 'grafico.png', format = 'png') {
        if (!chartInstance || !chartInstance.canvas) {
            throw new Error('Instância de gráfico inválida');
        }

        const mimeType = format === 'jpg' ? 'image/jpeg' : 'image/png';
        const url = chartInstance.toBase64Image(mimeType);

        // Criar link e fazer download
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        link.click();
    }

    /**
     * Download de arquivo (helper privado)
     * @private
     */
    static _downloadFile(content, filename, mimeType) {
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);

        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        link.click();

        // Limpar URL
        setTimeout(() => URL.revokeObjectURL(url), 100);
    }
}

// Expor globalmente
if (typeof window !== 'undefined') {
    window.ExportService = ExportService;
}
