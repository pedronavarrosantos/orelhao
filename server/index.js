require('dotenv').config({ path: '../.env' });
const fastify = require('fastify')({ logger: true });
const socketio = require('socket.io');

const port = process.env.PORT || 3001;
const apiKey = process.env.IA_API_KEY;

// 1. Configuração do Socket.io
// O Socket.io precisa de um servidor HTTP bruto para funcionar, o Fastify fornece isso
const io = socketio(fastify.server, {
  cors: {
    origin: '*', // Permite que qualquer cliente (como nosso app futuro) se conecte
    methods: ['GET', 'POST']
  }
});

// 2. Lógica de Conexão do Chat
io.on('connection', (socket) => {
  console.log('🆕 Novo usuário conectado! ID:', socket.id);

  // Quando o servidor recebe uma mensagem chamada 'chat message'
  socket.on('chat message', (msg) => {
    console.log('💬 Mensagem recebida:', msg);
    
    // O servidor reenvia a mensagem para TODOS os usuários conectados
    io.emit('chat message', msg);
  });

  socket.on('disconnect', () => {
    console.log('🔴 Usuário desconectado.');
  });
});

// Rota de teste para o navegador
fastify.get('/', async (request, reply) => {
  return { status: 'Orelhão Chat Server Online!', socket_status: 'Ativo' };
});

const start = async () => {
  try {
    await fastify.listen({ port: port, host: '0.0.0.0' });
    
    console.log('\n--------------------------------------------');
    console.log('🚀 Orelhão Chat Server está rodando!');
    console.log(`🌐 HTTP: http://localhost:${port}`);
    console.log(`🔌 WebSocket: ws://localhost:${port}`);
    
    if (apiKey) {
      console.log('✅ Chave de API detectada e pronta para o Bot!');
    } else {
      console.log('❌ Erro: Chave de API não encontrada.');
    }
    console.log('--------------------------------------------\n');
    
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
