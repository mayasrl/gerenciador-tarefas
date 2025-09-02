# Gerenciador de Tarefas API

API completa para um sistema de gerenciamento de tarefas, desenvolvida com Node.js, Express e PostgreSQL. Permite criar contas, autenticar usuários, gerenciar tarefas, times e membros, com sistema de autorização baseado em roles (admin/member).

---

## Funcionalidades

- **Autenticação e Autorização:**
  - Registro de usuários com senha criptografada (bcrypt).
  - Login com JSON Web Tokens (JWT).
  - Roles de usuário: `admin` e `member`.
  - `admin` pode gerenciar usuários, times e todas as tarefas.
  - `member` pode gerenciar apenas suas tarefas e visualizar tarefas do seu time.

- **Gerenciamento de Times:**
  - CRUD completo de times (apenas admin).
  - Adicionar e remover membros de times (apenas admin).

- **Gerenciamento de Tarefas:**
  - CRUD completo de tarefas.
  - Atribuição de tarefas a membros específicos.
  - Status: `Pendente`, `Em progresso`, `Concluído`.
  - Prioridade: `Alta`, `Média`, `Baixa`.
  - Histórico de mudanças em cada tarefa.

- **Endpoints:**
  - `/api/auth`: Autenticação (registro, login, perfil).
  - `/api/users`: Gerenciamento de usuários (admin).
  - `/api/teams`: Gerenciamento de times.
  - `/api/tasks`: Gerenciamento de tarefas.

---

## Tecnologias Utilizadas

- **Backend:** Node.js
- **Framework:** Express.js
- **Banco de Dados:** PostgreSQL
- **Autenticação:** JSON Web Tokens (JWT)
- **Testes:** Jest e Supertest
- **Variáveis de Ambiente:** Dotenv

---

## Estrutura do Projeto

```
/gerenciador-tarefas
|-- src
|   |-- config          # Configurações (banco de dados, seeds)
|   |-- controllers     # Lógica de negócio
|   |-- middleware      # Middlewares (autenticação, autorização)
|   |-- models          # Modelos de dados (User, Team, Task)
|   |-- routes          # Definição das rotas da API
|   `-- app.js          # Arquivo principal da aplicação
|-- tests               # Testes com Jest
|-- .env                # Variáveis de ambiente
|-- .gitignore          # Arquivos ignorados pelo Git
|-- package.json        # Dependências e scripts
`-- README.md           # Documentação do projeto
```

---

## Como Executar Localmente

1. **Clone o repositório:**
   ```bash
   git clone https://github.com/seu-usuario/gerenciador-tarefas.git
   cd gerenciador-tarefas
   ```

2. **Instale as dependências:**
   ```bash
   npm install
   ```

3. **Configure as variáveis de ambiente:**
   - Crie um arquivo `.env` na raiz do projeto.
   - Copie o conteúdo de `.env.example` para `.env` e preencha com suas configurações de banco de dados e JWT secret.

4. **Configure o banco de dados PostgreSQL:**
   - Crie um banco de dados com o nome especificado em `.env`.
   - A aplicação irá criar as tabelas automaticamente na primeira execução.

5. **Execute a aplicação em modo de desenvolvimento:**
   ```bash
   npm run dev
   ```
   A API estará disponível em `http://localhost:3000`.

6. **Execute os testes:**
   ```bash
   npm test
   ```

---

## Endpoints da API

### Autenticação (`/api/auth`)

- `POST /register`: Registrar novo usuário.
- `POST /login`: Login de usuário.
- `GET /profile`: Obter perfil do usuário logado.
- `PUT /profile`: Atualizar perfil do usuário logado.

### Usuários (`/api/users`) - Admin

- `GET /`: Listar todos os usuários.
- `GET /:id`: Buscar usuário por ID.
- `POST /`: Criar novo usuário.
- `PUT /:id`: Atualizar usuário.
- `DELETE /:id`: Deletar usuário.

### Times (`/api/teams`)

- `GET /`: Listar times.
- `GET /:id`: Buscar time por ID.
- `POST /`: Criar novo time (admin).
- `PUT /:id`: Atualizar time (admin).
- `DELETE /:id`: Deletar time (admin).
- `POST /:id/members`: Adicionar membro ao time (admin).
- `DELETE /:id/members/:userId`: Remover membro do time (admin).

### Tarefas (`/api/tasks`)

- `GET /`: Listar tarefas.
- `GET /:id`: Buscar tarefa por ID.
- `POST /`: Criar nova tarefa.
- `PUT /:id`: Atualizar tarefa.
- `DELETE /:id`: Deletar tarefa.
- `POST /:id/assign`: Atribuir tarefa a um usuário.
- `POST /:id/status`: Alterar status da tarefa.
- `GET /:id/history`: Buscar histórico de uma tarefa.

---

## Deploy

A aplicação está configurada para deploy no Render. Para fazer o deploy:

1. Crie uma conta no Render.
2. Crie um novo "Web Service" e conecte seu repositório do GitHub.
3. Configure as variáveis de ambiente no Render.
4. O Render irá detectar o `package.json` e instalar as dependências com `npm install`.
5. O comando de start `npm start` será executado automaticamente.

---

<p align="center">
  Desenvolvido durante o curso da <strong>Rocketseat</strong> com <img src="heart.svg" width="14" alt="coração"/> por <strong>@mayasrl</strong>.
</p>
