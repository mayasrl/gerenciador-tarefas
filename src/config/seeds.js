const { query } = require('./database');
const User = require('../models/User');
const Team = require('../models/Team');
const Task = require('../models/Task');

const seedDatabase = async () => {
  try {
    console.log('🌱 Iniciando seed do banco de dados...');

    // Verificar se já existem usuários
    const existingUsers = await query('SELECT COUNT(*) FROM users');
    if (parseInt(existingUsers.rows[0].count) > 0) {
      console.log('⚠️  Banco de dados já possui dados. Pulando seed...');
      return;
    }

    // Criar usuário admin padrão
    console.log('👤 Criando usuário administrador...');
    const admin = await User.create({
      name: 'Administrador',
      email: 'admin@gerenciador.com',
      password: 'admin123',
      role: 'admin'
    });
    console.log(`✅ Admin criado: ${admin.email}`);

    // Criar alguns usuários membros
    console.log('👥 Criando usuários membros...');
    const member1 = await User.create({
      name: 'João Silva',
      email: 'joao@empresa.com',
      password: 'senha123',
      role: 'member'
    });

    const member2 = await User.create({
      name: 'Maria Santos',
      email: 'maria@empresa.com',
      password: 'senha123',
      role: 'member'
    });

    const member3 = await User.create({
      name: 'Pedro Oliveira',
      email: 'pedro@empresa.com',
      password: 'senha123',
      role: 'member'
    });

    console.log(`✅ Membros criados: ${member1.email}, ${member2.email}, ${member3.email}`);

    // Criar times de exemplo
    console.log('🏢 Criando times...');
    const teamDev = await Team.create({
      name: 'Desenvolvimento',
      description: 'Time responsável pelo desenvolvimento de software',
      created_by: admin.id
    });

    const teamMarketing = await Team.create({
      name: 'Marketing',
      description: 'Time responsável pelas estratégias de marketing',
      created_by: admin.id
    });

    console.log(`✅ Times criados: ${teamDev.name}, ${teamMarketing.name}`);

    // Adicionar membros aos times
    console.log('👥 Adicionando membros aos times...');
    await teamDev.addMember(member1.id);
    await teamDev.addMember(member2.id);
    await teamMarketing.addMember(member2.id);
    await teamMarketing.addMember(member3.id);

    // Criar tarefas de exemplo
    console.log('📋 Criando tarefas de exemplo...');
    
    // Tarefas do time de desenvolvimento
    await Task.create({
      title: 'Implementar autenticação JWT',
      description: 'Desenvolver sistema de autenticação usando JSON Web Tokens',
      status: 'Em progresso',
      priority: 'Alta',
      assigned_to: member1.id,
      team_id: teamDev.id,
      created_by: admin.id,
      due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 dias
    });

    await Task.create({
      title: 'Criar testes unitários',
      description: 'Implementar testes unitários para os models',
      status: 'Pendente',
      priority: 'Média',
      assigned_to: member2.id,
      team_id: teamDev.id,
      created_by: admin.id,
      due_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000) // 14 dias
    });

    await Task.create({
      title: 'Documentar API',
      description: 'Criar documentação completa da API',
      status: 'Pendente',
      priority: 'Baixa',
      assigned_to: member1.id,
      team_id: teamDev.id,
      created_by: admin.id,
      due_date: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000) // 21 dias
    });

    // Tarefas do time de marketing
    await Task.create({
      title: 'Criar campanha de lançamento',
      description: 'Desenvolver estratégia de marketing para o lançamento do produto',
      status: 'Em progresso',
      priority: 'Alta',
      assigned_to: member3.id,
      team_id: teamMarketing.id,
      created_by: admin.id,
      due_date: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000) // 10 dias
    });

    await Task.create({
      title: 'Análise de concorrência',
      description: 'Realizar análise detalhada dos concorrentes',
      status: 'Concluído',
      priority: 'Média',
      assigned_to: member2.id,
      team_id: teamMarketing.id,
      created_by: admin.id,
      due_date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) // 2 dias atrás (concluída)
    });

    console.log('✅ Tarefas de exemplo criadas');

    console.log('🎉 Seed do banco de dados concluído com sucesso!');
    console.log('\n📋 Dados criados:');
    console.log('👤 Usuários:');
    console.log(`   - Admin: ${admin.email} (senha: admin123)`);
    console.log(`   - Membro: ${member1.email} (senha: senha123)`);
    console.log(`   - Membro: ${member2.email} (senha: senha123)`);
    console.log(`   - Membro: ${member3.email} (senha: senha123)`);
    console.log('🏢 Times: Desenvolvimento, Marketing');
    console.log('📋 5 tarefas de exemplo criadas');

  } catch (error) {
    console.error('❌ Erro durante o seed:', error);
    throw error;
  }
};

// Executar seed se chamado diretamente
if (require.main === module) {
  seedDatabase()
    .then(() => {
      console.log('Seed concluído. Encerrando...');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Erro no seed:', error);
      process.exit(1);
    });
}

module.exports = { seedDatabase };

