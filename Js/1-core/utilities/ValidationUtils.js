/**
 * ValidationUtils - Utilitários de Validação
 * 
 * Fornece funções para validar diferentes tipos de dados:
 * - CPF
 * - Datas
 * - Períodos de licença
 * - Campos obrigatórios
 * - Formatos de texto
 */

const ValidationUtils = (function() {
    'use strict';

    // ============================================================
    // VALIDAÇÃO DE CPF
    // ============================================================

    /**
     * Valida um CPF brasileiro
     * @param {string} cpf - CPF para validar (com ou sem formatação)
     * @returns {boolean} true se o CPF é válido
     */
    function isValidCPF(cpf) {
        if (!cpf || typeof cpf !== 'string') return false;

        // Remove formatação
        cpf = cpf.replace(/[^\d]/g, '');

        // Verifica tamanho
        if (cpf.length !== 11) return false;

        // Verifica CPFs conhecidos inválidos (todos dígitos iguais)
        if (/^(\d)\1{10}$/.test(cpf)) return false;

        // Valida primeiro dígito verificador
        let soma = 0;
        for (let i = 0; i < 9; i++) {
            soma += parseInt(cpf.charAt(i)) * (10 - i);
        }
        let resto = 11 - (soma % 11);
        let digito1 = resto >= 10 ? 0 : resto;

        if (digito1 !== parseInt(cpf.charAt(9))) return false;

        // Valida segundo dígito verificador
        soma = 0;
        for (let i = 0; i < 10; i++) {
            soma += parseInt(cpf.charAt(i)) * (11 - i);
        }
        resto = 11 - (soma % 11);
        let digito2 = resto >= 10 ? 0 : resto;

        if (digito2 !== parseInt(cpf.charAt(10))) return false;

        return true;
    }

    // ============================================================
    // VALIDAÇÃO DE DATAS
    // ============================================================

    /**
     * Verifica se uma data é válida
     * @param {Date|string|null} date - Data para validar
     * @returns {boolean} true se a data é válida
     */
    function isValidDate(date) {
        if (!date) return false;
        
        if (date instanceof Date) {
            return !isNaN(date.getTime());
        }

        if (typeof date === 'string') {
            const parsed = new Date(date);
            return !isNaN(parsed.getTime());
        }

        return false;
    }

    /**
     * Verifica se uma data está no futuro
     * @param {Date} date - Data para verificar
     * @returns {boolean} true se a data é futura
     */
    function isFutureDate(date) {
        if (!isValidDate(date)) return false;
        const now = new Date();
        now.setHours(0, 0, 0, 0);
        const checkDate = new Date(date);
        checkDate.setHours(0, 0, 0, 0);
        return checkDate > now;
    }

    /**
     * Verifica se uma data está no passado
     * @param {Date} date - Data para verificar
     * @returns {boolean} true se a data é passada
     */
    function isPastDate(date) {
        if (!isValidDate(date)) return false;
        const now = new Date();
        now.setHours(0, 0, 0, 0);
        const checkDate = new Date(date);
        checkDate.setHours(0, 0, 0, 0);
        return checkDate < now;
    }

    /**
     * Verifica se uma data está dentro de um intervalo
     * @param {Date} date - Data para verificar
     * @param {Date} startDate - Data inicial do intervalo
     * @param {Date} endDate - Data final do intervalo
     * @returns {boolean} true se a data está no intervalo
     */
    function isDateInRange(date, startDate, endDate) {
        if (!isValidDate(date) || !isValidDate(startDate) || !isValidDate(endDate)) {
            return false;
        }

        const check = new Date(date);
        const start = new Date(startDate);
        const end = new Date(endDate);

        check.setHours(0, 0, 0, 0);
        start.setHours(0, 0, 0, 0);
        end.setHours(0, 0, 0, 0);

        return check >= start && check <= end;
    }

    /**
     * Verifica se startDate é anterior a endDate
     * @param {Date} startDate - Data inicial
     * @param {Date} endDate - Data final
     * @returns {boolean} true se startDate < endDate
     */
    function isValidDateRange(startDate, endDate) {
        if (!isValidDate(startDate) || !isValidDate(endDate)) {
            return false;
        }

        const start = new Date(startDate);
        const end = new Date(endDate);
        start.setHours(0, 0, 0, 0);
        end.setHours(0, 0, 0, 0);

        return start <= end;
    }

    // ============================================================
    // VALIDAÇÃO DE PERÍODOS DE LICENÇA
    // ============================================================

    /**
     * Valida período de licença (formato: "jan/2025 a dez/2025")
     * @param {string} periodo - Período para validar
     * @returns {boolean} true se o formato é válido
     */
    function isValidLicencaPeriodo(periodo) {
        if (!periodo || typeof periodo !== 'string') return false;

        // Regex para validar formato "mes/ano a mes/ano" ou "mes/ano"
        const regex = /^(jan|fev|mar|abr|mai|jun|jul|ago|set|out|nov|dez)\/\d{4}(\s+a\s+(jan|fev|mar|abr|mai|jun|jul|ago|set|out|nov|dez)\/\d{4})?$/i;
        
        return regex.test(periodo.trim());
    }

    /**
     * Valida dias de licença (deve ser número positivo)
     * @param {number|string} dias - Dias para validar
     * @returns {boolean} true se é um número válido de dias
     */
    function isValidDiasLicenca(dias) {
        if (dias === null || dias === undefined) return false;
        
        const num = typeof dias === 'string' ? parseFloat(dias) : dias;
        
        return !isNaN(num) && num >= 0 && num <= 9999;
    }

    // ============================================================
    // VALIDAÇÃO DE CAMPOS OBRIGATÓRIOS
    // ============================================================

    /**
     * Verifica se um campo não está vazio
     * @param {any} value - Valor para verificar
     * @returns {boolean} true se o valor não está vazio
     */
    function isRequired(value) {
        if (value === null || value === undefined) return false;
        
        if (typeof value === 'string') {
            return value.trim().length > 0;
        }

        if (Array.isArray(value)) {
            return value.length > 0;
        }

        if (typeof value === 'object') {
            return Object.keys(value).length > 0;
        }

        return true;
    }

    /**
     * Valida múltiplos campos obrigatórios
     * @param {Object} obj - Objeto com os campos
     * @param {Array<string>} requiredFields - Array com nomes dos campos obrigatórios
     * @returns {Object} { valid: boolean, missing: Array<string> }
     */
    function validateRequiredFields(obj, requiredFields) {
        if (!obj || typeof obj !== 'object') {
            return { valid: false, missing: requiredFields };
        }

        const missing = [];

        for (const field of requiredFields) {
            if (!isRequired(obj[field])) {
                missing.push(field);
            }
        }

        return {
            valid: missing.length === 0,
            missing: missing
        };
    }

    // ============================================================
    // VALIDAÇÃO DE FORMATOS
    // ============================================================

    /**
     * Valida email
     * @param {string} email - Email para validar
     * @returns {boolean} true se o email é válido
     */
    function isValidEmail(email) {
        if (!email || typeof email !== 'string') return false;
        
        const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return regex.test(email);
    }

    /**
     * Valida telefone brasileiro (com ou sem formatação)
     * @param {string} phone - Telefone para validar
     * @returns {boolean} true se o telefone é válido
     */
    function isValidPhone(phone) {
        if (!phone || typeof phone !== 'string') return false;
        
        // Remove formatação
        const digitsOnly = phone.replace(/[^\d]/g, '');
        
        // Aceita 10 dígitos (fixo) ou 11 dígitos (celular)
        return digitsOnly.length === 10 || digitsOnly.length === 11;
    }

    /**
     * Valida matrícula (apenas números, 1-10 dígitos)
     * @param {string} matricula - Matrícula para validar
     * @returns {boolean} true se a matrícula é válida
     */
    function isValidMatricula(matricula) {
        if (!matricula) return false;
        
        const str = String(matricula).trim();
        const regex = /^\d{1,10}$/;
        
        return regex.test(str);
    }

    /**
     * Valida nome (pelo menos 2 caracteres, apenas letras e espaços)
     * @param {string} name - Nome para validar
     * @returns {boolean} true se o nome é válido
     */
    function isValidName(name) {
        if (!name || typeof name !== 'string') return false;
        
        const trimmed = name.trim();
        
        // Pelo menos 2 caracteres
        if (trimmed.length < 2) return false;
        
        // Apenas letras, espaços e acentos
        const regex = /^[a-záàâãéèêíïóôõöúçñA-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇÑ\s]+$/;
        
        return regex.test(trimmed);
    }

    // ============================================================
    // VALIDAÇÃO DE NÚMEROS
    // ============================================================

    /**
     * Verifica se um valor é um número válido
     * @param {any} value - Valor para verificar
     * @returns {boolean} true se é um número válido
     */
    function isNumeric(value) {
        if (value === null || value === undefined || value === '') return false;
        return !isNaN(parseFloat(value)) && isFinite(value);
    }

    /**
     * Alias para isNumeric (compatibilidade)
     * @param {any} value - Valor para verificar
     * @returns {boolean} true se é um número válido
     */
    function isValidNumber(value) {
        return isNumeric(value);
    }

    /**
     * Verifica se um número está dentro de um intervalo
     * @param {number} value - Valor para verificar
     * @param {number} min - Valor mínimo
     * @param {number} max - Valor máximo
     * @returns {boolean} true se está no intervalo
     */
    function isInRange(value, min, max) {
        if (!isNumeric(value)) return false;
        const num = parseFloat(value);
        return num >= min && num <= max;
    }

    /**
     * Verifica se é um número inteiro
     * @param {any} value - Valor para verificar
     * @returns {boolean} true se é inteiro
     */
    function isInteger(value) {
        if (!isNumeric(value)) return false;
        return Number.isInteger(parseFloat(value));
    }

    // ============================================================
    // VALIDAÇÃO COMPLEXA DE OBJETOS
    // ============================================================

    /**
     * Valida um registro de servidor completo
     * @param {Object} servidor - Objeto servidor
     * @returns {Object} { valid: boolean, errors: Array<string> }
     */
    function validateServidorRecord(servidor) {
        const errors = [];

        if (!servidor || typeof servidor !== 'object') {
            return { valid: false, errors: ['Registro inválido'] };
        }

        // CPF obrigatório e válido
        if (!isRequired(servidor.cpf)) {
            errors.push('CPF é obrigatório');
        } else if (!isValidCPF(servidor.cpf)) {
            errors.push('CPF inválido');
        }

        // Nome obrigatório
        if (!isRequired(servidor.nome)) {
            errors.push('Nome é obrigatório');
        } else if (!isValidName(servidor.nome)) {
            errors.push('Nome inválido');
        }

        // Matrícula obrigatória
        if (!isRequired(servidor.matricula)) {
            errors.push('Matrícula é obrigatória');
        } else if (!isValidMatricula(servidor.matricula)) {
            errors.push('Matrícula inválida');
        }

        return {
            valid: errors.length === 0,
            errors: errors
        };
    }

    /**
     * Valida um registro de licença completo
     * @param {Object} licenca - Objeto licença
     * @returns {Object} { valid: boolean, errors: Array<string> }
     */
    function validateLicencaRecord(licenca) {
        const errors = [];

        if (!licenca || typeof licenca !== 'object') {
            return { valid: false, errors: ['Registro inválido'] };
        }

        // Período obrigatório e válido
        if (!isRequired(licenca.periodo)) {
            errors.push('Período é obrigatório');
        } else if (!isValidLicencaPeriodo(licenca.periodo)) {
            errors.push('Formato de período inválido');
        }

        // Dias obrigatório e válido
        if (!isRequired(licenca.dias)) {
            errors.push('Dias é obrigatório');
        } else if (!isValidDiasLicenca(licenca.dias)) {
            errors.push('Número de dias inválido');
        }

        // Datas de início e fim (se presentes)
        if (licenca.dataInicio && !isValidDate(licenca.dataInicio)) {
            errors.push('Data de início inválida');
        }

        if (licenca.dataFim && !isValidDate(licenca.dataFim)) {
            errors.push('Data de fim inválida');
        }

        // Se ambas as datas estão presentes, valida intervalo
        if (licenca.dataInicio && licenca.dataFim) {
            if (!isValidDateRange(licenca.dataInicio, licenca.dataFim)) {
                errors.push('Data de início deve ser anterior à data de fim');
            }
        }

        return {
            valid: errors.length === 0,
            errors: errors
        };
    }

    // ============================================================
    // EXPORTAÇÃO
    // ============================================================

    return {
        // CPF
        isValidCPF,
        
        // Datas
        isValidDate,
        isFutureDate,
        isPastDate,
        isDateInRange,
        isValidDateRange,
        
        // Licenças
        isValidLicencaPeriodo,
        isValidDiasLicenca,
        
        // Campos obrigatórios
        isRequired,
        validateRequiredFields,
        
        // Formatos
        isValidEmail,
        isValidPhone,
        isValidMatricula,
        isValidName,
        
        // Números
        isNumeric,
        isValidNumber,
        isInRange,
        isInteger,
        
        // Validação complexa
        validateServidorRecord,
        validateLicencaRecord
    };
})();

// Exportação para Node.js e Browser
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ValidationUtils;
}
