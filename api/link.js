const QRCode = require("qrcode");
const { handlePreflight, getParams, sendJson, sendPng } = require("./_lib/http");

/*
  GET /api/link?url=vidu.com&format=png|json
*/
module.exports = async (req, res) => {
  if (handlePreflight(req, res)) return;
  try {
    let { url, format } = getParams(req);
    if (!url) {
      return sendJson(res, 400, { ok: false, error: "Thiếu tham số bắt buộc: url." });
    }
    if (!/^https?:\/\//i.test(url)) url = "https://" + url;

    if (format === "png") {
      const buffer = await QRCode.toBuffer(url, { width: 512, margin: 1 });
      return sendPng(res, buffer);
    }
    const qr = await QRCode.toDataURL(url, { width: 512, margin: 1 });
    return sendJson(res, 200, { ok: true, data: url, qr });
  } catch (e) {
    return sendJson(res, 500, { ok: false, error: e.message });
  }
};
