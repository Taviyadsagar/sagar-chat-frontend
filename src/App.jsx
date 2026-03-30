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

  // --- NAYA: Dynamic Name Logic ---
  const [myName, setMyName] = useState(() => {
    return localStorage.getItem("user_name") || "";
  });

  const myId = "Sagar_786"; 
  const myQRData = JSON.stringify({ id: myId, name: myName });

  useEffect(() => {
    // Agar naam nahi hai toh prompt pucho
    if (!myName) {
      const name = prompt("Enter your name to start chatting:");
      if (name) {
        setMyName(name);
        localStorage.setItem("user_name", name);
      } else {
        setMyName("Guest User");
      }
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
    return () => socket.off("receive_message", handleReceive);
  }, [myId, myName]);

  const handleScan = (scannedData) => {
    try {
      const friendData = JSON.parse(scannedData);
      if (friendData.id && friendData.name) {
        setFriends((prev) => {
          const isAlreadyFriend = prev.find(f => f.id === friendData.id);
          if (!isAlreadyFriend) {
            const updated = [...prev, friendData];
            localStorage.setItem("chat_friends", JSON.stringify(updated));
            return updated;
          }
          return prev;
        });
        
        setRoom(friendData.id);
        socket.emit("join_room", friendData.id);

        socket.emit("send_message", {
          room: friendData.id,
          type: "AUTO_CONNECT", 
          senderData: { id: myId, name: myName },
          text: `${myName} connected with you!`,
          sender: myName
        });

        setShowScanner(false);
      }
    } catch (err) { alert("Invalid QR!"); }
  }

  // --- NAYA: Delete Friend Logic ---
  const deleteFriend = (e, friendId) => {
    e.stopPropagation(); // Click ko prevent karega taaki chat window na khule
    if (window.confirm("Delete this contact?")) {
      const updatedFriends = friends.filter(f => f.id !== friendId);
      setFriends(updatedFriends);
      localStorage.setItem("chat_friends", JSON.stringify(updatedFriends));
      if (room === friendId) setRoom(""); // Agar wahi chat khuli hai toh band kar do
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
          <div className="user-info">
             <b>{myName}</b> (You)
          </div>
          <div className="qr-actions">
            <button title="My QR" onClick={() => setShowMyQR(!showMyQR)}>🆔</button>
            <button title="Scan" onClick={() => setShowScanner(!showScanner)}>📷</button>
          </div>
        </div>

        {showMyQR && (
          <div className="qr-display">
            <QRCodeSVG value={myQRData} size={120} />
            <p>Your Chat QR</p>
          </div>
        )}

        {showScanner && <Scanner onScanSuccess={handleScan} />}

        <div className="chat-list">
          <div className="list-header">
            <h3>Recent Chats</h3>
            <span className="count-badge">{friends.length} Users</span>
          </div>
          {friends.map((f, i) => (
            <div key={i} className={`user-item ${room === f.id ? "active" : ""}`} onClick={() => {
              setRoom(f.id);
              socket.emit("join_room", f.id);
            }}>
              <div className="user-details">
                <span className="user-name">{f.name}</span>
                <span className="user-id">ID: {f.id}</span>
              </div>
              <button className="delete-btn" onClick={(e) => deleteFriend(e, f.id)}>❌</button>
            </div>
          ))}
        </div>
      </div>

      <div className="chat-window">
        <div className="chat-header">
          {room ? `Chatting with: ${friends.find(f => f.id === room)?.name || room}` : "Select a friend to start"}
        </div>
        <div className="message-area">
          {chat.length === 0 && !room && <div className="welcome">Scan a QR to add friends!</div>}
          {chat.map((msg, index) => (
            <div key={index} className={`message-bubble ${msg.sender === myName ? "sent" : "received"}`}>
              <div className="msg-info"><b>{msg.sender}</b> <span>{msg.time}</span></div>
              <div className="msg-text">{msg.text}</div>
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
          <button onClick={sendMessage} disabled={!room}>➤</button>
        </div>
      </div>
    </div>
  )
}
export default App