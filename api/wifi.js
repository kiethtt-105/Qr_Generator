const QRCode = require("qrcode");
const { buildWifi } = require("./_lib/generators");
const { handlePreflight, getParams, sendJson, sendPng } = require("./_lib/http");

/*
  GET /api/wifi?ssid=TenWifi&password=matkhau&enc=WPA&hidden=false&format=png|json
  enc: WPA | WEP | nopass
*/
module.exports = async (req, res) => {
  if (handlePreflight(req, res)) return;
  try {
    const { ssid, password, enc, hidden, format } = getParams(req);
    if (!ssid) {
      return sendJson(res, 400, { ok: false, error: "Thiếu tham số bắt buộc: ssid." });
    }
    const payload = buildWifi({
      ssid,
      password,
      enc: enc || "WPA",
      hidden: hidden === "true" || hidden === true,
    });

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
