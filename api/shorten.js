const QRCode = require("qrcode");
const { handlePreflight, getParams, sendJson, sendPng } = require("./_lib/http");

/*
  GET /api/shorten?url=https://vidu.com/duong-dan-rat-dai&format=png|json

  Gọi hộ dịch vụ rút gọn cleanuri.com từ phía server (Node),
  nên không bao giờ dính lỗi CORS như khi gọi thẳng từ trình duyệt.
*/
module.exports = async (req, res) => {
  if (handlePreflight(req, res)) return;
  try {
    let { url, format } = getParams(req);
    if (!url) {
      return sendJson(res, 400, { ok: false, error: "Thiếu tham số bắt buộc: url." });
    }
    if (!/^https?:\/\//i.test(url)) url = "https://" + url;

    const apiRes = await fetch("https://cleanuri.com/api/v1/shorten", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: "url=" + encodeURIComponent(url),
    });
    const json = await apiRes.json();
    if (!json.result_url) {
      return sendJson(res, 502, {
        ok: false,
        error: json.error || "Không rút gọn được liên kết.",
      });
    }
    const shortUrl = json.result_url;

    if (format === "png") {
      const buffer = await QRCode.toBuffer(shortUrl, { width: 512, margin: 1 });
      return sendPng(res, buffer);
    }
    const qr = await QRCode.toDataURL(shortUrl, { width: 512, margin: 1 });
    return sendJson(res, 200, { ok: true, data: shortUrl, qr });
  } catch (e) {
    return sendJson(res, 500, { ok: false, error: e.message });
  }
};
