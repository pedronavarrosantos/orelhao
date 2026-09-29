require('dotenv').config({ path: '../.env' });
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer');
const cors = require('cors');
const crypto = require('crypto');

const app = express();
app.use(cors()); 
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*' }
});

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME, 
  password: process.env.DB_PASSWORD, 
  port: 5432,
});

const transporter = nodemailer.createTransport({
  host: "sandbox.smtp.mailtrap.io",
  port: 2525,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('❌ Erro ao conectar ao PostgreSQL:', err.stack);
  } else {
    console.log('✅ Conectado ao Banco de Dados PostgreSQL!');
  }
});

// --- ROTA DE CADASTRO ---
app.post('/register', async (req, res) => {
  const { username, email, password } = req.body;
  if (!username || !email || !password) {
    return res.status(400).json({ error: 'Por favor, preencha todos os campos!' });
  }
  try {
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const result = await pool.query(
      'INSERT INTO users (username, email, password_hash, verification_token) VALUES ($1, $2, $3, $4) RETURNING id',
      [username, email, hashedPassword, verificationToken]
    );
    const verificationLink = `http://localhost:3001/verify?token=${verificationToken}`;
    const mailOptions = {
      from: '"Orelhão Chat" <suporte@orelhao.com.br>',
      to: email, 
      subject: '📞 Verifique sua conta no Orelhão!',
      text: `Olá ${username}! Para ativar sua conta, clique no link: ${verificationLink}`,
      html: `<b>Olá ${username},</b><br><p>Para ativar sua conta e começar a conversar, clique no botão abaixo:</p>
             <a href="${verificationLink}" style="background-color: #00d1ff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; font-weight: bold;">Verificar Conta</a>`
    };
    await transporter.sendMail(mailOptions);
    res.status(201).json({ message: 'Usuário criado! Verifique seu e-mail para ativar a conta.' });
  } catch (err) {
    if (err.code === '23505') {
      res.status(400).json({ error: 'Este nome de usuário ou e-mail já está em uso!' });
    } else {
      console.error('❌ Erro no cadastro:', err.stack);
      res.status(500).json({ error: 'Erro interno no servidor.' });
    }
  }
});

// --- ROTA DE LOGIN COM DISPARO DE 2FA ---
app.post('/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Por favor, preencha nome de usuário e senha!' });
  }
  try {
    const result = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
    if (result.rows.length === 0) return res.status(401).json({ error: 'Usuário não encontrado!' });
    const user = result.rows[0];
    const passwordMatch = await bcrypt.compare(password, user.password_hash);
    if (!passwordMatch) return res.status(401).json({ error: 'Senha incorreta!' });
    if (!user.is_verified) return res.status(403).json({ error: 'Sua conta ainda não foi verificada. Verifique seu e-mail!' });
    
    const twoFactorCode = Math.floor(100000 + Math.random() * 900000).toString();
    await pool.query('UPDATE users SET two_factor_code = $1 WHERE username = $2', [twoFactorCode, username]);
    
    const mailOptions = {
      from: '"Orelhão Segurança" <seguranca@orelhao.com.br>',
      to: user.email,
      subject: '🔑 Seu código de acesso ao Orelhão',
      text: `Seu código de verificação é: ${twoFactorCode}`,
      html: `<h2>Olá ${user.username}!</h2><p>Seu código de segurança para acessar o Orelhão é:</p>
             <h1 style="color: #00d1ff; font-size: 32px; letter-spacing: 5px;">${twoFactorCode}</h1>
             <p>Este código expira em breve. Não o compartilhe com ninguém.</p>`
    };
    await transporter.sendMail(mailOptions);
    res.status(200).json({ message: 'Código de verificação enviado ao seu e-mail!', requires2FA: true, username: user.username });
  } catch (err) {
    console.error('❌ Erro no login:', err.stack);
    res.status(500).json({ error: 'Erro interno no servidor.' });
  }
});

// --- NOVA ROTA: VERIFICAÇÃO DO CÓDIGO 2FA ---
app.post('/verify-2fa', async (req, res) => {
  const { username, code } = req.body;

  if (!username || !code) {
    return res.status(400).json({ error: 'Usuário e código são obrigatórios!' });
  }

  try {
    // 1. Busca o usuário e o código salvo no banco
    const result = await pool.query('SELECT two_factor_code FROM users WHERE username = $1', [username]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Usuário não encontrado!' });
    }

    const user = result.rows[0];

    // 2. Compara o código digitado com o código do banco
    if (user.two_factor_code !== code) {
      return res.status(401).json({ error: 'Código de verificação incorreto!' });
    }

    // 3. Código correto! Apaga o código do banco (para não ser usado de novo) e libera o acesso
    await pool.query('UPDATE users SET two_factor_code = NULL WHERE username = $1', [username]);
    
    res.status(200).json({ message: 'Autenticação 2FA bem-sucedida! Bem-vindo ao Orelhão.' });
  } catch (err) {
    console.error('❌ Erro no 2FA:', err.stack);
    res.status(500).json({ error: 'Erro interno ao verificar o código.' });
  }
});
// ---------------------------------

app.get('/verify', async (req, res) => {
  const { token } = req.query;
  if (!token) return res.status(400).send('Token de verificação ausente!');
  try {
    const result = await pool.query('SELECT username FROM users WHERE verification_token = $1', [token]);
    if (result.rows.length === 0) return res.status(400).send('Token inválido ou já utilizado!');
    const username = result.rows[0].username;
    await pool.query('UPDATE users SET is_verified = true, verification_token = NULL WHERE verification_token = $1', [token]);
    res.send(`<h1>✅ Conta Verificada!</h1><p>Olá ${username}, sua conta no Orelhão foi ativada com sucesso. Agora você já pode fazer login!</p>`);
  } catch (err) {
    console.error('❌ Erro na verificação:', err.stack);
    res.status(500).send('Erro interno no servidor ao verificar conta.');
  }
});

io.on('connection', async (socket) => {
  console.log('🆕 Novo usuário conectado! ID:', socket.id);
  try {
    const result = await pool.query('SELECT username, text FROM messages ORDER BY created_at ASC');
    socket.emit('load history', result.rows.map(msg => ({ user: msg.username, text: msg.text })));
  } catch (err) {
    console.error('❌ Erro ao carregar histórico:', err.stack);
  }
  socket.on('chat message', async (data) => {
    try {
      await pool.query('INSERT INTO messages (username, text) VALUES ($1, $2)', [data.user, data.text]);
      io.emit('chat message', data);
    } catch (err) {
      console.error('❌ Erro ao salvar mensagem:', err.stack);
    }
  });
  socket.on('disconnect', () => {
    console.log('🔴 Usuário desconectado.');
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, 'localhost', () => {
  console.log(`
--------------------------------------------
🚀 Servidor Orelhão está online!
🌐 Acesse em: http://localhost:${PORT}
🔌 WebSocket: ws://localhost:${PORT}
--------------------------------------------
`);
});
