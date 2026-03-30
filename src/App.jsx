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

  const myId = "Sagar_786"; 
  const myName = "Sagar";   

  const myQRData = JSON.stringify({ id: myId, name: myName });

  useEffect(() => {
    // Laptop load hote hi apni ID join karega
    socket.emit("join_room", myId);

    const handleReceive = (data) => {
      // --- NAYA LOGIC: Auto-Connect signal check karo ---
      if (data.type === "AUTO_CONNECT") {
        setRoom(data.senderData.id); // Laptop apne aap room set kar lega
        
        // Agar friend list mein nahi hai toh add karo
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
        // Normal message handle karo
        setChat((prev) => [...prev, data]);
      }
    };

    socket.on("receive_message", handleReceive);
    return () => socket.off("receive_message", handleReceive);
  }, [myId]); 

  const handleScan = (scannedData) => {
    try {
      const friendData = JSON.parse(scannedData);
      
      if (friendData.id && friendData.name) {
        const isAlreadyFriend = friends.find(f => f.id === friendData.id);
        
        if (!isAlreadyFriend) {
          const updatedFriends = [...friends, friendData];
          setFriends(updatedFriends);
          localStorage.setItem("chat_friends", JSON.stringify(updatedFriends));
        }
        
        // 1. Room set karo
        setRoom(friendData.id);
        socket.emit("join_room", friendData.id);

        // 2. --- NAYA LOGIC: Laptop ko signal bhejo ki maine scan kiya hai ---
        socket.emit("send_message", {
          room: friendData.id,
          type: "AUTO_CONNECT", 
          senderData: { id: myId, name: myName },
          text: "Handshake established!",
          sender: myName
        });

        setShowScanner(false);
      }
    } catch (err) {
      alert("Invalid QR!");
    }
  }

  const sendMessage = () => {
    if (message !== "" && room !== "") {
      const messageData = {
        room: room, 
        text: message,
        sender: myName,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
      socket.emit("send_message", messageData)
      setChat((prev) => [...prev, messageData])
      setMessage("")
    }
  }

  return (
    <div className="app-container">
      <div className="sidebar">
        <div className="header">
          <span>WhatsApp Clone</span>
          <div className="qr-actions">
            <button onClick={() => setShowMyQR(!showMyQR)}>My QR</button>
            <button onClick={() => setShowScanner(!showScanner)}>Scan</button>
          </div>
        </div>

        {showMyQR && (
          <div className="qr-display">
            <QRCodeSVG value={myQRData} size={150} />
            <p>Share this with friends</p>
          </div>
        )}

        {showScanner && <Scanner onScanSuccess={handleScan} />}

        <div className="chat-list">
          <h3>Recent Chats</h3>
          {friends.map((f, i) => (
            <div key={i} className={`user ${room === f.id ? "active" : ""}`} onClick={() => {
              setRoom(f.id);
              socket.emit("join_room", f.id);
            }}>
              {f.name}
            </div>
          ))}
        </div>
      </div>

      <div className="chat-window">
        <div className="chat-header">
          {room ? `Chatting with: ${friends.find(f => f.id === room)?.name || room}` : "Select a friend"}
        </div>
        <div className="message-area">
          {chat.map((msg, index) => (
            <div key={index} className={`message-bubble ${msg.sender === myName ? "sent" : "received"}`}>
              <b>{msg.sender}:</b> {msg.text}
            </div>
          ))}
        </div>
        <div className="input-area">
          <input 
            value={message} 
            onChange={(e) => setMessage(e.target.value)} 
            placeholder="Type a message..." 
            disabled={!room} 
            onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
          />
          <button onClick={sendMessage} disabled={!room}>Send</button>
        </div>
      </div>
    </div>
  )
}
export default App