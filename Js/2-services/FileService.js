/**
 * FileService - Gerenciamento de upload/download de arquivos
 *
 * Responsabilidades:
 * - Upload de arquivos locais (Excel/CSV)
 * - Leitura de arquivos via FileReader API
 * - Validação de tipos de arquivo
 * - Conversão de formatos
 *
 * @module 2-services/FileService
 */

class FileService {
    /**
     * Tipos de arquivo suportados
     */
    static SUPPORTED_TYPES = {
        'text/csv': ['.csv'],
        'application/vnd.ms-excel': ['.xls'],
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx']
    };

    /**
     * Tamanho máximo de arquivo (5MB)
     */
    static MAX_FILE_SIZE = 5 * 1024 * 1024;

    /**
     * Valida se o arquivo é suportado
     * @param {File} file - Arquivo a validar
     * @returns {{valid: boolean, error: string|null}}
     */
    static validateFile(file) {
        if (!file) {
            return { valid: false, error: 'Nenhum arquivo selecionado' };
        }

        // Validar tamanho
        if (file.size > this.MAX_FILE_SIZE) {
            return {
                valid: false,
                error: `Arquivo muito grande (${(file.size / 1024 / 1024).toFixed(2)}MB). Máximo: 5MB`
            };
        }

        // Validar extensão
        const extension = '.' + file.name.split('.').pop().toLowerCase();
        const isValidExtension = Object.values(this.SUPPORTED_TYPES)
            .flat()
            .includes(extension);

        if (!isValidExtension) {
            return {
                valid: false,
                error: `Tipo de arquivo não suportado: ${extension}. Use .csv, .xls ou .xlsx`
            };
        }

        return { valid: true, error: null };
    }

    /**
     * Lê arquivo como texto (CSV)
     * @param {File} file - Arquivo a ler
     * @returns {Promise<string>} - Conteúdo do arquivo
     */
    static readAsText(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();

            reader.onload = (event) => {
                resolve(event.target.result);
            };

            reader.onerror = (error) => {
                reject(new Error(`Erro ao ler arquivo: ${error}`));
            };

            reader.readAsText(file, 'UTF-8');
        });
    }

    /**
     * Lê arquivo como ArrayBuffer (Excel)
     * @param {File} file - Arquivo a ler
     * @returns {Promise<ArrayBuffer>} - Conteúdo binário
     */
    static readAsArrayBuffer(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();

            reader.onload = (event) => {
                resolve(event.target.result);
            };

            reader.onerror = (error) => {
                reject(new Error(`Erro ao ler arquivo: ${error}`));
            };

            reader.readAsArrayBuffer(file);
        });
    }

    /**
     * Lê arquivo Excel e converte para CSV
     * @param {File} file - Arquivo Excel
     * @returns {Promise<string>} - Conteúdo CSV
     */
    static async readExcelAsCSV(file) {
        if (typeof XLSX === 'undefined') {
            throw new Error('Biblioteca XLSX não carregada');
        }

        const arrayBuffer = await this.readAsArrayBuffer(file);
        const workbook = XLSX.read(arrayBuffer, { type: 'array' });

        // Pegar primeira aba
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];

        // Converter para CSV
        const csv = XLSX.utils.sheet_to_csv(worksheet);

        return csv;
    }

    /**
     * Processa arquivo automaticamente (detecta tipo e converte)
     * @param {File} file - Arquivo a processar
     * @returns {Promise<{content: string, metadata: Object}>}
     */
    static async processFile(file) {
        // Validar arquivo
        const validation = this.validateFile(file);
        if (!validation.valid) {
            throw new Error(validation.error);
        }

        const extension = '.' + file.name.split('.').pop().toLowerCase();
        let content;

        // Processar baseado no tipo
        if (extension === '.csv') {
            content = await this.readAsText(file);
        } else if (['.xls', '.xlsx'].includes(extension)) {
            content = await this.readExcelAsCSV(file);
        } else {
            throw new Error(`Tipo de arquivo não suportado: ${extension}`);
        }

        // Retornar conteúdo + metadados
        return {
            content,
            metadata: {
                name: file.name,
                size: file.size,
                type: file.type,
                lastModified: file.lastModified,
                extension
            }
        };
    }

    /**
     * Cria e faz download de arquivo
     * @param {string} content - Conteúdo do arquivo
     * @param {string} filename - Nome do arquivo
     * @param {string} mimeType - Tipo MIME
     */
    static downloadFile(content, filename, mimeType = 'text/plain') {
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);

        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        link.click();

        // Limpar URL
        setTimeout(() => URL.revokeObjectURL(url), 100);
    }

    /**
     * Exporta dados como CSV
     * @param {Array<Object>} data - Dados a exportar
     * @param {string} filename - Nome do arquivo
     * @param {Array<string>} columns - Colunas a incluir
     */
    static exportAsCSV(data, filename, columns = null) {
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
                const value = row[col] ?? '';
                // Escapar vírgulas e aspas
                if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
                    return `"${value.replace(/"/g, '""')}"`;
                }
                return value;
            }).join(',');
        });

        // Combinar
        const csv = [header, ...rows].join('\n');

        // Download
        this.downloadFile(csv, filename, 'text/csv;charset=utf-8;');
    }
}

// Expor globalmente (browser)
if (typeof window !== 'undefined') {
    window.FileService = FileService;
}

// Exportar para Node.js (testes)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = FileService;
}
