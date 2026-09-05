const QRCode = require("qrcode");
const { buildSms } = require("./_lib/generators");
const { handlePreflight, getParams, sendJson, sendPng } = require("./_lib/http");

/*
  GET /api/sms?phone=0900000000&message=Xin chao&format=png|json
*/
module.exports = async (req, res) => {
  if (handlePreflight(req, res)) return;
  try {
    const { phone, message, format } = getParams(req);
    if (!phone) {
      return sendJson(res, 400, { ok: false, error: "Thiếu tham số bắt buộc: phone." });
    }
    const payload = buildSms({ phone, message });

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
