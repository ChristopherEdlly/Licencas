# 📘 Proximo Objetivo **— Integração do Site com MSAL + Microsoft Graph + Planilha de Licença-Prêmio**

## **1. Autenticação com MSAL (Microsoft Login)**

O site utiliza **MSAL (Microsoft Authentication Library)** para autenticar os usuários com suas contas corporativas Microsoft.

### O que isso garante:

* Apenas funcionários autenticados acessam o sistema
* O site não armazena credenciais
* Cada ação é vinculada à identidade real do colaborador
* Todos os acessos são auditados pela organização (Microsoft 365 Audit Logs)

### Informações obtidas com a autenticação:

* Nome completo do usuário
* E-mail corporativo
* Identificador único (ID do colaborador dentro do Entra ID)

Essas informações são usadas apenas para:

* Exibir dados personalizados na interface
* Filtrar os registros pertencentes ao próprio usuário
* Registrar ações com identificação segura

---

# 📘 **2. Acesso à planilha via Microsoft Graph**

A planilha de licenças-prêmio está armazenada no SharePoint da empresa.

O site não acessa o arquivo diretamente por URL; em vez disso, usa a  **API do Microsoft Graph** .

### Por que isso é mais seguro:

* O link real da planilha **não aparece no código**
* O acesso é feito com o **token** do usuário autenticado
* Somente pessoas com permissão no SharePoint conseguem ler/alterar
* Permissões são inteiramente controladas pelo SharePoint (nível corporativo)

O Microsoft Graph atua como uma camada de segurança entre o site e o SharePoint.

---

# 📘 **3. Permissões e segurança da planilha**

O SharePoint controla quais usuários podem:

* Ler dados
* Editar sua própria linha
* Criar novos registros
* Apenas visualizar informações pessoais

O site não tem “poderes próprios”.

Tudo depende da permissão que cada usuário já possui no SharePoint.

### Isso evita:

* Vazamento de dados
* Manipulação indevida
* Escalada de privilégios
* Acesso não autorizado
* Necessidade de armazenar segredos no front-end

---

# 📘 **4. Estrutura da planilha (colunas)**

A planilha utilizada possui as colunas:

<pre class="overflow-visible! px-0!" data-start="2403" data-end="2541"><div class="contain-inline-size rounded-2xl corner-superellipse/1.1 relative bg-token-sidebar-surface-primary"><div class="sticky top-9"><div class="absolute end-0 bottom-0 flex h-9 items-center pe-2"><div class="bg-token-bg-elevated-secondary text-token-text-secondary flex items-center gap-4 rounded-sm px-2 font-sans text-xs"></div></div></div><div class="overflow-y-auto p-4" dir="ltr"><code class="whitespace-pre!"><span><span>NUMERO, EMISSAO, UNIDADE, LOTACAO, NOME, </span><span>CARGO</span><span>, REF,
CPF, RG, AQUISITIVO_INICIO, AQUISITIVO_FIM,
A_PARTIR, TERMINO, RESTANDO, GOZO
</span></span></code></div></div></pre>

Ela funciona como:

* **Calendário de gozo** das licenças-prêmio
* **Histórico corporativo** de gozos realizados
* **Controle de períodos aquisitivos e consumidos**

---

# 📘 **5. Como o site garante personalização (mostrar só dados do usuário)**

Ao autenticar, o MSAL entrega o  **nome e e-mail do funcionário** .

O site utiliza esses dados para **filtrar a planilha** via Graph, retornando somente:

* Registros onde `NOME` corresponde ao nome do usuário, ou
* Registros onde `CPF` corresponde ao usuário autenticado (se necessário), ou
* Registros onde `UNIDADE` ou `LOTACAO` sejam compatíveis (em caso de gestores)

### Vantagens:

* Cada colaborador só vê seus próprios dados
* Gestores podem ver sua equipe (conforme permissões do SharePoint)
* Transparência e privacidade garantidas

---

# 📘 **6. Como funciona o CRU (Criar, Ler e Atualizar) na planilha**

### **1. Leitura (Read)**

O site consulta a planilha via Graph e retorna os dados autorizados para o usuário.

### **2. Criação (Create)**

O funcionário pode registrar:

* novo gozo
* nova programação
* início de um período
* qualquer dado que a empresa permitir

O Graph insere uma nova linha na tabela da planilha.

### **3. Atualização (Update)**

O funcionário pode atualizar:

* datas de gozo
* período aquisitivo
* previsão de término
* horas/quantidade restantes

A atualização é feita somente nas linhas que ele tem permissão para alterar.

### ❗ Importante

Nenhuma ação de edição ultrapassa o nível de permissão do colaborador no SharePoint.

Se ele não tem permissão de edição, o Graph nega automaticamente.

 **O sistema não permite exclusão (sem “D” do CRUD)** , garantindo integridade histórica.

---

# 📘 **7. Por que este modelo é extremamente seguro**

### ✔️ Sem links expostos

A planilha nunca aparece no código.

### ✔️ Sem segredos no front-end

Não há senhas, credenciais, tokens ou chaves embarcadas no site.

### ✔️ Controle corporativo real

Permissões vêm diretamente do SharePoint e Entra ID.

### ✔️ Tokens temporários

Mesmo em caso de interceptação (teórica), o token expira em minutos.

### ✔️ Auditoria completa

Toda ação (leitura ou escrita) é registrada nos logs do Microsoft 365.

### ✔️ Sem servidor intermediário

Não existe backend vulnerável — o front fala diretamente com o Microsoft Graph.

---

# 📘 **8. Em resumo (ideal para colocar em documentação)**

> “O sistema realiza autenticação corporativa via MSAL e acessa a planilha de licenças-prêmio através do Microsoft Graph.
>
> O acesso é totalmente delegado e seguro, respeitando as permissões individuais definidas no SharePoint.
>
> Cada colaborador visualiza apenas seus próprios dados, enquanto gestores têm acesso ampliado conforme suas permissões.
>
> A aplicação permite criar e atualizar registros diretamente na planilha, mantendo integridade histórica e sem expor links ou credenciais em código.”
>
