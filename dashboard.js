/**
 * dashboard.js
 * Lógica principal da aplicação, gráficos e interações
 */

class DashboardLicencas {
    constructor() {
        this.data = [];
        this.processedData = [];
        this.charts = {};
        this.currentView = 'original';
        this.monthsLimit = 60;
        
        this.initializeEventListeners();
        this.setupDragAndDrop();
    }

    initializeEventListeners() {
        // File input
        document.getElementById('fileInput').addEventListener('change', (e) => {
            this.handleFiles(e.target.files);
        });

        // Filters
        document.getElementById('departmentFilter').addEventListener('change', () => this.applyFilters());
        document.getElementById('yearFilter').addEventListener('change', () => this.applyFilters());
        document.getElementById('monthsLimit').addEventListener('change', (e) => {
            this.monthsLimit = parseInt(e.target.value) || 60;
            this.reprocessData();
        });

        // Search
        document.getElementById('searchInput').addEventListener('input', (e) => {
            this.searchTable(e.target.value);
        });
    }

    setupDragAndDrop() {
        const uploadArea = document.getElementById('uploadArea');
        
        uploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadArea.classList.add('dragover');
        });

        uploadArea.addEventListener('dragleave', () => {
            uploadArea.classList.remove('dragover');
        });

        uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadArea.classList.remove('dragover');
            this.handleFiles(e.dataTransfer.files);
        });
    }

    async handleFiles(files) {
        if (files.length === 0) return;
        
        this.showProcessing('Carregando arquivo...');
        
        try {
            for (const file of files) {
                await this.processFile(file);
            }
            
            if (this.data.length > 0) {
                await this.processData();
                this.hideProcessing();
                this.showDashboard();
            } else {
                this.showError('Nenhum dado foi encontrado nos arquivos');
            }
        } catch (error) {
            this.showError('Erro ao processar arquivo: ' + error.message);
        }
    }

    async processFile(file) {
        const extension = file.name.split('.').pop().toLowerCase();
        
        if (extension === 'csv') {
            await this.processCSV(file);
        } else if (extension === 'xlsx' || extension === 'xls') {
            await this.processExcel(file);
        } else {
            throw new Error('Formato de arquivo não suportado: ' + extension);
        }
    }

    async processCSV(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const csv = e.target.result;
                    const lines = csv.split('\n').filter(line => line.trim());
                    
                    if (lines.length < 2) {
                        reject(new Error('Arquivo CSV vazio ou inválido'));
                        return;
                    }

                    const headers = lines[0].split(',').map(h => h.trim().replace(/['"]/g, ''));
                    const data = [];

                    for (let i = 1; i < lines.length; i++) {
                        const values = this.parseCSVLine(lines[i]);
                        if (values.length >= headers.length) {
                            const row = {};
                            headers.forEach((header, index) => {
                                row[header] = values[index]?.trim().replace(/['"]/g, '') || '';
                            });
                            data.push(row);
                        }
                    }

                    this.data = [...this.data, ...data];
                    resolve();
                } catch (error) {
                    reject(error);
                }
            };
            reader.onerror = () => reject(new Error('Erro ao ler arquivo CSV'));
            reader.readAsText(file);
        });
    }

    async processExcel(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const data = new Uint8Array(e.target.result);
                    const workbook = XLSX.read(data, { type: 'array' });
                    const sheetName = workbook.SheetNames[0];
                    const worksheet = workbook.Sheets[sheetName];
                    const jsonData = XLSX.utils.sheet_to_json(worksheet);
                    
                    this.data = [...this.data, ...jsonData];
                    resolve();
                } catch (error) {
                    reject(error);
                }
            };
            reader.onerror = () => reject(new Error('Erro ao ler arquivo Excel'));
            reader.readAsArrayBuffer(file);
        });
    }

    parseCSVLine(line) {
        const result = [];
        let current = '';
        let inQuotes = false;
        
        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            
            if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
                result.push(current);
                current = '';
            } else {
                current += char;
            }
        }
        result.push(current);
        return result;
    }

    async processData() {
        this.showProcessing('Processando cronogramas...');
        
        this.processedData = [];
        const cronogramaColumn = this.findCronogramaColumn();
        
        if (!cronogramaColumn) {
            throw new Error('Coluna "Cronograma" não encontrada no arquivo');
        }

        let processedCount = 0;
        for (const row of this.data) {
            this.showProcessing(`Processando cronogramas... ${++processedCount}/${this.data.length}`);
            
            const cronograma = row[cronogramaColumn];
            const parsedDates = cronograma ? cronogramaParser.parse(cronograma, this.monthsLimit) : [];
            
            this.processedData.push({
                ...row,
                cronogramaOriginal: cronograma,
                licencasProcessadas: parsedDates,
                totalLicencas: parsedDates.length
            });
            
            // Allow UI to update
            await new Promise(resolve => setTimeout(resolve, 1));
        }

        this.updateKPIs();
        this.populateFilters();
        this.createCharts();
        this.populateTable();
    }

    reprocessData() {
        if (this.data.length === 0) return;
        
        this.processData().then(() => {
            this.applyFilters();
        });
    }

    findCronogramaColumn() {
        if (this.data.length === 0) return null;
        
        const firstRow = this.data[0];
        const possibleNames = ['cronograma', 'Cronograma', 'CRONOGRAMA', 'cronogramas', 'Cronogramas'];
        
        for (const name of possibleNames) {
            if (firstRow.hasOwnProperty(name)) {
                return name;
            }
        }
        
        // Buscar por similaridade
        const keys = Object.keys(firstRow);
        for (const key of keys) {
            if (key.toLowerCase().includes('cronograma')) {
                return key;
            }
        }
        
        return null;
    }

    updateKPIs() {
        const totalServidores = this.processedData.length;
        const totalLicencas = this.processedData.reduce((sum, row) => sum + row.totalLicencas, 0);
        
        // Próximas licenças (90 dias)
        const today = new Date();
        const in90Days = new Date(today.getTime() + (90 * 24 * 60 * 60 * 1000));
        
        let proximasLicencas = 0;
        for (const row of this.processedData) {
            for (const dateStr of row.licencasProcessadas) {
                const date = new Date(dateStr);
                if (date >= today && date <= in90Days) {
                    proximasLicencas++;
                }
            }
        }

        // Departamentos únicos
        const departamentos = new Set();
        for (const row of this.processedData) {
            const dept = this.getDepartamento(row);
            if (dept) departamentos.add(dept);
        }

        document.getElementById('totalServidores').textContent = totalServidores.toLocaleString();
        document.getElementById('totalLicencas').textContent = totalLicencas.toLocaleString();
        document.getElementById('proximasLicencas').textContent = proximasLicencas.toLocaleString();
        document.getElementById('totalDepartamentos').textContent = departamentos.size.toLocaleString();
    }

    getDepartamento(row) {
        const possibleNames = ['departamento', 'Departamento', 'DEPARTAMENTO', 'departamentos', 'Departamentos', 'setor', 'Setor'];
        
        for (const name of possibleNames) {
            if (row[name]) return row[name];
        }
        
        return 'Não especificado';
    }

    populateFilters() {
        // Populate department filter
        const departmentSelect = document.getElementById('departmentFilter');
        const departments = new Set();
        
        for (const row of this.processedData) {
            const dept = this.getDepartamento(row);
            departments.add(dept);
        }
        
        departmentSelect.innerHTML = '<option value="">Todos</option>';
        Array.from(departments).sort().forEach(dept => {
            const option = document.createElement('option');
            option.value = dept;
            option.textContent = dept;
            departmentSelect.appendChild(option);
        });

        // Populate year filter
        const yearSelect = document.getElementById('yearFilter');
        const years = new Set();
        
        for (const row of this.processedData) {
            for (const dateStr of row.licencasProcessadas) {
                const year = new Date(dateStr).getFullYear();
                years.add(year);
            }
        }
        
        yearSelect.innerHTML = '<option value="">Todos</option>';
        Array.from(years).sort().forEach(year => {
            const option = document.createElement('option');
            option.value = year;
            option.textContent = year;
            yearSelect.appendChild(option);
        });
    }

    createCharts() {
        this.createMonthlyChart();
        this.createDepartmentChart();
        this.createTimelineChart();
        this.createYearlyChart();
    }

    createMonthlyChart() {
        const ctx = document.getElementById('monthlyChart').getContext('2d');
        
        const monthData = {};
        for (const row of this.processedData) {
            for (const dateStr of row.licencasProcessadas) {
                const date = new Date(dateStr);
                const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
                monthData[monthKey] = (monthData[monthKey] || 0) + 1;
            }
        }

        const sortedMonths = Object.keys(monthData).sort();
        const labels = sortedMonths.map(month => {
            const [year, monthNum] = month.split('-');
            const monthName = new Date(year, monthNum - 1).toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' });
            return monthName;
        });
        const data = sortedMonths.map(month => monthData[month]);

        this.charts.monthly = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Licenças por Mês',
                    data: data,
                    borderColor: 'rgba(102, 126, 234, 1)',
                    backgroundColor: 'rgba(102, 126, 234, 0.1)',
                    tension: 0.4,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            stepSize: 1
                        }
                    }
                }
            }
        });
    }

    createDepartmentChart() {
        const ctx = document.getElementById('departmentChart').getContext('2d');
        
        const deptData = {};
        for (const row of this.processedData) {
            const dept = this.getDepartamento(row);
            deptData[dept] = (deptData[dept] || 0) + row.totalLicencas;
        }

        const labels = Object.keys(deptData);
        const data = Object.values(deptData);
        const colors = this.generateColors(labels.length);

        this.charts.department = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{
                    data: data,
                    backgroundColor: colors,
                    borderWidth: 2,
                    borderColor: '#fff'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom'
                    }
                }
            }
        });
    }

    createTimelineChart() {
        const ctx = document.getElementById('timelineChart').getContext('2d');
        
        // Agrupar por ano
        const yearData = {};
        for (const row of this.processedData) {
            for (const dateStr of row.licencasProcessadas) {
                const year = new Date(dateStr).getFullYear();
                yearData[year] = (yearData[year] || 0) + 1;
            }
        }

        const years = Object.keys(yearData).sort();
        const data = years.map(year => yearData[year]);

        this.charts.timeline = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: years,
                datasets: [{
                    label: 'Licenças',
                    data: data,
                    backgroundColor: 'rgba(118, 75, 162, 0.8)',
                    borderColor: 'rgba(118, 75, 162, 1)',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            stepSize: 1
                        }
                    }
                }
            }
        });
    }

    createYearlyChart() {
        const ctx = document.getElementById('yearlyChart').getContext('2d');
        
        const yearData = {};
        const currentYear = new Date().getFullYear();
        
        // Próximos 5 anos
        for (let year = currentYear; year < currentYear + 5; year++) {
            yearData[year] = 0;
        }
        
        for (const row of this.processedData) {
            for (const dateStr of row.licencasProcessadas) {
                const year = new Date(dateStr).getFullYear();
                if (year >= currentYear && year < currentYear + 5) {
                    yearData[year]++;
                }
            }
        }

        const labels = Object.keys(yearData);
        const data = Object.values(yearData);

        this.charts.yearly = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Licenças Futuras',
                    data: data,
                    backgroundColor: 'rgba(102, 126, 234, 0.8)',
                    borderColor: 'rgba(102, 126, 234, 1)',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            stepSize: 1
                        }
                    }
                }
            }
        });
    }

    generateColors(count) {
        const colors = [
            'rgba(102, 126, 234, 0.8)',
            'rgba(118, 75, 162, 0.8)',
            'rgba(255, 99, 132, 0.8)',
            'rgba(54, 162, 235, 0.8)',
            'rgba(255, 205, 86, 0.8)',
            'rgba(75, 192, 192, 0.8)',
            'rgba(153, 102, 255, 0.8)',
            'rgba(255, 159, 64, 0.8)'
        ];
        
        const result = [];
        for (let i = 0; i < count; i++) {
            result.push(colors[i % colors.length]);
        }
        return result;
    }

    populateTable() {
        const tbody = document.getElementById('tableBody');
        tbody.innerHTML = '';

        for (const row of this.processedData) {
            const tr = document.createElement('tr');
            
            const nome = this.getFieldValue(row, ['nome', 'Nome', 'NOME']);
            const dataNasc = this.getFieldValue(row, ['Data Nascimento', 'data_nascimento', 'nascimento']);
            const idade = this.getFieldValue(row, ['idade', 'Idade', 'IDADE']);
            const dataAdm = this.getFieldValue(row, ['Data Admissão', 'data_admissao', 'admissao']);
            const departamento = this.getDepartamento(row);
            const cronogramaOriginal = row.cronogramaOriginal || '';
            const licencasProcessadas = row.licencasProcessadas.join('; ');

            tr.innerHTML = `
                <td>${nome}</td>
                <td>${dataNasc}</td>
                <td>${idade}</td>
                <td>${dataAdm}</td>
                <td>${departamento}</td>
                <td class="cronograma-cell">${cronogramaOriginal}</td>
                <td class="cronograma-cell">${licencasProcessadas}</td>
            `;
            
            tbody.appendChild(tr);
        }
    }

    getFieldValue(row, possibleNames) {
        for (const name of possibleNames) {
            if (row[name] !== undefined && row[name] !== null && row[name] !== '') {
                return row[name];
            }
        }
        return '';
    }

    applyFilters() {
        const departmentFilter = document.getElementById('departmentFilter').value;
        const yearFilter = document.getElementById('yearFilter').value;
        
        // Filter table
        const rows = document.querySelectorAll('#tableBody tr');
        for (const row of rows) {
            let show = true;
            
            if (departmentFilter) {
                const deptCell = row.cells[4].textContent;
                show = show && deptCell === departmentFilter;
            }
            
            if (yearFilter) {
                const licencasCell = row.cells[6].textContent;
                show = show && licencasCell.includes(yearFilter);
            }
            
            row.style.display = show ? '' : 'none';
        }
    }

    searchTable(searchTerm) {
        const rows = document.querySelectorAll('#tableBody tr');
        const term = searchTerm.toLowerCase();
        
        for (const row of rows) {
            const text = row.textContent.toLowerCase();
            row.style.display = text.includes(term) ? '' : 'none';
        }
    }

    showProcessing(message) {
        document.getElementById('processingStatus').textContent = message;
        document.getElementById('processingSection').style.display = 'block';
        document.getElementById('dashboardSection').style.display = 'none';
        document.getElementById('tableSection').style.display = 'none';
    }

    hideProcessing() {
        document.getElementById('processingSection').style.display = 'none';
    }

    showDashboard() {
        document.getElementById('dashboardSection').style.display = 'block';
        document.getElementById('tableSection').style.display = 'block';
        
        // Add animation classes
        document.getElementById('dashboardSection').classList.add('fade-in');
        document.getElementById('tableSection').classList.add('slide-up');
    }

    showError(message) {
        this.hideProcessing();
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error';
        errorDiv.innerHTML = `<strong>Erro:</strong> ${message}`;
        
        const container = document.querySelector('.container');
        container.insertBefore(errorDiv, document.getElementById('dashboardSection'));
        
        setTimeout(() => {
            errorDiv.remove();
        }, 5000);
    }

    exportData() {
        const exportData = this.processedData.map(row => ({
            Nome: this.getFieldValue(row, ['nome', 'Nome', 'NOME']),
            'Data Nascimento': this.getFieldValue(row, ['Data Nascimento', 'data_nascimento', 'nascimento']),
            Idade: this.getFieldValue(row, ['idade', 'Idade', 'IDADE']),
            'Data Admissão': this.getFieldValue(row, ['Data Admissão', 'data_admissao', 'admissao']),
            Departamento: this.getDepartamento(row),
            'Cronograma Original': row.cronogramaOriginal || '',
            'Total Licenças': row.totalLicencas,
            'Licenças Processadas': row.licencasProcessadas.join('; ')
        }));

        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet(exportData);
        XLSX.utils.book_append_sheet(wb, ws, 'Cronogramas Processados');
        
        XLSX.writeFile(wb, `cronogramas_processados_${new Date().toISOString().split('T')[0]}.xlsx`);
    }
}

// Global functions
function resetFilters() {
    document.getElementById('departmentFilter').value = '';
    document.getElementById('yearFilter').value = '';
    document.getElementById('searchInput').value = '';
    dashboard.applyFilters();
    dashboard.searchTable('');
}

function exportData() {
    dashboard.exportData();
}

function toggleTableView() {
    const btn = event.target;
    if (dashboard.currentView === 'original') {
        dashboard.currentView = 'processed';
        btn.textContent = 'Ver Original';
        // Could implement different table views here
    } else {
        dashboard.currentView = 'original';
        btn.textContent = 'Ver Cronogramas';
        // Could implement different table views here
    }
}

// Initialize application
const dashboard = new DashboardLicencas();