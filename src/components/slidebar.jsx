import { QRCodeSVG } from 'qrcode.react';

const MyProfileQR = ({ userId }) => {
  return (
    <div style={{ textAlign: 'center', padding: '20px' }}>
      <h3>Scan to Chat with Me</h3>
      {/* Aapki Unique ID (e.g., Sagar_123) ka QR banega */}
      <QRCodeSVG value={userId} size={200} bgColor={"#ffffff"} fgColor={"#00a884"} />
      <p>ID: {userId}</p>
    </div>
  );
};