import { Html5QrcodeScanner } from "html5-qrcode";
import { useEffect } from "react";

const Scanner = ({ onScanSuccess }) => {
  useEffect(() => {
    const scanner = new Html5QrcodeScanner("reader", {
      fps: 10,
      qrbox: { width: 250, height: 250 },
    });

    scanner.render(
      (decodedText) => {
        onScanSuccess(decodedText);
        scanner.clear();
      },
      (error) => { console.warn(error); }
    );

    return () => scanner.clear(); // Jab component band ho toh camera bhi band ho jaye
  }, []);

  return (
    <div style={{ padding: "20px", background: "#fff" }}>
      <div id="reader"></div>
    </div>
  );
};

export default Scanner;