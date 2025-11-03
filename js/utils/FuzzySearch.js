/**
 * FuzzySearch.js
 * Utilitário para busca fuzzy usando algoritmo Levenshtein distance
 * Permite encontrar correspondências mesmo com erros de digitação
 */

class FuzzySearch {
    /**
     * Calcula a distância de Levenshtein entre duas strings
     * Retorna o número mínimo de edições (inserções, deleções, substituições)
     * necessárias para transformar str1 em str2
     *
     * @param {string} str1 - Primeira string
     * @param {string} str2 - Segunda string
     * @returns {number} - Distância de Levenshtein
     */
    static levenshteinDistance(str1, str2) {
        const len1 = str1.length;
        const len2 = str2.length;

        // Criar matriz de distâncias
        const matrix = Array(len1 + 1).fill(null).map(() =>
            Array(len2 + 1).fill(0)
        );

        // Inicializar primeira linha e coluna
        for (let i = 0; i <= len1; i++) {
            matrix[i][0] = i;
        }
        for (let j = 0; j <= len2; j++) {
            matrix[0][j] = j;
        }

        // Preencher matriz com distâncias mínimas
        for (let i = 1; i <= len1; i++) {
            for (let j = 1; j <= len2; j++) {
                const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;

                matrix[i][j] = Math.min(
                    matrix[i - 1][j] + 1,     // Deleção
                    matrix[i][j - 1] + 1,     // Inserção
                    matrix[i - 1][j - 1] + cost  // Substituição
                );
            }
        }

        return matrix[len1][len2];
    }

    /**
     * Calcula a similaridade entre duas strings (0 a 1)
     * 1 = idênticas, 0 = completamente diferentes
     *
     * @param {string} str1 - Primeira string
     * @param {string} str2 - Segunda string
     * @returns {number} - Similaridade (0-1)
     */
    static similarity(str1, str2) {
        if (!str1 || !str2) return 0;

        const longer = str1.length > str2.length ? str1 : str2;
        const shorter = str1.length > str2.length ? str2 : str1;

        if (longer.length === 0) return 1.0;

        const distance = this.levenshteinDistance(longer, shorter);
        return (longer.length - distance) / longer.length;
    }

    /**
     * Normaliza string para comparação
     * Remove acentos, converte para minúsculas, remove espaços extras
     *
     * @param {string} str - String a normalizar
     * @returns {string} - String normalizada
     */
    static normalize(str) {
        if (typeof str !== 'string') return '';

        return str
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '') // Remove acentos
            .replace(/\s+/g, ' ')             // Normaliza espaços
            .trim();
    }

    /**
     * Busca fuzzy em uma lista de strings
     * Retorna itens que atendem ao threshold de similaridade
     *
     * @param {string} query - Termo de busca
     * @param {string[]} items - Lista de strings para buscar
     * @param {number} threshold - Similaridade mínima (0-1), padrão 0.6
     * @returns {Array<{item: string, score: number}>} - Itens com score de similaridade
     */
    static search(query, items, threshold = 0.6) {
        if (!query || !items || items.length === 0) return [];

        const normalizedQuery = this.normalize(query);
        const results = [];

        for (const item of items) {
            const normalizedItem = this.normalize(item);
            const score = this.similarity(normalizedQuery, normalizedItem);

            if (score >= threshold) {
                results.push({ item, score });
            }
        }

        // Ordenar por score (maior primeiro)
        return results.sort((a, b) => b.score - a.score);
    }

    /**
     * Busca fuzzy em objetos
     * Busca em múltiplos campos do objeto
     *
     * @param {string} query - Termo de busca
     * @param {Object[]} objects - Array de objetos
     * @param {string[]} fields - Campos do objeto para buscar
     * @param {number} threshold - Similaridade mínima (0-1)
     * @returns {Array<{object: Object, score: number, matchedField: string}>}
     */
    static searchObjects(query, objects, fields, threshold = 0.6) {
        if (!query || !objects || objects.length === 0) return [];

        const normalizedQuery = this.normalize(query);
        const results = [];

        for (const obj of objects) {
            let bestScore = 0;
            let matchedField = '';

            // Buscar em cada campo especificado
            for (const field of fields) {
                const value = obj[field];
                if (!value) continue;

                const normalizedValue = this.normalize(String(value));
                const score = this.similarity(normalizedQuery, normalizedValue);

                if (score > bestScore) {
                    bestScore = score;
                    matchedField = field;
                }
            }

            if (bestScore >= threshold) {
                results.push({
                    object: obj,
                    score: bestScore,
                    matchedField: matchedField
                });
            }
        }

        // Ordenar por score (maior primeiro)
        return results.sort((a, b) => b.score - a.score);
    }

    /**
     * Verifica se query está contida em target (substring fuzzy)
     * Mais permissivo que a busca exata, mas mais restritivo que fuzzy completo
     *
     * @param {string} query - Termo de busca
     * @param {string} target - String alvo
     * @param {number} maxErrors - Número máximo de erros permitidos
     * @returns {boolean}
     */
    static fuzzyContains(query, target, maxErrors = 1) {
        if (!query || !target) return false;

        const normalizedQuery = this.normalize(query);
        const normalizedTarget = this.normalize(target);

        // Se é substring exata, retorna true
        if (normalizedTarget.includes(normalizedQuery)) return true;

        // Se query é muito curta, requer match exato
        if (normalizedQuery.length < 3) return false;

        // Busca por palavras individuais
        const queryWords = normalizedQuery.split(/\s+/);
        const targetWords = normalizedTarget.split(/\s+/);

        for (const qWord of queryWords) {
            let found = false;

            for (const tWord of targetWords) {
                const distance = this.levenshteinDistance(qWord, tWord);

                if (distance <= maxErrors) {
                    found = true;
                    break;
                }
            }

            // Se alguma palavra da query não foi encontrada, retorna false
            if (!found && qWord.length >= 3) {
                return false;
            }
        }

        return true;
    }

    /**
     * Cria um highlighter de texto para destacar matches
     *
     * @param {string} text - Texto original
     * @param {string} query - Termo de busca
     * @returns {string} - HTML com <mark> nos matches
     */
    static highlight(text, query) {
        if (!text || !query) return text;

        const normalizedQuery = this.normalize(query);
        const normalizedText = this.normalize(text);

        // Encontrar matches exatos primeiro
        const queryWords = normalizedQuery.split(/\s+/);
        let result = text;

        for (const word of queryWords) {
            if (word.length < 2) continue;

            // Criar regex case-insensitive e accent-insensitive
            const pattern = word.split('').map(char => {
                // Escapar caracteres especiais de regex
                const escaped = char.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                return escaped;
            }).join('[\\s]*'); // Permite espaços entre caracteres

            const regex = new RegExp(`(${pattern})`, 'gi');
            result = result.replace(regex, '<mark>$1</mark>');
        }

        return result;
    }

    /**
     * Sugere correções para uma palavra com erro
     *
     * @param {string} word - Palavra com possível erro
     * @param {string[]} dictionary - Dicionário de palavras corretas
     * @param {number} maxSuggestions - Número máximo de sugestões
     * @returns {string[]} - Array de sugestões ordenadas por similaridade
     */
    static suggest(word, dictionary, maxSuggestions = 5) {
        if (!word || !dictionary || dictionary.length === 0) return [];

        const results = this.search(word, dictionary, 0.5);
        return results
            .slice(0, maxSuggestions)
            .map(r => r.item);
    }
}

// Exportar para uso global
if (typeof window !== 'undefined') {
    window.FuzzySearch = FuzzySearch;
}
