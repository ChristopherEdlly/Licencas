/**
 * OperationalImpactAnalyzer.js
 * 
 * Analisa o impacto operacional das licenças nos departamentos
 * - Calcula capacidade disponível por mês/departamento
 * - Detecta gargalos (períodos com muitos ausentes)
 * - Gera score de risco operacional
 * - Sugere redistribuições inteligentes
 * 
 * @version 5.0.0 - Sprint 5
 * @author Dashboard Licenças Premium
 */

class OperationalImpactAnalyzer {
    constructor(dashboard) {
        this.dashboard = dashboard;
        
        // Configurações de thresholds
        this.thresholds = {
            critical: 40,      // % de ausentes para considerar crítico
            high: 30,          // % de ausentes para considerar alto
            warning: 20        // % de ausentes para considerar aviso
        };
        
        // Cache
        this.impactCache = new Map();
        this.departmentCache = new Map();
        
        this.init();
    }
    
    async init() {
        console.log('📊 Inicializando OperationalImpactAnalyzer v5.0...');
        console.log('✅ OperationalImpactAnalyzer inicializado');
    }
    
    /**
     * Analisa o impacto operacional completo
     * @param {Array} servidores - Lista de todos os servidores
     * @returns {Object} Análise completa de impacto
     */
    analyze(servidores) {
        if (!servidores || servidores.length === 0) {
            return this.getEmptyAnalysis();
        }
        
        console.log(`📊 Analisando impacto operacional de ${servidores.length} servidores...`);
        
        // Agrupar servidores por departamento
        const byDepartment = this.groupByDepartment(servidores);
        
        // Analisar cada departamento
        const departmentAnalyses = {};
        for (const [dept, servers] of Object.entries(byDepartment)) {
            departmentAnalyses[dept] = this.analyzeDepartment(dept, servers);
        }
        
        // Análise geral (todos os servidores)
        const globalAnalysis = this.analyzeGlobal(servidores);
        
        // Detectar períodos críticos (múltiplos departamentos afetados)
        const criticalPeriods = this.detectCriticalPeriods(departmentAnalyses);
        
        // Gerar sugestões de redistribuição
        const suggestions = this.generateSuggestions(departmentAnalyses, servidores);
        
        const result = {
            timestamp: Date.now(),
            totalServidores: servidores.length,
            byDepartment: departmentAnalyses,
            global: globalAnalysis,
            criticalPeriods,
            suggestions,
            summary: this.generateSummary(departmentAnalyses, criticalPeriods)
        };
        
        console.log('✅ Análise de impacto concluída:', result.summary);
        
        return result;
    }
    
    /**
     * Agrupa servidores por departamento
     * @param {Array} servidores 
     * @returns {Object} Servidores agrupados
     */
    groupByDepartment(servidores) {
        const grouped = {};
        
        for (const servidor of servidores) {
            // Prioridade: Lotação > Superintendência > Subsecretaria > "Sem Departamento"
            const dept = servidor.lotacao || 
                        servidor.superintendencia || 
                        servidor.subsecretaria || 
                        'Sem Departamento';
            
            if (!grouped[dept]) {
                grouped[dept] = [];
            }
            grouped[dept].push(servidor);
        }
        
        return grouped;
    }
    
    /**
     * Analisa um departamento específico
     * @param {string} departmentName 
     * @param {Array} servidores 
     * @returns {Object} Análise do departamento
     */
    analyzeDepartment(departmentName, servidores) {
        const totalServidores = servidores.length;
        
        // Calcular ausências por mês
        const ausenciasPorMes = this.calculateMonthlyAbsences(servidores);
        
        // Calcular capacidade disponível por mês (%)
        const capacidadePorMes = {};
        for (const [mes, ausentes] of Object.entries(ausenciasPorMes)) {
            const percentAusente = (ausentes / totalServidores) * 100;
            const percentDisponivel = 100 - percentAusente;
            
            capacidadePorMes[mes] = {
                disponivel: percentDisponivel,
                ausente: percentAusente,
                servidoresAusentes: ausentes,
                servidoresDisponiveis: totalServidores - ausentes,
                nivel: this.getRiskLevel(percentAusente)
            };
        }
        
        // Identificar meses críticos
        const mesesCriticos = Object.entries(capacidadePorMes)
            .filter(([_, data]) => data.nivel === 'critical' || data.nivel === 'high')
            .map(([mes, data]) => ({
                mes,
                ...data
            }));
        
        // Calcular score de risco
        const riskScore = this.calculateDepartmentRisk(capacidadePorMes);
        
        return {
            nome: departmentName,
            totalServidores,
            capacidadePorMes,
            mesesCriticos,
            riskScore,
            status: this.getDepartmentStatus(riskScore)
        };
    }
    
    /**
     * Calcula quantos servidores estão ausentes em cada mês
     * @param {Array} servidores 
     * @returns {Object} Map de mês -> quantidade de ausentes
     */
    calculateMonthlyAbsences(servidores) {
        const absences = {};
        
        for (const servidor of servidores) {
            if (!servidor.periodos || servidor.periodos.length === 0) {
                continue;
            }
            
            // Para cada período de licença
            for (const periodo of servidor.periodos) {
                if (!periodo.inicio || !periodo.fim) continue;
                
                const inicio = new Date(periodo.inicio);
                const fim = new Date(periodo.fim);
                
                // Contar para cada mês no período
                let current = new Date(inicio);
                while (current <= fim) {
                    const mesKey = `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, '0')}`;
                    
                    if (!absences[mesKey]) {
                        absences[mesKey] = 0;
                    }
                    absences[mesKey]++;
                    
                    // Próximo mês
                    current.setMonth(current.getMonth() + 1);
                    current.setDate(1); // Reset para primeiro dia
                }
            }
        }
        
        return absences;
    }
    
    /**
     * Determina nível de risco baseado no % de ausentes
     * @param {number} percentAusente 
     * @returns {string} 'normal', 'warning', 'high', 'critical'
     */
    getRiskLevel(percentAusente) {
        if (percentAusente >= this.thresholds.critical) return 'critical';
        if (percentAusente >= this.thresholds.high) return 'high';
        if (percentAusente >= this.thresholds.warning) return 'warning';
        return 'normal';
    }
    
    /**
     * Calcula score de risco do departamento (0-100)
     * @param {Object} capacidadePorMes 
     * @returns {number}
     */
    calculateDepartmentRisk(capacidadePorMes) {
        const meses = Object.values(capacidadePorMes);
        if (meses.length === 0) return 0;
        
        let totalRisk = 0;
        let weights = 0;
        
        for (const mes of meses) {
            let weight = 1;
            let risk = mes.ausente;
            
            if (mes.nivel === 'critical') weight = 3;
            else if (mes.nivel === 'high') weight = 2;
            else if (mes.nivel === 'warning') weight = 1.5;
            
            totalRisk += risk * weight;
            weights += weight;
        }
        
        const avgRisk = totalRisk / weights;
        return Math.min(100, Math.round(avgRisk * 2.5));
    }
    
    /**
     * Define status do departamento
     * @param {number} riskScore 
     * @returns {string}
     */
    getDepartmentStatus(riskScore) {
        if (riskScore >= 75) return 'Crítico';
        if (riskScore >= 50) return 'Alto Risco';
        if (riskScore >= 25) return 'Moderado';
        return 'Normal';
    }
    
    /**
     * Análise global
     * @param {Array} servidores 
     * @returns {Object}
     */
    analyzeGlobal(servidores) {
        const ausenciasPorMes = this.calculateMonthlyAbsences(servidores);
        const totalServidores = servidores.length;
        
        const capacidadePorMes = {};
        for (const [mes, ausentes] of Object.entries(ausenciasPorMes)) {
            const percentAusente = (ausentes / totalServidores) * 100;
            capacidadePorMes[mes] = {
                disponivel: 100 - percentAusente,
                ausente: percentAusente,
                nivel: this.getRiskLevel(percentAusente)
            };
        }
        
        return {
            totalServidores,
            capacidadePorMes,
            mediaAusencias: this.calculateAverage(Object.values(ausenciasPorMes)),
            picoAusencias: Math.max(...Object.values(ausenciasPorMes), 0),
            mesesSemAusencias: Object.entries(ausenciasPorMes).filter(([_, v]) => v === 0).length
        };
    }
    
    /**
     * Detecta períodos críticos
     * @param {Object} departmentAnalyses 
     * @returns {Array}
     */
    detectCriticalPeriods(departmentAnalyses) {
        const periodsByMonth = {};
        
        for (const [dept, analysis] of Object.entries(departmentAnalyses)) {
            for (const mesCritico of analysis.mesesCriticos) {
                if (!periodsByMonth[mesCritico.mes]) {
                    periodsByMonth[mesCritico.mes] = {
                        mes: mesCritico.mes,
                        departamentos: [],
                        totalAusentes: 0,
                        mediaPorcentagem: 0
                    };
                }
                
                periodsByMonth[mesCritico.mes].departamentos.push({
                    nome: dept,
                    ausentes: mesCritico.servidoresAusentes,
                    porcentagem: mesCritico.ausente,
                    nivel: mesCritico.nivel
                });
                periodsByMonth[mesCritico.mes].totalAusentes += mesCritico.servidoresAusentes;
            }
        }
        
        const periods = Object.values(periodsByMonth)
            .map(period => {
                period.mediaPorcentagem = period.departamentos.reduce((sum, d) => sum + d.porcentagem, 0) / period.departamentos.length;
                period.gravidade = period.departamentos.length * period.mediaPorcentagem;
                return period;
            })
            .sort((a, b) => b.gravidade - a.gravidade);
        
        return periods;
    }
    
    /**
     * Gera sugestões de redistribuição
     * @param {Object} departmentAnalyses 
     * @param {Array} servidores 
     * @returns {Array}
     */
    generateSuggestions(departmentAnalyses, servidores) {
        const suggestions = [];
        
        for (const [dept, analysis] of Object.entries(departmentAnalyses)) {
            if (analysis.mesesCriticos.length === 0) continue;
            
            for (const mesCritico of analysis.mesesCriticos) {
                const servidoresNesteMes = this.getServidoresInMonth(
                    servidores.filter(s => (s.lotacao || s.superintendencia || s.subsecretaria) === dept),
                    mesCritico.mes
                );
                
                const mesesAlternativos = Object.entries(analysis.capacidadePorMes)
                    .filter(([mes, data]) => data.nivel === 'normal' && mes !== mesCritico.mes)
                    .map(([mes, data]) => ({
                        mes,
                        disponibilidade: data.disponivel
                    }))
                    .sort((a, b) => b.disponibilidade - a.disponibilidade)
                    .slice(0, 3);
                
                if (mesesAlternativos.length > 0 && servidoresNesteMes.length > 0) {
                    suggestions.push({
                        tipo: 'redistribuicao',
                        departamento: dept,
                        problematico: mesCritico.mes,
                        ausentes: mesCritico.servidoresAusentes,
                        porcentagem: mesCritico.ausente,
                        nivel: mesCritico.nivel,
                        servidores: servidoresNesteMes.slice(0, Math.ceil(servidoresNesteMes.length / 2)),
                        mesesAlternativos
                    });
                }
            }
        }
        
        return suggestions.sort((a, b) => {
            const levelOrder = { critical: 0, high: 1, warning: 2, normal: 3 };
            if (levelOrder[a.nivel] !== levelOrder[b.nivel]) {
                return levelOrder[a.nivel] - levelOrder[b.nivel];
            }
            return b.porcentagem - a.porcentagem;
        });
    }
    
    /**
     * Busca servidores em determinado mês
     * @param {Array} servidores 
     * @param {string} mesKey 
     * @returns {Array}
     */
    getServidoresInMonth(servidores, mesKey) {
        const [ano, mes] = mesKey.split('-').map(Number);
        const result = [];
        
        for (const servidor of servidores) {
            if (!servidor.periodos || servidor.periodos.length === 0) continue;
            
            for (const periodo of servidor.periodos) {
                if (!periodo.inicio || !periodo.fim) continue;
                
                const inicio = new Date(periodo.inicio);
                const fim = new Date(periodo.fim);
                const mesInicio = new Date(ano, mes - 1, 1);
                const mesFim = new Date(ano, mes, 0);
                
                if (inicio <= mesFim && fim >= mesInicio) {
                    result.push({
                        nome: servidor.nome,
                        urgencia: servidor.urgencia,
                        periodo
                    });
                    break;
                }
            }
        }
        
        return result;
    }
    
    /**
     * Gera resumo executivo
     * @param {Object} departmentAnalyses 
     * @param {Array} criticalPeriods 
     * @returns {Object}
     */
    generateSummary(departmentAnalyses, criticalPeriods) {
        const totalDepts = Object.keys(departmentAnalyses).length;
        const deptsComProblemas = Object.values(departmentAnalyses)
            .filter(d => d.mesesCriticos.length > 0).length;
        const totalMesesCriticos = criticalPeriods.length;
        
        const deptMaiorRisco = Object.entries(departmentAnalyses)
            .sort((a, b) => b[1].riskScore - a[1].riskScore)[0];
        
        return {
            totalDepartamentos: totalDepts,
            departamentosComProblemas: deptsComProblemas,
            totalMesesCriticos,
            departamentoMaiorRisco: deptMaiorRisco ? {
                nome: deptMaiorRisco[0],
                riskScore: deptMaiorRisco[1].riskScore,
                status: deptMaiorRisco[1].status
            } : null,
            status: this.getGlobalStatus(deptsComProblemas, totalDepts)
        };
    }
    
    /**
     * Status global
     * @param {number} comProblemas 
     * @param {number} total 
     * @returns {string}
     */
    getGlobalStatus(comProblemas, total) {
        const ratio = comProblemas / total;
        if (ratio >= 0.5) return 'Crítico';
        if (ratio >= 0.3) return 'Alto Risco';
        if (ratio >= 0.1) return 'Atenção';
        return 'Normal';
    }
    
    /**
     * Calcula média
     * @param {Array} values 
     * @returns {number}
     */
    calculateAverage(values) {
        if (values.length === 0) return 0;
        return values.reduce((sum, val) => sum + val, 0) / values.length;
    }
    
    /**
     * Retorna análise vazia
     * @returns {Object}
     */
    getEmptyAnalysis() {
        return {
            timestamp: Date.now(),
            totalServidores: 0,
            byDepartment: {},
            global: { totalServidores: 0, capacidadePorMes: {}, mediaAusencias: 0, picoAusencias: 0, mesesSemAusencias: 0 },
            criticalPeriods: [],
            suggestions: [],
            summary: {
                totalDepartamentos: 0,
                departamentosComProblemas: 0,
                totalMesesCriticos: 0,
                departamentoMaiorRisco: null,
                status: 'Normal'
            }
        };
    }
    
    /**
     * Gera heatmap de ausências
     * @param {Object} analysisResult 
     * @returns {Array}
     */
    generateHeatmap(analysisResult) {
        const { global } = analysisResult;
        
        return Object.entries(global.capacidadePorMes)
            .map(([mes, data]) => ({
                mes,
                valor: data.ausente,
                nivel: data.nivel,
                disponivel: data.disponivel
            }))
            .sort((a, b) => a.mes.localeCompare(b.mes));
    }
    
    /**
     * Gera dados para gráfico de capacidade
     * @param {Object} analysisResult 
     * @param {string} departamento 
     * @returns {Object}
     */
    generateCapacityChart(analysisResult, departamento = null) {
        const data = departamento
            ? analysisResult.byDepartment[departamento]?.capacidadePorMes
            : analysisResult.global.capacidadePorMes;
        
        if (!data) return null;
        
        const meses = Object.keys(data).sort();
        const disponivel = meses.map(mes => data[mes].disponivel);
        const ausente = meses.map(mes => data[mes].ausente);
        
        return {
            labels: meses.map(mes => {
                const [ano, m] = mes.split('-');
                const nomeMes = new Date(ano, parseInt(m) - 1, 1).toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });
                return nomeMes;
            }),
            datasets: [
                {
                    label: 'Disponível (%)',
                    data: disponivel,
                    backgroundColor: 'rgba(16, 185, 129, 0.5)',
                    borderColor: 'rgba(16, 185, 129, 1)',
                    borderWidth: 2
                },
                {
                    label: 'Ausente (%)',
                    data: ausente,
                    backgroundColor: 'rgba(239, 68, 68, 0.5)',
                    borderColor: 'rgba(239, 68, 68, 1)',
                    borderWidth: 2
                }
            ]
        };
    }
    
    // Métodos legados (compatibilidade)
    groupByMonth(servidores) { return this.calculateMonthlyAbsences(servidores); }
    identifyBottlenecks(ausenciasPorMes) { return this.detectCriticalPeriods({ global: { capacidadePorMes: ausenciasPorMes } }); }
    detectOverload(ausenciasPorMes) { return []; }
    getStats() {
        if (!this.impactData) return null;
        return { totalGargalos: this.impactData.gargalos?.length || 0, totalSobrecarga: this.impactData.sobrecarga?.length || 0 };
    }
    
    clearCache() {
        this.impactCache.clear();
        this.departmentCache.clear();
        console.log('🧹 Cache limpo');
    }
    
    destroy() {
        this.clearCache();
        console.log('🗑️ OperationalImpactAnalyzer destruído');
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = OperationalImpactAnalyzer;
}
