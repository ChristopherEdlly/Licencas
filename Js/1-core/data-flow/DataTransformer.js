/**
 * DataTransformer - Transformação e Enriquecimento de Dados
 *
 * Responsável por:
 * - Enriquecer registros com dados calculados
 * - Adicionar status e urgências
 * - Calcular saldos e projeções
 * - Normalizar e padronizar dados
 *
 * Dependências globais: DateUtils, FormatUtils
 * (Carregue os scripts de utilitários antes deste arquivo)
 */

const DataTransformer = (function () {
    'use strict';

    // ============================================================
    // ENRIQUECIMENTO DE LICENÇAS
    // ============================================================

    /**
     * Enriquece um registro de licença com dados calculados
     * @param {Object} licenca - Registro de licença básico
     * @returns {Object} Licença enriquecida
     */
    function enrichLicenca(licenca) {
        if (!licenca || typeof licenca !== 'object') {
            return null;
        }

        const enriched = { ...licenca };

        // Parse das datas do período
        if (enriched.periodo) {
            const dates = parsePeriodoDates(enriched.periodo);
            if (dates) {
                enriched.dataInicio = dates.dataInicio;
                enriched.dataFim = dates.dataFim;
            }
        }

        // Calcula dias restantes até o início
        if (enriched.dataInicio) {
            const hoje = new Date();
            enriched.diasAteInicio = DateUtils.diffInDays(hoje, enriched.dataInicio);
        }

        // Calcula dias restantes até o fim
        if (enriched.dataFim) {
            const hoje = new Date();
            enriched.diasAteFim = DateUtils.diffInDays(hoje, enriched.dataFim);
        }

        // Calcula urgência
        enriched.urgencia = calculateUrgencia(enriched);

        // Calcula status
        enriched.status = calculateStatus(enriched);

        // Calcula percentual de gozo
        if (enriched.dias > 0) {
            const gozados = enriched.diasGozados || 0;
            enriched.percentualGozado = (gozados / enriched.dias) * 100;
        }

        // Formata textos para exibição
        enriched.periodoFormatado = FormatUtils.capitalize(enriched.periodo || '');
        enriched.diasFormatado = FormatUtils.formatDays(enriched.dias);
        enriched.saldoFormatado = FormatUtils.formatDays(enriched.saldo || 0);

        return enriched;
    }

    /**
     * Parse período "jan/2025 a dez/2025" para datas
     * @param {string} periodo - Período no formato brasileiro
     * @returns {Object|null} { dataInicio, dataFim }
     */
    function parsePeriodoDates(periodo) {
        if (!periodo) return null;

        const match = periodo.match(/^(\w+)\/(\d{4})(?:\s+a\s+(\w+)\/(\d{4}))?$/i);
        if (!match) return null;

        const mesInicio = match[1];
        const anoInicio = match[2];
        const mesFim = match[3] || mesInicio;
        const anoFim = match[4] || anoInicio;

        const dataInicio = DateUtils.parseBrazilianDate(`${mesInicio}/${anoInicio}`);
        const dataFim = DateUtils.parseBrazilianDate(`${mesFim}/${anoFim}`);

        if (!dataInicio || !dataFim) return null;

        // Ajusta data fim para último dia do mês
        dataFim.setMonth(dataFim.getMonth() + 1);
        dataFim.setDate(0);

        return { dataInicio, dataFim };
    }

    /**
     * Calcula urgência baseada em dias até o início
     * @param {Object} licenca - Registro de licença
     * @returns {string} 'critica'|'alta'|'media'|'baixa'|'expirada'
     */
    function calculateUrgencia(licenca) {
        if (!licenca.diasAteInicio && licenca.diasAteInicio !== 0) {
            return 'indefinida';
        }

        const dias = licenca.diasAteInicio;

        // Já passou
        if (dias < 0) {
            // Verifica se ainda está no período
            if (licenca.diasAteFim && licenca.diasAteFim >= 0) {
                return 'em-gozo';
            }
            return 'expirada';
        }

        // Urgências baseadas em dias restantes
        if (dias <= 30) return 'critica';
        if (dias <= 60) return 'alta';
        if (dias <= 90) return 'moderada';
        return 'baixa';
    }

    /**
     * Calcula status da licença
     * @param {Object} licenca - Registro de licença
     * @returns {string} Status calculado
     */
    function calculateStatus(licenca) {
        const hoje = new Date();

        // Verifica se tem datas
        if (!licenca.dataInicio || !licenca.dataFim) {
            return 'pendente';
        }

        const inicio = new Date(licenca.dataInicio);
        const fim = new Date(licenca.dataFim);

        hoje.setHours(0, 0, 0, 0);
        inicio.setHours(0, 0, 0, 0);
        fim.setHours(0, 0, 0, 0);

        // Expirada
        if (hoje > fim) {
            const saldo = licenca.saldo || 0;
            if (saldo > 0) {
                return 'expirada-com-saldo';
            }
            return 'expirada';
        }

        // Em gozo
        if (hoje >= inicio && hoje <= fim) {
            return 'em-gozo';
        }

        // Agendada
        if (hoje < inicio) {
            return 'agendada';
        }

        return 'ativa';
    }

    // ============================================================
    // FUNÇÕES AUXILIARES
    // ============================================================

    /**
     * Normaliza texto para busca (remove acentos, lowercase)
     * @param {string} text - Texto para normalizar
     * @returns {string} Texto normalizado
     */
    function normalizeForSearch(text) {
        if (!text) return '';
        return text.toString()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '') // Remove acentos
            .toLowerCase()
            .trim();
    }

    /**
     * Converte valor para Date object
     * @param {*} value - String, Date, ou outro
     * @returns {Date|null} Date object ou null se inválido
     */
    function ensureDate(value) {
        if (!value) return null;
        if (value instanceof Date) return value;

        // Tentar parse direto (funciona com "YYYY-MM-DD HH:MM:SS")
        if (typeof value === 'string') {
            const s = value.trim();

            // ISO-like: YYYY-MM-DD or YYYY-MM-DD HH:MM:SS
            const isoMatch = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
            if (isoMatch) {
                const year = parseInt(isoMatch[1], 10);
                const month = parseInt(isoMatch[2], 10) - 1;
                const day = parseInt(isoMatch[3], 10);
                // Criar data ao meio-dia para evitar problemas de timezone
                const d = new Date(year, month, day, 12, 0, 0);
                if (!isNaN(d.getTime())) return d;
            }

            // Brazilian format: DD/MM/YYYY or DD/MM/YYYY HH:MM:SS
            const brMatch = s.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
            if (brMatch) {
                const day = parseInt(brMatch[1], 10);
                const month = parseInt(brMatch[2], 10) - 1;
                const year = parseInt(brMatch[3], 10);
                // Criar data ao meio-dia para evitar problemas de timezone
                const d = new Date(year, month, day, 12, 0, 0);
                if (!isNaN(d.getTime())) return d;
            }

            // Fallback to Date constructor as last resort
            const dateFallback = new Date(s);
            if (!isNaN(dateFallback.getTime())) return dateFallback;
        } else {
            const date = new Date(value);
            if (!isNaN(date.getTime())) {
                return date;
            }
        }

        // Tentar via CronogramaParser se disponível
        if (typeof window !== 'undefined' && window.CronogramaParser) {
            const parser = new window.CronogramaParser();
            return parser.parseDate(value);
        }

        return null;
    }

    // ============================================================
    // ENRIQUECIMENTO DE SERVIDORES
    // ============================================================

    /**
     * Calcula períodos aquisitivos de licença prêmio (5 anos de ciclos)
     * @param {Object} servidor - Servidor com licenças
     * @returns {Array<Object>} Array de períodos aquisitivos
     */
    function calcularPeriodosAquisitivos(servidor) {
        const periodos = [];
        const hoje = new Date();
        
        // Primeiro, tentar extrair períodos reais das licenças existentes
        const periodosReais = new Map();
        
        if (servidor.licencas && Array.isArray(servidor.licencas)) {
            servidor.licencas.forEach(lic => {
                const aquisitivoInicio = ensureDate(lic.aquisitivoInicio || lic.AQUISITIVO_INICIO);
                const aquisitivoFim = ensureDate(lic.aquisitivoFim || lic.AQUISITIVO_FIM);
                
                if (aquisitivoInicio && aquisitivoFim) {
                    const key = `${aquisitivoInicio.toISOString()}_${aquisitivoFim.toISOString()}`;
                    if (!periodosReais.has(key)) {
                        periodosReais.set(key, {
                            inicio: aquisitivoInicio,
                            fim: aquisitivoFim,
                            diasGozados: 0
                        });
                    }
                    // Somar dias gozados neste período
                    periodosReais.get(key).diasGozados += (lic.diasGozados || lic.dias || 0);
                }
            });
        }
        
        // Se encontrou períodos reais, usar eles
        if (periodosReais.size > 0) {
            // Debug desabilitado para evitar spam no console
            // console.log(`[DataTransformer] Encontrados ${periodosReais.size} períodos aquisitivos reais para ${servidor.nome || servidor.NOME}`);
            
            periodosReais.forEach((periodo, key) => {
                const diasGerados = 90;
                const disponivel = Math.max(0, diasGerados - periodo.diasGozados);
                
                const anoInicio = periodo.inicio.getFullYear();
                const anoFim = periodo.fim.getFullYear();
                const label = anoInicio === anoFim ? `${anoInicio}` : `${anoInicio}-${anoFim}`;
                
                periodos.push({
                    label: label,
                    inicio: periodo.inicio,
                    fim: periodo.fim,
                    anoInicio: anoInicio,
                    anoFim: anoFim,
                    diasGerados: diasGerados,
                    diasGozados: periodo.diasGozados,
                    disponivel: disponivel,
                    estaVencido: periodo.fim < hoje
                });
            });
            
            // Ordenar por data de início
            periodos.sort((a, b) => a.inicio - b.inicio);
            
            // Adicionar próximo período (futuro)
            if (periodos.length > 0) {
                const ultimoPeriodo = periodos[periodos.length - 1];
                const proximoInicio = new Date(ultimoPeriodo.fim);
                proximoInicio.setDate(proximoInicio.getDate() + 1);
                
                const proximoFim = new Date(proximoInicio);
                proximoFim.setFullYear(proximoFim.getFullYear() + 5);
                proximoFim.setDate(proximoFim.getDate() - 1);
                
                periodos.push({
                    label: `${proximoInicio.getFullYear()}-${proximoFim.getFullYear()}`,
                    inicio: proximoInicio,
                    fim: proximoFim,
                    anoInicio: proximoInicio.getFullYear(),
                    anoFim: proximoFim.getFullYear(),
                    diasGerados: 90,
                    diasGozados: 0,
                    disponivel: 90,
                    estaVencido: false
                });
            }
        } else {
            // Fallback: gerar períodos genéricos de 1 ano (últimos 5 anos)
            // Debug desabilitado para evitar spam no console
            // console.log(`[DataTransformer] Sem períodos reais, gerando períodos genéricos para ${servidor.nome || servidor.NOME}`);
            
            const anoAtual = hoje.getFullYear();
            for (let i = 0; i < 5; i++) {
                const anoInicio = anoAtual - (4 - i);
                const inicio = new Date(anoInicio, 0, 1);
                const fim = new Date(anoInicio, 11, 31);
                
                periodos.push({
                    label: `${anoInicio}`,
                    inicio: inicio,
                    fim: fim,
                    anoInicio: anoInicio,
                    anoFim: anoInicio,
                    diasGerados: 90,
                    diasGozados: 0,
                    disponivel: 90,
                    estaVencido: fim < hoje
                });
            }
        }
        
        return periodos;
    }

    /**
     * Enriquece um registro de servidor com dados calculados
     * @param {Object} servidor - Registro de servidor básico
     * @returns {Object} Servidor enriquecido
     */
    function enrichServidor(servidor) {
        if (!servidor || typeof servidor !== 'object') {
            return null;
        }

        const enriched = { ...servidor };

        // Defensive: if lotacao is empty, try to derive from alternative fields
        // But avoid filling with generic organization names like 'SEFAZ' (prefer specific gerência names)
        if ((!enriched.lotacao || String(enriched.lotacao).trim() === '') && (enriched.unidade || enriched.UNIDADE)) {
            const candidate = (enriched.UNIDADE || enriched.unidade || '').toString().trim();
            const normalize = typeof normalizeForSearch === 'function' ? normalizeForSearch : (t=> (t||'').toString().toLowerCase().trim());
            const candidateNorm = normalize(candidate);

            const GENERIC_UNIDADES = new Set(['sefaz','secretaria','secretaria de estado da fazenda','orgao','orgão','n/a','nao informada','unidade']);

            let accept = candidate && candidate.length > 2 && !GENERIC_UNIDADES.has(candidateNorm);

            // If hierarchy manager exists, prefer candidate only when it maps to a gerencia (specific)
            try {
                if (accept && typeof window !== 'undefined' && window.lotacaoHierarchyManager && typeof window.lotacaoHierarchyManager.findLotacao === 'function') {
                    const info = window.lotacaoHierarchyManager.findLotacao(candidate);
                    if (info && info.type && info.type !== 'gerencia') {
                        accept = false; // candidate is too generic (e.g., secretaria)
                    }
                }
            } catch (e) {
                // ignore hierarchy check failures
            }

            if (accept) {
                enriched.lotacao = candidate;
                try { console.debug('[DataTransformer] backfill lotacao from unidade for', enriched.nome || enriched.NOME || '(unknown)', '=>', enriched.lotacao); } catch (e) {}
            }
        }

        // If still missing, assign a sentinel value so UI and filters can show/select it
        if (!enriched.lotacao || String(enriched.lotacao).trim() === '') {
            enriched.lotacao = 'Sem lotação';
        }

        // Formata CPF
        if (enriched.cpf) {
            enriched.cpfFormatado = FormatUtils.formatCPF(enriched.cpf);
        }

        // Formata RG
        if (enriched.rg || enriched.RG) {
            const rgValue = enriched.rg || enriched.RG;
            enriched.rgFormatado = FormatUtils.formatRG(rgValue);
        }

        // Formata nome
        if (enriched.nome) {
            enriched.nomeFormatado = FormatUtils.formatProperName(enriched.nome);
        }

        // Formata telefone
        if (enriched.telefone) {
            enriched.telefoneFormatado = FormatUtils.formatPhone(enriched.telefone);
        }

        // Tentar parsear licenças se houver string de licenças prêmio
        if ((!enriched.licencas || !Array.isArray(enriched.licencas) || enriched.licencas.length === 0) && enriched.licencasPremio) {
            if (typeof DataParser !== 'undefined' && typeof DataParser.parseLicencasPremio === 'function') {
                const parsed = DataParser.parseLicencasPremio(enriched.licencasPremio);
                if (parsed && parsed.length > 0) {
                    enriched.licencas = parsed.map(p => ({
                        dataInicio: p.inicio,
                        dataFim: p.fim,
                        periodo: p.raw,
                        dias: DateUtils.diffInDays(p.inicio, p.fim) + 1
                    }));

                    // Enriquecer cada licença gerada
                    enriched.licencas = enriched.licencas.map(l => enrichLicenca(l));
                }
            }
        }

        // === NORMALIZAÇÃO DE LICENÇAS E CAMPOS ===

        // 1. GARANTIR que licencas é um array
        if (!Array.isArray(enriched.licencas)) {
            enriched.licencas = [];
        }

        // 2. Normalizar TODAS as licenças (converter datas para Date objects)
        enriched.licencas = enriched.licencas.map((lic, index) => {
            const inicioDate = ensureDate(lic.inicio || lic.dataInicio);
            const fimDate = ensureDate(lic.fim || lic.dataFim);

            // calcula dias a partir de inicio/fim quando possível
            let diasCalculated = 0;
            if (typeof lic.dias === 'number' && !isNaN(lic.dias)) {
                diasCalculated = lic.dias;
            } else if (inicioDate && fimDate) {
                diasCalculated = DateUtils.diffInDays(inicioDate, fimDate) + 1;
            } else {
                diasCalculated = 30;
            }

            // Helper para extrair número de uma string
            const parseNumber = (v) => {
                if (v === undefined || v === null) return NaN;
                if (typeof v === 'number') return v;
                const s = String(v).trim().replace(',', '.');
                const m = s.match(/(-?\d+(?:[\.,]\d+)?)/);
                if (!m) return NaN;
                const n = parseFloat(m[1].replace(',', '.'));
                return isNaN(n) ? NaN : n;
            };

            // Regra: a duração do agendamento (`diasCalculated`) é, por definição, a
            // quantidade de dias que o servidor irá gozar. Portanto `diasGozados` deverá
            // refletir esse valor por padrão. Vamos ainda capturar o valor original da
            // coluna GOZO (se existir) para auditoria e possíveis checagens posteriores.
            let diasGozadosParsed = diasCalculated;
            let diasGozadosSource = 'period'; // indica que veio do período (inicio/fim)

            const gozoOriginal = parseNumber(lic.diasGozados !== undefined ? lic.diasGozados : (lic.GOZO || lic.gozo));
            if (!isNaN(gozoOriginal)) {
                // Se houver um GOZO explícito, registremos mas NÃO sobrepor o cálculo
                // baseado em datas (seguindo sua regra de negócio).
                diasGozadosSource = (gozoOriginal === diasCalculated) ? 'gozo' : 'gozo_mismatch';
            }

            // saldo numérico usado apenas para referência/cálculo auxiliar
            let saldoParsed = parseNumber(lic.restando || lic.RESTANDO || lic.saldo);

            const licNormalizada = {
                inicio: inicioDate,
                fim: fimDate,
                tipo: lic.tipo || 'prevista',
                descricao: lic.descricao || '',
                dias: diasCalculated,
                diasGozados: diasGozadosParsed,
                meses: lic.meses || Math.ceil(diasCalculated / 30),
                restando: lic.restando || lic.RESTANDO || '',
                // saldo numérico (parse de strings como '30(DIAS)' ou '30') — usado em totais
                saldo: (function(r){
                    const s = parseNumber(r);
                    return isNaN(s) ? 0 : Math.round(s);
                })(lic.restando || lic.RESTANDO || lic.saldo || 0),
                aquisitivoInicio: ensureDate(lic.aquisitivoInicio),
                aquisitivoFim: ensureDate(lic.aquisitivoFim)
            };

            // Se não tem fim mas tem inicio e dias, calcular fim
            if (!licNormalizada.fim && licNormalizada.inicio && licNormalizada.dias) {
                const fimCalculado = new Date(licNormalizada.inicio);
                fimCalculado.setDate(fimCalculado.getDate() + licNormalizada.dias - 1);
                licNormalizada.fim = fimCalculado;
            }

            return licNormalizada;
        }).filter(lic => lic.inicio && lic.inicio instanceof Date); // Remove licenças sem data válida

        // 3. Enriquecer cada licença normalizada
        enriched.licencas = enriched.licencas.map(l => enrichLicenca(l));

        // 4. Normalizar campos para busca (preserva originais para exibição)
        if (enriched.lotacao) {
            enriched._lotacaoNormalizada = normalizeForSearch(enriched.lotacao);
        }

        if (enriched.nome || enriched.servidor) {
            const nomeOriginal = enriched.nome || enriched.servidor;
            enriched.nome = nomeOriginal; // Padronizar em "nome"
            enriched._nomeNormalizado = normalizeForSearch(nomeOriginal);
        }

        if (enriched.cargo) {
            enriched._cargoNormalizado = normalizeForSearch(enriched.cargo);
        }

        // === FIM DA NORMALIZAÇÃO ===

        // ===  CÁLCULO DE PERÍODOS AQUISITIVOS ===
        // Gera períodos aquisitivos de 5 anos com dias disponíveis
        enriched.periodosAquisitivos = calcularPeriodosAquisitivos(enriched);

        // Calcula estatísticas de licenças (se disponível)
        if (enriched.licencas && Array.isArray(enriched.licencas)) {
            enriched.totalLicencas = enriched.licencas.length;
            // `totalGozados` é a fonte-única canônica para total de dias consumidos
            enriched.totalGozados = enriched.licencas.reduce((sum, lic) => sum + (lic.diasGozados || 0), 0);

            // Calcular total gerado por períodos aquisitivos
            // Identificar períodos aquisitivos únicos e assumir 90 dias gerados por período
            const uniqueAquisitivos = new Set();
            enriched.licencas.forEach(lic => {
                if (lic.aquisitivoInicio instanceof Date || lic.aquisitivoFim instanceof Date) {
                    const inicioKey = lic.aquisitivoInicio ? lic.aquisitivoInicio.toISOString().slice(0,10) : '';
                    const fimKey = lic.aquisitivoFim ? lic.aquisitivoFim.toISOString().slice(0,10) : '';
                    uniqueAquisitivos.add(`${inicioKey}-${fimKey}`);
                } else if (lic.inicio instanceof Date) {
                    // fallback: use year window
                    uniqueAquisitivos.add(`aquisitivo-${lic.inicio.getFullYear()}`);
                }
            });

            const diasPorAquisitivo = 90;
            const totalGerado = uniqueAquisitivos.size * diasPorAquisitivo;

            // totalSaldo = totalGerado - totalGozados (clamp >= 0)
            enriched.totalSaldo = Math.max(0, totalGerado - enriched.totalGozados);
            enriched.totalDiasGanhos = totalGerado;

            enriched.totalGozadosFormatado = FormatUtils.formatDays(enriched.totalGozados);
            enriched.totalSaldoFormatado = FormatUtils.formatDays(enriched.totalSaldo);
        }

        // Identifica licenças urgentes
        if (enriched.licencas && Array.isArray(enriched.licencas)) {
            enriched.temLicencaUrgente = enriched.licencas.some(
                lic => lic.urgencia === 'critica' || lic.urgencia === 'alta'
            );

            // Determinar próxima licença para exibição (a primeira cronologicamente)
            const licencasComData = enriched.licencas.filter(l => l.dataInicio);
            if (licencasComData.length > 0) {
                // Ordenar por data
                licencasComData.sort((a, b) => {
                    const dateA = a.dataInicio instanceof Date ? a.dataInicio : new Date(a.dataInicio);
                    const dateB = b.dataInicio instanceof Date ? b.dataInicio : new Date(b.dataInicio);
                    return dateA - dateB;
                });

                enriched.proximaLicenca = licencasComData[0].dataInicio;
            }

            // Agregar urgência do servidor (pior caso)
            const urgencies = enriched.licencas.map(l => l.urgencia);
            if (urgencies.includes('critica')) enriched.urgencia = 'critica';
            else if (urgencies.includes('alta')) enriched.urgencia = 'alta';
            else if (urgencies.includes('moderada')) enriched.urgencia = 'moderada';
            else if (urgencies.includes('baixa')) enriched.urgencia = 'baixa';
            else if (urgencies.includes('em-gozo')) enriched.urgencia = 'baixa'; // Em gozo = baixa prioridade para alerta
            else enriched.urgencia = 'baixa';
        }

        return enriched;
    }

    // ============================================================
    // AGREGAÇÃO DE DADOS
    // ============================================================

    /**
     * Agrupa licenças de um servidor
     * @param {Array<Object>} licencas - Array de licenças
     * @returns {Object} Licenças agrupadas por servidor
     */
    function groupLicencasByServidor(licencas) {
        if (!Array.isArray(licencas)) return {};

        const grouped = {};

        for (const licenca of licencas) {
            const cpf = licenca.cpf;
            if (!cpf) continue;

            if (!grouped[cpf]) {
                grouped[cpf] = {
                    cpf: cpf,
                    nome: licenca.nome,
                    matricula: licenca.matricula,
                    cargo: licenca.cargo,
                    lotacao: licenca.lotacao,
                    licencas: []
                };
            }

            grouped[cpf].licencas.push(licenca);
        }

        return grouped;
    }

    /**
     * Enriquece um array de licenças com servidores agrupados
     * @param {Array<Object>} licencas - Array de licenças
     * @returns {Array<Object>} Array de servidores enriquecidos
     */
    function enrichServidoresWithLicencas(licencas) {
        if (!Array.isArray(licencas)) return [];

        // Primeiro enriquece cada licença individualmente
        const enrichedLicencas = licencas.map(lic => enrichLicenca(lic)).filter(Boolean);

        // Agrupa por servidor
        const grouped = groupLicencasByServidor(enrichedLicencas);

        // Enriquece cada servidor
        const servidores = Object.values(grouped).map(srv => enrichServidor(srv));

        return servidores;
    }

    // ============================================================
    // NORMALIZAÇÃO DE DADOS
    // ============================================================

    /**
     * Normaliza valores numéricos (converte strings para números)
     * @param {Object} obj - Objeto para normalizar
     * @param {Array<string>} numericFields - Campos que devem ser numéricos
     * @returns {Object} Objeto normalizado
     */
    function normalizeNumericFields(obj, numericFields) {
        if (!obj || typeof obj !== 'object') return obj;

        const normalized = { ...obj };

        for (const field of numericFields) {
            if (normalized[field] !== undefined && normalized[field] !== null) {
                const value = normalized[field];
                if (typeof value === 'string') {
                    const num = parseFloat(value.replace(',', '.'));
                    if (!isNaN(num)) {
                        normalized[field] = num;
                    }
                }
            }
        }

        return normalized;
    }

    /**
     * Normaliza um registro de licença
     * @param {Object} licenca - Licença para normalizar
     * @returns {Object} Licença normalizada
     */
    function normalizeLicenca(licenca) {
        const numericFields = ['dias', 'diasGozados', 'saldo'];
        return normalizeNumericFields(licenca, numericFields);
    }

    /**
     * Remove campos desnecessários de um objeto
     * @param {Object} obj - Objeto original
     * @param {Array<string>} fieldsToKeep - Campos para manter
     * @returns {Object} Objeto apenas com campos especificados
     */
    function pickFields(obj, fieldsToKeep) {
        if (!obj || typeof obj !== 'object') return obj;

        const picked = {};

        for (const field of fieldsToKeep) {
            if (obj.hasOwnProperty(field)) {
                picked[field] = obj[field];
            }
        }

        return picked;
    }

    /**
     * Remove campos específicos de um objeto
     * @param {Object} obj - Objeto original
     * @param {Array<string>} fieldsToRemove - Campos para remover
     * @returns {Object} Objeto sem os campos especificados
     */
    function omitFields(obj, fieldsToRemove) {
        if (!obj || typeof obj !== 'object') return obj;

        const omitted = { ...obj };

        for (const field of fieldsToRemove) {
            delete omitted[field];
        }

        return omitted;
    }

    // ============================================================
    // TRANSFORMAÇÕES EM LOTE
    // ============================================================

    /**
     * Aplica transformação em array de objetos
     * @param {Array<Object>} items - Array de itens
     * @param {Function} transformer - Função de transformação
     * @returns {Array<Object>} Array transformado
     */
    function transformBatch(items, transformer) {
        if (!Array.isArray(items)) return [];
        if (typeof transformer !== 'function') return items;

        return items.map(transformer).filter(Boolean);
    }

    /**
     * Enriquece um array de licenças
     * @param {Array<Object>} licencas - Array de licenças
     * @returns {Array<Object>} Array de licenças enriquecidas
     */
    function enrichLicencasBatch(licencas) {
        return transformBatch(licencas, enrichLicenca);
    }

    /**
     * Enriquece um array de servidores
     * @param {Array<Object>} servidores - Array de servidores
     * @returns {Array<Object>} Array de servidores enriquecidos
     */
    function enrichServidoresBatch(servidores) {
        return transformBatch(servidores, enrichServidor);
    }

    // ============================================================
    // ORDENAÇÃO
    // ============================================================

    /**
     * Cria função comparadora para ordenação
     * @param {string} field - Campo para ordenar
     * @param {string} order - 'asc' ou 'desc'
     * @returns {Function} Função comparadora
     */
    function createSorter(field, order = 'asc') {
        return (a, b) => {
            const valueA = a[field];
            const valueB = b[field];

            if (valueA === valueB) return 0;

            let comparison = 0;
            if (valueA > valueB) {
                comparison = 1;
            } else if (valueA < valueB) {
                comparison = -1;
            }

            return order === 'desc' ? -comparison : comparison;
        };
    }

    /**
     * Ordena licenças por urgência
     * @param {Array<Object>} licencas - Array de licenças
     * @returns {Array<Object>} Array ordenado
     */
    function sortByUrgencia(licencas) {
        if (!Array.isArray(licencas)) return [];

        const urgenciaOrder = {
            'critica': 1,
            'alta': 2,
            'moderada': 3,
            'baixa': 4,
            'em-gozo': 5,
            'expirada': 6,
            'indefinida': 7
        };

        return [...licencas].sort((a, b) => {
            const orderA = urgenciaOrder[a.urgencia] || 999;
            const orderB = urgenciaOrder[b.urgencia] || 999;
            return orderA - orderB;
        });
    }

    // ============================================================
    // EXPORTAÇÃO
    // ============================================================

    return {
        // Enriquecimento
        enrichLicenca,
        enrichServidor,
        enrichServidoresWithLicencas,

        // Parsing
        parsePeriodoDates,

        // Cálculos
        calculateUrgencia,
        calculateStatus,

        // Agregação
        groupLicencasByServidor,

        // Normalização
        normalizeNumericFields,
        normalizeLicenca,
        pickFields,
        omitFields,

        // Transformações em lote
        transformBatch,
        enrichLicencasBatch,
        enrichServidoresBatch,

        // Ordenação
        createSorter,
        sortByUrgencia
    };
})();

// Exportação para Node.js e Browser
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DataTransformer;
}

// Export para browser (global)
if (typeof window !== 'undefined') {
    window.DataTransformer = DataTransformer;
}
