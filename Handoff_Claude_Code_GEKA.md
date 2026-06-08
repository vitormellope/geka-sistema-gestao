# Handoff Técnico e Arquitetural: Sistema de Gestão GEKA

Este documento contém o escopo completo, regras de negócio e arquitetura técnica para que o **Claude Code** (ou outro agente de IA) possa inicializar, estruturar e codificar o Sistema de Gestão GEKA do zero, preparando-o para deploy no Vercel (Frontend) e Github.

---

## 1. Visão Geral do Sistema
O Sistema de Gestão GEKA é uma plataforma interna de gerenciamento de demandas para uma empresa de comunicação visual. Ele organiza o fluxo desde a entrada de novas solicitações (vendedores) até o fechamento de propostas comerciais (orçamentos), conectando múltiplos perfis de usuários, eliminando planilhas dispersas e centralizando o conhecimento.

## 2. Stack Tecnológica a ser Implementada
O Claude Code deve configurar o repositório utilizando a seguinte stack desacoplada:

### Backend
- **Framework:** FastAPI (Python)
- **Banco de Dados:** SQLite (arquivo `geka.db`) via SQLAlchemy ORM.
- **Autenticação:** Baseada em JWT (JSON Web Tokens).

### Frontend
- **Framework:** React com TypeScript (Vite recomendado).
- **Estilização:** Tailwind CSS.
- **Roteamento:** React Router.
- **Integração API:** Axios (com envio automático do token JWT via header `Authorization`).

---

## 3. Matriz de Perfis e Permissões (Roles)
A aplicação deve possuir 5 perfis de acesso, cada um com visões específicas:

1. **Vendedor:** Cria campanhas e demandas; envia propostas aos clientes; fecha negócios.
2. **Assistente:** Possui as mesmas permissões do vendedor; atua auxiliando-o na abertura e acompanhamento das demandas.
3. **Orçamentista:** Atua na "Fila de Triagem". Avalia a demanda e decide se realiza um "Orçamento Direto" ou se encaminha para a decupagem técnica. Define SLAs de entrega.
4. **Projetista:** Recebe demandas complexas na "Fila de Decupagem". Realiza a análise técnica. Se faltar informações, devolve a demanda como "Pendência" para o vendedor.
5. **Gerente:** Acesso irrestrito. Visualiza todas as demandas, possui dashboard gerencial de Kanban, cadastra usuários e edita categorias/taxonomias.

---

## 4. Fluxo de Trabalho e Status das Demandas (Kanban)
O ciclo de vida de uma demanda obedece o seguinte funil (Pipeline):

1. **Nova / Lead Novo:** Gerada pelo Vendedor.
2. **Em Triagem:** O Orçamentista recebe a demanda e avalia os dados (medidas, quantidade, prazo, categoria).
3. **Pendência de Informação:** Caso falte dados, Orçamentista ou Projetista devolve ao Vendedor para ajuste.
4. **Fila de Decupagem (Em Projeto):** Demanda aguardando o Projetista planificar o material.
5. **Orçamento Direto (Em Desenvolvimento):** O orçamentista insere o valor final (ex: cálculo vindo do Holdprint).
6. **Orçado:** Valor definido. A demanda retorna à visão do comercial.
7. **Proposta Enviada:** Vendedor registra que enviou o orçamento para aprovação do cliente.
8. **Fechado / Faturado:** Fim do processo, negócio ganho.

---

## 5. Modelagem do Banco de Dados (Entidades Principais)
O Claude Code deve gerar os models (`models.py`) e schemas (`schemas.py`) para:

- **Usuários (Users):** `id`, `nome`, `email`, `hashed_password`, `role` (enum dos perfis), `is_active`.
- **Categorias (Categories):** `id`, `nome` (ex: PDV, Cenografia, Letreiro), `fields_schema` (JSON com campos dinâmicos requeridos).
- **Campanhas (Campaigns):** Agrupador superior a projetos. `id`, `cliente`, `nome_campanha`. Uma campanha pode ter várias demandas associadas (ex: Fachada e Totem dentro da mesma campanha "Loja Venâncio").
- **Demandas (Demands):** A entidade central. `id`, `campaign_id` (FK), `titulo`, `categoria_id` (FK), `status` (enum do fluxo), `prioridade`, `prazo_esperado`, `prazo_orcamento_sla`, `valor_estimado`.
- **Histórico (Logs):** `id`, `demand_id` (FK), `user_id` (FK), `acao` (mudança de status), `observacao`, `timestamp`.
- **Anexos (Attachments):** Suporte para arquivos PDF enviados como briefing.

---

## 6. Funcionalidades da Interface Frontend (Componentes)
O Claude Code deve estruturar a pasta `/src` do React com os seguintes módulos principais:

- `Dashboard.tsx` & `KanbanBoard.tsx`: Telas principais com colunas drag-and-drop ou listagem do funil de vendas.
- `NewDemand.tsx`: Formulário inteligente. Se o vendedor selecionar a categoria "Display", deve exigir `medidas`, `quantidade` e `prazo`.
- `TriageQueue.tsx`: Tela exclusiva do Orçamentista para aprovar, enviar para projeto ou retornar dependência.
- `DemandSlideOver.tsx`: Um modal lateral (slide-over) que abre ao clicar numa demanda, mostrando todo o histórico de logs, transições e anexos sem sair do dashboard.
- `NotificationBell.tsx`: Central de notificações para avisar o vendedor quando a demanda for orçada, ou o orçamentista quando chegar nova triagem.

---

## 7. Instruções Finais para o Claude Code
**Ao ler este arquivo, execute as seguintes tarefas:**
1. Inicialize um projeto FastAPI na pasta `backend/`.
2. Inicialize um projeto React+Vite+Tailwind na pasta `frontend/`.
3. Crie o banco SQLite `geka.db` e configure as rotas CRUD básicas para as entidades acima.
4. Construa a interface React baseada no fluxo descrito.
5. Gere instruções de deploy no Vercel (para o frontend) e Render/Railway (para o backend).
