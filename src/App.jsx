import { useState, useEffect, useRef } from 'react'
import io from 'socket.io-client'
import './App.css'
import { QRCodeSVG } from 'qrcode.react'
import Scanner from './components/Scanner'

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
  
  // --- NEW STATES FOR AUTH ---
  const [isLoggedIn, setIsLoggedIn] = useState(localStorage.getItem("isLoggedIn") === "true");
  const [myName, setMyName] = useState(localStorage.getItem("user_name") || "");
  const [loginInput, setLoginInput] = useState(""); 
  const [tempFriend, setTempFriend] = useState(null);

  const myId = "Sagar_786"; // Ye aapka static ID hai
  const lastMessageRef = useRef(null);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (isLoggedIn) {
      socket.emit("join_room", myId);
      
      const handleReceive = (data) => {
        if (data.type === "AUTO_CONNECT") {
          setFriends((prev) => {
            const exists = prev.find(f => f.id === data.senderData.id);
            if (!exists) {
              const updated = [...prev, data.senderData];
              localStorage.setItem("chat_friends", JSON.stringify(updated));
              return updated;
            }
            return prev;
          });
        } else {
          setChat((prev) => [...prev, data]);
        }
      };
      
      socket.on("receive_message", handleReceive);
      return () => socket.off("receive_message");
    }
  }, [myId, isLoggedIn]);

  useEffect(() => {
    lastMessageRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chat]);

  // --- LOGIN FUNCTION ---
  const handleLogin = () => {
    if (loginInput.trim() === "") return alert("Please enter your name!");
    setMyName(loginInput);
    setIsLoggedIn(true);
    localStorage.setItem("user_name", loginInput);
    localStorage.setItem("isLoggedIn", "true");
  };

  // --- LOGOUT FUNCTION ---
  const handleLogout = () => {
    localStorage.clear(); // Saara data saaf karne ke liye
    setIsLoggedIn(false);
    setMyName("");
    setChat([]);
    setFriends([]);
    setRoom("");
    window.location.reload(); // App reset karne ke liye
  };

  const handleScan = (scannedData) => {
    try {
      const friendData = JSON.parse(scannedData);
      if (friendData.id) {
        setTempFriend(friendData);
        setShowScanner(false);
      }
    } catch (err) { alert("Invalid QR!"); }
  }

  const completeRegistration = (enteredName) => {
    if (!enteredName) return alert("Please enter your name!");
    setMyName(enteredName);
    localStorage.setItem("user_name", enteredName);
    socket.emit("send_message", {
      room: myId, 
      type: "AUTO_CONNECT", 
      senderData: { id: myId, name: enteredName },
      text: `SYSTEM: ${enteredName} Initialized.`,
      sender: "System"
    });
    setRoom(tempFriend.id);
    setTempFriend(null);
  }

  const sendMessage = () => {
    if (message !== "" && room !== "") {
      const msgData = { room, sender: myName, text: message, time: new Date().toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}) };
      socket.emit("send_message", msgData);
      setChat((prev) => [...prev, msgData]);
      setMessage("");
    }
  };

  const renderAvatar = (name) => (
    <div className="avatar-circle">
      {name ? name.charAt(0).toUpperCase() : "?"}
    </div>
  );

  // --- CONDITIONAL RENDERING ---
  if (!isLoggedIn) {
    return (
      <div className="login-screen">
        <div className="reg-card">
          <h2 className="neon-text">CYBER CORE LOGIN</h2>
          <p>Initialize your node identity</p>
          <input 
            type="text" 
            placeholder="Enter Username..." 
            value={loginInput}
            onChange={(e) => setLoginInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
          />
          <button onClick={handleLogin} className="login-btn">AUTHORIZE</button>
        </div>
      </div>
    );
  }

  return (
    <div className={`app-container ${isMobile ? 'mobile-mode' : 'desktop-mode'}`}>
      
      {isMobile && tempFriend && (
        <div className="registration-overlay">
          <div className="reg-card">
            <h3>CYBER INITIALIZATION</h3>
            <p>Enter your ID name to sync</p>
            <input type="text" id="regName" placeholder="Node Name..." onKeyPress={(e) => e.key === 'Enter' && completeRegistration(e.target.value)} />
            <button onClick={() => completeRegistration(document.getElementById('regName').value)}>CONNECT NODE</button>
          </div>
        </div>
      )}

      {(!isMobile || (isMobile && !room && !tempFriend)) && (
        <div className="sidebar">
          <div className="header">
            <b>{isMobile ? "CYBER SCAN" : "ADMIN PANEL"}</b>
            <div className="qr-actions">
               <button className="id-btn" onClick={() => setShowMyQR(!showMyQR)}>ID</button>
               {/* LOGOUT BUTTON ADDED HERE */}
               <button className="logout-btn" onClick={handleLogout} title="Exit System">LogOut</button>
            </div>
          </div>

          <div className="scanner-trigger">
            <button className={`neon-scan-btn ${showScanner ? 'active' : ''}`} onClick={() => setShowScanner(!showScanner)}>
              <span>📷 SCAN NEW USER</span>
            </button>
          </div>

          {showScanner && <div className="scanner-view"><Scanner onScanSuccess={handleScan} /></div>}
          
          {showMyQR && (
            <div className="qr-display-box">
              <QRCodeSVG value={JSON.stringify({ id: myId, name: myName })} size={140} fgColor="#000000" bgColor="transparent" />
              <small>SCAN TO SYNC</small>
            </div>
          )}
          
          <div className="chat-list">
             <p className="list-header">ACTIVE NODES ({friends.length})</p>
             {friends.map((f, i) => (
               <div key={i} className={`user-item ${room === f.id ? "active" : ""}`} onClick={() => setRoom(f.id)}>
                 {renderAvatar(f.name)}
                 <div className="user-details">
                   <span className="user-name">{f.name}</span>
                   <span className="user-id">{f.id}</span>
                 </div>
               </div>
             ))}
          </div>
        </div>
      )}

      {(room || !isMobile) && (
        <div className={`chat-window ${isMobile ? 'full-view' : ''}`}>
          <div className="chat-header">
            {isMobile && <button className="back-btn" onClick={() => setRoom("")}>⬅</button>}
            {room && renderAvatar(friends.find(f => f.id === room)?.name)}
            <div className="header-text">
               <div className="user-name-title">{room ? friends.find(f => f.id === room)?.name : "SYSTEM_READY"}</div>
               <div className="status-container">
                  <div className="status-dot"></div>
                  <small>Online</small>
               </div>
            </div>
          </div>
          
          <div className="message-area">
            {chat.map((msg, i) => (
              <div key={i} ref={i === chat.length - 1 ? lastMessageRef : null} className={`message-bubble ${msg.sender === myName ? "sent" : "received"}`}>
                <div className="text">{msg.text}</div>
                <span className="time">{msg.time}</span>
              </div>
            ))}
          </div>

          <div className="input-area">
            <input value={message} onChange={(e) => setMessage(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && sendMessage()} placeholder="Type message..." disabled={!room} />
            <button onClick={sendMessage} disabled={!room} className="send-btn">➤</button>
          </div>
        </div>
      )}
    </div>
  )
}
export default App;