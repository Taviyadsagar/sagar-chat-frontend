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

  // --- CHANGES START HERE ---
  useEffect(() => {
    // 1. App load hote hi Sagar ko uski apni ID wale room mein daal do
    // Isse Laptop humesha "Listen" mode mein rahega
    socket.emit("join_room", myId);

    const handleReceive = (data) => {
      // Sirf wahi messages dikhao jo aapke current room se related hon
      setChat((prev) => [...prev, data]);
    };

    socket.on("receive_message", handleReceive);

    return () => {
      socket.off("receive_message", handleReceive);
    };
  }, [myId]); 
  // --- CHANGES END HERE ---

  const handleScan = (scannedData) => {
    try {
      const friendData = JSON.parse(scannedData);
      
      if (friendData.id && friendData.name) {
        const isAlreadyFriend = friends.find(f => f.id === friendData.id);
        
        if (!isAlreadyFriend) {
          const confirmAdd = window.confirm(`Add ${friendData.name} to your chats?`);
          if (confirmAdd) {
            const updatedFriends = [...friends, friendData];
            setFriends(updatedFriends);
            localStorage.setItem("chat_friends", JSON.stringify(updatedFriends));
          }
        }
        
        // Friend ki ID join karo message bhejne ke liye
        setRoom(friendData.id);
        socket.emit("join_room", friendData.id);
        setShowScanner(false);
      }
    } catch (err) {
      alert("Invalid QR! Make sure it's a Chat QR.");
    }
  }

  const sendMessage = () => {
    if (message !== "" && room !== "") {
      const messageData = {
        room: room, // Friend ki ID
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
        <div className="chat-header">{room ? `Chatting with ID: ${room}` : "Select a friend"}</div>
        <div className="message-area">
          {chat.map((msg, index) => (
            <div key={index} className={`message-bubble ${msg.sender === myName ? "sent" : "received"}`}>
              <b>{msg.sender}:</b> {msg.text}
            </div>
          ))}
        </div>
        <div className="input-area">
          <input value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Type..." disabled={!room} />
          <button onClick={sendMessage} disabled={!room}>Send</button>
        </div>
      </div>
    </div>
  )
}
export default App