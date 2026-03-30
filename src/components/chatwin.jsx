import React from 'react'

const ChatWindow = () => {
  return (
    <div style={{ width: '70%', height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <div style={{ flex: 1, padding: '20px', backgroundColor: '#e5ddd5' }}>
        <p>Messages will appear here...</p>
      </div>
      <div style={{ padding: '10px', backgroundColor: '#f0f2f5' }}>
        <input type="text" placeholder="Type a message" style={{ width: '90%', padding: '10px' }} />
      </div>
    </div>
  )
}

export default ChatWindow