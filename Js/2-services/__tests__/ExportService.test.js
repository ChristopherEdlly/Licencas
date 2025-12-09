/**
 * @jest-environment jsdom
 */

describe('ExportService', () => {
    beforeEach(() => {
        // Mock globals
        global.XLSX = {
            utils: {
                book_new: jest.fn(() => ({})),
                json_to_sheet: jest.fn(() => ({})),
                book_append_sheet: jest.fn()
            },
            writeFile: jest.fn()
        };

        global.jspdf = {
            jsPDF: jest.fn().mockImplementation(() => ({
                internal: {
                    pageSize: {
                        getWidth: () => 210,
                        getHeight: () => 297
                    },
                    getNumberOfPages: () => 1
                },
                addImage: jest.fn(),
                addPage: jest.fn(),
                save: jest.fn(),
                text: jest.fn(),
                setFontSize: jest.fn(),
                setPage: jest.fn(),
                autoTable: jest.fn()
            }))
        };

        global.html2canvas = jest.fn().mockResolvedValue({
            height: 1000,
            width: 800,
            toDataURL: jest.fn(() => 'data:image/png;base64,mock')
        });

        global.URL.createObjectURL = jest.fn(() => 'blob:mock-url');
        global.URL.revokeObjectURL = jest.fn();
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('checkDependencies', () => {
        test('deve verificar disponibilidade das bibliotecas', () => {
            const deps = ExportService.checkDependencies();

            expect(deps).toHaveProperty('jsPDF');
            expect(deps).toHaveProperty('xlsx');
            expect(deps).toHaveProperty('html2canvas');
        });
    });

    describe('exportAsCSV', () => {
        test('deve exportar dados como CSV', () => {
            const data = [
                { nome: 'João', idade: 30, cidade: 'São Paulo' },
                { nome: 'Maria', idade: 25, cidade: 'Rio de Janeiro' }
            ];

            const mockLink = {
                href: '',
                download: '',
                click: jest.fn()
            };

            document.createElement = jest.fn(() => mockLink);

            ExportService.exportAsCSV(data, 'test.csv');

            expect(mockLink.download).toBe('test.csv');
            expect(mockLink.click).toHaveBeenCalled();
        });

        test('deve lançar erro se não houver dados', () => {
            expect(() => ExportService.exportAsCSV([], 'test.csv'))
                .toThrow('Nenhum dado para exportar');
        });

        test('deve usar colunas especificadas', () => {
            const data = [
                { nome: 'João', idade: 30, cidade: 'São Paulo', email: 'joao@test.com' }
            ];

            let capturedContent = '';

            global.Blob = jest.fn((content) => {
                capturedContent = content[0];
                return new Blob(content);
            });

            const mockLink = { click: jest.fn() };
            document.createElement = jest.fn(() => mockLink);

            ExportService.exportAsCSV(data, 'test.csv', ['nome', 'idade']);

            expect(capturedContent).toContain('nome,idade');
            expect(capturedContent).not.toContain('cidade');
            expect(capturedContent).not.toContain('email');
        });

        test('deve formatar datas corretamente', () => {
            const data = [
                { nome: 'João', nascimento: new Date('1990-01-15') }
            ];

            let capturedContent = '';

            global.Blob = jest.fn((content) => {
                capturedContent = content[0];
                return new Blob(content);
            });

            const mockLink = { click: jest.fn() };
            document.createElement = jest.fn(() => mockLink);

            ExportService.exportAsCSV(data, 'test.csv');

            expect(capturedContent).toContain('15/01/1990');
        });
    });

    describe('exportAsExcel', () => {
        test('deve exportar dados como Excel', () => {
            const data = [
                { nome: 'João', idade: 30 },
                { nome: 'Maria', idade: 25 }
            ];

            ExportService.exportAsExcel(data, 'test.xlsx', 'Dados');

            expect(global.XLSX.utils.book_new).toHaveBeenCalled();
            expect(global.XLSX.utils.json_to_sheet).toHaveBeenCalledWith(data);
            expect(global.XLSX.utils.book_append_sheet).toHaveBeenCalled();
            expect(global.XLSX.writeFile).toHaveBeenCalled();
        });

        test('deve lançar erro se XLSX não estiver carregado', () => {
            delete global.XLSX;

            const data = [{ nome: 'João' }];

            expect(() => ExportService.exportAsExcel(data, 'test.xlsx'))
                .toThrow('Biblioteca XLSX não carregada');
        });

        test('deve lançar erro se não houver dados', () => {
            expect(() => ExportService.exportAsExcel([], 'test.xlsx'))
                .toThrow('Nenhum dado para exportar');
        });
    });

    describe('exportAsPDF', () => {
        test('deve exportar elemento como PDF', async () => {
            const mockElement = document.createElement('div');
            mockElement.innerHTML = '<h1>Test</h1>';

            await ExportService.exportAsPDF(mockElement, 'test.pdf');

            expect(global.html2canvas).toHaveBeenCalledWith(
                mockElement,
                expect.objectContaining({
                    scale: 2,
                    useCORS: true
                })
            );

            const pdfInstance = global.jspdf.jsPDF.mock.results[0].value;
            expect(pdfInstance.addImage).toHaveBeenCalled();
            expect(pdfInstance.save).toHaveBeenCalledWith('test.pdf');
        });

        test('deve lançar erro se bibliotecas não estiverem carregadas', async () => {
            delete global.jspdf;

            const mockElement = document.createElement('div');

            await expect(ExportService.exportAsPDF(mockElement))
                .rejects
                .toThrow('Bibliotecas jsPDF/html2canvas não carregadas');
        });

        test('deve adicionar múltiplas páginas se necessário', async () => {
            const mockElement = document.createElement('div');

            // Canvas muito alto
            global.html2canvas.mockResolvedValueOnce({
                height: 3000,
                width: 800,
                toDataURL: () => 'data:image/png;base64,mock'
            });

            await ExportService.exportAsPDF(mockElement, 'test.pdf');

            const pdfInstance = global.jspdf.jsPDF.mock.results[0].value;
            expect(pdfInstance.addPage).toHaveBeenCalled();
        });
    });

    describe('exportTableAsPDF', () => {
        test('deve exportar tabela como PDF', () => {
            const data = [
                { nome: 'João', idade: 30, cargo: 'Analista' },
                { nome: 'Maria', idade: 25, cargo: 'Gerente' }
            ];

            ExportService.exportTableAsPDF(data, 'tabela.pdf', {
                title: 'Relatório de Servidores'
            });

            const pdfInstance = global.jspdf.jsPDF.mock.results[0].value;
            expect(pdfInstance.text).toHaveBeenCalledWith(
                'Relatório de Servidores',
                14,
                15
            );
            expect(pdfInstance.autoTable).toHaveBeenCalled();
            expect(pdfInstance.save).toHaveBeenCalledWith('tabela.pdf');
        });

        test('deve lançar erro se não houver dados', () => {
            expect(() => ExportService.exportTableAsPDF([], 'test.pdf'))
                .toThrow('Nenhum dado para exportar');
        });

        test('deve usar colunas personalizadas', () => {
            const data = [
                { nome: 'João', idade: 30, email: 'joao@test.com' }
            ];

            const columns = [
                { header: 'Nome', dataKey: 'nome' },
                { header: 'Idade', dataKey: 'idade' }
            ];

            ExportService.exportTableAsPDF(data, 'test.pdf', { columns });

            const pdfInstance = global.jspdf.jsPDF.mock.results[0].value;
            const autoTableCall = pdfInstance.autoTable.mock.calls[0][0];

            expect(autoTableCall.columns).toEqual(columns);
        });

        test('deve formatar datas nas tabelas', () => {
            const data = [
                { nome: 'João', nascimento: new Date('1990-01-15') }
            ];

            ExportService.exportTableAsPDF(data, 'test.pdf');

            const pdfInstance = global.jspdf.jsPDF.mock.results[0].value;
            const autoTableCall = pdfInstance.autoTable.mock.calls[0][0];

            expect(autoTableCall.body[0].nascimento).toBe('15/01/1990');
        });
    });

    describe('exportChartAsImage', () => {
        test('deve exportar gráfico como imagem', () => {
            const mockChart = {
                canvas: document.createElement('canvas'),
                toBase64Image: jest.fn(() => 'data:image/png;base64,mockdata')
            };

            const mockLink = {
                href: '',
                download: '',
                click: jest.fn()
            };

            document.createElement = jest.fn(() => mockLink);

            ExportService.exportChartAsImage(mockChart, 'grafico.png');

            expect(mockChart.toBase64Image).toHaveBeenCalledWith('image/png');
            expect(mockLink.download).toBe('grafico.png');
            expect(mockLink.click).toHaveBeenCalled();
        });

        test('deve suportar formato JPEG', () => {
            const mockChart = {
                canvas: document.createElement('canvas'),
                toBase64Image: jest.fn(() => 'data:image/jpeg;base64,mockdata')
            };

            const mockLink = { click: jest.fn() };
            document.createElement = jest.fn(() => mockLink);

            ExportService.exportChartAsImage(mockChart, 'grafico.jpg', 'jpg');

            expect(mockChart.toBase64Image).toHaveBeenCalledWith('image/jpeg');
        });

        test('deve lançar erro se gráfico for inválido', () => {
            expect(() => ExportService.exportChartAsImage(null))
                .toThrow('Instância de gráfico inválida');

            expect(() => ExportService.exportChartAsImage({}))
                .toThrow('Instância de gráfico inválida');
        });
    });
});
