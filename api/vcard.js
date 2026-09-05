const QRCode = require("qrcode");
const { buildVCard } = require("./_lib/generators");
const { handlePreflight, getParams, sendJson, sendPng } = require("./_lib/http");

/*
  GET /api/vcard?name=Nguyen Van A&phone=0900000000&email=a@vidu.com
                 &org=Cong ty ABC&address=123 Duong X&format=png|json
*/
module.exports = async (req, res) => {
  if (handlePreflight(req, res)) return;
  try {
    const { name, phone, email, org, address, format } = getParams(req);
    if (!name) {
      return sendJson(res, 400, { ok: false, error: "Thiếu tham số bắt buộc: name." });
    }
    const payload = buildVCard({ name, phone, email, org, address });

    if (format === "png") {
      const buffer = await QRCode.toBuffer(payload, { width: 512, margin: 1 });
      return sendPng(res, buffer);
    }
    const qr = await QRCode.toDataURL(payload, { width: 512, margin: 1 });
    return sendJson(res, 200, { ok: true, data: payload, qr });
  } catch (e) {
    return sendJson(res, 500, { ok: false, error: e.message });
  }
};
