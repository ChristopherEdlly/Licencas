// LicenseService.spec.js
// Testes para o LicenseService

const LicenseService = require('../js/modules/LicenseService');
const DataLoader = require('../js/modules/DataLoader');

describe('LicenseService', () => {
  let licenseService;
  let mockDataLoader;

  beforeEach(() => {
    mockDataLoader = {
      load: jest.fn(async (key) => {
        if (key === 'licenses') {
          return [
            { id: 1, name: 'License A' },
            { id: 2, name: 'License B' },
          ];
        }
        return [];
      }),
    };
    licenseService = new LicenseService(mockDataLoader);
  });

  test('deve buscar todas as licenças', async () => {
    const licenses = await licenseService.getAllLicenses();
    expect(licenses).toEqual([
      { id: 1, name: 'License A' },
      { id: 2, name: 'License B' },
    ]);
  });

  test('deve buscar uma licença por ID', async () => {
    const license = await licenseService.getLicenseById(1);
    expect(license).toEqual({ id: 1, name: 'License A' });
  });

  test('deve criar uma nova licença', async () => {
    const newLicense = { id: 3, name: 'License C' };
    const licenses = await licenseService.createLicense(newLicense);
    expect(licenses).toContainEqual(newLicense);
  });

  test('deve deletar uma licença por ID', async () => {
    const licenses = await licenseService.deleteLicense(1);
    expect(licenses).not.toContainEqual({ id: 1, name: 'License A' });
  });
});