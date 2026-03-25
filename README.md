# RastroFlow v4 - Sistema de Rastreamento (SaaS)

Sistema completo para rastreamento de encomendas focado em afiliados e lojistas PAD (Pay After Delivery).
Construído com **FastAPI**, **React (Vite/Tailwind)** e **PostgreSQL+Redis** via Docker.

## Stack Tecnológica
- **Backend:** Python + FastAPI + SQLAlchemy Async (asyncpg)
- **Background Jobs:** Celery + Redis
- **Frontend:** React + Vite + Tailwind CSS + Recharts
- **Banco de Dados:** PostgreSQL
- **Integrações:** 17TRACK (Rastreio), Resend (Emails), Cakto/Keedpay (Webhooks de entrada)

## Estrutura do Projeto
```
├── backend/
│   ├── app/ (Lógica central, roteadores, models, celery tasks)
│   ├── alembic/ (Migrações do DB)
│   ├── requirements.txt
│   ├── Dockerfile
│   └── create_admin.py (Script CLI)
├── frontend/
│   ├── src/ (React app)
│   ├── nginx.conf
│   ├── package.json
│   ├── tailwind.config.js
│   ├── vite.config.js
│   └── Dockerfile
├── docker-compose.yml
└── .env.example
```

## Instalação e Deploy (VPS)

1. **Pré-requisitos**: A VPS já deve possuir Docker e Docker Compose instalados. Você precisa ter criado a rede externa e os containers de banco de dados conforme as especificações.
   ```bash
   docker network create icontainer-network
   # (Certifique-se que o postgres e o redis já estão rodando nesta rede)
   ```

2. **Configuração do Ambiente**:
   - Clone ou copie este repositório para a VPS.
   - Copie o arquivo de exemplo e edite com suas credenciais:
     ```bash
     cp .env.example .env
     nano .env
     ```

3. **Subindo a Aplicação**:
   ```bash
   docker-compose up -d --build
   ```
   Isso iniciará:
   - `backend` (FastAPI na porta 8000 interna)
   - `frontend` (Nginx servindo React e roteando `/api/` para o backend na porta 3000 ligada ao host)
   - `celery` (Worker para chamadas assíncronas 17TRACK e emails)
   - `celery-beat` (Agendador para polling de rastreamento e reset mensal)

4. **Criando o primeiro Administrador**:
   Após os containers subirem e o banco de dados ser inicializado (as tabelas são criadas automaticamente no startup do FastAPI), execute:
   ```bash
   docker-compose exec backend python create_admin.py
   ```
   Siga os prompts para definir o e-mail e senha do administrador root.

5. **Acesso**:
   Configure seu Cloudflare/Proxy Reverso para apontar `v4.rastroflow.com.br` para a porta `3000` da VPS.
   - Painel: `https://v4.rastroflow.com.br/`
   - APIs Documentação: `https://v4.rastroflow.com.br/api/docs`

## Logs e Manutenção
Para visualizar os logs dos workers ou da API:
```bash
docker-compose logs -f celery
docker-compose logs -f backend
```

Para aplicar modificações no frontend no futuro:
```bash
docker-compose build frontend
docker-compose up -d frontend
```
