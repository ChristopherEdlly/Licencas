/**
 * LicenseService
 * 
 * Serviço para gerenciar operações relacionadas a licenças.
 * Fornece métodos de alto nível para buscar, filtrar e processar dados de licenças.
 * 
 * Camada: Services
 * Dependências: DataLoader, LicencaCalculator, UrgencyAnalyzer
 */

import DataLoader from '../data-flow/DataLoader.js';
import LicencaCalculator from '../core/LicencaCalculator.js';
import UrgencyAnalyzer from '../core/UrgencyAnalyzer.js';

export class LicenseService {
    constructor(dataLoader = null, calculator = null, urgencyAnalyzer = null) {
        this.dataLoader = dataLoader || new DataLoader();
        this.calculator = calculator || new LicencaCalculator();
        this.urgencyAnalyzer = urgencyAnalyzer || new UrgencyAnalyzer();
        this.cachedLicenses = null;
        this.lastLoadTime = null;
    }

    /**
     * Carrega todas as licenças disponíveis
     * @param {boolean} forceRefresh - Se true, força recarregamento dos dados
     * @returns {Promise<Array>} Array de licenças
     */
    async loadAllLicenses(forceRefresh = false) {
        if (!forceRefresh && this.cachedLicenses && this._isCacheValid()) {
            return this.cachedLicenses;
        }

        try {
            const data = await this.dataLoader.loadFromSource('primary');
            this.cachedLicenses = data;
            this.lastLoadTime = Date.now();
            return data;
        } catch (error) {
            throw new Error(`Falha ao carregar licenças: ${error.message}`);
        }
    }

    /**
     * Busca uma licença por matrícula
     * @param {string} matricula - Matrícula do servidor
     * @returns {Promise<Object|null>} Licença encontrada ou null
     */
    async findLicenseByMatricula(matricula) {
        if (!matricula || typeof matricula !== 'string') {
            throw new Error('Matrícula inválida');
        }

        const licenses = await this.loadAllLicenses();
        return licenses.find(lic => lic.matricula === matricula) || null;
    }

    /**
     * Filtra licenças por critérios múltiplos
     * @param {Object} filters - Objeto com filtros (lotacao, tipo, status, etc)
     * @returns {Promise<Array>} Licenças filtradas
     */
    async filterLicenses(filters = {}) {
        const licenses = await this.loadAllLicenses();
        
        return licenses.filter(license => {
            // Filtro por lotação
            if (filters.lotacao && license.lotacao !== filters.lotacao) {
                return false;
            }

            // Filtro por tipo
            if (filters.tipo && license.tipo !== filters.tipo) {
                return false;
            }

            // Filtro por status
            if (filters.status && license.status !== filters.status) {
                return false;
            }

            // Filtro por urgência
            if (filters.urgency) {
                const urgencyLevel = this.urgencyAnalyzer.analyzeUrgency(license).level;
                if (urgencyLevel !== filters.urgency) {
                    return false;
                }
            }

            // Filtro por prazo mínimo
            if (filters.minDaysRemaining !== undefined) {
                const calculation = this.calculator.calcularLicenca(license);
                if (!calculation.diasRestantes || calculation.diasRestantes < filters.minDaysRemaining) {
                    return false;
                }
            }

            // Filtro por prazo máximo
            if (filters.maxDaysRemaining !== undefined) {
                const calculation = this.calculator.calcularLicenca(license);
                if (!calculation.diasRestantes || calculation.diasRestantes > filters.maxDaysRemaining) {
                    return false;
                }
            }

            return true;
        });
    }

    /**
     * Obtém licenças com enriquecimento de dados (cálculos e urgência)
     * @param {Object} filters - Filtros opcionais
     * @returns {Promise<Array>} Licenças enriquecidas
     */
    async getEnrichedLicenses(filters = {}) {
        const licenses = await this.filterLicenses(filters);
        
        return licenses.map(license => {
            const calculation = this.calculator.calcularLicenca(license);
            const urgency = this.urgencyAnalyzer.analyzeUrgency(license);
            
            return {
                ...license,
                calculated: calculation,
                urgency: urgency
            };
        });
    }

    /**
     * Agrupa licenças por um campo específico
     * @param {string} field - Campo para agrupar (lotacao, tipo, status)
     * @param {Object} filters - Filtros opcionais
     * @returns {Promise<Object>} Objeto com licenças agrupadas
     */
    async groupLicensesBy(field, filters = {}) {
        const validFields = ['lotacao', 'tipo', 'status', 'urgency'];
        if (!validFields.includes(field)) {
            throw new Error(`Campo inválido para agrupamento: ${field}`);
        }

        const licenses = await this.filterLicenses(filters);
        const grouped = {};

        licenses.forEach(license => {
            let key;
            
            if (field === 'urgency') {
                key = this.urgencyAnalyzer.analyzeUrgency(license).level;
            } else {
                key = license[field] || 'indefinido';
            }

            if (!grouped[key]) {
                grouped[key] = [];
            }
            grouped[key].push(license);
        });

        return grouped;
    }

    /**
     * Conta licenças por critérios
     * @param {Object} filters - Filtros opcionais
     * @returns {Promise<number>} Contagem de licenças
     */
    async countLicenses(filters = {}) {
        const licenses = await this.filterLicenses(filters);
        return licenses.length;
    }

    /**
     * Obtém licenças urgentes (prazo <= 30 dias)
     * @returns {Promise<Array>} Licenças urgentes
     */
    async getUrgentLicenses() {
        return this.filterLicenses({ maxDaysRemaining: 30 });
    }

    /**
     * Obtém licenças críticas (prazo <= 7 dias)
     * @returns {Promise<Array>} Licenças críticas
     */
    async getCriticalLicenses() {
        return this.filterLicenses({ maxDaysRemaining: 7 });
    }

    /**
     * Obtém estatísticas básicas das licenças
     * @param {Object} filters - Filtros opcionais
     * @returns {Promise<Object>} Objeto com estatísticas
     */
    async getBasicStats(filters = {}) {
        const licenses = await this.filterLicenses(filters);
        
        const stats = {
            total: licenses.length,
            byType: {},
            byStatus: {},
            urgent: 0,
            critical: 0
        };

        licenses.forEach(license => {
            // Contagem por tipo
            const tipo = license.tipo || 'indefinido';
            stats.byType[tipo] = (stats.byType[tipo] || 0) + 1;

            // Contagem por status
            const status = license.status || 'indefinido';
            stats.byStatus[status] = (stats.byStatus[status] || 0) + 1;

            // Contagem de urgentes e críticos
            const calculation = this.calculator.calcularLicenca(license);
            if (calculation.diasRestantes !== null) {
                if (calculation.diasRestantes <= 30) {
                    stats.urgent++;
                }
                if (calculation.diasRestantes <= 7) {
                    stats.critical++;
                }
            }
        });

        return stats;
    }

    /**
     * Busca licenças por texto (nome ou matrícula)
     * @param {string} searchText - Texto de busca
     * @returns {Promise<Array>} Licenças encontradas
     */
    async searchLicenses(searchText) {
        if (!searchText || typeof searchText !== 'string') {
            throw new Error('Texto de busca inválido');
        }

        const licenses = await this.loadAllLicenses();
        const normalizedSearch = searchText.toLowerCase().trim();

        return licenses.filter(license => {
            const nome = (license.nome || '').toLowerCase();
            const matricula = (license.matricula || '').toLowerCase();
            
            return nome.includes(normalizedSearch) || matricula.includes(normalizedSearch);
        });
    }

    /**
     * Limpa o cache de licenças
     */
    clearCache() {
        this.cachedLicenses = null;
        this.lastLoadTime = null;
    }

    /**
     * Verifica se o cache ainda é válido (5 minutos)
     * @private
     */
    _isCacheValid() {
        if (!this.lastLoadTime) return false;
        const CACHE_DURATION = 5 * 60 * 1000; // 5 minutos
        return (Date.now() - this.lastLoadTime) < CACHE_DURATION;
    }

    /**
     * Valida uma licença antes de processar
     * @param {Object} license - Licença a validar
     * @returns {boolean} True se válida
     */
    validateLicense(license) {
        if (!license || typeof license !== 'object') return false;
        
        const requiredFields = ['matricula', 'nome', 'tipo'];
        return requiredFields.every(field => 
            license[field] !== undefined && license[field] !== null
        );
    }

    /**
     * Obtém resumo de uma licença específica
     * @param {string} matricula - Matrícula do servidor
     * @returns {Promise<Object|null>} Resumo da licença
     */
    async getLicenseSummary(matricula) {
        const license = await this.findLicenseByMatricula(matricula);
        
        if (!license) return null;

        const calculation = this.calculator.calcularLicenca(license);
        const urgency = this.urgencyAnalyzer.analyzeUrgency(license);

        return {
            matricula: license.matricula,
            nome: license.nome,
            tipo: license.tipo,
            status: license.status,
            lotacao: license.lotacao,
            diasRestantes: calculation.diasRestantes,
            urgencia: urgency.level,
            mensagem: urgency.message
        };
    }
}

export default LicenseService;
