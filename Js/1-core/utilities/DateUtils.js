/**
 * DateUtils - Utilitários para manipulação de datas
 * Responsabilidade: Parsing e formatação de datas brasileiras
 * Dependências: NENHUMA (função pura)
 */

class DateUtils {
    // Toggle verbose parsing logs
    static DEBUG = false;
    /**
     * Parse data brasileira flexível
     * Aceita: "jan/2025", "01/2025", "janeiro/2025", "2025-01-01"
     * @param {string} dateStr - String de data
     * @returns {Date|null} - Objeto Date ou null se inválido
     */
    static parseBrazilianDate(dateStr) {
        if (!dateStr || typeof dateStr !== 'string') {
            console.log(`[DateUtils] Input inválido: ${dateStr}`);
            return null;
        }

        const str = dateStr.trim().toLowerCase();
        if (DateUtils.DEBUG) console.log(`[DateUtils] Parsing: "${str}"`);

        // Mapa de meses
        const monthMap = {
            'jan': 0, 'janeiro': 0,
            'fev': 1, 'fevereiro': 1,
            'mar': 2, 'março': 2, 'marco': 2,
            'abr': 3, 'abril': 3,
            'mai': 4, 'maio': 4,
            'jun': 5, 'junho': 5,
            'jul': 6, 'julho': 6,
            'ago': 7, 'agosto': 7,
            'set': 8, 'setembro': 8,
            'out': 9, 'outubro': 9,
            'nov': 10, 'novembro': 10,
            'dez': 11, 'dezembro': 11
        };

        // Formato: "jan/2025" ou "janeiro/2025"
        const monthYearMatch = str.match(/([a-zç]+)\/(\d{4})/);
        if (monthYearMatch) {
            const [, monthStr, yearStr] = monthYearMatch;
            const month = monthMap[monthStr];
            const year = parseInt(yearStr);
            
            if (month !== undefined && !isNaN(year)) {
                if (DateUtils.DEBUG) console.log(`[DateUtils] ✓ Parsed como mês/ano: ${month + 1}/${year}`);
                // Criar data ao meio-dia para evitar problemas de timezone
                return new Date(year, month, 1, 12, 0, 0);
            }
        }

        // Formato: "DD/MM/YYYY" (DEVE VIR ANTES de MM/YYYY para evitar falso positivo)
        const fullDateMatch = str.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
        if (fullDateMatch) {
            const [, dayStr, monthStr, yearStr] = fullDateMatch;
            const day = parseInt(dayStr);
            const month = parseInt(monthStr) - 1;
            const year = parseInt(yearStr);
            
            if (day >= 1 && day <= 31 && month >= 0 && month <= 11 && !isNaN(year)) {
                if (DateUtils.DEBUG) console.log(`[DateUtils] ✓ Parsed como DD/MM/YYYY: ${day}/${month + 1}/${year}`);
                // Criar data ao meio-dia para evitar problemas de timezone
                return new Date(year, month, day, 12, 0, 0);
            }
        }

        // Formato: "01/2025" (número/ano - APÓS DD/MM/YYYY)
        const numMonthYearMatch = str.match(/(\d{1,2})\/(\d{4})/);
        if (numMonthYearMatch) {
            const [, monthStr, yearStr] = numMonthYearMatch;
            const month = parseInt(monthStr) - 1; // 01 = janeiro (index 0)
            const year = parseInt(yearStr);
            
            if (month >= 0 && month <= 11 && !isNaN(year)) {
                if (DateUtils.DEBUG) console.log(`[DateUtils] ✓ Parsed como MM/YYYY: ${month + 1}/${year}`);
                // Criar data ao meio-dia para evitar problemas de timezone
                return new Date(year, month, 1, 12, 0, 0);
            }
        }

        // Formato ISO: "2025-01-15"
        const isoMatch = str.match(/(\d{4})-(\d{2})-(\d{2})/);
        if (isoMatch) {
            const [, yearStr, monthStr, dayStr] = isoMatch;
            const year = parseInt(yearStr);
            const month = parseInt(monthStr) - 1;
            const day = parseInt(dayStr);
            
            if (day >= 1 && day <= 31 && month >= 0 && month <= 11 && !isNaN(year)) {
                if (DateUtils.DEBUG) console.log(`[DateUtils] ✓ Parsed como ISO: ${year}-${month + 1}-${day}`);
                // Criar data ao meio-dia para evitar problemas de timezone
                return new Date(year, month, day, 12, 0, 0);
            }
        }

        if (DateUtils.DEBUG) console.log(`[DateUtils] ✗ Não foi possível fazer parse: "${dateStr}"`);
        return null;
    }

    /**
     * Alias genérico para parseBrazilianDate
     * @param {string|Date} input - String de data ou objeto Date
     * @returns {Date|null} - Objeto Date ou null
     */
    static parseDate(input) {
        // Se já é um Date, retorna
        if (input instanceof Date) {
            return isNaN(input) ? null : input;
        }
        // Se é string, faz parse
        return this.parseBrazilianDate(input);
    }

    /**
     * Formata Date para string brasileira
     * @param {Date} date - Objeto Date
     * @param {string} format - 'short' (DD/MM/YYYY) ou 'long' (15 de janeiro de 2025)
     * @returns {string} - Data formatada
     */
    static formatBrazilianDate(date, format = 'short') {
        if (!(date instanceof Date) || isNaN(date)) {
            return '-';
        }

        if (format === 'short') {
            const day = String(date.getDate()).padStart(2, '0');
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const year = date.getFullYear();
            return `${day}/${month}/${year}`;
        }

        if (format === 'long') {
            const months = [
                'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
                'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'
            ];
            const day = date.getDate();
            const month = months[date.getMonth()];
            const year = date.getFullYear();
            return `${day} de ${month} de ${year}`;
        }

        return date.toLocaleDateString('pt-BR');
    }

    /**
     * Calcula diferença em dias entre duas datas
     * @param {Date} date1 - Data inicial
     * @param {Date} date2 - Data final
     * @returns {number} - Diferença em dias
     */
    static diffInDays(date1, date2) {
        if (!(date1 instanceof Date) || !(date2 instanceof Date)) {
            return 0;
        }
        const diffMs = date2 - date1;
        return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    }

    /**
     * Calcula diferença em meses entre duas datas
     * @param {Date} date1 - Data inicial
     * @param {Date} date2 - Data final
     * @returns {number} - Diferença em meses
     */
    static diffInMonths(date1, date2) {
        if (!(date1 instanceof Date) || !(date2 instanceof Date)) {
            return 0;
        }
        const yearDiff = date2.getFullYear() - date1.getFullYear();
        const monthDiff = date2.getMonth() - date1.getMonth();
        return yearDiff * 12 + monthDiff;
    }

    /**
     * Adiciona dias a uma data
     * @param {Date} date - Data base
     * @param {number} days - Dias a adicionar
     * @returns {Date} - Nova data
     */
    static addDays(date, days) {
        if (!(date instanceof Date)) {
            return null;
        }
        const result = new Date(date);
        result.setDate(result.getDate() + days);
        return result;
    }

    /**
     * Adiciona meses a uma data
     * @param {Date} date - Data base
     * @param {number} months - Meses a adicionar
     * @returns {Date} - Nova data
     */
    static addMonths(date, months) {
        if (!(date instanceof Date)) {
            return null;
        }
        const result = new Date(date);
        result.setMonth(result.getMonth() + months);
        return result;
    }
}

// Export para Node.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DateUtils;
}

// Export para browser (global)
if (typeof window !== 'undefined') {
    window.DateUtils = DateUtils;
}
