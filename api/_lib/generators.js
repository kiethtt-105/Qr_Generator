/* ---------------------------------------------------------------
   Cùng logic sinh chuỗi QR như bên frontend (js/script.js),
   chuyển sang CommonJS để chạy được trong serverless function (Node.js).
------------------------------------------------------------------ */

function stripAccents(str) {
  return String(str)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D");
}

function crc16(str) {
  let crc = 0xffff;
  for (let i = 0; i < str.length; i++) {
    crc ^= str.charCodeAt(i) << 8;
    for (let b = 0; b < 8; b++) {
      crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

function tlv(id, value) {
  return id + String(value.length).padStart(2, "0") + value;
}

// bin: mã ngân hàng (BIN Napas), account: số tài khoản,
// amount: số tiền (chuỗi số, có thể rỗng), message: nội dung chuyển khoản
function buildVietQR({ bin, account, amount, message }) {
  const acc = tlv("00", bin) + tlv("01", account);
  const merchant = tlv("00", "A000000727") + tlv("01", acc) + tlv("02", "QRIBFTTA");
  let p = "";
  p += tlv("00", "01");
  p += tlv("01", amount ? "12" : "11");
  p += tlv("38", merchant);
  p += tlv("53", "704");
  if (amount) p += tlv("54", String(amount));
  p += tlv("58", "VN");
  if (message) p += tlv("62", tlv("08", message));
  p += "6304";
  return p + crc16(p);
}

function buildVCard({ name, phone, email, org, address }) {
  return (
    `BEGIN:VCARD\nVERSION:3.0\nN:${name}\nFN:${name}\n` +
    (org ? `ORG:${org}\n` : "") +
    (phone ? `TEL:${phone}\n` : "") +
    (email ? `EMAIL:${email}\n` : "") +
    (address ? `ADR:;;${address};;;;\n` : "") +
    `END:VCARD`
  );
}

function buildWifi({ ssid, password, enc = "WPA", hidden = false }) {
  const esc = (s) => String(s || "").replace(/([\\;,:"])/g, "\\$1");
  return `WIFI:T:${enc};S:${esc(ssid)};${enc !== "nopass" ? `P:${esc(password)};` : ""}H:${
    hidden ? "true" : "false"
  };;`;
}

function buildSms({ phone, message }) {
  return `SMSTO:${phone}:${message || ""}`;
}

function buildMailto({ to, subject, body }) {
  return `mailto:${to}?subject=${encodeURIComponent(subject || "")}&body=${encodeURIComponent(
    body || ""
  )}`;
}

module.exports = {
  stripAccents,
  crc16,
  tlv,
  buildVietQR,
  buildVCard,
  buildWifi,
  buildSms,
  buildMailto,
};
