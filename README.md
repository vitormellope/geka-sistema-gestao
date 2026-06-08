# Sistema de Gestão GEKA

Plataforma interna de gerenciamento de demandas para empresa de comunicação visual.

## Stack

- **Backend:** FastAPI + SQLAlchemy + SQLite + JWT
- **Frontend:** React + TypeScript + Vite + Tailwind CSS

## Setup Local

### Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

O backend inicia em `http://localhost:8000`. Um usuário admin é criado automaticamente:
- **Email:** admin@geka.com
- **Senha:** geka2024

### Frontend

```bash
cd frontend
npm install
npm run dev
```

O frontend inicia em `http://localhost:5173` e faz proxy das chamadas `/api` para o backend.

## Deploy

### Frontend (Vercel)

1. Conecte o repositório no Vercel
2. Configure:
   - **Root Directory:** `frontend`
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
3. Adicione a variável de ambiente `VITE_API_URL` com a URL do backend

### Backend (Render / Railway)

1. Conecte o repositório
2. Configure:
   - **Root Directory:** `backend`
   - **Build Command:** `pip install -r requirements.txt`
   - **Start Command:** `uvicorn main:app --host 0.0.0.0 --port $PORT`
3. Adicione a variável `SECRET_KEY` com uma chave segura

## Perfis de Acesso

| Perfil | Acesso |
|--------|--------|
| Vendedor | Cria campanhas e demandas, envia propostas |
| Assistente | Mesmas permissões do vendedor |
| Orçamentista | Fila de triagem, define orçamentos e SLAs |
| Projetista | Fila de decupagem, análise técnica |
| Gerente | Acesso total, dashboard Kanban, gestão de usuários |

## Fluxo de Demandas

Nova → Em Triagem → Em Projeto / Em Desenvolvimento → Orçado → Proposta Enviada → Fechado
