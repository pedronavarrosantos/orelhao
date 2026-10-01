require('dotenv').config({ path: '../.env' });
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer');
const cors = require('cors');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');

if (!process.env.DB_PASSWORD) {
  console.error('❌ ERRO CRÍTICO: Variáveis de ambiente não carregadas. Verifique o arquivo .env');
}

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
  if (err) console.error('❌ Erro PostgreSQL:', err.stack);
  else console.log('✅ Conectados ao PostgreSQL!');
});

app.post('/register', async (req, res) => {
  const { username, email, password } = req.body;
  if (!username || !email || !password) return res.status(400).json({ error: 'Preencha tudo!' });
  try {
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    const verificationToken = crypto.randomBytes(32).toString('hex');
    await pool.query('INSERT INTO users (username, email, password_hash, verification_token) VALUES ($1, $2, $3, $4)', [username, email, hashedPassword, verificationToken]);
    const verificationLink = `http://localhost:3001/verify?token=${verificationToken}`;
    await transporter.sendMail({
      from: '"Orelhão Chat" <suporte@orelhao.com.br>',
      to: email, 
      subject: 'Verifique sua conta!',
      html: `<p>Clique aqui: <a href="${verificationLink}">Verificar Conta</a></p>`
    });
    res.status(201).json({ message: 'Usuário criado!' });
  } catch (err) {
    if (err.code === '23505') return res.status(400).json({ error: 'Usuário ou e-mail já existe!' });
    res.status(500).json({ error: 'Erro interno.' });
  }
});

app.post('/login', async (req, res) => {
  const { username, password, deviceToken } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Campos obrigatórios!' });
  try {
    const result = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
    if (result.rows.length === 0) return res.status(401).json({ error: 'Usuário não encontrado!' });
    const user = result.rows[0];
    if (!(await bcrypt.compare(password, user.password_hash))) return res.status(401).json({ error: 'Senha incorreta!' });
    if (!user.is_verified) return res.status(403).json({ error: 'Conta não verificada!' });

    if (deviceToken) {
      const trustResult = await pool.query('SELECT * FROM trusted_devices WHERE device_token = $1 AND user_id = $2', [deviceToken, user.id]);
      if (trustResult.rows.length > 0) {
        const token = jwt.sign({ userId: user.id, username: user.username }, process.env.JWT_SECRET, { expiresIn: '7d' });
        return res.status(200).json({ message: 'Sucesso!', userId: user.id, username: user.username, token });
      }
    }

    const twoFactorCode = Math.floor(100000 + Math.random() * 900000).toString();
    await pool.query('UPDATE users SET two_factor_code = $1 WHERE username = $2', [twoFactorCode, username]);
    await transporter.sendMail({
      from: '"Orelhão Segurança" <seguranca@orelhao.com.br>',
      to: user.email,
      subject: 'Seu código 2FA',
      html: `<h2>Seu código: <span style="color: #00d1ff;">${twoFactorCode}</span></h2>`
    });
    res.status(200).json({ message: 'Código enviado!', requires2FA: true, username: user.username });
  } catch (err) {
    res.status(500).json({ error: 'Erro interno.' });
  }
});

app.post('/verify-2fa', async (req, res) => {
  const { username, code, trustDevice } = req.body;
  try {
    const result = await pool.query('SELECT id, username, two_factor_code FROM users WHERE username = $1', [username]);
    if (result.rows.length === 0 || result.rows[0].two_factor_code !== code) {
      return res.status(401).json({ error: 'Código incorreto!' });
    }
    const user = result.rows[0];
    await pool.query('UPDATE users SET two_factor_code = NULL WHERE username = $1', [username]);
    
    let deviceToken = null;
    if (trustDevice) {
      deviceToken = crypto.randomBytes(32).toString('hex');
      await pool.query('INSERT INTO trusted_devices (user_id, device_token) VALUES ($1, $2)', [user.id, deviceToken]);
    }

    const token = jwt.sign({ userId: user.id, username: user.username }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.status(200).json({ message: 'Sucesso!', userId: user.id, username: user.username, token, deviceToken });
  } catch (err) {
    res.status(500).json({ error: 'Erro interno.' });
  }
});

app.get('/validate-token', async (req, res) => {
  const token = req.headers['authorization'];
  if (!token) return res.status(401).json({ error: 'Token ausente' });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const result = await pool.query('SELECT id, username FROM users WHERE id = $1', [decoded.userId]);
    if (result.rows.length === 0) return res.status(401).json({ error: 'Usuário não existe mais' });
    res.status(200).json({ userId: result.rows[0].id, username: result.rows[0].username });
  } catch (err) {
    res.status(401).json({ error: 'Sessão expirada' });
  }
});

app.get('/verify', async (req, res) => {
  const { token } = req.query;
  try {
    const result = await pool.query('SELECT username FROM users WHERE verification_token = $1', [token]);
    if (result.rows.length === 0) return res.status(400).send('Token inválido!');
    const username = result.rows[0].username;
    await pool.query('UPDATE users SET is_verified = true, verification_token = NULL WHERE verification_token = $1', [token]);
    res.send(`<h1>✅ Verificado!</h1><p>Olá ${username}, você já pode logar!</p>`);
  } catch (err) {
    res.status(500).send('Erro interno.');
  }
});

app.get('/servers', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM servers ORDER BY name ASC');
    res.status(200).json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao carregar servidores.' });
  }
});

app.post('/create-server', async (req, res) => {
  const { name, ownerId } = req.body;
  if (!name || !ownerId) return res.status(400).json({ error: 'Nome e ID do dono são obrigatórios!' });
  try {
    const result = await pool.query('INSERT INTO servers (name, owner_id) VALUES ($1, $2) RETURNING *', [name, ownerId]);
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao criar servidor.' });
  }
});

app.get('/channels/:serverId', async (req, res) => {
  try {
    const { serverId } = req.params;
    const result = await pool.query('SELECT id, name FROM channels WHERE server_id = $1 ORDER BY name ASC', [serverId]);
    res.status(200).json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao carregar canais.' });
  }
});

app.post('/create-channel', async (req, res) => {
  const { name, serverId } = req.body;
  if (!name || !serverId) return res.status(400).json({ error: 'Nome do canal e ID do servidor são obrigatórios!' });
  try {
    const result = await pool.query('INSERT INTO channels (name, server_id) VALUES ($1, $2) RETURNING *', [name, serverId]);
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao criar canal.' });
  }
});

io.on('connection', async (socket) => {
  console.log('🆕 Conectou:', socket.id);
  socket.on('join channel', async (channelId) => {
    const room = String(channelId);
    socket.join(room);
    try {
      const result = await pool.query('SELECT username, text, created_at FROM messages WHERE channel_id = $1 ORDER BY created_at ASC', [channelId]);
      socket.emit('load history', result.rows.map(msg => ({ user: msg.username, text: msg.text, time: msg.created_at })));
    } catch (err) {
      console.error('Erro histórico:', err);
    }
  });
  socket.on('chat message', async (data) => {
    const { user, text, channelId } = data;
    const room = String(channelId);
    try {
      const result = await pool.query('INSERT INTO messages (username, text, channel_id) VALUES ($1, $2, $3) RETURNING created_at', [user, text, channelId]);
      const time = result.rows[0]?.created_at || new Date();
      io.to(room).emit('chat message', { ...data, time });
    } catch (err) {
      console.error('Erro ao salvar mensagem:', err);
    }
  });
  socket.on('disconnect', () => {
    console.log('❌ Desconectou:', socket.id);
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`\n🚀 Servidor Orelhão online na porta ${PORT}\n`);
});
