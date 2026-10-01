import { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';

const socket = io('http://localhost:3001');

const authContainerStyle = { height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', backgroundColor: '#0b0e14', fontFamily: 'sans-serif' };
const authFormStyle = { backgroundColor: '#1e1f22', padding: '40px', borderRadius: '15px', textAlign: 'center', boxShadow: '0 8px 32px rgba(0,0,0,0.8)', width: '350px', border: '1px solid #2b2d31' };
const inputStyle = { padding: '12px', width: '100%', borderRadius: '5px', border: 'none', backgroundColor: '#0b0e14', color: 'white', marginBottom: '15px', display: 'block', boxSizing: 'border-box', border: '1px solid #313338' };
const inputStyle2FA = { ...inputStyle, textAlign: 'center', fontSize: '24px', letterSpacing: '5px' };
const buttonStyle = { padding: '12px 30px', backgroundColor: '#00d1ff', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold', width: '100%' };
const toggleTextStyle = { color: '#b5bac1', marginTop: '20px', fontSize: '14px', cursor: 'pointer' };
const serverSidebarStyle = { width: '72px', backgroundColor: '#1e1f22', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '12px 0', gap: '12px' };
const serverIconStyle = (active) => ({ width: '48px', height: '48px', borderRadius: active ? '15px' : '50%', backgroundColor: active ? '#00d1ff' : '#313338', display: 'flex', justifyContent: 'center', alignItems: 'center', cursor: 'pointer', color: 'white', fontWeight: 'bold', transition: '0.2s', fontSize: '16px', textAlign: 'center', overflow: 'hidden', padding: '2px' });
const channelSidebarStyle = { width: '240px', backgroundColor: '#2b2d31', display: 'flex', flexDirection: 'column' };
const channelHeaderStyle = { height: '48px', display: 'flex', alignItems: 'center', padding: '0 16px', borderBottom: '1px solid #232428', color: 'white' };
const channelListStyle = { flexGrow: 1, padding: '10px 0', overflowY: 'auto' };
const channelItemStyle = (active) => ({ padding: '8px 16px', cursor: 'pointer', color: active ? 'white' : '#8e9297', backgroundColor: active ? '#3f4147' : 'transparent', transition: '0.2s' });
const createChannelButtonStyle = { margin: '10px', padding: '8px', backgroundColor: 'transparent', color: '#00d1ff', border: '1px solid #00d1ff', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold', transition: '0.2s' };
const userPanelStyle = { height: '52px', backgroundColor: '#232428', display: 'flex', alignItems: 'center', padding: '0 12px', gap: '10px', justifyContent: 'space-between' };
const userAvatarStyle = { width: '32px', height: '32px', borderRadius: '50%', backgroundColor: '#00d1ff' };
const logoutButtonStyle = { backgroundColor: 'transparent', border: 'none', color: '#ff4d4d', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' };
const chatMainStyle = { flex: 1, display: 'flex', flexDirection: 'column', backgroundColor: '#313338', position: 'relative' };
const chatHeaderStyle = { height: '48px', display: 'flex', alignItems: 'center', padding: '0 16px', borderBottom: '1px solid #232428', color: 'white' };
const messageAreaStyle = { flexGrow: 1, overflowY: 'scroll', padding: '20px', display: 'flex', flexDirection: 'column', gap: '15px' };
const messageRowStyle = { display: 'flex', flexDirection: 'column', gap: '4px' };
const msgUserContainerStyle = { display: 'flex', alignItems: 'center', gap: '8px' };
const msgUserStyle = { color: '#00d1ff', fontWeight: 'bold', fontSize: '14px' };
const msgTimeStyle = { color: '#72767d', fontSize: '11px' };
const msgTextStyle = { color: '#dbdee1', fontSize: '15px' };
const chatInputFormStyle = { padding: '20px', display: 'flex', gap: '10px', backgroundColor: '#313338' };
const chatInputStyle = { padding: '12px', flexGrow: 1, borderRadius: '8px', border: 'none', backgroundColor: '#383a40', color: 'white' };
const chatButtonStyle = { padding: '0 20px', backgroundColor: '#00d1ff', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' };

const modalOverlayStyle = { position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, fontFamily: 'sans-serif' };
const modalBoxStyle = { backgroundColor: '#1e1f22', padding: '30px', borderRadius: '12px', width: '400px', border: '1px solid #00d1ff', textAlign: 'center', boxShadow: '0 0 20px rgba(0,209,255,0.2)' };
const modalTitleStyle = { color: 'white', fontSize: '20px', marginBottom: '20px', fontWeight: 'bold' };
const modalActionButtonStyle = { padding: '10px 20px', backgroundColor: '#00d1ff', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold', marginRight: '10px' };
const modalCancelButtonStyle = { padding: '10px 20px', backgroundColor: 'transparent', color: '#b5bac1', border: 'none', cursor: 'pointer', fontWeight: 'bold' };

const scrollButtonStyle = { position: 'absolute', bottom: '80px', right: '20px', width: '40px', height: '40px', borderRadius: '50%', backgroundColor: '#00d1ff', color: 'white', border: 'none', cursor: 'pointer', fontWeight: 'bold', boxShadow: '0 4px 10px rgba(0,0,0,0.3)', fontSize: '18px', zIndex: 10 };

const versionContainerStyle = { marginTop: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '8px', color: '#b5bac1', fontSize: '12px', paddingBottom: '12px' };
const miniLogoStyle = { width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover' };

const trustContainerStyle = { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', color: '#b5bac1', fontSize: '13px', marginBottom: '20px', cursor: 'pointer' };
const checkboxStyle = { width: '16px', height: '16px', cursor: 'pointer', accentColor: '#00d1ff' };

function App() {
  const [userId, setUserId] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [trustDevice, setTrustDevice] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [isWaitingFor2FA, setIsWaitingFor2FA] = useState(false);
  const [message, setMessage] = useState('');
  const [chat, setChat] = useState([]);
  const [channels, setChannels] = useState([]);
  const [servers, setServers] = useState([]);
  const [activeServerId, setActiveServerId] = useState(null);
  const [activeChannelId, setActiveChannelId] = useState(null);

  const [isServerModalOpen, setIsServerModalOpen] = useState(false);
  const [isChannelModalOpen, setIsChannelModalOpen] = useState(false);
  const [newServerName, setNewServerName] = useState('');
  const [newChannelName, setNewChannelName] = useState('');

  const chatEndRef = useRef(null);
  const messageAreaRef = useRef(null);

  const formatTime = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const scrollToBottom = () => {
    if (messageAreaRef.current) {
      messageAreaRef.current.scrollTop = messageAreaRef.current.scrollHeight;
    }
  };

  useEffect(() => {
    socket.on('chat message', (data) => {
      setChat((prevChat) => [...prevChat, data]);
    });
    socket.on('load history', (history) => {
      setChat(Array.isArray(history) ? history : []);
    });
    return () => {
      socket.off('chat message');
      socket.off('load history');
    };
  }, []);

  useEffect(() => {
    checkSession();
  }, []);

  useEffect(() => {
    if (isLoggedIn) {
      fetchServers();
    }
  }, [isLoggedIn]);

  useEffect(() => {
    if (isLoggedIn && activeServerId) {
      fetchChannels(activeServerId);
    }
  }, [isLoggedIn, activeServerId]);

  useEffect(() => {
    if (isLoggedIn && activeChannelId) {
      socket.emit('join channel', activeChannelId);
    }
  }, [isLoggedIn, activeChannelId]);

  const checkSession = async () => {
    const token = localStorage.getItem('orelhao_token');
    if (!token) return;
    try {
      const response = await fetch('http://localhost:3001/validate-token', {
        headers: { 'Authorization': token }
      });
      if (response.ok) {
        const data = await response.json();
        setUserId(data.userId);
        setUsername(data.username);
        setIsLoggedIn(true);
      } else {
        localStorage.removeItem('orelhao_token');
      }
    } catch (err) {
      localStorage.removeItem('orelhao_token');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('orelhao_token');
    setIsLoggedIn(false);
    setActiveServerId(null);
    setActiveChannelId(null);
    setUserId('');
    setUsername('');
  };

  const fetchServers = async () => {
    try {
      const response = await fetch('http://localhost:3001/servers');
      const data = await response.json();
      setServers(data);
      if (data.length > 0 && !activeServerId) {
        setActiveServerId(data[0].id);
      }
    } catch (err) {
      console.error('Erro ao carregar servidores:', err);
    }
  };

  const confirmCreateServer = async () => {
    if (!newServerName) return alert('Digite um nome!');
    try {
      const response = await fetch('http://localhost:3001/create-server', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newServerName, ownerId: userId }),
      });
      if (response.ok) {
        await fetchServers();
        setIsServerModalOpen(false);
        setNewServerName('');
      }
    } catch (err) {
      alert('Erro ao criar servidor.');
    }
  };

  const fetchChannels = async (serverId) => {
    try {
      const response = await fetch(`http://localhost:3001/channels/${serverId}`);
      const data = await response.json();
      setChannels(data);
      setActiveChannelId(null);
      if (data.length > 0) {
        setActiveChannelId(data[0].id);
      }
    } catch (err) {
      console.error('Erro ao carregar canais:', err);
    }
  };

  const confirmCreateChannel = async () => {
    if (!newChannelName) return alert('Digite um nome!');
    try {
      const response = await fetch('http://localhost:3001/create-channel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newChannelName, serverId: activeServerId }),
      });
      if (response.ok) {
        await fetchChannels(activeServerId);
        setIsChannelModalOpen(false);
        setNewChannelName('');
      }
    } catch (err) {
      alert('Erro ao criar canal.');
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    if (!username || !email || !password || !confirmPassword) {
      alert('Por favor, preencha todos os campos!');
      return;
    }
    if (password !== confirmPassword) {
      alert('❌ As senhas não coincidem!');
      return;
    }
    try {
      const response = await fetch('http://localhost:3001/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email, password }),
      });
      const data = await response.json();
      if (response.ok) {
        alert('✅ Conta criada! Verifique seu e-mail no Mailtrap.');
        setIsRegistering(false);
      } else {
        alert(`❌ Erro: ${data.error}`);
      }
    } catch (err) {
      alert('Erro ao conectar com o servidor.');
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!username || !password) {
      alert('Por favor, preencha usuário e senha!');
      return;
    }
    try {
      const deviceToken = localStorage.getItem('orelhao_device_token');
      const response = await fetch('http://localhost:3001/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, deviceToken }),
      });
      const data = await response.json();
      if (response.ok) {
        if (data.requires2FA) {
          alert('🔑 Senha correta! Agora digite o código enviado ao seu e-mail.');
          setIsWaitingFor2FA(true);
        } else {
          localStorage.setItem('orelhao_token', data.token);
          setUserId(data.userId);
          setUsername(data.username);
          setIsLoggedIn(true);
        }
      } else {
        alert(`❌ Erro: ${data.error}`);
      }
    } catch (err) {
      alert('Erro ao conectar com o servidor.');
    }
  };

  const handleVerify2FA = async (e) => {
    e.preventDefault();
    if (!twoFactorCode) {
      alert('Por favor, digite o código de 6 dígitos!');
      return;
    }
    try {
      const response = await fetch('http://localhost:3001/verify-2fa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, code: twoFactorCode, trustDevice }),
      });
      const data = await response.json();
      if (response.ok) {
        localStorage.setItem('orelhao_token', data.token);
        if (data.deviceToken) {
          localStorage.setItem('orelhao_device_token', data.deviceToken);
        }
        setUserId(data.userId);
        setUsername(data.username);
        setIsLoggedIn(true);
        setIsWaitingFor2FA(false);
      } else {
        alert(`❌ Erro: ${data.error}`);
      }
    } catch (err) {
      alert('Erro ao conectar com o servidor.');
    }
  };

  const sendMessage = (e) => {
    e.preventDefault();
    if (message.trim() && activeChannelId) {
      socket.emit('chat message', { user: username, text: message, channelId: activeChannelId });
      setMessage('');
      setTimeout(scrollToBottom, 100);
    }
  };

  const changeChannel = (id) => {
    setActiveChannelId(id);
    socket.emit('join channel', id);
  };

  if (!isLoggedIn) {
    return (
      <div style={authContainerStyle}>
        <form onSubmit={isWaitingFor2FA ? handleVerify2FA : (isRegistering ? handleRegister : handleLogin)} style={authFormStyle}>
          <img src="/logo.png" alt="Logo" style={{ width: '100px', height: '100px', borderRadius: '50%', marginBottom: '20px', objectFit: 'cover' }} />
          <h1 style={{ color: '#00d1ff', marginBottom: '20px', fontSize: '28px' }}>Orelhão</h1>
          <p style={{ color: '#b5bac1', marginBottom: '20px' }}>
            {isWaitingFor2FA ? 'Autenticação de Dois Fatores' : (isRegistering ? 'Crie sua conta agora' : 'Bem-vindo de volta!')}
          </p>
          {isWaitingFor2FA ? (
            <>
              <input type="text" value={twoFactorCode} onChange={(e) => setTwoFactorCode(e.target.value)} placeholder="Código de 6 dígitos" style={inputStyle2FA} />
              <div style={trustContainerStyle}>
                <input type="checkbox" style={checkboxStyle} checked={trustDevice} onChange={(e) => setTrustDevice(e.target.checked)} id="trustDevice" />
                <label htmlFor="trustDevice">Lembrar deste dispositivo</label>
              </div>
            </>
          ) : (
            <>
              <input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Nome de usuário" style={inputStyle} />
              {isRegistering && (
                <>
                  <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="E-mail" style={inputStyle} />
                  <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Senha" style={inputStyle} />
                  <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Confirme sua senha" style={inputStyle} />
                </>
              )}
              {!isRegistering && (
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Senha" style={inputStyle} />
              )}
            </>
          )}
          <button type="submit" style={buttonStyle}>{isWaitingFor2FA ? 'Verificar Código' : (isRegistering ? 'Cadastrar' : 'Entrar')}</button>
          {!isWaitingFor2FA && (
            <p style={toggleTextStyle} onClick={() => { setIsRegistering(!isRegistering); setPassword(''); setConfirmPassword(''); }}>
              {isRegistering ? 'Já tem conta? Faça login' : 'Não tem conta? Cadastre-se'}
            </p>
          )}
        </form>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', height: '100vh', backgroundColor: '#313338', fontFamily: 'sans-serif', color: 'white' }}>
      <div style={serverSidebarStyle}>
        {servers.map((srv) => (
          <div key={srv.id} style={serverIconStyle(activeServerId === srv.id)} onClick={() => setActiveServerId(srv.id)}>
            {srv.name.substring(0, 2).toUpperCase()}
          </div>
        ))}
        <div style={serverIconStyle(false)} onClick={() => setIsServerModalOpen(true)}>+</div>
        <div style={versionContainerStyle}>
          <span>v1.0</span>
          <img src="/logo.png" alt="Logo" style={miniLogoStyle} />
        </div>
      </div>
      <div style={channelSidebarStyle}>
        <div style={channelHeaderStyle}>
          <strong style={{ fontSize: '16px' }}>
            {servers.find(s => s.id === activeServerId)?.name || 'Selecione um Servidor'}
          </strong>
        </div>
        <div style={channelListStyle}>
          {channels.map((chan) => (
            <div key={chan.id} style={channelItemStyle(activeChannelId === chan.id)} onClick={() => changeChannel(chan.id)}>
              # {chan.name}
            </div>
          ))}
          {activeServerId && <button style={createChannelButtonStyle} onClick={() => setIsChannelModalOpen(true)}>+ Criar Canal</button>}
        </div>
        <div style={userPanelStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={userAvatarStyle}></div>
            <span style={{ fontSize: '14px' }}>{username}</span>
          </div>
          <button style={logoutButtonStyle} onClick={handleLogout}>Sair</button>
        </div>
      </div>
      <div style={chatMainStyle}>
        <div style={chatHeaderStyle}>
          <span style={{ color: '#b5bac1', fontSize: '20px' }}>#</span>
          <strong style={{ fontSize: '18px', marginLeft: '5px' }}>
            {channels.find(c => c.id === activeChannelId)?.name || 'Selecione um canal'}
          </strong>
        </div>
        <div style={messageAreaStyle} ref={messageAreaRef}>
          {(chat || []).map((msg, index) => (
            <div key={index} style={messageRowStyle}>
              <div style={msgUserContainerStyle}>
                <div style={msgUserStyle}>{msg.user}</div>
                <div style={msgTimeStyle}>{formatTime(msg.time)}</div>
              </div>
              <div style={msgTextStyle}>{msg.text}</div>
            </div>
          ))}
        </div>
        <button style={scrollButtonStyle} onClick={scrollToBottom} title="Ir para o fim">↓</button>
        <form onSubmit={sendMessage} style={chatInputFormStyle}>
          <input value={message} onChange={(e) => setMessage(e.target.value)} placeholder={`Enviar mensagem para #${channels.find(c => c.id === activeChannelId)?.name || '...'}`} style={chatInputStyle} />
          <button type="submit" style={chatButtonStyle}>Enviar</button>
        </form>
      </div>

      {isServerModalOpen && (
        <div style={modalOverlayStyle}>
          <div style={modalBoxStyle}>
            <div style={modalTitleStyle}>Criar Novo Servidor</div>
            <input style={inputStyle} placeholder="Nome do servidor" value={newServerName} onChange={(e) => setNewServerName(e.target.value)} />
            <div style={{ display: 'flex', justifyContent: 'center', marginTop: '20px' }}>
              <button style={modalActionButtonStyle} onClick={confirmCreateServer}>Criar</button>
              <button style={modalCancelButtonStyle} onClick={() => setIsServerModalOpen(false)}>Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {isChannelModalOpen && (
        <div style={modalOverlayStyle}>
          <div style={modalBoxStyle}>
            <div style={modalTitleStyle}>Criar Novo Canal</div>
            <input style={inputStyle} placeholder="Nome do canal" value={newChannelName} onChange={(e) => setNewChannelName(e.target.value)} />
            <div style={{ display: 'flex', justifyContent: 'center', marginTop: '20px' }}>
              <button style={modalActionButtonStyle} onClick={confirmCreateChannel}>Criar</button>
              <button style={modalCancelButtonStyle} onClick={() => setIsChannelModalOpen(false)}>Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
