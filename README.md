
# Dashboard de Licenças

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

## Estrutura do repositório

- `index.html`, `css/`, `js/`, `img/`, `docs/`.


## Contato

- Maintainer: ChristopherEdlly
- Email: Christopher2004edlly@gmail.com
- WhatsApp: (79) 98178-1022

---


