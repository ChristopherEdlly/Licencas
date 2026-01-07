/**
 * FormatUtils - Utilitários para formatação de dados
 * Responsabilidade: Formatação de números, CPF, dinheiro, textos
 * Dependências: NENHUMA (função pura)
 */

class FormatUtils {
    /**
     * Formata número com separadores de milhares
     * @param {number|string} num - Número a formatar
     * @param {number} decimals - Casas decimais (padrão: 0)
     * @returns {string} - Número formatado (ex: "1.234,56")
     */
    static formatNumber(num, decimals = 0) {
        if (num === null || num === undefined || num === '') {
            return '-';
        }

        const number = typeof num === 'string' ? parseFloat(num) : num;
        
        if (isNaN(number)) {
            console.log(`[FormatUtils] Número inválido: ${num}`);
            return '-';
        }

        // Fixar casas decimais
        const fixed = number.toFixed(decimals);
        
        // Separar parte inteira e decimal
        const [integerPart, decimalPart] = fixed.split('.');
        
        // Adicionar separador de milhares (ponto)
        const formattedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
        
        // Juntar com vírgula como separador decimal
        if (decimals > 0 && decimalPart) {
            return `${formattedInteger},${decimalPart}`;
        }
        
        return formattedInteger;
    }

    /**
     * Formata valor monetário
     * @param {number|string} value - Valor
     * @param {string} currency - Símbolo da moeda (padrão: "R$")
     * @returns {string} - Valor formatado (ex: "R$ 1.234,56")
     */
    static formatCurrency(value, currency = 'R$') {
        if (value === null || value === undefined || value === '') {
            return `${currency} 0,00`;
        }

        const number = typeof value === 'string' ? parseFloat(value) : value;
        
        if (isNaN(number)) {
            console.log(`[FormatUtils] Valor inválido: ${value}`);
            return `${currency} 0,00`;
        }

        const formatted = this.formatNumber(number, 2);
        return `${currency} ${formatted}`;
    }

    /**
     * Formata percentual
     * @param {number} value - Valor decimal (0.5 = 50%)
     * @param {number} decimals - Casas decimais (padrão: 1)
     * @returns {string} - Percentual formatado (ex: "50,5%")
     */
    static formatPercent(value, decimals = 1) {
        if (value === null || value === undefined) {
            return '0%';
        }

        const number = typeof value === 'string' ? parseFloat(value) : value;
        
        if (isNaN(number)) {
            return '0%';
        }

        const percent = number * 100;
        return `${this.formatNumber(percent, decimals)}%`;
    }

    /**
     * Formata CPF
     * @param {string|number} cpf - CPF (apenas números)
     * @returns {string} - CPF formatado (ex: "123.456.789-00")
     */
    static formatCPF(cpf) {
        if (!cpf) {
            return '-';
        }

        // Remover caracteres não numéricos
        const cleaned = String(cpf).replace(/\D/g, '');
        
        // Adicionar zeros à esquerda se tiver menos de 11 dígitos
        const padded = cleaned.padStart(11, '0');
        
        if (padded.length !== 11) {
            console.log(`[FormatUtils] CPF inválido (deve ter 11 dígitos): ${cpf}`);
            return cpf; // Retorna original se inválido
        }

        // Formatar: 123.456.789-00
        return padded.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    }

    /**
     * Formata RG brasileiro (3 formatos suportados)
     * - 6 dígitos: xxx.xxx (ex: 123.456)
     * - 7 dígitos: xxx.xxx-x (ex: 123.456-7)
     * - 8 dígitos: x.xxx.xxx-x (ex: 0.123.456-7)
     * @param {string|number} rg - RG (apenas números ou já formatado)
     * @returns {string} - RG formatado
     */
    static formatRG(rg) {
        if (!rg) {
            return '-';
        }

        // Remover caracteres não numéricos
        const cleaned = String(rg).replace(/\D/g, '');
        
        // Se não tem dígitos suficientes, retornar como está
        if (cleaned.length < 6) {
            console.log(`[FormatUtils] RG muito curto (${cleaned.length} dígitos): ${rg}`);
            return String(rg);
        }
        
        // Formato baseado na quantidade de dígitos
        if (cleaned.length === 6) {
            // xxx.xxx
            return cleaned.replace(/(\d{3})(\d{3})/, '$1.$2');
        } else if (cleaned.length === 7) {
            // xxx.xxx-x
            return cleaned.replace(/(\d{3})(\d{3})(\d{1})/, '$1.$2-$3');
        } else if (cleaned.length === 8) {
            // x.xxx.xxx-x
            return cleaned.replace(/(\d{1})(\d{3})(\d{3})(\d{1})/, '$1.$2.$3-$4');
        }

        // Se não corresponde aos 3 formatos, retorna com formatação genérica
        console.log(`[FormatUtils] RG com formato não padrão (${cleaned.length} dígitos): ${rg}, usando formatação genérica`);
        
        // Formatação genérica: adicionar pontos a cada 3 dígitos
        return cleaned.replace(/(\d{3})(?=\d)/g, '$1.');
    }

    /**
     * Formata telefone brasileiro
     * @param {string|number} phone - Telefone (apenas números)
     * @returns {string} - Telefone formatado (ex: "(61) 98765-4321")
     */
    static formatPhone(phone) {
        if (!phone) {
            return '-';
        }

        const cleaned = String(phone).replace(/\D/g, '');
        
        // Celular: (XX) 9XXXX-XXXX (11 dígitos)
        if (cleaned.length === 11) {
            return cleaned.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
        }
        
        // Fixo: (XX) XXXX-XXXX (10 dígitos)
        if (cleaned.length === 10) {
            return cleaned.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
        }

        console.log(`[FormatUtils] Telefone inválido: ${phone}`);
        return phone; // Retorna original se inválido
    }

    /**
     * Capitaliza primeira letra
     * @param {string} str - String
     * @returns {string} - String capitalizada (ex: "joão" → "João")
     */
    static capitalize(str) {
        if (!str || typeof str !== 'string') {
            return '';
        }

        return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
    }

    /**
     * Capitaliza todas as palavras (Title Case)
     * @param {string} str - String
     * @returns {string} - String em title case (ex: "joão silva" → "João Silva")
     */
    static titleCase(str) {
        if (!str || typeof str !== 'string') {
            return '';
        }

        return str
            .toLowerCase()
            .split(' ')
            .map(word => {
                // Não capitalizar preposições pequenas
                const lowercase = ['de', 'da', 'do', 'das', 'dos', 'e', 'a', 'o'];
                if (lowercase.includes(word)) {
                    return word;
                }
                return word.charAt(0).toUpperCase() + word.slice(1);
            })
            .join(' ');
    }

    /**
     * Trunca string com reticências
     * @param {string} str - String
     * @param {number} maxLength - Tamanho máximo
     * @returns {string} - String truncada (ex: "Lorem ipsum..." se > maxLength)
     */
    static truncate(str, maxLength = 50) {
        if (!str || typeof str !== 'string') {
            return '';
        }

        if (str.length <= maxLength) {
            return str;
        }

        return str.substring(0, maxLength - 3) + '...';
    }

    /**
     * Formata dias (plural/singular)
     * @param {number} days - Número de dias
     * @returns {string} - Formatado (ex: "1 dia", "5 dias")
     */
    static formatDays(days) {
        if (days === null || days === undefined) {
            return '0 dias';
        }

        const num = typeof days === 'string' ? parseInt(days) : days;
        
        if (isNaN(num)) {
            return '0 dias';
        }

        return num === 1 ? '1 dia' : `${num} dias`;
    }

    /**
     * Formata meses (plural/singular)
     * @param {number} months - Número de meses
     * @returns {string} - Formatado (ex: "1 mês", "5 meses")
     */
    static formatMonths(months) {
        if (months === null || months === undefined) {
            return '0 meses';
        }

        const num = typeof months === 'string' ? parseInt(months) : months;
        
        if (isNaN(num)) {
            return '0 meses';
        }

        return num === 1 ? '1 mês' : `${num} meses`;
    }

    /**
     * Formata anos (plural/singular)
     * @param {number} years - Número de anos
     * @returns {string} - Formatado (ex: "1 ano", "5 anos")
     */
    static formatYears(years) {
        if (years === null || years === undefined) {
            return '0 anos';
        }

        const num = typeof years === 'string' ? parseInt(years) : years;
        
        if (isNaN(num)) {
            return '0 anos';
        }

        return num === 1 ? '1 ano' : `${num} anos`;
    }

    /**
     * Remove acentos de uma string
     * @param {string} str - String com acentos
     * @returns {string} - String sem acentos
     */
    static removeAccents(str) {
        if (!str || typeof str !== 'string') {
            return '';
        }

        return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    }

    /**
     * Formata nome próprio (maiúsculas adequadas)
     * @param {string} name - Nome
     * @returns {string} - Nome formatado
     */
    static formatProperName(name) {
        if (!name || typeof name !== 'string') {
            return '';
        }

        // Lista de palavras que devem permanecer minúsculas (exceto no início)
        const lowercase = ['de', 'da', 'do', 'das', 'dos', 'e', 'a', 'o', 'em'];
        
        const words = name.toLowerCase().trim().split(/\s+/);
        
        return words.map((word, index) => {
            // Primeira palavra sempre maiúscula
            if (index === 0) {
                return word.charAt(0).toUpperCase() + word.slice(1);
            }
            
            // Verificar se é preposição
            if (lowercase.includes(word)) {
                return word;
            }
            
            return word.charAt(0).toUpperCase() + word.slice(1);
        }).join(' ');
    }

    /**
     * Limpa string removendo espaços extras
     * @param {string} str - String
     * @returns {string} - String limpa
     */
    static cleanString(str) {
        if (!str || typeof str !== 'string') {
            return '';
        }

        return str.trim().replace(/\s+/g, ' ');
    }
}

// Export para Node.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = FormatUtils;
}

// Export para browser (global)
if (typeof window !== 'undefined') {
    window.FormatUtils = FormatUtils;
}
