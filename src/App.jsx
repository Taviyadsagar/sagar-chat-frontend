import { useState, useEffect, useRef } from 'react'
import io from 'socket.io-client'
import './App.css'
import { QRCodeSVG } from 'qrcode.react'
import Scanner from './components/Scanner'

// Local testing ke liye "http://localhost:3001" use karein
// Production ke liye apni Render wali link rehne dein
const socket = io.connect("https://sagar-chat-backend.onrender.com");

function App() {
  const [message, setMessage] = useState("")
  const [chat, setChat] = useState([])
  const [friends, setFriends] = useState(() => {
    const saved = localStorage.getItem("chat_friends");
    return saved ? JSON.parse(saved) : [];
  })
  
  const [showScanner, setShowScanner] = useState(false)
  const [showMyQR, setShowMyQR] = useState(false)
  const [room, setRoom] = useState("") 
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  
  // Auth States
  const [isLoggedIn, setIsLoggedIn] = useState(localStorage.getItem("isLoggedIn") === "true");
  const [myName, setMyName] = useState(localStorage.getItem("user_name") || "");
  const [loginInput, setLoginInput] = useState("");
  const [tempFriend, setTempFriend] = useState(null);

  const myId = "Sagar_786"; 
  const lastMessageRef = useRef(null);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (isLoggedIn) {
      socket.emit("join_room", myId);

      // Atlas se purane messages load karna
      socket.on("load_messages", (messages) => {
        const formatted = messages.map(m => ({
          room: m.room,
          sender: m.author,
          text: m.message,
          time: m.time
        }));
        setChat(formatted);
      });

      socket.on("receive_message", (data) => {
        setChat((prev) => [...prev, data]);
      });

      return () => {
        socket.off("load_messages");
        socket.off("receive_message");
      }
    }
  }, [isLoggedIn]);

  useEffect(() => {
    lastMessageRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chat]);

  const handleLogin = () => {
    if (loginInput.trim() === "") return alert("Enter Name!");
    setMyName(loginInput);
    setIsLoggedIn(true);
    localStorage.setItem("user_name", loginInput);
    localStorage.setItem("isLoggedIn", "true");
  };

  const handleLogout = () => {
    localStorage.clear();
    window.location.reload();
  };

  const sendMessage = () => {
    if (message !== "" && room !== "") {
      const msgData = { 
        room, 
        sender: myName, 
        text: message, 
        time: new Date().toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}) 
      };
      socket.emit("send_message", msgData);
      setChat((prev) => [...prev, msgData]);
      setMessage("");
    }
  };

  // ... (handleScan aur renderAvatar function same rahenge jo pehle the)
  const handleScan = (scannedData) => {
    try {
      const friendData = JSON.parse(scannedData);
      if (friendData.id) { setTempFriend(friendData); setShowScanner(false); }
    } catch (err) { alert("Invalid QR!"); }
  }

  const renderAvatar = (name) => (
    <div className="avatar-circle">{name ? name.charAt(0).toUpperCase() : "?"}</div>
  );

  if (!isLoggedIn) {
    return (
      <div className="login-screen">
        <div className="reg-card">
          <h2 className="neon-text">CYBER CORE LOGIN</h2>
          <input type="text" placeholder="Username..." value={loginInput} onChange={(e)=>setLoginInput(e.target.value)} />
          <button onClick={handleLogin}>AUTHORIZE</button>
        </div>
      </div>
    );
  }

  return (
    <div className={`app-container ${isMobile ? 'mobile-mode' : 'desktop-mode'}`}>
      {/* ... Sidebar aur Chat Window ka wahi UI jo pehle tha ... */}
      {/* Bas Header mein Logout button add kar dena */}
      <div className="sidebar">
        <div className="header">
          <b>{isMobile ? "CYBER SCAN" : "ADMIN PANEL"}</b>
          <button onClick={handleLogout} className="logout-btn">Exit</button>
        </div>
        {/* ... baaki sidebar content ... */}
      </div>

      <div className="chat-window">
        {/* ... chat window content ... */}
        <div className="message-area">
            {chat.map((msg, i) => (
              <div key={i} ref={i === chat.length - 1 ? lastMessageRef : null} 
                   className={`message-bubble ${msg.sender === myName ? "sent" : "received"}`}>
                <div className="text">{msg.text}</div>
                <span className="time">{msg.time}</span>
              </div>
            ))}
        </div>
        <div className="input-area">
            <input value={message} onChange={(e) => setMessage(e.target.value)} 
                   onKeyPress={(e) => e.key === 'Enter' && sendMessage()} placeholder="Type..." />
            <button onClick={sendMessage} className="send-btn">➤</button>
        </div>
      </div>
    </div>
  )
}
export default App;