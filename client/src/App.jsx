import { useState, useEffect } from 'react';
import io from 'socket.io-client';

const socket = io('http://localhost:3001');

function App() {
  const [username, setUsername] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [message, setMessage] = useState('');
  const [chat, setChat] = useState([]);

  useEffect(() => {
    // 1. Ouve mensagens novas em tempo real
    socket.on('chat message', (data) => {
      setChat((prevChat) => [...prevChat, data]);
    });

    // 2. Ouve o histórico que o servidor envia ao conectar
    socket.on('load history', (history) => {
      setChat(history);
    });

    // Limpa os ouvintes ao desmontar o componente para evitar duplicatas
    return () => {
      socket.off('chat message');
      socket.off('load history');
    };
  }, []);

  const handleLogin = (e) => {
    e.preventDefault();
    if (username.trim()) {
      setIsLoggedIn(true);
    }
  };

  const sendMessage = (e) => {
    e.preventDefault();
    if (message.trim()) {
      // Enviamos um OBJETO agora, não apenas texto
      socket.emit('chat message', {
        user: username,
        text: message
      });
      setMessage('');
    }
  };

  // TELA DE LOGIN
  if (!isLoggedIn) {
    return (
      <div style={{ 
        height: '100vh', display: 'flex', justifyContent: 'center', 
        alignItems: 'center', backgroundColor: '#2c2f33', fontFamily: 'sans-serif' 
      }}>
        <form onSubmit={handleLogin} style={{ 
          backgroundColor: '#23272a', padding: '40px', borderRadius: '10px', 
          textAlign: 'center', boxShadow: '0 4px 15px rgba(0,0,0,0.3)' 
        }}>
          <h1 style={{ color: '#7289da', marginBottom: '20px' }}>📞 Bem-vindo ao Orelhão</h1>
          <p style={{ color: '#aaa', marginBottom: '20px' }}>Escolha um apelido para começar</p>
          <input 
            value={username} 
            onChange={(e) => setUsername(e.target.value)} 
            placeholder="Seu nome..." 
            style={{ 
              padding: '12px', width: '250px', borderRadius: '5px', 
              border: 'none', backgroundColor: '#40444b', color: 'white', 
              marginBottom: '20px', display: 'block', marginX: 'auto' 
            }}
          />
          <button type="submit" style={{ 
            padding: '12px 30px', backgroundColor: '#7289da', color: 'white', 
            border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' 
          }}>
            Entrar no Chat
          </button>
        </form>
      </div>
    );
  }

  // TELA DO CHAT
  return (
    <div style={{ 
      padding: '20px', fontFamily: 'sans-serif', backgroundColor: '#2c2f33', 
      color: 'white', height: '100vh', display: 'flex', flexDirection: 'column' 
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h1 style={{ color: '#7289da', margin: 0 }}>📞 Orelhão Chat</h1>
        <span style={{ color: '#aaa' }}>Logado como: <strong style={{ color: 'white' }}>{username}</strong></span>
      </div>
      
      <div style={{ 
        border: '1px solid #444', flexGrow: 1, overflowY: 'scroll', 
        padding: '20px', marginBottom: '20px', backgroundColor: '#23272a', borderRadius: '8px' 
      }}>
        {chat.map((msg, index) => (
          <div key={index} style={{ marginBottom: '10px', borderBottom: '1px solid #333', paddingBottom: '5px' }}>
            <strong style={{ color: '#7289da' }}>{msg.user}:</strong> {msg.text}
          </div>
        ))}
      </div>

      <form onSubmit={sendMessage} style={{ display: 'flex', gap: '10px' }}>
        <input 
          value={message} 
          onChange={(e) => setMessage(e.target.value)} 
          placeholder="Digite sua mensagem..." 
          style={{ padding: '12px', flexGrow: 1, borderRadius: '5px', border: 'none', backgroundColor: '#40444b', color: 'white' }}
        />
        <button type="submit" style={{ 
          padding: '12px 20px', backgroundColor: '#7289da', color: 'white', 
          border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' 
        }}>
          Enviar
        </button>
      </form>
    </div>
  );
}

export default App;
