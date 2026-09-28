require('dotenv').config({ path: '../.env' });
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { Pool } = require('pg');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*' }
});

// --- CONFIGURAÇÃO DO POSTGRESQL VIA .ENV ---
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME, 
  password: process.env.DB_PASSWORD, 
  port: 5432,
});

// Testando a conexão com o banco
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('❌ Erro ao conectar ao PostgreSQL:', err.stack);
  } else {
    console.log('✅ Conectado ao Banco de Dados PostgreSQL!');
  }
});
// ---------------------------------

// Tornamos a conexão 'async' para podermos buscar o histórico no banco
io.on('connection', async (socket) => {
  console.log('🆕 Novo usuário conectado! ID:', socket.id);

  try {
    // 1. BUSCA O HISTÓRICO: Pega as mensagens do banco em ordem de data (ASC = Mais antigas primeiro)
    const result = await pool.query('SELECT username, text FROM messages ORDER BY created_at ASC');
    const history = result.rows;

    // 2. ENVIA O HISTÓRICO: Manda as mensagens apenas para o usuário que acabou de conectar
    // Note que usamos um evento novo chamado 'load history'
    socket.emit('load history', history.map(msg => ({
      user: msg.username,
      text: msg.text
    })));
    
    console.log(`📜 Histórico enviado para ${socket.id} (${history.length} mensagens)`);
  } catch (err) {
    console.error('❌ Erro ao carregar histórico:', err.stack);
  }

  socket.on('chat message', async (data) => {
    console.log(`💬 ${data.user}: ${data.text}`);

    try {
      await pool.query(
        'INSERT INTO messages (username, text) VALUES ($1, $2)',
        [data.user, data.text]
      );
      console.log('💾 Mensagem salva no banco!');
    } catch (err) {
      console.error('❌ Erro ao salvar mensagem no banco:', err.stack);
    }
    
    io.emit('chat message', data);
  });

  socket.on('disconnect', () => {
    console.log('🔴 Usuário desconectado.');
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`
--------------------------------------------
🚀 Servidor Orelhão está online!
🌐 Acesse em: http://localhost:${PORT}
🔌 WebSocket: ws://localhost:${PORT}
--------------------------------------------
`);
});
