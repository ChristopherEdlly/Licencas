/**
 * LotacaoNormalizer - Serviço para normalizar lotações duplicadas
 *
 * Problema: "CEAC ARACAJU", "CEAC - ARACAJU", "CEAC-ARACAJU" são a mesma lotação
 * Solução: Normalização automática + regras customizáveis
 */

class LotacaoNormalizer {
    constructor() {
        this.storageKey = 'lotacaoNormalizationRules';
        this.customRules = this._loadCustomRules();
    }

    /**
     * Normaliza uma string de lotação
     * @param {string} lotacao - Lotação original
     * @returns {string} Lotação normalizada
     */
    normalize(lotacao) {
        if (!lotacao) return '';

        let normalized = String(lotacao).trim();

        // 1. Converter para maiúsculas
        normalized = normalized.toUpperCase();

        // 2. Remover acentos
        normalized = this._removeAccents(normalized);

        // 3. Normalizar separadores (-, _, múltiplos espaços → espaço único)
        normalized = normalized
            .replace(/[-_]+/g, ' ')          // Trocar - e _ por espaço
            .replace(/\s+/g, ' ')             // Múltiplos espaços → 1 espaço
            .trim();

        // 4. Remover pontuação no final
        normalized = normalized.replace(/[.,;:!?]+$/g, '');

        // 5. Aplicar regras customizadas do usuário
        const customNormalized = this.customRules[normalized];
        if (customNormalized) {
            return customNormalized;
        }

        // 6. Aplicar regras de siglas comuns (expandir ou padronizar)
        normalized = this._applyCommonRules(normalized);

        return normalized;
    }

    /**
     * Normaliza array de servidores (mutável)
     * @param {Array} servidores - Array de objetos servidor
     */
    normalizeServidores(servidores) {
        servidores.forEach(servidor => {
            if (servidor.LOTACAO || servidor.lotacao) {
                const original = servidor.LOTACAO || servidor.lotacao;
                const normalized = this.normalize(original);

                // Guardar original para referência
                servidor.__lotacaoOriginal = original;
                servidor.LOTACAO = normalized;
                servidor.lotacao = normalized;
            }
        });
    }

    /**
     * Analisa todas as lotações e encontra duplicatas
     * @param {Array} servidores - Array de servidores
     * @returns {Object} Mapa de lotações { normalizada: [originais] }
     */
    analyzeDuplicates(servidores) {
        const lotacaoMap = new Map();

        servidores.forEach(servidor => {
            const original = servidor.__lotacaoOriginal || servidor.LOTACAO || servidor.lotacao;
            const normalized = this.normalize(original);

            if (!lotacaoMap.has(normalized)) {
                lotacaoMap.set(normalized, new Set());
            }
            lotacaoMap.get(normalized).add(original);
        });

        // Converter para objeto e filtrar apenas duplicatas
        const result = {};
        lotacaoMap.forEach((originais, normalizada) => {
            if (originais.size > 1) {
                result[normalizada] = Array.from(originais).sort();
            }
        });

        return result;
    }

    /**
     * Retorna estatísticas de normalização
     * @param {Array} servidores - Array de servidores
     * @returns {Object} { total, unique, duplicates, savings }
     */
    getStats(servidores) {
        const originais = new Set();
        const normalizadas = new Set();

        servidores.forEach(servidor => {
            const original = servidor.__lotacaoOriginal || servidor.LOTACAO || servidor.lotacao;
            if (original) {
                originais.add(original);
                normalizadas.add(this.normalize(original));
            }
        });

        const duplicatesRemoved = originais.size - normalizadas.size;
        const savingsPercent = originais.size > 0
            ? Math.round((duplicatesRemoved / originais.size) * 100)
            : 0;

        return {
            total: originais.size,
            unique: normalizadas.size,
            duplicates: duplicatesRemoved,
            savingsPercent
        };
    }

    /**
     * Adiciona regra de normalização customizada
     * @param {string} original - String original (ou variação)
     * @param {string} normalized - Como deve ser normalizada
     */
    addCustomRule(original, normalized) {
        const key = this.normalize(original);
        this.customRules[key] = normalized.toUpperCase().trim();
        this._saveCustomRules();
    }

    /**
     * Remove regra customizada
     * @param {string} original - String original
     */
    removeCustomRule(original) {
        const key = this.normalize(original);
        delete this.customRules[key];
        this._saveCustomRules();
    }

    /**
     * Retorna todas as regras customizadas
     * @returns {Object} Regras { original: normalizada }
     */
    getCustomRules() {
        return { ...this.customRules };
    }

    /**
     * Limpa todas as regras customizadas
     */
    clearCustomRules() {
        this.customRules = {};
        this._saveCustomRules();
    }

    /**
     * Remove acentos de uma string
     * @private
     */
    _removeAccents(str) {
        return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    }

    /**
     * Aplica regras comuns de padronização
     * @private
     */
    _applyCommonRules(str) {
        const rules = {
            // Direções cardeais
            'N ': 'NORTE ',
            'S ': 'SUL ',
            'L ': 'LESTE ',
            'O ': 'OESTE ',
            ' N$': ' NORTE',
            ' S$': ' SUL',
            ' L$': ' LESTE',
            ' O$': ' OESTE',

            // Siglas comuns
            '^CEAC ': 'CEAC ',
            '^SUTRI ': 'SUTRI ',
            '^DRF ': 'DRF ',
            '^RF ': 'RF ',

            // Remover artigos e preposições duplicados
            ' DA ': ' ',
            ' DE ': ' ',
            ' DO ': ' ',
            ' DOS ': ' ',
            ' DAS ': ' ',
            ' E ': ' ',
        };

        let result = str;
        for (const [pattern, replacement] of Object.entries(rules)) {
            result = result.replace(new RegExp(pattern, 'g'), replacement);
        }

        return result.trim();
    }

    /**
     * Carrega regras customizadas do localStorage
     * @private
     */
    _loadCustomRules() {
        try {
            const stored = localStorage.getItem(this.storageKey);
            return stored ? JSON.parse(stored) : {};
        } catch (error) {
            console.error('[LotacaoNormalizer] Erro ao carregar regras:', error);
            return {};
        }
    }

    /**
     * Salva regras customizadas no localStorage
     * @private
     */
    _saveCustomRules() {
        try {
            localStorage.setItem(this.storageKey, JSON.stringify(this.customRules));
        } catch (error) {
            console.error('[LotacaoNormalizer] Erro ao salvar regras:', error);
        }
    }
}

// Exportar instância global
if (typeof window !== 'undefined') {
    window.lotacaoNormalizer = new LotacaoNormalizer();
}
