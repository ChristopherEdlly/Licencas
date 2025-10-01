# Guia do Usuário — Dashboard de Licenças (PT‑BR)

## Sumário

- [Resumo rápido](#resumo-rapido)
- [O que você vê na tela](#o-que-voce-ve-na-tela)
- [Como preparar o arquivo (o mínimo necessário)](#como-preparar-o-arquivo)
- [Exemplos práticos (copiar/colar no Excel)](#exemplos-praticos)
  - [Exemplo A — Planilha com colunas INICIO e FINAL](#exemplo-a)
  - [Exemplo B — Planilha com coluna CRONOGRAMA](#exemplo-b)
- [Passo a passo (simples)](#passo-a-passo)
- [O sistema pode lembrar o último arquivo carregado](#cache)
- [Erros comuns e como agir](#erros-comuns)
- [Observações finais](#observacoes-finais)

<a id="resumo-rapido"></a>
## Resumo rápido

- Use o botão "Importar Planilha Excel" para carregar seus dados (não há arrastar-e-soltar).
- São aceitos arquivos `.xlsx`, `.xls` e `.csv` (o sistema foi pensado para planilhas Excel).
- O botão "Exportar" na página Timeline baixa a imagem do gráfico (PNG).

<a id="o-que-voce-ve-na-tela"></a>
## O que você vê na tela

- Cabeçalho: título e contadores rápidos.
- Botão "Importar Planilha Excel": carregamento do arquivo.
- Barra lateral: busca e filtros (idade, mês/período, limpar filtros).
- Área principal: cartões de resumo, gráfico principal e tabela de servidores.
- Modais: detalhes do servidor e listas por período.

<a id="como-preparar-o-arquivo"></a>
## Como preparar o arquivo (o mínimo necessário)

- Colunas básicas que devem existir (os nomes podem variar um pouco, o sistema tenta encontrar):
  - `SERVIDOR` (nome do servidor)
  - `CARGO`
  - um campo com as datas/períodos de licença — isso pode ser fornecido em duas formas:
    - duas colunas com início e fim do período (Cabeçalho: `INICIO`, `FINAL`), se não colocar anos explícitos nas datas, o sistema pode interpretar o ano atual ou o proximo ano
    - ou
    - uma coluna com a descrição do período (Cabeçalho: `cronograma`) — Sempre coloque o ano.

- Mantenha cada valor em sua própria coluna na planilha. Se for salvar como CSV, use vírgula como separador.

<a id="exemplos-praticos"></a>
## Exemplos práticos (copiar/colar no Excel)

As tabelas abaixo são pensadas para usuários do Excel:

<a id="exemplo-a"></a>
### Exemplo A — Planilha com colunas `INICIO` e `FINAL` (uma linha = um período)

| SERVIDOR       | CPF             | CARGO    | INICIO       | FINAL          |
|----------------|-----------------|----------|--------------|----------------|
| Maria Silva    | 123.456.789-00  | Analista | 16/01/2025   | 16/02/2025     |
| João Souza     | 987.654.321-00  | Técnico  | jan/2025     | mar/2025       |
| Ana Pereira    | 111.222.333-44  | Gerente  | janeiro/2026 | fevereiro/2026 |
| Carlos Lima    | 555.666.777-88  | Analista | 07/2025      | 11/2025        |
| Carlos Lima    | 555.666.777-88  | Analista | jan/2025     | jan/2025       |

Observações e formatos recomendados para `INICIO` e `FINAL` (prático e direto):

- Formatos preferidos (use um deles):
  - `DD/MM/YYYY` — ex.: `16/11/2025` (quando você tiver o dia exato).
  - `MM/YYYY` ou `M/YYYY` — ex.: `01/2025` ou `7/2025` (quando for do primeiro dia do mês até o último dia do mês final).
  - `mes_por_extenso/YYYY` — ex.: `janeiro/2026` ou `jan/2026` (aceito, mas prefira MM/YYYY para consistência).

- Regras de interpretação (o que o sistema assume):
  - Se a célula contém apenas mês/ano, o sistema considera `INICIO` = primeiro dia do mês e `FINAL` = último dia do mês.
  - Se `INICIO` e `FINAL` correspondem ao mesmo mês/ano, o período será todo o mês (ex.: `jan/2025` → 01/01/2025 a 31/01/2025).
  - Se `INICIO` e `FINAL` forem meses diferentes, o período vai do primeiro dia do mês de início até o último dia do mês de fim.
  - Use `DD/MM/YYYY - DD/MM/YYYY` somente quando quiser especificar dias exatos; caso contrário use `MM/YYYY` para marcar meses inteiros.
  - Se a linha ficar ambígua (por exemplo `INICIO` posterior a `FINAL`), ela será sinalizada no painel como ambígua/erro — corrija a planilha nessa linha.

- Como representar múltiplos períodos para o mesmo servidor:
  - Crie linhas separadas para cada período com o mesmo `SERVIDOR` (ex.: veja as duas linhas de `Carlos Lima` no exemplo).

- Exemplos de entradas e interpretação (entrada → intervalo usado):
  - `01/01/2025` (INICIO)  e `31/01/2025` (FINAL)  → 01/01/2025 a 31/01/2025
  - `jan/2025` (INICIO)     e `mar/2025` (FINAL)   → 01/01/2025 a 31/03/2025
  - `janeiro/2026` (INICIO)  e `fevereiro/2026` (FINAL) → 01/01/2026 a 28/02/2026 (ou 29/02 em ano bissexto)

- Dicas rápidas para o Excel (prático):
  - Mantenha uma célula por valor: `INICIO` em uma coluna, `FINAL` em outra.
  - Para múltiplos períodos, crie linhas separadas (mesma pessoa repetida).
  - Prefira `MM/YYYY` ou `DD/MM/YYYY` com ano explícito; entradas sem ano podem gerar resultados ambíguos.


<a id="exemplo-b"></a>
### Exemplo B — Planilha com coluna `CRONOGRAMA` (descrições práticas)

| SERVIDOR        | CPF             | CARGO    | CRONOGRAMA                                              |
|-----------------|-----------------|----------|---------------------------------------------------------|
| Mariana Santos  | 222.333.444-55  | Analista | 01/06/2025 - 30/06/2025; 01/09/2025 - 30/09/2025        |
| Roberto Alves   | 333.444.555-66  | Técnico  | Início em 01/06/2025 (6 meses consecutivos)             |
| Paula Costa     | 444.555.666-77  | Gerente  | Janeiro a cada ano — a partir de 2026                   |
| Fernando Rocha  | 666.777.888-99  | Analista | 01/09/2025; 01/09/2026                                  |

Observação: no campo `CRONOGRAMA` prefira expressões claras e inclua anos quando possível.

Observações e formatos recomendados para o campo `CRONOGRAMA` (prático e direto):


- **Intervalo com hífen (`-`)**: Use o hífen para indicar um período contínuo entre duas datas, normalmente início e fim do período. Exemplo: `01/06/2025 - 30/06/2025` indica um período de 1 a 30 de junho de 2025. O sistema entende que tudo entre a data inicial e final faz parte do mesmo período de licença.

- **Separação de múltiplos períodos com ponto e vírgula (`;`)**: Quando houver mais de um período para o mesmo servidor, separe cada um com ponto e vírgula. Exemplo: `01/06/2025 - 30/06/2025; 01/09/2025 - 30/09/2025` indica dois períodos distintos. O sistema irá criar uma licença para cada intervalo separado por `;`.

- **Início + duração**: Para indicar que a licença começa em uma data e dura um número específico de meses, use o formato `Início em DD/MM/YYYY (N meses consecutivos)`. Exemplo: `Início em 01/06/2025 (6 meses consecutivos)` gera 6 períodos mensais a partir da data inicial.

- **Recorrência anual**: Para licenças que se repetem todo ano, use uma frase clara, sempre incluindo o ano inicial. Exemplo: `Janeiro a cada ano — a partir de 2026`.

- **Datas isoladas**: Para períodos de apenas um dia ou mês, use `DD/MM/YYYY` ou `MM/YYYY` com ano explícito. Exemplo: `16/11/2025` ou `09/2025`.

**Resumo prático:**
- O hífen (`-`) indica o intervalo entre datas (início e fim).
- O ponto e vírgula (`;`) separa períodos distintos dentro da mesma célula.
- O sistema lê cada trecho separado por `;` como um período independente.
- Sempre inclua o ano para evitar ambiguidade.

Dicas rápidas para o Excel:
- Coloque toda a descrição do cronograma em uma única célula por servidor.
- Evite abreviações sem ano (ex.: `jan`) — prefira `jan/2025` ou `01/2025`.
- Use ponto e vírgula para separar períodos dentro da célula, isso facilita a interpretação pelo sistema.

Exemplos práticos que funcionam bem no Excel (cole na célula `CRONOGRAMA`):

- `01/06/2025 - 30/06/2025; 01/09/2025 - 30/09/2025`
- `Início em 01/06/2025 (6 meses consecutivos)`
- `Janeiro a cada ano — a partir de 2026`
- `16/11/2025; 24/12/2025`

<a id="passo-a-passo"></a>
## Passo a passo (simples)

1. Abra o site no navegador.
2. Clique em "Importar Planilha Excel" e selecione seu arquivo (`.xlsx`, `.xls` ou `.csv`).
3. Aguarde o processamento; você verá um spinner enquanto o sistema lê o arquivo.
4. Depois do processamento, os gráficos e a tabela serão atualizados automaticamente.
5. Use busca e filtros na barra lateral para encontrar e refinar os resultados.
6. Na página "Timeline", clique em "Exportar" para baixar a imagem PNG do gráfico.

<a id="cache"></a>
## O sistema pode lembrar o último arquivo carregado

- O painel pode gravar apenas informações do último arquivo para facilitar recargas rápidas. Há limite de tamanho para esse recurso (aprox. 5 MB) e o dado em cache é considerado válido por até 7 dias.

<a id="erros-comuns"></a>
## Erros comuns e como agir

- Se uma linha aparecer como ambígua ou com erro, verifique:
  - se os cabeçalhos mínimos estão presentes (`SERVIDOR`, `CARGO` e `Cronograma` **OU** `Inicio` e `Fim`);
  - se as datas na coluna de período têm ano (quando aplicável).

<a id="observacoes-finais"></a>
## Observações finais

- O site foi pensado para planilhas Excel; prefira `.xlsx` quando possível.
- Não existe arrastar-e-soltar; use o botão de importação.
- Arquivos muito grandes podem deixar o navegador lento; divida o arquivo se notar travamento.
- O sistema tenta interpretar vários formatos de datas e períodos, mas entradas muito ambíguas podem não ser processadas corretamente; revise os dados conforme necessário.
