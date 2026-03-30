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
  const [myName, setMyName] = useState(localStorage.getItem("user_name") || "");
  
  // NEW: Temporary state for registration after scan
  const [tempFriend, setTempFriend] = useState(null);

  const myId = "Sagar_786"; 
  const lastMessageRef = useRef(null);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
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
  }, [myId]);

  useEffect(() => {
    lastMessageRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chat]);

  // --- LOGIC: Scan ke baad Name mangna ---
  const handleScan = (scannedData) => {
    try {
      const friendData = JSON.parse(scannedData);
      if (friendData.id) {
        setTempFriend(friendData); // Save data temporarily
        setShowScanner(false);      // Close sidebar/scanner
      }
    } catch (err) { alert("Invalid QR!"); }
  }

  // --- LOGIC: Registration Complete and Connect ---
  const completeRegistration = (enteredName) => {
    if (!enteredName) return alert("Please enter your name!");
    
    setMyName(enteredName);
    localStorage.setItem("user_name", enteredName);

    // Laptop (Admin) ko inform karo
    socket.emit("send_message", {
      room: myId, 
      type: "AUTO_CONNECT", 
      senderData: { id: myId, name: enteredName },
      text: `SYSTEM: ${enteredName} Initialized.`,
      sender: "System"
    });

    setRoom(tempFriend.id); // Chat open kardo
    setTempFriend(null);    // Registration box hatao
  }

  const sendMessage = () => {
    if (message !== "" && room !== "") {
      const msgData = { room, sender: myName, text: message, time: new Date().toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}) };
      socket.emit("send_message", msgData);
      setChat((prev) => [...prev, msgData]);
      setMessage("");
    }
  };

  return (
    <div className={`app-container ${isMobile ? 'mobile-mode' : 'desktop-mode'}`}>
      
      {/* 1. REGISTRATION OVERLAY (Mobile only) */}
      {isMobile && tempFriend && (
        <div className="registration-overlay">
          <div className="reg-card">
            <h3>CYBER INITIALIZATION</h3>
            <p>Enter your ID name to sync with Laptop</p>
            <input type="text" id="regName" placeholder="Node Name..." onKeyPress={(e) => e.key === 'Enter' && completeRegistration(e.target.value)} />
            <button onClick={() => completeRegistration(document.getElementById('regName').value)}>CONNECT NODE</button>
          </div>
        </div>
      )}

      {/* 2. SIDEBAR (Only if no active chat on mobile) */}
      {(!isMobile || (isMobile && !room && !tempFriend)) && (
        <div className="sidebar">
          <div className="header">
            <b>{isMobile ? "CYBER SCAN" : "ADMIN PANEL"}</b>
            <button className="id-btn" onClick={() => setShowMyQR(!showMyQR)}>ID</button>
          </div>

          <div className="scanner-trigger">
            <button className={`neon-scan-btn ${showScanner ? 'active' : ''}`} onClick={() => setShowScanner(!showScanner)}>
              <div className="pulse-ring"></div>
              <span>📷 SCAN NEW USER</span>
            </button>
          </div>

          {showScanner && <div className="scanner-view"><Scanner onScanSuccess={handleScan} /></div>}
          
          {showMyQR && (
            <div className="qr-box">
              <QRCodeSVG value={JSON.stringify({ id: myId, name: myName })} size={150} fgColor="#00fff2" bgColor="transparent" />
              <small>SCAN TO SYNC</small>
            </div>
          )}
          
          <div className="chat-list">
             <p className="list-title">ACTIVE NODES ({friends.length})</p>
             {friends.map((f, i) => (
               <div key={i} className={`user-item ${room === f.id ? "active" : ""}`} onClick={() => setRoom(f.id)}>
                 <b>{f.name}</b>
                 <small>{f.id}</small>
               </div>
             ))}
          </div>
        </div>
      )}

      {/* 3. CHAT WINDOW (Mobile aur Desktop dono ke liye) */}
      {(room || !isMobile) && (
        <div className={`chat-window ${isMobile ? 'full-view' : ''}`}>
          <div className="chat-header">
            {isMobile && <button className="back-btn" onClick={() => setRoom("")}>⬅</button>}
            <div className="status-dot"></div>
            <span>{room ? `CONNECTED: ${friends.find(f => f.id === room)?.name || "User"}` : "AWAITING NODE..."}</span>
          </div>
          
          <div className="message-area">
            {chat.map((msg, i) => (
              <div key={i} ref={i === chat.length - 1 ? lastMessageRef : null} className={`message-bubble ${msg.sender === myName ? "sent" : "received"}`}>
                <small>{msg.sender}</small>
                <div className="text">{msg.text}</div>
                <span className="time">{msg.time}</span>
              </div>
            ))}
          </div>

          <div className="input-area">
            <input value={message} onChange={(e) => setMessage(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && sendMessage()} placeholder="Type message..." disabled={!room} />
            <button onClick={sendMessage} disabled={!room}>➤</button>
          </div>
        </div>
      )}
    </div>
  )
}
export default App