import { useState, useEffect } from 'react';
import io from 'socket.io-client';

const socket = io('http://localhost:3001');

function App() {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [twoFactorCode, setTwoFactorCode] = useState(''); // Estado para o código 2FA
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [isWaitingFor2FA, setIsWaitingFor2FA] = useState(false); // Controla a tela de 2FA
  const [message, setMessage] = useState('');
  const [chat, setChat] = useState([]);

  useEffect(() => {
    socket.on('chat message', (data) => {
      setChat((prevChat) => [...prevChat, data]);
    });
    socket.on('load history', (history) => {
      setChat(history);
    });
    return () => {
      socket.off('chat message');
      socket.off('load history');
    };
  }, []);

  // FUNÇÃO PARA CRIAR CONTA
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

  // FUNÇÃO PARA LOGIN (PASSO 1: SENHA)
  const handleLogin = async (e) => {
    e.preventDefault();
    if (!username || !password) {
      alert('Por favor, preencha usuário e senha!');
      return;
    }
    try {
      const response = await fetch('http://localhost:3001/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await response.json();

      if (response.ok) {
        if (data.requires2FA) {
          alert('🔑 Senha correta! Agora digite o código enviado ao seu e-mail.');
          setIsWaitingFor2FA(true); // Muda para a tela de 2FA
        } else {
          setIsLoggedIn(true);
        }
      } else {
        alert(`❌ Erro: ${data.error}`);
      }
    } catch (err) {
      alert('Erro ao conectar com o servidor.');
    }
  };

  // FUNÇÃO PARA VALIDAR O CÓDIGO 2FA (PASSO 2: CÓDIGO)
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
        body: JSON.stringify({ username, code: twoFactorCode }),
      });
      const data = await response.json();

      if (response.ok) {
        alert('✅ Acesso autorizado! Bem-vindo ao Orelhão.');
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
    if (message.trim()) {
      socket.emit('chat message', { user: username, text: message });
      setMessage('');
    }
  };

  // TELA DE LOGIN / CADASTRO / 2FA
  if (!isLoggedIn) {
    return (
      <div style={{ 
        height: '100vh', display: 'flex', justifyContent: 'center', 
        alignItems: 'center', backgroundColor: '#1e1f22', fontFamily: 'sans-serif' 
      }}>
        <form onSubmit={
          isWaitingFor2FA ? handleVerify2FA : (isRegistering ? handleRegister : handleLogin)
        } style={{ 
          backgroundColor: '#2b2d31', padding: '40px', borderRadius: '10px', 
          textAlign: 'center', boxShadow: '0 4px 15px rgba(0,0,0,0.5)', width: '320px' 
        }}>
          <h1 style={{ color: '#00d1ff', marginBottom: '20px' }}>📞 Orelhão</h1>
          
          <p style={{ color: '#b5bac1', marginBottom: '20px' }}>
            {isWaitingFor2FA 
              ? 'Autenticação de Dois Fatores' 
              : (isRegistering ? 'Crie sua conta agora' : 'Bem-vindo de volta!')}
          </p>

          {isWaitingFor2FA ? (
            // TELA DE DIGITAR O CÓDIGO 2FA
            <input 
              type="text"
              value={twoFactorCode} 
              onChange={(e) => setTwoFactorCode(e.target.value)} 
              placeholder="Código de 6 dígitos" 
              style={{...inputStyle, textAlign: 'center', fontSize: '24px', letterSpacing: '5px'}} 
            />
          ) : (
            // TELA DE LOGIN OU CADASTRO
            <>
              <input 
                value={username} 
                onChange={(e) => setUsername(e.target.value)} 
                placeholder="Nome de usuário" 
                style={inputStyle} 
              />
              {isRegistering && (
                <>
                  <input 
                    value={email} 
                    onChange={(e) => setEmail(e.target.value)} 
                    placeholder="E-mail" 
                    style={inputStyle} 
                  />
                  <input 
                    type="password"
                    value={password} 
                    onChange={(e) => setPassword(e.target.value)} 
                    placeholder="Senha" 
                    style={inputStyle} 
                  />
                  <input 
                    type="password"
                    value={confirmPassword} 
                    onChange={(e) => setConfirmPassword(e.target.value)} 
                    placeholder="Confirme sua senha" 
                    style={inputStyle} 
                  />
                </>
              )}
              {!isRegistering && (
                <input 
                  type="password"
                  value={password} 
                  onChange={(e) => setPassword(e.target.value)} 
                  placeholder="Senha" 
                  style={inputStyle} 
                />
              )}
            </>
          )}

          <button type="submit" style={buttonStyle}>
            {isWaitingFor2FA ? 'Verificar Código' : (isRegistering ? 'Cadastrar' : 'Entrar')}
          </button>

          {!isWaitingFor2FA && (
            <p style={{ color: '#b5bac1', marginTop: '20px', fontSize: '14px', cursor: 'pointer' }} 
               onClick={() => {
                 setIsRegistering(!isRegistering);
                 setPassword('');
                 setConfirmPassword('');
               }}>
              {isRegistering ? 'Já tem conta? Faça login' : 'Não tem conta? Cadastre-se'}
            </p>
          )}
        </form>
      </div>
    );
  }

  return (
    <div style={{ 
      padding: '20px', fontFamily: 'sans-serif', backgroundColor: '#313338', 
      color: 'white', height: '100vh', display: 'flex', flexDirection: 'column' 
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h1 style={{ color: '#00d1ff', margin: 0 }}>📞 Orelhão Chat</h1>
        <span style={{ color: '#b5bac1' }}>Logado como: <strong style={{ color: 'white' }}>{username}</strong></span>
      </div>
      
      <div style={{ 
        border: '1px solid #232428', flexGrow: 1, overflowY: 'scroll', 
        padding: '20px', marginBottom: '20px', backgroundColor: '#2b2d31', borderRadius: '8px' 
      }}>
        {chat.map((msg, index) => (
          <div key={index} style={{ marginBottom: '10px', borderBottom: '1px solid #232428', paddingBottom: '5px' }}>
            <strong style={{ color: '#00d1ff' }}>{msg.user}:</strong> {msg.text}
          </div>
        ))}
      </div>

      <form onSubmit={sendMessage} style={{ display: 'flex', gap: '10px' }}>
        <input 
          value={message} 
          onChange={(e) => setMessage(e.target.value)} 
          placeholder="Digite sua mensagem..." 
          style={{ padding: '12px', flexGrow: 1, borderRadius: '5px', border: 'none', backgroundColor: '#383a40', color: 'white' }}
        />
        <button type="submit" style={buttonStyle}>Enviar</button>
      </form>
    </div>
  );
}

const inputStyle = { 
  padding: '12px', width: '100%', borderRadius: '5px', 
  border: 'none', backgroundColor: '#1e1f22', color: 'white', 
  marginBottom: '15px', display: 'block', boxSizing: 'border-box' 
};

const buttonStyle = { 
  padding: '12px 30px', backgroundColor: '#00d1ff', color: 'white', 
  border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold', width: '100%'
};

export default App;
