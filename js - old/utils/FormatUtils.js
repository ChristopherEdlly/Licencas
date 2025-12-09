/**
 * FormatUtils.js
 * Módulo de formatação de dados para exibição
 */

class FormatUtils {
    constructor() {
        this.dateUtils = new DateUtils();
    }

    /**
     * Formata número com separadores de milhar
     * @param {number} num - Número para formatar
     * @returns {string} Número formatado
     */
    formatarNumero(num) {
        if (num === null || num === undefined) return '0';
        return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    }

    /**
     * Formata CPF
     * @param {string} cpf - CPF sem formatação
     * @returns {string} CPF formatado (XXX.XXX.XXX-XX)
     */
    formatarCPF(cpf) {
        if (!cpf) return '';
        
        const limpo = cpf.toString().replace(/[^\d]/g, '');
        if (limpo.length !== 11) return cpf;
        
        return limpo.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    }

    /**
     * Formata sexo para exibição
     * @param {string} sexo - Sexo (M/F)
     * @returns {string} Sexo formatado
     */
    formatarSexo(sexo) {
        if (!sexo) return '';
        
        const s = sexo.toString().toUpperCase().trim();
        if (s === 'M' || s === 'MAS' || s === 'MASCULINO') return 'Masculino';
        if (s === 'F' || s === 'FEM' || s === 'FEMININO') return 'Feminino';
        return sexo;
    }

    /**
     * Formata idade
     * @param {number} idade - Idade em anos
     * @returns {string} Idade formatada
     */
    formatarIdade(idade) {
        if (!idade && idade !== 0) return '-';
        
        const anos = Math.floor(idade);
        return `${anos} ${anos === 1 ? 'ano' : 'anos'}`;
    }

    /**
     * Formata tempo de serviço
     * @param {number} anos - Anos de serviço
     * @returns {string} Tempo formatado
     */
    formatarTempoServico(anos) {
        if (!anos && anos !== 0) return '-';
        
        const a = Math.floor(anos);
        return `${a} ${a === 1 ? 'ano' : 'anos'}`;
    }

    /**
     * Formata duração em dias
     * @param {number} dias - Número de dias
     * @returns {string} Duração formatada (ex: "30 dias", "90 dias (3 meses)")
     */
    formatarDuracao(dias) {
        if (!dias && dias !== 0) return '-';
        
        if (dias < 30) {
            return `${dias} ${dias === 1 ? 'dia' : 'dias'}`;
        }
        
        const meses = Math.floor(dias / 30);
        const diasRestantes = dias % 30;
        
        if (diasRestantes === 0) {
            return `${dias} dias (${meses} ${meses === 1 ? 'mês' : 'meses'})`;
        }
        
        return `${dias} dias (${meses}m ${diasRestantes}d)`;
    }

    /**
     * Formata quantidade de meses de licença
     * @param {number} meses - Quantidade de meses
     * @returns {string} Meses formatados
     */
    formatarMesesLicenca(meses) {
        if (!meses && meses !== 0) return '-';
        
        const dias = meses * 30;
        const licencas = Math.floor(meses / 3);
        const mesesRestantes = meses % 3;
        
        let texto = `${meses} ${meses === 1 ? 'mês' : 'meses'} (${dias} dias)`;
        
        if (licencas > 0) {
            texto += ` = ${licencas} ${licencas === 1 ? 'licença' : 'licenças'}`;
            if (mesesRestantes > 0) {
                texto += ` + ${mesesRestantes} ${mesesRestantes === 1 ? 'mês' : 'meses'}`;
            }
        }
        
        return texto;
    }

    /**
     * Formata nível de urgência com ícone e cor
     * @param {string} urgencia - Nível de urgência (URGENTE, MEDIO, BAIXO, SEM_LICENCA)
     * @returns {Object} { texto, icone, classe }
     */
    formatarUrgencia(urgencia) {
        const urgenciaUpper = (urgencia || '').toString().toUpperCase();
        
        const mapa = {
            'URGENTE': {
                texto: 'Urgente',
                icone: '🔴',
                classe: 'urgency-critical'
            },
            'MEDIO': {
                texto: 'Médio',
                icone: '🟡',
                classe: 'urgency-moderate'
            },
            'BAIXO': {
                texto: 'Baixo',
                icone: '🟢',
                classe: 'urgency-low'
            },
            'SEM_LICENCA': {
                texto: 'Sem Licença',
                icone: '⚪',
                classe: 'urgency-none'
            },
            'CRITICAL': {
                texto: 'Crítico',
                icone: '🔴',
                classe: 'urgency-critical'
            },
            'HIGH': {
                texto: 'Alto',
                icone: '🟠',
                classe: 'urgency-high'
            },
            'MODERATE': {
                texto: 'Moderado',
                icone: '🟡',
                classe: 'urgency-moderate'
            },
            'LOW': {
                texto: 'Baixo',
                icone: '🟢',
                classe: 'urgency-low'
            }
        };
        
        return mapa[urgenciaUpper] || {
            texto: 'Não definido',
            icone: '⚫',
            classe: 'urgency-unknown'
        };
    }

    /**
     * Formata data de aposentadoria prevista
     * @param {Date} dataAposentadoria - Data prevista
     * @param {Date} dataAtual - Data atual (padrão: hoje)
     * @returns {string} Texto formatado
     */
    formatarAposentadoriaPrevista(dataAposentadoria, dataAtual = new Date()) {
        if (!dataAposentadoria) return 'Não calculado';
        
        const data = this.dateUtils.formatarData(dataAposentadoria);
        const anos = Math.floor((dataAposentadoria - dataAtual) / (365.25 * 24 * 60 * 60 * 1000));
        
        if (anos < 0) {
            return `${data} (já atingiu)`;
        } else if (anos === 0) {
            return `${data} (este ano)`;
        } else if (anos === 1) {
            return `${data} (em 1 ano)`;
        } else {
            return `${data} (em ${anos} anos)`;
        }
    }

    /**
     * Trunca texto com reticências
     * @param {string} texto - Texto para truncar
     * @param {number} maxLength - Tamanho máximo
     * @returns {string} Texto truncado
     */
    truncarTexto(texto, maxLength = 50) {
        if (!texto) return '';
        
        const str = texto.toString();
        if (str.length <= maxLength) return str;
        
        return str.substring(0, maxLength - 3) + '...';
    }

    /**
     * Formata porcentagem
     * @param {number} valor - Valor decimal (0-1)
     * @param {number} casasDecimais - Casas decimais
     * @returns {string} Porcentagem formatada
     */
    formatarPorcentagem(valor, casasDecimais = 1) {
        if (valor === null || valor === undefined) return '0%';
        
        const percent = (valor * 100).toFixed(casasDecimais);
        return `${percent}%`;
    }

    /**
     * Formata lista de itens
     * @param {Array} items - Array de itens
     * @param {string} separador - Separador (padrão: ', ')
     * @returns {string} Lista formatada
     */
    formatarLista(items, separador = ', ') {
        if (!items || !Array.isArray(items) || items.length === 0) return '-';
        
        return items.join(separador);
    }

    /**
     * Cria badge HTML para status
     * @param {string} texto - Texto do badge
     * @param {string} classe - Classe CSS
     * @returns {string} HTML do badge
     */
    criarBadge(texto, classe = '') {
        return `<span class="badge ${classe}">${this.sanitize(texto)}</span>`;
    }

    /**
     * Sanitiza texto para HTML
     * @param {string} texto - Texto para sanitizar
     * @returns {string} Texto sanitizado
     */
    sanitize(texto) {
        if (!texto) return '';
        
        const div = document.createElement('div');
        div.textContent = texto.toString();
        return div.innerHTML;
    }

    /**
     * Formata linha da tabela de servidores
     * @param {Object} servidor - Dados do servidor
     * @returns {Object} Dados formatados para exibição
     */
    formatarServidorParaTabela(servidor) {
        return {
            nome: this.sanitize(servidor.nome || ''),
            cpf: this.formatarCPF(servidor.cpf),
            idade: servidor.idade || '-',
            sexo: this.formatarSexo(servidor.sexo),
            cargo: this.sanitize(servidor.cargo || '-'),
            lotacao: this.sanitize(servidor.lotacao || '-'),
            tempoServico: this.formatarTempoServico(servidor.tempoServico),
            mesesLicenca: servidor.mesesLicenca || '-',
            urgencia: this.formatarUrgencia(servidor.urgencia),
            proximaLicenca: servidor.proximaLicenca ? 
                this.dateUtils.formatarData(servidor.proximaLicenca) : 'Não agendada'
        };
    }

    /**
     * Gera resumo de estatísticas
     * @param {Object} stats - Estatísticas
     * @returns {string} HTML com resumo
     */
    formatarResumoEstatisticas(stats) {
        if (!stats) return '';
        
        return `
            <div class="stats-summary">
                <div class="stat-item">
                    <span class="stat-label">Total:</span>
                    <span class="stat-value">${this.formatarNumero(stats.total || 0)}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Com Licença:</span>
                    <span class="stat-value">${this.formatarNumero(stats.comLicenca || 0)}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Sem Licença:</span>
                    <span class="stat-value">${this.formatarNumero(stats.semLicenca || 0)}</span>
                </div>
            </div>
        `;
    }
}

// Exportar para uso global
if (typeof window !== 'undefined') {
    window.FormatUtils = FormatUtils;
}

// Exportar para módulos ES6
if (typeof module !== 'undefined' && module.exports) {
    module.exports = FormatUtils;
}
