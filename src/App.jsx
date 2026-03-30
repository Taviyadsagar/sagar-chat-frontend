import { useState, useEffect, useRef } from 'react' // useRef add kiya scroll ke liye
import io from 'socket.io-client'
import './App.css'
import { QRCodeSVG } from 'qrcode.react'
import Scanner from './components/Scanner'

// Backend server se connect ho raha hai
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
  const [myName, setMyName] = useState(localStorage.getItem("user_name") || "");

  const myId = "Sagar_786"; 
  const lastMessageRef = useRef(null); // Naye message par focus karne ke liye

  // --- 1. RESPONSIVE HANDLE ---
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // --- 2. SOCKET & INITIAL LOGIC ---
  useEffect(() => {
    if (!myName) {
      const name = prompt("Enter your name:");
      if (name) { setMyName(name); localStorage.setItem("user_name", name); }
    }
    socket.emit("join_room", myId);

    const handleReceive = (data) => {
      if (data.type === "AUTO_CONNECT") {
        setRoom(data.senderData.id);
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
        // Naya message chat list mein add karo
        setChat((prev) => [...prev, data]);
      }
    };

    socket.on("receive_message", handleReceive);
    return () => socket.off("receive_message");
  }, [myId, myName]);

  // --- 3. AUTO SCROLL LOGIC ---
  useEffect(() => {
    lastMessageRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chat]);

  // --- 4. SEND MESSAGE FUNCTION ---
  const sendMessage = () => {
    if (message !== "" && room !== "") {
      const messageData = {
        room: room,
        sender: myName,
        text: message,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      // Socket par bhejo
      socket.emit("send_message", messageData);
      // Apni screen par dikhao
      setChat((prev) => [...prev, messageData]);
      // Input khali karo
      setMessage("");
    }
  };

  const handleScan = (scannedData) => {
    try {
      const friendData = JSON.parse(scannedData);
      if (friendData.id) {
        socket.emit("send_message", {
          room: myId, 
          type: "AUTO_CONNECT", 
          senderData: { id: friendData.id, name: friendData.name },
          text: `${friendData.name} Scanned!`,
          sender: "System"
        });
        alert("User Scanned Successfully!");
        setShowScanner(false);
      }
    } catch (err) { alert("Invalid QR!"); }
  }

  const deleteFriend = (e, id) => {
    e.stopPropagation();
    if (window.confirm("Delete this user?")) {
      const updated = friends.filter(f => f.id !== id);
      setFriends(updated);
      localStorage.setItem("chat_friends", JSON.stringify(updated));
      if (room === id) setRoom("");
    }
  }

  return (
    <div className={`app-container ${isMobile ? 'mobile-mode' : 'desktop-mode'}`}>
      
      {/* --- SIDEBAR SECTION --- */}
      {(!isMobile || (isMobile && !room)) && (
        <div className="sidebar">
          <div className="header">
            <b>{isMobile ? "CYBER SCAN" : "ADMIN PANEL"}</b>
            <div className="qr-actions">
              <button className="icon-btn" onClick={() => setShowMyQR(!showMyQR)} title="My ID">🆔</button>
            </div>
          </div>

          <div className="scanner-trigger">
            <button 
              className={`neon-scan-btn ${showScanner ? 'active' : ''}`} 
              onClick={() => setShowScanner(!showScanner)}
            >
              <div className="pulse-ring"></div>
              <span className="btn-icon">📷</span>
              <span className="btn-text">{showScanner ? "Close Scanner" : "Scan New User"}</span>
            </button>
          </div>

          {showScanner && (
            <div className="scanner-container">
              <Scanner onScanSuccess={handleScan} />
            </div>
          )}

          {showMyQR && (
            <div className="qr-display-box">
              <QRCodeSVG value={JSON.stringify({ id: myId, name: myName })} size={140} bgColor="transparent" fgColor="#00fff2" />
              <p>YOUR ACCESS KEY</p>
            </div>
          )}
          
          {!isMobile && (
            <div className="chat-list">
              <div className="list-header">
                <span>ACTIVE NODES</span>
                <span className="count-badge">{friends.length}</span>
              </div>
              {friends.map((f, i) => (
                <div key={i} className={`user-item ${room === f.id ? "active" : ""}`} 
                     onClick={() => { setRoom(f.id); socket.emit("join_room", f.id); }}>
                  <div className="user-details">
                    <span className="user-name">{f.name}</span>
                    <span className="user-id">NODE_ID: {f.id}</span>
                  </div>
                  <button className="delete-btn" onClick={(e) => deleteFriend(e, f.id)}>❌</button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* --- CHAT WINDOW SECTION --- */}
      {!isMobile && (
        <div className="chat-window">
          <div className="chat-header">
            <div className="status-dot"></div>
            {room ? `ENCRYPTED_LINK: ${friends.find(f => f.id === room)?.name}` : "SYSTEM_READY - AWAITING CONNECTION"}
          </div>
          
          <div className="message-area">
            {chat.length === 0 && !room && <div className="placeholder-text">INITIATE CONNECTION BY SCANNING QR</div>}
            
            {chat.map((msg, i) => (
              <div key={i} 
                   ref={i === chat.length - 1 ? lastMessageRef : null} // Last message par focus
                   className={`message-bubble ${msg.sender === myName ? "sent" : "received"}`}>
                <div className="msg-info"><b>{msg.sender}</b> <small>{msg.time}</small></div>
                <div className="msg-text">{msg.text}</div>
              </div>
            ))}
          </div>

          {/* --- INPUT AREA --- */}
          <div className="input-area">
            <input 
              value={message} 
              onChange={(e) => setMessage(e.target.value)} 
              placeholder="Enter encrypted message..." 
              disabled={!room} 
              onKeyPress={(e) => e.key === 'Enter' && sendMessage()} // Enter se message bhejega
            />
            <button className="send-btn" onClick={sendMessage} disabled={!room}>➤</button>
          </div>
        </div>
      )}
    </div>
  )
}
export default App