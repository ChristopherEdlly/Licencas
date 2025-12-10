/**
 * MathUtils - Utilitários Matemáticos
 * 
 * Fornece funções matemáticas úteis:
 * - Cálculos estatísticos
 * - Arredondamentos e precisão
 * - Conversões e proporções
 * - Interpolações
 * - Validações numéricas
 */

const MathUtils = (function () {
    'use strict';

    // ============================================================
    // ESTATÍSTICAS BÁSICAS
    // ============================================================

    /**
     * Calcula a soma de um array
     * @param {Array<number>} numbers - Array de números
     * @returns {number} Soma
     */
    function sum(numbers) {
        if (!Array.isArray(numbers)) return 0;
        return numbers.reduce((acc, num) => acc + (Number(num) || 0), 0);
    }

    /**
     * Calcula a média aritmética
     * @param {Array<number>} numbers - Array de números
     * @returns {number} Média
     */
    function average(numbers) {
        if (!Array.isArray(numbers) || numbers.length === 0) return 0;
        return sum(numbers) / numbers.length;
    }

    /**
     * Calcula a mediana
     * @param {Array<number>} numbers - Array de números
     * @returns {number} Mediana
     */
    function median(numbers) {
        if (!Array.isArray(numbers) || numbers.length === 0) return 0;

        const sorted = [...numbers].sort((a, b) => a - b);
        const middle = Math.floor(sorted.length / 2);

        if (sorted.length % 2 === 0) {
            return (sorted[middle - 1] + sorted[middle]) / 2;
        }

        return sorted[middle];
    }

    /**
     * Calcula a moda (valor mais frequente)
     * @param {Array<number>} numbers - Array de números
     * @returns {number|null} Moda (ou null se não houver)
     */
    function mode(numbers) {
        if (!Array.isArray(numbers) || numbers.length === 0) return null;

        const frequency = {};
        let maxFreq = 0;
        let modeValue = null;

        for (const num of numbers) {
            frequency[num] = (frequency[num] || 0) + 1;
            if (frequency[num] > maxFreq) {
                maxFreq = frequency[num];
                modeValue = num;
            }
        }

        return maxFreq > 1 ? modeValue : null;
    }

    /**
     * Calcula o desvio padrão
     * @param {Array<number>} numbers - Array de números
     * @returns {number} Desvio padrão
     */
    function standardDeviation(numbers) {
        if (!Array.isArray(numbers) || numbers.length === 0) return 0;

        const avg = average(numbers);
        const squaredDiffs = numbers.map(num => Math.pow(num - avg, 2));
        const variance = average(squaredDiffs);

        return Math.sqrt(variance);
    }

    /**
     * Encontra o valor mínimo
     * @param {Array<number>} numbers - Array de números
     * @returns {number} Valor mínimo
     */
    function min(numbers) {
        if (!Array.isArray(numbers) || numbers.length === 0) return 0;
        return Math.min(...numbers);
    }

    /**
     * Encontra o valor máximo
     * @param {Array<number>} numbers - Array de números
     * @returns {number} Valor máximo
     */
    function max(numbers) {
        if (!Array.isArray(numbers) || numbers.length === 0) return 0;
        return Math.max(...numbers);
    }

    /**
     * Calcula o range (diferença entre max e min)
     * @param {Array<number>} numbers - Array de números
     * @returns {number} Range
     */
    function range(numbers) {
        if (!Array.isArray(numbers) || numbers.length === 0) return 0;
        return max(numbers) - min(numbers);
    }

    // ============================================================
    // ARREDONDAMENTOS E PRECISÃO
    // ============================================================

    /**
     * Arredonda para N casas decimais
     * @param {number} value - Valor a arredondar
     * @param {number} decimals - Número de casas decimais
     * @returns {number} Valor arredondado
     */
    function round(value, decimals = 0) {
        const multiplier = Math.pow(10, decimals);
        return Math.round(value * multiplier) / multiplier;
    }

    /**
     * Arredonda para cima
     * @param {number} value - Valor a arredondar
     * @param {number} decimals - Número de casas decimais
     * @returns {number} Valor arredondado para cima
     */
    function ceil(value, decimals = 0) {
        const multiplier = Math.pow(10, decimals);
        return Math.ceil(value * multiplier) / multiplier;
    }

    /**
     * Arredonda para baixo
     * @param {number} value - Valor a arredondar
     * @param {number} decimals - Número de casas decimais
     * @returns {number} Valor arredondado para baixo
     */
    function floor(value, decimals = 0) {
        const multiplier = Math.pow(10, decimals);
        return Math.floor(value * multiplier) / multiplier;
    }

    /**
     * Trunca (remove casas decimais)
     * @param {number} value - Valor a truncar
     * @param {number} decimals - Número de casas decimais a manter
     * @returns {number} Valor truncado
     */
    function truncate(value, decimals = 0) {
        const multiplier = Math.pow(10, decimals);
        return Math.trunc(value * multiplier) / multiplier;
    }

    // ============================================================
    // PROPORÇÕES E PERCENTUAIS
    // ============================================================

    /**
     * Calcula percentual
     * @param {number} value - Valor parcial
     * @param {number} total - Valor total
     * @returns {number} Percentual (0-100)
     */
    function percentage(value, total) {
        if (!total || total === 0) return 0;
        return (value / total) * 100;
    }

    /**
     * Calcula valor a partir de percentual
     * @param {number} percent - Percentual (0-100)
     * @param {number} total - Valor total
     * @returns {number} Valor calculado
     */
    function percentageOf(percent, total) {
        return (percent / 100) * total;
    }

    /**
     * Calcula variação percentual
     * @param {number} oldValue - Valor antigo
     * @param {number} newValue - Valor novo
     * @returns {number} Variação percentual
     */
    function percentageChange(oldValue, newValue) {
        if (!oldValue || oldValue === 0) return 0;
        return ((newValue - oldValue) / oldValue) * 100;
    }

    /**
     * Calcula proporção
     * @param {number} value - Valor parcial
     * @param {number} total - Valor total
     * @returns {number} Proporção (0-1)
     */
    function ratio(value, total) {
        if (!total || total === 0) return 0;
        return value / total;
    }

    // ============================================================
    // INTERVALOS E LIMITES
    // ============================================================

    /**
     * Limita valor entre mínimo e máximo (clamp)
     * @param {number} value - Valor a limitar
     * @param {number} min - Valor mínimo
     * @param {number} max - Valor máximo
     * @returns {number} Valor limitado
     */
    function clamp(value, min, max) {
        return Math.min(Math.max(value, min), max);
    }

    /**
     * Verifica se valor está no intervalo
     * @param {number} value - Valor a verificar
     * @param {number} min - Valor mínimo
     * @param {number} max - Valor máximo
     * @param {boolean} inclusive - Se inclui os limites
     * @returns {boolean} true se está no intervalo
     */
    function inRange(value, min, max, inclusive = true) {
        if (inclusive) {
            return value >= min && value <= max;
        }
        return value > min && value < max;
    }

    /**
     * Normaliza valor para intervalo 0-1
     * @param {number} value - Valor a normalizar
     * @param {number} min - Valor mínimo do range
     * @param {number} max - Valor máximo do range
     * @returns {number} Valor normalizado (0-1)
     */
    function normalize(value, min, max) {
        if (max === min) return 0;
        return (value - min) / (max - min);
    }

    /**
     * Desnormaliza valor de 0-1 para range original
     * @param {number} normalized - Valor normalizado (0-1)
     * @param {number} min - Valor mínimo do range
     * @param {number} max - Valor máximo do range
     * @returns {number} Valor desnormalizado
     */
    function denormalize(normalized, min, max) {
        return normalized * (max - min) + min;
    }

    // ============================================================
    // INTERPOLAÇÕES
    // ============================================================

    /**
     * Interpolação linear
     * @param {number} start - Valor inicial
     * @param {number} end - Valor final
     * @param {number} t - Parâmetro (0-1)
     * @returns {number} Valor interpolado
     */
    function lerp(start, end, t) {
        return start + (end - start) * t;
    }

    /**
     * Interpolação inversa (encontra t para um valor)
     * @param {number} start - Valor inicial
     * @param {number} end - Valor final
     * @param {number} value - Valor alvo
     * @returns {number} Parâmetro t (0-1)
     */
    function inverseLerp(start, end, value) {
        if (end === start) return 0;
        return (value - start) / (end - start);
    }

    /**
     * Remapeia valor de um intervalo para outro
     * @param {number} value - Valor a remapear
     * @param {number} inMin - Mínimo do intervalo de entrada
     * @param {number} inMax - Máximo do intervalo de entrada
     * @param {number} outMin - Mínimo do intervalo de saída
     * @param {number} outMax - Máximo do intervalo de saída
     * @returns {number} Valor remapeado
     */
    function remap(value, inMin, inMax, outMin, outMax) {
        const t = inverseLerp(inMin, inMax, value);
        return lerp(outMin, outMax, t);
    }

    // ============================================================
    // VALIDAÇÕES E COMPARAÇÕES
    // ============================================================

    /**
     * Verifica se é número válido
     * @param {any} value - Valor a verificar
     * @returns {boolean} true se é número válido
     */
    function isValidNumber(value) {
        return typeof value === 'number' && !isNaN(value) && isFinite(value);
    }

    /**
     * Verifica se é número inteiro
     * @param {any} value - Valor a verificar
     * @returns {boolean} true se é inteiro
     */
    function isInteger(value) {
        return isValidNumber(value) && Number.isInteger(value);
    }

    /**
     * Verifica se é número positivo
     * @param {number} value - Valor a verificar
     * @returns {boolean} true se é positivo
     */
    function isPositive(value) {
        return isValidNumber(value) && value > 0;
    }

    /**
     * Verifica se é número negativo
     * @param {number} value - Valor a verificar
     * @returns {boolean} true se é negativo
     */
    function isNegative(value) {
        return isValidNumber(value) && value < 0;
    }

    /**
     * Verifica se dois números são aproximadamente iguais
     * @param {number} a - Primeiro número
     * @param {number} b - Segundo número
     * @param {number} epsilon - Tolerância (padrão: 0.0001)
     * @returns {boolean} true se são aproximadamente iguais
     */
    function approximatelyEqual(a, b, epsilon = 0.0001) {
        return Math.abs(a - b) < epsilon;
    }

    // ============================================================
    // CONVERSÕES
    // ============================================================

    /**
     * Converte graus para radianos
     * @param {number} degrees - Graus
     * @returns {number} Radianos
     */
    function degreesToRadians(degrees) {
        return degrees * (Math.PI / 180);
    }

    /**
     * Converte radianos para graus
     * @param {number} radians - Radianos
     * @returns {number} Graus
     */
    function radiansToDegrees(radians) {
        return radians * (180 / Math.PI);
    }

    // ============================================================
    // FUNÇÕES ÚTEIS
    // ============================================================

    /**
     * Calcula fatorial
     * @param {number} n - Número inteiro positivo
     * @returns {number} Fatorial
     */
    function factorial(n) {
        if (n < 0) return 0;
        if (n === 0 || n === 1) return 1;

        let result = 1;
        for (let i = 2; i <= n; i++) {
            result *= i;
        }
        return result;
    }

    /**
     * Calcula combinação (nCr)
     * @param {number} n - Total de elementos
     * @param {number} r - Elementos escolhidos
     * @returns {number} Número de combinações
     */
    function combination(n, r) {
        if (r > n || r < 0) return 0;
        if (r === 0 || r === n) return 1;

        // Otimização: C(n,r) = C(n, n-r)
        r = Math.min(r, n - r);

        let result = 1;
        for (let i = 0; i < r; i++) {
            result *= (n - i);
            result /= (i + 1);
        }

        return Math.round(result);
    }

    /**
     * Calcula permutação (nPr)
     * @param {number} n - Total de elementos
     * @param {number} r - Elementos escolhidos
     * @returns {number} Número de permutações
     */
    function permutation(n, r) {
        if (r > n || r < 0) return 0;

        let result = 1;
        for (let i = 0; i < r; i++) {
            result *= (n - i);
        }

        return result;
    }

    /**
     * Calcula Greatest Common Divisor (MDC)
     * @param {number} a - Primeiro número
     * @param {number} b - Segundo número
     * @returns {number} MDC
     */
    function gcd(a, b) {
        a = Math.abs(a);
        b = Math.abs(b);

        while (b !== 0) {
            const temp = b;
            b = a % b;
            a = temp;
        }

        return a;
    }

    /**
     * Calcula Least Common Multiple (MMC)
     * @param {number} a - Primeiro número
     * @param {number} b - Segundo número
     * @returns {number} MMC
     */
    function lcm(a, b) {
        if (a === 0 || b === 0) return 0;
        return Math.abs(a * b) / gcd(a, b);
    }

    /**
     * Verifica se é número primo
     * @param {number} n - Número a verificar
     * @returns {boolean} true se é primo
     */
    function isPrime(n) {
        if (n <= 1) return false;
        if (n <= 3) return true;
        if (n % 2 === 0 || n % 3 === 0) return false;

        for (let i = 5; i * i <= n; i += 6) {
            if (n % i === 0 || n % (i + 2) === 0) {
                return false;
            }
        }

        return true;
    }

    /**
     * Gera número aleatório em um intervalo
     * @param {number} min - Valor mínimo
     * @param {number} max - Valor máximo
     * @param {boolean} integer - Se deve retornar inteiro
     * @returns {number} Número aleatório
     */
    function random(min = 0, max = 1, integer = false) {
        const value = Math.random() * (max - min) + min;
        return integer ? Math.floor(value) : value;
    }

    // ============================================================
    // EXPORTAÇÃO
    // ============================================================

    return {
        // Estatísticas
        sum,
        average,
        median,
        mode,
        standardDeviation,
        min,
        max,
        range,

        // Arredondamentos
        round,
        ceil,
        floor,
        truncate,

        // Proporções
        percentage,
        percentageOf,
        percentageChange,
        ratio,

        // Intervalos
        clamp,
        inRange,
        normalize,
        denormalize,

        // Interpolações
        lerp,
        inverseLerp,
        remap,

        // Validações
        isValidNumber,
        isInteger,
        isPositive,
        isNegative,
        approximatelyEqual,

        // Conversões
        degreesToRadians,
        radiansToDegrees,

        // Funções úteis
        factorial,
        combination,
        permutation,
        gcd,
        lcm,
        isPrime,
        random
    };
})();

// Exportação para Node.js e Browser
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MathUtils;
}

// Export para browser (global)
if (typeof window !== 'undefined') {
    window.MathUtils = MathUtils;
}
