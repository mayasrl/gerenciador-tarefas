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

<p align="center">
  Desenvolvido durante o curso da <strong>Rocketseat</strong> com <img src="heart.svg" width="14" alt="coração"/> por <strong>@mayasrl</strong>.
</p>
