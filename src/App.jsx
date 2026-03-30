import { useState, useEffect } from 'react'
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
  const myId = "Sagar_786"; 

  // Window resize handle karne ke liye (Responsive check)
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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
        setChat((prev) => [...prev, data]);
      }
    };

    socket.on("receive_message", handleReceive);
    return () => socket.off("receive_message");
  }, [myId, myName]);

  const handleScan = (scannedData) => {
    try {
      const friendData = JSON.parse(scannedData);
      if (friendData.id) {
        // Laptop (Admin) ko inform karo
        socket.emit("send_message", {
          room: myId, // Apni hi ID par bhejo taaki laptop catch kare
          type: "AUTO_CONNECT", 
          senderData: { id: friendData.id, name: friendData.name },
          text: `${friendData.name} Scanned!`,
          sender: "System"
        });
        alert("User Scanned & Sent to Laptop!");
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
      
      {/* SIDEBAR: Sirf Laptop par dikhega ya Mobile par toggle hoga */}
      {(!isMobile || (isMobile && !room)) && (
        <div className="sidebar">
          <div className="header">
            <b>{isMobile ? "Scanner Mode" : "Admin Panel"}</b>
            <div className="qr-actions">
              <button onClick={() => setShowMyQR(!showMyQR)}>🆔</button>
              <button onClick={() => setShowScanner(!showScanner)}>📷</button>
            </div>
          </div>

          {showScanner && <Scanner onScanSuccess={handleScan} />}
          
          {/* User List: Sirf Laptop (Desktop) par Delete option ke saath */}
          {!isMobile && (
            <div className="chat-list">
              <div className="list-header">
                <h3>Managed Users ({friends.length})</h3>
              </div>
              {friends.map((f, i) => (
                <div key={i} className={`user-item ${room === f.id ? "active" : ""}`} 
                     onClick={() => { setRoom(f.id); socket.emit("join_room", f.id); }}>
                  <div className="user-details">
                    <span className="user-name">{f.name}</span>
                    <span className="user-id">{f.id}</span>
                  </div>
                  <button className="delete-btn" onClick={(e) => deleteFriend(e, f.id)}>❌</button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* CHAT WINDOW: Laptop par main screen, Mobile par scan ke baad hidden */}
      {!isMobile && (
        <div className="chat-window">
          <div className="chat-header">
            {room ? `Control: ${friends.find(f => f.id === room)?.name}` : "System Idle - Select User"}
          </div>
          <div className="message-area">
            {chat.map((msg, i) => (
              <div key={i} className={`message-bubble ${msg.sender === myName ? "sent" : "received"}`}>
                <div className="msg-info"><b>{msg.sender}</b></div>
                <div className="msg-text">{msg.text}</div>
              </div>
            ))}
          </div>
          <div className="input-area">
            <input value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Type..." disabled={!room} />
            <button onClick={() => { /* Send Logic Same */ }}>➤</button>
          </div>
        </div>
      )}
    </div>
  )
}
export default App