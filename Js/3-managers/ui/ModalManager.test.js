const ModalManager = require('./ModalManager');

/**
 * @jest-environment jsdom
 */


describe('ModalManager', () => {
    let modalManager;
    let appMock;

    beforeEach(() => {
        // Clear DOM
        document.body.innerHTML = '';
        // Mock app with uiStateManager
        appMock = {
            uiStateManager: {
                openModal: jest.fn(),
                closeModal: jest.fn()
            },
            dataStateManager: {
                getAllServidores: jest.fn(() => [])
            }
        };
        modalManager = new ModalManager(appMock);
    });

    afterEach(() => {
        modalManager.destroy();
        jest.clearAllMocks();
    });

    describe('createModal', () => {
        it('should create a modal in the DOM', () => {
            const modal = modalManager.createModal({
                id: 'testModal',
                title: 'Test',
                content: '<p>Hello</p>',
                size: 'small'
            });
            expect(document.getElementById('testModal')).toBeTruthy();
            expect(modal.querySelector('.modal-title-section h3').textContent).toBe('Test');
            expect(modal.querySelector('.modal-body').innerHTML).toContain('Hello');
        });
    });

    describe('open', () => {
        it('should open a modal and add it to the stack', () => {
            modalManager.createModal({ id: 'openModal', title: 'Open', content: '' });
            modalManager.open('openModal');
            const modal = document.getElementById('openModal');
            expect(modal.style.display).toBe('flex');
            expect(modalManager.modalStack).toContain('openModal');
            expect(appMock.uiStateManager.openModal).toHaveBeenCalledWith('openModal');
        });

        it('should not open a non-existent modal', () => {
            const spy = jest.spyOn(console, 'warn').mockImplementation(() => {});
            modalManager.open('notFound');
            expect(spy).toHaveBeenCalledWith('Modal notFound não encontrado');
            spy.mockRestore();
        });
    });

    describe('close', () => {
        it('should close a modal and remove it from the stack', (done) => {
            modalManager.createModal({ id: 'closeModal', title: 'Close', content: '' });
            modalManager.open('closeModal');
            modalManager.close('closeModal');
            setTimeout(() => {
                const modal = document.getElementById('closeModal');
                expect(modal.style.display).toBe('none');
                expect(modalManager.modalStack).not.toContain('closeModal');
                expect(appMock.uiStateManager.closeModal).toHaveBeenCalledWith('closeModal');
                done();
            }, 350);
        });

        it('should not close a non-existent modal', () => {
            const spy = jest.spyOn(console, 'warn').mockImplementation(() => {});
            modalManager.close('notFound');
            expect(spy).toHaveBeenCalledWith('Modal notFound não encontrado');
            spy.mockRestore();
        });
    });

    describe('toggle', () => {
        it('should open a closed modal', () => {
            modalManager.createModal({ id: 'toggleModal', title: '', content: '' });
            modalManager.toggle('toggleModal');
            expect(modalManager.isOpen('toggleModal')).toBe(true);
        });

        it('should close an open modal', (done) => {
            modalManager.createModal({ id: 'toggleModal', title: '', content: '' });
            modalManager.open('toggleModal');
            modalManager.toggle('toggleModal');
            setTimeout(() => {
                expect(modalManager.isOpen('toggleModal')).toBe(false);
                done();
            }, 350);
        });
    });

    describe('closeAll', () => {
        it('should close all open modals', (done) => {
            modalManager.createModal({ id: 'm1', title: '', content: '' });
            modalManager.createModal({ id: 'm2', title: '', content: '' });
            modalManager.open('m1');
            modalManager.open('m2');
            modalManager.closeAll();
            setTimeout(() => {
                expect(modalManager.isOpen('m1')).toBe(false);
                expect(modalManager.isOpen('m2')).toBe(false);
                done();
            }, 350);
        });
    });

    describe('isOpen', () => {
        it('should return true if modal is open', () => {
            modalManager.createModal({ id: 'openCheck', title: '', content: '' });
            modalManager.open('openCheck');
            expect(modalManager.isOpen('openCheck')).toBe(true);
        });

        it('should return false if modal is not open', () => {
            modalManager.createModal({ id: 'closedCheck', title: '', content: '' });
            expect(modalManager.isOpen('closedCheck')).toBe(false);
        });
    });

    describe('getTopModal', () => {
        it('should return the last opened modal', () => {
            modalManager.createModal({ id: 'm1', title: '', content: '' });
            modalManager.createModal({ id: 'm2', title: '', content: '' });
            modalManager.open('m1');
            modalManager.open('m2');
            expect(modalManager.getTopModal()).toBe('m2');
        });

        it('should return null if no modals are open', () => {
            expect(modalManager.getTopModal()).toBeNull();
        });
    });

    describe('updateContent', () => {
        it('should update modal body content', () => {
            modalManager.createModal({ id: 'updateModal', title: '', content: 'Old' });
            modalManager.updateContent('updateModal', 'New Content');
            const modal = document.getElementById('updateModal');
            expect(modal.querySelector('.modal-body').innerHTML).toBe('New Content');
        });
    });

    describe('updateTitle', () => {
        it('should update modal title', () => {
            modalManager.createModal({ id: 'titleModal', title: 'Old Title', content: '' });
            modalManager.updateTitle('titleModal', 'New Title');
            const modal = document.getElementById('titleModal');
            expect(modal.querySelector('.modal-title-section h3').textContent).toBe('New Title');
        });
    });

    describe('destroyModal', () => {
        it('should remove modal from DOM', () => {
            modalManager.createModal({ id: 'destroyModal', title: '', content: '' });
            modalManager.destroyModal('destroyModal');
            expect(document.getElementById('destroyModal')).toBeNull();
        });

        it('should warn if modal does not exist', () => {
            const spy = jest.spyOn(console, 'warn').mockImplementation(() => {});
            modalManager.destroyModal('notFound');
            expect(spy).toHaveBeenCalledWith('Modal notFound não encontrado');
            spy.mockRestore();
        });
    });

    describe('alert', () => {
        it('should show an alert modal and resolve on OK', async () => {
            const promise = modalManager.alert('Test alert', 'Alert Title');
            // Simulate user click
            const okBtn = document.getElementById('alertModal').querySelector('#alert-ok-btn');
            okBtn.click();
            await expect(promise).resolves.toBeUndefined();
        });
    });

    describe('confirm', () => {
        it('should resolve true when Confirmar is clicked', async () => {
            const promise = modalManager.confirm('Are you sure?', 'Confirm');
            const okBtn = document.getElementById('confirmModal').querySelector('#confirm-ok-btn');
            okBtn.click();
            await expect(promise).resolves.toBe(true);
        });

        it('should resolve false when Cancelar is clicked', async () => {
            const promise = modalManager.confirm('Are you sure?', 'Confirm');
            const cancelBtn = document.getElementById('confirmModal').querySelector('#confirm-cancel-btn');
            cancelBtn.click();
            await expect(promise).resolves.toBe(false);
        });
    });

    describe('_agruparLicencasPorPeriodos', () => {
        it('should group contiguous or overlapping licenses', () => {
            const licencas = [
                { inicio: '2023-01-01', fim: '2023-01-10', tipo: 'A' },
                { inicio: '2023-01-11', fim: '2023-01-20', tipo: 'A' }, // contiguous
                { inicio: '2023-02-01', fim: '2023-02-05', tipo: 'A' }
            ];
            const periodos = modalManager._agruparLicencasPorPeriodos(licencas);
            expect(periodos.length).toBe(2);
            expect(periodos[0].licencas.length).toBe(2);
            expect(periodos[1].licencas.length).toBe(1);
        });

        it('should return empty array if no licenses', () => {
            expect(modalManager._agruparLicencasPorPeriodos([])).toEqual([]);
        });
    });

    describe('_processarDadosServidor', () => {
        it('should process server data and return normalized object', () => {
            const servidorInput = {
                nome: 'João',
                cargo: 'Analista',
                lotacao: 'TI',
                matricula: '123',
                admissao: '2020-01-01',
                licencas: [
                    { inicio: '2023-01-01', fim: '2023-01-10', saldo: 10, tipo: 'A' }
                ]
            };
            const result = modalManager._processarDadosServidor(servidorInput);
            expect(result.nome).toBe('João');
            expect(result.cargo).toBe('Analista');
            expect(Array.isArray(result.licencas)).toBe(true);
            expect(result.licencas.length).toBe(1);
            expect(result.stats.totalLicencas).toBe(1);
        });
    });

    describe('getDebugInfo', () => {
        it('should return debug info object', () => {
            modalManager.createModal({ id: 'debugModal', title: '', content: '' });
            modalManager.open('debugModal');
            const info = modalManager.getDebugInfo();
            expect(info.openModals).toContain('debugModal');
            expect(info.modalCount).toBe(1);
            expect(info.topModal).toBe('debugModal');
        });
    });
});