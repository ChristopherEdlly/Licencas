/**
 * ValidationUtils.js
 * Módulo de validação de dados da planilha
 */

class ValidationUtils {
    constructor() {
        this.errors = [];
        this.warnings = [];
    }

    /**
     * Limpa erros e avisos acumulados
     */
    clear() {
        this.errors = [];
        this.warnings = [];
    }

    /**
     * Adiciona um erro
     * @param {string} servidor - Nome do servidor
     * @param {string} campo - Campo com erro
     * @param {string} mensagem - Mensagem de erro
     */
    addError(servidor, campo, mensagem) {
        this.errors.push({
            servidor,
            campo,
            mensagem,
            tipo: 'error'
        });
    }

    /**
     * Adiciona um aviso
     * @param {string} servidor - Nome do servidor
     * @param {string} campo - Campo com aviso
     * @param {string} mensagem - Mensagem de aviso
     */
    addWarning(servidor, campo, mensagem) {
        this.warnings.push({
            servidor,
            campo,
            mensagem,
            tipo: 'warning'
        });
    }

    /**
     * Valida nome do servidor (campo obrigatório)
     * @param {string} nome - Nome do servidor
     * @returns {boolean} True se válido
     */
    validarNomeServidor(nome) {
        if (!nome || nome.toString().trim() === '') {
            return false;
        }
        return nome.toString().trim().length >= 3;
    }

    /**
     * Valida CPF (formato básico)
     * @param {string} cpf - CPF
     * @returns {boolean} True se válido
     */
    validarCPF(cpf) {
        if (!cpf) return true; // Opcional
        
        const limpo = cpf.toString().replace(/[^\d]/g, '');
        return limpo.length === 11 || limpo === '';
    }

    /**
     * Valida sexo
     * @param {string} sexo - Sexo (MAS, FEM, M, F)
     * @returns {boolean} True se válido
     */
    validarSexo(sexo) {
        if (!sexo) return true; // Opcional
        
        const normalizado = sexo.toString().toUpperCase().trim();
        return ['MAS', 'FEM', 'M', 'F', 'MASCULINO', 'FEMININO'].includes(normalizado);
    }

    /**
     * Normaliza sexo para formato padrão
     * @param {string} sexo - Sexo
     * @returns {string} 'M' ou 'F'
     */
    normalizarSexo(sexo) {
        if (!sexo) return '';
        
        const normalizado = sexo.toString().toUpperCase().trim();
        if (['MAS', 'M', 'MASCULINO'].includes(normalizado)) return 'M';
        if (['FEM', 'F', 'FEMININO'].includes(normalizado)) return 'F';
        return '';
    }

    /**
     * Valida idade
     * @param {number} idade - Idade
     * @returns {boolean} True se válido
     */
    validarIdade(idade) {
        if (!idade && idade !== 0) return true; // Opcional
        
        const num = parseFloat(idade);
        return !isNaN(num) && num >= 18 && num <= 100;
    }

    /**
     * Valida número de meses de licença
     * @param {number} meses - Quantidade de meses
     * @returns {boolean} True se válido
     */
    validarMeses(meses) {
        if (!meses && meses !== 0) return true; // Opcional
        
        const num = parseInt(meses);
        return !isNaN(num) && num >= 0 && num <= 36; // Máximo 36 meses (12 licenças)
    }

    /**
     * Valida dados completos de um servidor
     * @param {Object} dados - Dados do servidor
     * @returns {Object} { valido: boolean, erros: Array, avisos: Array }
     */
    validarServidor(dados) {
        this.clear();
        
        const nome = dados.SERVIDOR || dados.servidor || dados.nome || '';

        // Validação obrigatória: nome
        if (!this.validarNomeServidor(nome)) {
            this.addError(nome || 'Desconhecido', 'SERVIDOR', 'Nome do servidor é obrigatório e deve ter pelo menos 3 caracteres');
        }

        // Validações opcionais
        if (dados.CPF && !this.validarCPF(dados.CPF)) {
            this.addWarning(nome, 'CPF', 'CPF em formato inválido');
        }

        if (dados.SEXO && !this.validarSexo(dados.SEXO)) {
            this.addWarning(nome, 'SEXO', 'Sexo em formato inválido (use MAS/FEM ou M/F)');
        }

        if (dados.IDADE && !this.validarIdade(dados.IDADE)) {
            this.addWarning(nome, 'IDADE', 'Idade fora do intervalo esperado (18-100 anos)');
        }

        if (dados.MESES && !this.validarMeses(dados.MESES)) {
            this.addWarning(nome, 'MESES', 'Quantidade de meses inválida (deve ser entre 0 e 36)');
        }

        return {
            valido: this.errors.length === 0,
            erros: [...this.errors],
            avisos: [...this.warnings]
        };
    }

    /**
     * Extrai e valida idade de string
     * @param {string|number} idadeStr - Idade em string ou número
     * @returns {number} Idade válida ou 0
     */
    extrairIdade(idadeStr) {
        if (!idadeStr) return 0;
        
        const cleaned = idadeStr.toString()
            .replace(/['"]/g, '')
            .replace(',', '.')
            .trim();
        
        const idade = parseFloat(cleaned);
        return isNaN(idade) ? 0 : Math.floor(idade);
    }

    /**
     * Extrai e valida número de meses
     * @param {string|number} mesesStr - Meses em string ou número
     * @returns {number} Quantidade de meses válida ou 0
     */
    extrairMeses(mesesStr) {
        if (!mesesStr) return 0;
        
        const cleaned = mesesStr.toString()
            .replace(/[^\d]/g, '')
            .trim();
        
        const meses = parseInt(cleaned);
        return isNaN(meses) ? 0 : meses;
    }

    /**
     * Verifica se um campo existe no objeto (case-insensitive)
     * @param {Object} obj - Objeto para verificar
     * @param {Array<string>} nomesPossiveis - Nomes possíveis do campo
     * @returns {string} Valor do campo ou ''
     */
    getField(obj, nomesPossiveis) {
        if (!obj) return '';
        
        const keys = Object.keys(obj);
        
        for (const nomePossivel of nomesPossiveis) {
            // Busca exata (case-insensitive)
            const keyEncontrada = keys.find(k => 
                k.toLowerCase().trim() === nomePossivel.toLowerCase().trim()
            );
            
            if (keyEncontrada && obj[keyEncontrada]) {
                return obj[keyEncontrada];
            }
            
            // Busca parcial
            const keyParcial = keys.find(k => 
                k.toLowerCase().includes(nomePossivel.toLowerCase())
            );
            
            if (keyParcial && obj[keyParcial]) {
                return obj[keyParcial];
            }
        }
        
        return '';
    }

    /**
     * Sanitiza HTML para prevenir XSS
     * @param {string} str - String para sanitizar
     * @returns {string} String sanitizada
     */
    sanitizeHTML(str) {
        if (!str) return '';
        
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    /**
     * Obtém todos os erros e avisos
     * @returns {Array} Lista de erros e avisos
     */
    getTodosProblemas() {
        return [...this.errors, ...this.warnings];
    }

    /**
     * Verifica se há erros críticos
     * @returns {boolean} True se há erros
     */
    hasErrors() {
        return this.errors.length > 0;
    }

    /**
     * Verifica se há avisos
     * @returns {boolean} True se há avisos
     */
    hasWarnings() {
        return this.warnings.length > 0;
    }
}

// Exportar para uso global
if (typeof window !== 'undefined') {
    window.ValidationUtils = ValidationUtils;
}

// Exportar para módulos ES6
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ValidationUtils;
}
