const QRCode = require("qrcode");
const { handlePreflight, getParams, sendJson, sendPng } = require("./_lib/http");

/*
  GET /api/text?content=Noi dung bat ky&format=png|json
*/
module.exports = async (req, res) => {
  if (handlePreflight(req, res)) return;
  try {
    const { content, format } = getParams(req);
    if (!content) {
      return sendJson(res, 400, { ok: false, error: "Thiếu tham số bắt buộc: content." });
    }
    if (format === "png") {
      const buffer = await QRCode.toBuffer(content, { width: 512, margin: 1 });
      return sendPng(res, buffer);
    }
    const qr = await QRCode.toDataURL(content, { width: 512, margin: 1 });
    return sendJson(res, 200, { ok: true, data: content, qr });
  } catch (e) {
    return sendJson(res, 500, { ok: false, error: e.message });
  }
};
