const QRCode = require("qrcode");
const { buildVietQR } = require("./_lib/generators");
const { handlePreflight, getParams, sendJson, sendPng } = require("./_lib/http");

/*
  GET /api/vietqr?bank=970436&account=0123456789&holder=NGUYEN VAN A
                  &amount=100000&message=Chuyen tien&format=png|json

  - bank    : mã BIN ngân hàng (bắt buộc) — ví dụ 970436 = Vietcombank
  - account : số tài khoản (bắt buộc)
  - holder  : tên chủ tài khoản, không dấu (bắt buộc)
  - amount  : số tiền VND (tùy chọn)
  - message : nội dung chuyển khoản (tùy chọn)
  - format  : "png" trả thẳng ảnh QR (dùng cho iOS Shortcuts "Get image"),
              mặc định trả JSON { ok, data, qr }
*/
module.exports = async (req, res) => {
  if (handlePreflight(req, res)) return;
  try {
    const { bank, account, holder, amount, message, format } = getParams(req);
    if (!bank || !account || !holder) {
      return sendJson(res, 400, {
        ok: false,
        error: "Thiếu tham số bắt buộc: bank, account, holder.",
      });
    }
    const payload = buildVietQR({
      bin: String(bank),
      account: String(account),
      amount: amount ? String(amount).replace(/\D/g, "") : "",
      message: message || "",
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
