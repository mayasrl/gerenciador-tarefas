require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { testConnection, initializeDatabase } = require('./config/database');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Importar rotas
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const teamRoutes = require('./routes/teams');
const taskRoutes = require('./routes/tasks');

// Rotas básicas
app.get('/', (req, res) => {
  res.json({ 
    message: 'API Gerenciador de Tarefas',
    version: '1.0.0',
    status: 'running',
    endpoints: {
      auth: '/api/auth',
      users: '/api/users',
      teams: '/api/teams',
      tasks: '/api/tasks',
      health: '/health'
    }
  });
});

app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Rotas da API
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/teams', teamRoutes);
app.use('/api/tasks', taskRoutes);

// Middleware de tratamento de erros
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    error: 'Algo deu errado!',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Erro interno do servidor'
  });
});

// Middleware para rotas não encontradas
app.use((req, res) => {
  res.status(404).json({ error: 'Rota não encontrada' });
});

// Função para inicializar a aplicação
const initializeApp = async () => {
  try {
    console.log('🚀 Iniciando aplicação...');
    
    // Testar conexão com banco de dados
    const dbConnected = await testConnection();
    if (!dbConnected) {
      console.error('❌ Falha na conexão com o banco de dados');
      process.exit(1);
    }

    // Inicializar estrutura do banco de dados
    const dbInitialized = await initializeDatabase();
    if (!dbInitialized) {
      console.error('❌ Falha na inicialização do banco de dados');
      process.exit(1);
    }

    console.log('✅ Aplicação inicializada com sucesso');
  } catch (error) {
    console.error('❌ Erro na inicialização:', error);
    process.exit(1);
  }
};

// Iniciar servidor
const startServer = async () => {
  await initializeApp();
  
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🌐 Servidor rodando na porta ${PORT}`);
    console.log(`📊 Ambiente: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🔗 URL: http://localhost:${PORT}`);
  });
};

// Iniciar apenas se não estiver sendo importado
if (require.main === module) {
  startServer();
}

module.exports = app;

