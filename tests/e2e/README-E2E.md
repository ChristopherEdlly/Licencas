# Testes End-to-End (E2E) 🧪

Testes completos de integração simulando o comportamento real de um usuário na aplicação.

## 📋 O que os testes cobrem

### 1. **Inicialização da Aplicação**
- ✅ Carregamento de componentes principais
- ✅ Navegação para página inicial
- ✅ Aplicação de tema padrão

### 2. **Upload e Processamento de Arquivo**
- ✅ Processamento de arquivo CSV válido
- ✅ Processamento de arquivo Excel válido
- ✅ Tratamento de erros para arquivos inválidos

### 3. **Navegação entre Páginas**
- ✅ Navegação para Calendar
- ✅ Navegação para Timeline
- ✅ Navegação para Reports
- ✅ Navegação para Settings
- ✅ Navegação para Tips
- ✅ Retorno para Home

### 4. **Aplicação de Filtros**
- ✅ Filtro por urgência
- ✅ Filtro por cargo
- ✅ Filtro por lotação
- ✅ Combinação de múltiplos filtros
- ✅ Limpeza de filtros

### 5. **Busca de Servidores**
- ✅ Busca por nome
- ✅ Busca por CPF
- ✅ Busca case-insensitive

### 6. **Sistema de Cache**
- ✅ Salvamento de arquivo no cache
- ✅ Restauração de dados do cache

### 7. **Sistema de Eventos**
- ✅ Emissão de evento ao carregar dados
- ✅ Emissão de evento ao aplicar filtros
- ✅ Emissão de evento ao mudar de página

### 8. **Integração Completa**
- ✅ Jornada completa do usuário (upload → filtros → navegação → exportação)

### 9. **Performance**
- ✅ Carregamento de 1000 registros em < 2 segundos
- ✅ Aplicação de filtros em dataset grande em < 500ms

### 10. **Tratamento de Erros**
- ✅ Erro ao carregar arquivo vazio
- ✅ Erro ao navegar para página inválida
- ✅ Dados inválidos ao aplicar filtros

## 🚀 Como executar os testes

### Método 1: No Navegador (Recomendado)

1. **Abrir o arquivo HTML de testes:**
   ```bash
   # Navegue até a pasta do projeto
   cd tests/e2e

   # Abra o arquivo no navegador
   # Windows:
   start run-e2e-tests.html

   # Mac:
   open run-e2e-tests.html

   # Linux:
   xdg-open run-e2e-tests.html
   ```

2. **Clique no botão "▶️ Executar Todos os Testes"**

3. **Visualize os resultados:**
   - ✅ Verde = Teste passou
   - ❌ Vermelho = Teste falhou
   - ⚠️ Amarelo = Teste pulado

### Método 2: Via Servidor Local

Se você estiver rodando um servidor local:

```bash
# Inicie o servidor (exemplo com Python)
python -m http.server 3000

# Ou com Node.js
npx serve .

# Acesse no navegador
http://localhost:3000/tests/e2e/run-e2e-tests.html
```

## 📊 Estrutura dos Testes

```
tests/e2e/
├── app.test.e2e.js       # Arquivo principal de testes
├── run-e2e-tests.html    # Interface visual para rodar testes
└── README-E2E.md         # Este arquivo
```

## 🎯 Cobertura de Testes

Os testes cobrem **10 áreas críticas** da aplicação:

| Área | Testes | Status |
|------|--------|--------|
| Inicialização | 3 | ✅ |
| Upload de Arquivo | 3 | ✅ |
| Navegação | 7 | ✅ |
| Filtros | 5 | ✅ |
| Busca | 3 | ✅ |
| Cache | 2 | ✅ |
| Eventos | 3 | ✅ |
| Integração Completa | 1 | ✅ |
| Performance | 2 | ✅ |
| Tratamento de Erros | 3 | ✅ |
| **TOTAL** | **32** | **✅** |

## 🔍 Como interpretar os resultados

### ✅ Teste Passou
```
✅ deve carregar todos os componentes principais
```
Tudo funcionou conforme esperado.

### ❌ Teste Falhou
```
❌ deve processar arquivo CSV válido
Error: Esperado 2, mas recebeu 0
```
Clique no teste para ver detalhes do erro.

### ⚠️ Teste Pulado
```
⚠️ deve salvar arquivo no cache
(CacheService não disponível)
```
Teste pulado porque dependência não está disponível.

## 🛠️ Troubleshooting

### Problema: "ReferenceError: App is not defined"
**Solução:** Certifique-se de que todos os scripts estão sendo carregados corretamente. Verifique o console do navegador.

### Problema: "TypeError: Cannot read property 'init' of undefined"
**Solução:** Verifique se os managers estão sendo inicializados na ordem correta. Veja `App.js` linha 200+.

### Problema: Testes falhando aleatoriamente
**Solução:** Pode ser problema de timing. Adicione `await` nas operações assíncronas.

### Problema: "Maximum call stack size exceeded"
**Solução:** Isso indica um loop infinito. Verifique `compatibility-bridge.js` para loops de eventos.

## 📝 Como adicionar novos testes

1. **Abra `app.test.e2e.js`**

2. **Adicione um novo `describe` block:**
   ```javascript
   describe('11. Minha Nova Funcionalidade', () => {
       test('deve fazer algo específico', async () => {
           // Arrange (preparar)
           await app.init();

           // Act (executar)
           const result = await app.minhaFuncao();

           // Assert (verificar)
           expect(result).toBeDefined();
           expect(result.length).toBe(5);
       });
   });
   ```

3. **Recarregue `run-e2e-tests.html` e execute novamente**

## 🎨 Customização Visual

Os testes têm uma interface visual moderna com:
- **Progress bar** mostrando progresso em tempo real
- **Cards de resumo** com estatísticas
- **Cores indicativas** para status (verde/vermelho/amarelo)
- **Stack traces** expansíveis para erros

## 📈 Métricas de Performance

Os testes incluem benchmarks de performance:

```javascript
test('deve carregar 1000 registros em menos de 2 segundos', async () => {
    const startTime = performance.now();
    app.dataStateManager.setAllServidores(largeData);
    const endTime = performance.now();

    expect(endTime - startTime).toBeLessThan(2000);
});
```

## 🔗 Integração Contínua (CI)

Para rodar os testes em CI (GitHub Actions, GitLab CI, etc.):

```yaml
# .github/workflows/e2e-tests.yml
name: E2E Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Run E2E Tests
        run: |
          npx serve . &
          npx playwright test tests/e2e/app.test.e2e.js
```

## 📚 Recursos Adicionais

- [Jest Documentation](https://jestjs.io/)
- [Testing Best Practices](https://testingjavascript.com/)
- [E2E Testing Guide](https://www.cypress.io/blog/2020/02/12/working-with-e2e-tests/)

## ✨ Contribuindo

Para adicionar novos testes:

1. Identifique a funcionalidade que precisa de testes
2. Crie um novo `describe` block
3. Escreva testes específicos usando `test()`
4. Use `expect()` para verificações
5. Execute e verifique que todos passam

## 📞 Suporte

Se encontrar problemas com os testes:

1. Verifique o console do navegador para erros
2. Certifique-se de que todos os arquivos estão carregados
3. Teste manualmente a funcionalidade no app principal
4. Verifique se há problemas de compatibilidade entre arquivos

---

**Última atualização:** 11/12/2025
**Versão:** 1.0.0
**Autor:** Claude Code Assistant
