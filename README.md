

# Dashboard de Licenças


## Introdução às Documentações

Este projeto acompanha dois guias principais para facilitar o uso e a manutenção do sistema:

- **[Guia do Usuário](docs/GUIA-DO-USUARIO.md)**: Explica, de forma prática e acessível, como utilizar o painel de licenças. Você encontrará instruções passo a passo para importar planilhas, dicas de formatação dos dados, exemplos práticos para copiar/colar no Excel, explicações sobre os campos obrigatórios, como usar filtros e exportar gráficos, além de orientações para resolver erros comuns. Ideal para quem deseja apenas utilizar o sistema sem se preocupar com detalhes técnicos.

- **[Guia do Desenvolvedor](docs/GUIA-DO-DESENVOLVEDOR.md)**: Destinado a quem deseja entender o funcionamento interno do sistema. Traz um mapeamento detalhado dos arquivos JavaScript principais, descrevendo a responsabilidade de cada função, parâmetros, retornos, efeitos colaterais e casos de borda importantes. Serve como referência rápida para manutenção, testes ou evolução do código.

Consulte o [Guia do Usuário](docs/GUIA-DO-USUARIO.md) para aprender a operar o painel e o [Guia do Desenvolvedor](docs/GUIA-DO-DESENVOLVEDOR.md) para compreender ou alterar a lógica do sistema.

Descrição curta

Este projeto é um painel web simples para visualizar e acompanhar cronogramas de licenças de servidores (ex.: licenças por mês, períodos, recorrências).

Demo hospedado

- Site: https://christopheredlly.github.io/Licencas/

Quero usar? Comece por aqui:

- Guia do Usuário (instruções passo a passo): [docs/GUIA-DO-USUARIO.md](docs/GUIA-DO-USUARIO.md)

Quem deve usar este repositório

- Usuários finais (que têm planilhas Excel e querem visualizar/filtrar os cronogramas).
- Desenvolvedores (que queiram Recriar o projeto).

## Comportamento do sistema.

Importante sobre como os dados são tratados

- Todo o processamento de planilhas ocorre no navegador do usuário (client‑side). Os arquivos que você seleciona são lidos e processados localmente pelo seu navegador; o sistema não envia automaticamente o conteúdo desses arquivos para servidores externos.
- O aplicativo não publica nem distribui os dados por conta própria, nem grava automaticamente os arquivos em servidores remotos. Se você fechar a página, os dados carregados não são publicados nem salvos por este sistema.

Se precisar de suporte para implantação ou tiver dúvidas sobre privacidade, entre em contato com o mantenedor (informações abaixo).


## Para usuários

- Leia o Guia do Usuário: [docs/GUIA-DO-USUARIO.md](docs/GUIA-DO-USUARIO.md)
- Demo online: https://christopheredlly.github.io/Licencas/

Quickstart para não técnicos (3 passos)
1. Abra o link do Demo ou abra `index.html` no navegador.
2. Clique em "Importar Planilha Excel" e selecione seu `.xlsx`/`.xls`/`.csv`.
3. Use busca e filtros; clique em um nome para ver detalhes.

Dicas práticas (linguagem simples)

- Colunas mínimas: `SERVIDOR` e uma coluna de período (`CRONOGRAMA`) ou `INICIO` + `FINAL`.
- Prefira inserir anos nas datas (`01/2026`, `jan/2026`) para evitar ambiguidade.
- Se o demo não aceitar seu arquivo, abra o Excel e salve como `.xlsx` novamente.

## Para desenvolvedores

- Guia do Desenvolvedor: [docs/GUIA-DO-DESENVOLVEDOR.md](docs/GUIA-DO-DESENVOLVEDOR.md)

Onde olhar primeiro

- `js/cronogramaParser.js` — lógica de interpretação dos cronogramas.
- `js/dashboard.js` — handlers de upload, orquestração do parser e renderização.
- `index.html` — estrutura da UI e pontos de integração (IDs de botões e modais).

Executando localmente (rápido)

1. Sirva o diretório com um servidor estático (ex.: `python -m http.server 8000`) ou abra `index.html` localmente.
2. Abra o console do navegador para ver logs e erros.

## Autenticação Microsoft (SPA segura)

- O projeto usa [MSAL Browser](https://learn.microsoft.com/azure/active-directory/develop/msal-overview#msaljs) com o fluxo **Authorization Code + PKCE**, que é o método recomendado pela Microsoft para aplicações 100% client-side.
- No portal Azure, registre o aplicativo como **Single-page application (SPA)** e configure o `Redirect URI` apontando para o domínio que servirá o dashboard (ex.: `https://christopheredlly.github.io/Licencas`).
- Não use Client Secret: apps SPA são clientes públicos, então qualquer segredo embutido no bundle seria exposto para o usuário final.
- O painel só libera o restante da interface depois que o usuário realiza o login Microsoft; um overlay bloqueia a interação até a autenticação.
- Preencha `.env` com:
	- `AZURE_CLIENT_ID`
	- `AZURE_TENANT_ID`
	- `AZURE_REDIRECT_URI`
	- `AZURE_AUTHORITY` (opcional; usa `https://login.microsoftonline.com/<TENANT>` caso omita)
	- `AZURE_SCOPES` (lista separada por vírgula, ex.: `User.Read,Files.Read.All`)
- Gere `env.config.js` rodando `node scripts/generate-env-config.mjs`. O arquivo é ignorado pelo git e só carrega os campos seguros.
- Se precisar chamar APIs que exijam credenciais de aplicativo (Client Secret / Client Certificate), crie um backend protegido e use MSAL Node nele. Não exponha esse fluxo diretamente no navegador.

## Estrutura do repositório

- `index.html`, `css/`, `js/`, `img/`, `docs/`.


## Contato

- Maintainer: ChristopherEdlly
- Email: Christopher2004edlly@gmail.com
- WhatsApp: (79) 98178-1022

---


