const QRCode = require("qrcode");
const { buildMailto } = require("./_lib/generators");
const { handlePreflight, getParams, sendJson, sendPng } = require("./_lib/http");

/*
  GET /api/email?to=a@vidu.com&subject=Tieu de&body=Noi dung&format=png|json
*/
module.exports = async (req, res) => {
  if (handlePreflight(req, res)) return;
  try {
    const { to, subject, body, format } = getParams(req);
    if (!to) {
      return sendJson(res, 400, { ok: false, error: "Thiếu tham số bắt buộc: to." });
    }
    const payload = buildMailto({ to, subject, body });

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
