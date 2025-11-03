# atualizações do escopo devido a mudança de gerente.
agora deve-se receber uma tabela, mas a maioria dos dados opçionais, obrigatorio somente o nome do servidor, agora tem uma tabela com o nome de todos os servidores e suas respectivas informações e essa tabela excel vai ser alimentada diariamente com o inicio da licença, toda licença dura exatamente 30 dias, então a partir do inicio da licença é possível calcular o final da licença.

---

exemplo da tabela que será recebida:
SERVIDOR | CPF | DN | SEXO | IDADE | ADMISSÃO | MESES | LOTAÇÃO | SUPERINTENDENCIA | SUBSECRETARIA | CARGO | Incicio Da licença |
|---------|-----|----|------|-------|----------|-------|---------|------------------|----------------|-------|------------------|
EFRAIM SANTANA LEITE | xxxxxxx | 26/3/1969 | MAS | 56.56 | 24/10/1989 | 7 | GEROT | SUTRI | SURE | AFT | jan/2025
GILVAN DE LIMA | xxxxxxx | 16/9/1964 | MAS | 61.08 | 13/9/1989 | 3 | GEROT | SUTRI | SURE | AFT | fev/2026
ISRAEL BATISTA FRANÇA JUNIOR | xxxxxxx | 12/1/1965 | MAS | 60.76 | 14/9/1989 | 12 | GEROT | SUTRI | SURE | AFT | 06/2025
LUIZ CARLOS LOBO SIQUEIRA | xxxxxxx | 25/10/1968 | MAS | 56.98 | 25/9/1989 | 11 | GEROT | SUTRI | SURE | AFT | 06/2025
RUBENS CAVALCANTE DANTAS | xxxxxxx | 2/7/1966 | MAS | 58.29 | 6/3/1986 | 8 | GEROT | SUTRI | SURE | AFT | Jan-25
JEOVA FRANCISCO DOS SANTOS | xxxxxxx | 13/5/1965 | MAS | 60.43 | 11/9/1989 | 9 | SUTRI | SUTRI | SURE | AFT | Feb-25
JOSE ROBERTO DE ARAGÃO | xxxxxxx | 22/7/1968 | MAS | 57.24 | 14/9/1989 | 12 | SUTRI | SUTRI | SURE | AFT | 
JOSE MARCIO SANTA ROSA | xxxxxxx | 8/12/1969 | MAS | 55.85 | 18/12/1989 | 12 | GELEG | SUTRI | SURE | AFT | 
LUSERGIO MATOS NOBRE | xxxxxxx | 29/4/1969 | MAS | 56.47 | 7/11/1989 | 12 | GELEG | SUTRI | SURE | AFT | 
MARCELO DE MORAIS CARVALHO | xxxxxxx | 23/3/1970 | MAS | 55.57 | 11/9/1989 | 8 | GELEG | SUTRI | SURE | AFT | Mar-25
ROGERIO LUIZ SANTOS FREITAS | xxxxxxx | 1/5/1966 | MAS | 58.46 | 14/9/1989 | 9 | GELEG | SUTRI | SURE | AFT | Apr-25
ROSINETE TELES DA ROCHA | xxxxxxx | 17/1/1968 | FEM | 57.75 | 14/9/1989 | 3 | GELEG | SUTRI | SURE | AFT |
VERAILZA COSTA ALVES | xxxxxxx | 6/3/1964 | FEM | 61.62 | 12/11/1984 | 7 | GELEG | SUTRI | SURE | AFT |

OBS: lembrando que alguns campos podem ficar vazios pois a planilha é alimentada por diversos setores e nem todos os setores preenchem todas as informações

# Escopo do Projeto de Painel de Licenças de Servidores
Este documento descreve o escopo do projeto para o desenvolvimento de um painel web destinado a visualizar e acompanhar os cronogramas de licenças de servidores públicos. O painel será alimentado por uma planilha Excel contendo informações detalhadas sobre cada servidor e suas respectivas licenças.
## Objetivo
Desenvolver um painel web intuitivo e funcional que permita ao RH da empresa visualizar, filtrar e acompanhar os cronogramas de licenças dos servidores com base nos dados fornecidos em uma planilha Excel, pois servidores tem o costume de esconder que estão perto de se aposentar para ganhar ganhar bonos devido a uma multa que a empresa recebe se ele aposentar-se sem tirar as licenças devidas.
## Requisitos Funcionais
1. **Importação de Planilha Excel**
   - O sistema deve permitir a importação de arquivos Excel (.xlsx, .xls) contendo os dados dos servidores.
   - Cada 1 Licença são 3 meses, portanto, o servidor pode fatorar 3 meses de licença e escolher apenas 1 mês.
   - cada linha da planilha representará um servidor com suas respectivas informações, podendo ter mais de uma linha para cada periodo de licença do servidor.
   - A planilha deve conter as seguintes colunas lembrando que apenas a coluna SERVIDOR é obrigatória pois as demais podem ficar vazias devido a planilha ser alimentada por diversos setores e somente depois ser formada a planilha completa:
     - SERVIDOR
     - CPF (opcional)
     - DN (opcional)
     - SEXO (opcional)
     - IDADE (opcional)
     - ADMISSÃO (opcional)
     - MESES (opcional)
     - Licença premio ja concedida (opcional) (conceder e concedida estão correlacionadas)
     - Licença premio a conceder (opcional) (conceder e concedida estão correlacionadas)
     - LOTAÇÃO (opcional)
     - SUPERINTENDENCIA (opcional)
     - SUBSECRETARIA (opcional)
     - CARGO (opcional)
     - Início Da licença (opcional)
2. **Cálculo do Fim da Licença**
    - O sistema deve calcular automaticamente a data de término da licença com base na data de início fornecida, considerando que uma mes de licença deve ter uma duração fixa de 30 dias.
3. **Visualização dos Dados**
   - O painel deve exibir uma tabela com os dados importados, incluindo o nome do servidor, data de início e data de término da licença.
   - Deve ser possível visualizar os dados em diferentes formatos, como lista ou calendário.
4. **Filtros e Busca**
   - O sistema deve permitir a filtragem dos servidores por diferentes critérios, como data de início, data de término, lotação, superintendência, entre outros.
   - Deve haver uma funcionalidade de busca para localizar servidores específicos pelo nome.
5. **Notificações e Alertas**
   - Para servidores perto de ter aposentadoria compulsória, deve mostrar um alerta visual.
6. **Exportação de Dados**
    - O sistema deve permitir a exportação de um relatório dos servidores com licenças ativas ou perto de aposentar em formatos como Excel ou PDF.
## Requisitos Não Funcionais
1. **Usabilidade**
   - O painel deve ser intuitivo e fácil de usar, mesmo para usuários com pouca experiência
    em tecnologia.  
2. **Desempenho**
    - O sistema deve ser capaz de processar e exibir os dados rapidamente, mesmo com grandes volumes de informações.
3. **Segurança**
    - Os dados dos servidores devem ser protegidos contra acessos não autorizados (não havera conexção com servidor externo, todo o processamento sera feito no client side, para maior segurança).
4. **Compatibilidade**
    - O painel deve ser compatível com os principais navegadores web (Chrome, Firefox, Edge).
## Tecnologias Sugeridas
- Frontend: HTML, CSS, JavaScript (não usar frameworks que não possam ser ospedados pelo github pages)
- Biblioteca para manipulação de Excel: SheetJS (xlsx)
- Gráficos (se necessário): Chart.js ou D3.js
## Entregáveis
1. Código-fonte do painel web.
2. Documentação técnica detalhada.
3. Guia do usuário para operação do painel.
4. não precisa de testes automatizados, apenas testes manuais.

---

## Dúvidas/Solicitações de Esclarecimento

1. Sobre o campo "Início Da licença", ele pode vir em diferentes formatos de data (ex: "jan/2025", "Jan-25", "06/2025", etc). Existe um padrão preferencial ou devemos tratar todos os formatos possíveis automaticamente?
 - Devemos tratar todos os formatos possíveis automaticamente.
2. Caso o campo "Início Da licença" esteja vazio, devemos considerar que o servidor ainda não tirou licença? Ou pode haver outros motivos para estar em branco?
 - Sim, devemos considerar que o servidor ainda não tirou a licença.
3. Para o cálculo da aposentadoria e do "grau de urgência", qual é a regra exata para determinar que um servidor está "perto de aposentar"? Existe uma idade, tempo de serviço, ou outra regra?
 - A regra exata deve ser definida pelo RH, mas geralmente considera-se a idade mínima para aposentadoria e o tempo de serviço.
4. O campo "MESES" refere-se ao total de meses de licença a que o servidor tem direito, ou apenas ao período atual? Como lidar se houver múltiplas linhas para o mesmo servidor?
 - O campo "MESES" refere-se ao periodo de licença a que o servidor irá tirar de licença. ex: 1 mês ele vai ficar 30 dias de licença, lembrando que 1 licença equivale a 3 meses(90 dias) mas o servidor é livre para escolher apenas 1 mês ou mais dessa mesma licença ou ele pode ter 2 licenças e tirar 4 meses(120 dias) tirando 1 licenca e apenas 1 mês da outra, ou seja ele pode escolher como tirar suas licenças, não tem limite maximo, mas  minimo é 30 dias(obrigatorio de 30 em 30 dias, independente da quantidade de dias no mês).
5. Sobre os campos "Licença premio ja concedida" e "Licença premio a conceder", pode explicar melhor como eles se relacionam e como devem ser usados no painel?
 - Esses campos indicam o status das licenças prêmio do servidor. "Licença premio ja concedida" indica o total de meses de licença que já foram concedidos ao servidor, enquanto "Licença premio a conceder" indica o total de meses que ainda podem ser concedidos. O painel deve usar essas informações para calcular o total de licenças disponíveis e já utilizadas.
6. Para exportação de dados, há um modelo de relatório desejado (colunas obrigatórias, layout, etc) ou pode ser uma exportação simples da tabela filtrada?
 - Pode ser uma exportação simples da tabela filtrada, incluindo todas as colunas visíveis no painel( podemos evoluir depois conforme a necessidade ou demanda).
7. Para o alerta visual de aposentadoria compulsória, qual deve ser o critério exato para exibir o alerta?
 - O critério deve ser definido por uma margem de segurança entre a o ano previsto de aposentadoria( com base em alguns calculos de idade e tempo de serviço) e a quantidade de licenças disponiveis( uma licença é 90 dias/3 meses).
8. Há necessidade de controle de versões dos dados importados (ex: histórico de uploads), ou basta sempre sobrescrever com o último arquivo importado?
 - não pode armazenar dados como o processamento sera todo feito no client side, não havera armazenamento de dados. 
9. Alguma preferência de idioma para a interface do painel (português, inglês, ambos)?
 - Português.
10. Alguma restrição quanto ao tamanho máximo da planilha a ser importada?
 - nenhuma restrição especifica, porem deve-se levar em conta o desempenho do sistema ao lidar com grandes volumes de dados.
---


# 📋 Dúvidas sobre o Novo Escopo
1. Relação entre "MESES" e "Início Da licença"
Se o campo "MESES" indica que o servidor vai tirar 3 meses, e "Início Da licença" é "jan/2025", o sistema deve:
 - se no campo meses vier 3 meses, o sistema deve considerar que o servidor vai tirar 30 dias cada, ou seja, 90 dias no total. aparir da data de inicio da licença (01/01/2025) o sistema deve calcular o fim da licença para daqui a 90 dias (01/04/2025). Tres entradas meses de licença equivalem a 90 dias
 separando em 3 licenças de 30 dias cada, ou seja, o servidor pode tirar 1 licença de 30 dias em jan/2025, outra licença de 30 dias em fev/2025 e outra licença de 30 dias em mar/2025. Ou o servidor pode tirar as 3 licenças juntas, ficando 90 dias de licença seguidos começando em 1/jan/2025 e terminando em 31/mar/2025, separando em periodos ficaria algo como:
 - Período 1 (dias 1–30): 01/01/2025 → 30/01/2025 (30 dias, ambos inclusos)
 - Período 2 (dias 31–60): 31/01/2025 → 01/03/2025 (30 dias, ambos inclusos)
 - Período 3 (dias 61–90): 02/03/2025 → 31/03/2025 (30 dias, ambos inclusos)

2. Múltiplas linhas para o mesmo servidor
Se um servidor tem múltiplas linhas na planilha (ex: linha 1 com jan/2025, linha 2 com jun/2025), o sistema deve:
 - Sim, deve tratar como períodos de licença diferentes do mesmo servidor.

3. Campo "Licença premio ja concedida" vs "Início Da licença"
Esses campos se relacionam? Por exemplo:
"Licença premio ja concedida" = 6 meses (histórico total já tirado)
"Início Da licença" = jan/2025 (próxima licença agendada)
Está correto este entendimento?
    - Não, esses campos não se relacionam diretamente. "Licença premio ja concedida" indica o total de meses de licença que já foram concedidos ao servidor, enquanto "Início Da licença" indica a data de início da próxima licença agendada. O sistema deve usar essas informações separadamente para calcular o total de licenças disponíveis e já utilizadas.
4. Cálculo de aposentadoria compulsória
Qual é a idade limite para aposentadoria compulsória (75 anos)?
 - Por idade (62F / 65M + 15 anos) Regra geral e permanente. A pessoa se aposenta ao atingir a idade mínima, desde que tenha pelo menos 15 anos de contribuição ao INSS. É a forma mais comum e simples de aposentadoria.
 - Por pontos (92F / 102M em 2025) (soma idade + tempo de serviço) Soma-se a idade com o tempo de contribuição. Quando o total atingir o mínimo exigido (92 ou 102 em 2025), a pessoa pode se aposentar. Essa pontuação sobe 1 ponto por ano até chegar a 100 (mulher) e 105 (homem).
 - Por idade progressiva (59F / 64M em 2025) É uma transição entre o sistema antigo (sem idade mínima) e o novo. A idade mínima aumenta 6 meses por ano até chegar a 62 (mulher) e 65 (homem). Em 2025, estão valendo 59F / 64M.

O alerta deve aparecer quando: (meses de licença disponíveis × 30 dias) + prazo de segurança > tempo até aposentadoria?
 - ao invez de um alerta temporario, o deve ter um local ode possa olhar os servidores que estão perto de aposentar, ou seja, o sistema deve calcular a data prevista de aposentadoria com base na idade atual e no tempo de serviço, e comparar essa data com a data atual para determinar quantos meses faltam para a aposentadoria. Se o servidor tiver licenças disponíveis (baseado no campo "MESES") que, somadas ao prazo de segurança, forem suficientes para cobrir o tempo restante até a aposentadoria, ele deve ser listado como "perto de aposentar" no painel.
Qual é o prazo de segurança em meses recomendado?
 - pra o prazo de segurança, o recomendado é valiar se ele tem licenças disponiveis, se sim, verificar se essas licenças acabam em uma faixa de no maximo 2 anos antes da data prevista de aposentadoria.
 - Se as licenças acabarem dentro desse periodo, o servidor deve ser listado como Urgente.
 - se as licenças acabarem entre 2 a 5 anos antes da aposentadoria, o servidor deve ser listado como Médio.
 - se as licenças acabarem com mais de 5 anos antes da aposentadoria, o servidor deve ser listado como Baixo.
 - Se o servidor não tiver licenças disponíveis, ele deve ser listado como Sem Licença.
 OBS: O sistema deve verificar se o servidor ja tem um cronograma de licença usando todas as licenças que ele tem direito, se sim, verificar se esse cronograma atende aos critérios de urgência( tendo uma faixa de segurança entre o prazo de segurança e a data de aposentadoria).

5. Formato da data de saída
Quando "Início Da licença" = "jan/2025" (sem dia específico):
Assumir sempre dia 01 (01/01/2025)?
 - sim
 Permitir flexibilidade na interpretação?
E o fim: último dia do mês (31/01/2025) ou exatamente 30 dias depois?
 - exatamente 30 dias depois (30/01/2025)
 - o usuário poderá escrever na mesma célula datas diferentes, como 15/01/2025, 20/01/2025, etc. o sistema deve interpretar essas datas corretamente.
 - o usuario também pode escrever datas com formatos diferentes, como "Jan-25", "06/2025", etc. o sistema deve interpretar esses formatos corretamente.
 - o usuario pode escrever datas com dias específicos, como "15/01/2025", "20/01/2025", etc. o sistema deve interpretar essas datas corretamente.
 - o usuario pode esscrever o proprio periodo, como "15/01/2025 - 14/02/2025", "20/01/2025 - 19/02/2025", etc. o sistema deve interpretar esses periodos corretamente.
 - o sistema deve ser capaz de interpretar e converter automaticamente esses diferentes formatos de data para um formato padrão interno (ex: DD/MM/YYYY) para facilitar os cálculos e exibições.
 - Se o campo estiver vazio, considerar que o servidor não tem licença agendada
 - o sistema deve ser capaz de lidar com datas inválidas ou mal formatadas, adicionando uma mensagem de erro no modal de problemas.
6. Modularização desejada
Você gostaria de separar em módulos como:
dataParser.js - parsing de datas e validação
licencaCalculator.js - cálculos de licenças
urgencyAnalyzer.js - análise de urgência
tableManager.js - gerenciamento de tabelas
chartManager.js - gerenciamento de gráficos
Ou prefere outra estrutura modular?
 - pode ser essa estrutura modular sugerida, mas com a possibilidade de adicionar mais módulos no futuro conforme a necessidade.
 - cada modulo deve ser independente, com funções bem definidas e documentadas, para facilitar a manutenção e evolução do sistema.
 - pode modularizar em mais partes e criar uma estrutura de pastas se necessário
7. Compatibilidade com dados antigos
O sistema antigo usava o campo "CRONOGRAMA" com textos descritivos. O novo sistema deve:
 - o sistema antigo identificava qual a coluna que ficava o periodo/começo/fim da licença com base no titulo "cronograma", o novo sistema deve verificar alguns nomes como "Início da Licença", "cronograma" "Inicio", "Inicio/Fim" e etc.
8. Validação e feedback de erros
Para linhas com apenas o nome do servidor (sem data de início):
 - Mostrar na tabela mas marcar como "Sem licença agendada"?

9. Exportação de relatórios
Os relatórios PDF/Excel devem incluir:
 - Opção para o usuário escolher o tipo de relatório (todos os servidores, apenas os com licenças ativas, apenas os perto de aposentar, etc)
 - criar uma nova tela para relatorio, onde o usuario possa escolher os filtros e o formato do relatorio (PDF ou Excel)
10. Performance esperada
Qual o volume máximo de servidores esperado (aproximadamente)?
uma média de 500 servidores, mas o sistema deve ser capaz de lidar com até 2000 servidores sem perda significativa de performance.
 - atualmente a tabela está com 300 servidores, sei que a tabela tem uma pequena parte dos servidores, ou seja, o sistema deve ser capaz de lidar com um aumento no volume de dados.