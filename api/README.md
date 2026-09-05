# API — dùng cho iOS Shortcuts / gọi ngoài

⚠️ **Quan trọng:** GitHub Pages chỉ phục vụ file tĩnh (HTML/CSS/JS), **không chạy được** các
file trong thư mục này. Để các API bên dưới hoạt động thật, bạn cần deploy repo này lên
**Vercel** (miễn phí, tự nhận diện thư mục `api/` là serverless functions):

1. Vào https://vercel.com → **Add New Project** → chọn repo `Qr_Gerenate` trên GitHub.
2. Để mặc định mọi thiết lập (Vercel tự nhận `index.html` ở gốc là trang tĩnh, mọi file
   trong `api/*.js` là 1 endpoint riêng) → bấm **Deploy**.
3. Sau khi deploy xong, bạn sẽ có domain dạng `https://qr-gerenate.vercel.app`. Trang web
   nằm ở domain gốc, API nằm ở `https://qr-gerenate.vercel.app/api/...`.

Mỗi khi push code mới lên GitHub, Vercel tự build & deploy lại — không cần làm gì thêm.

## Danh sách endpoint

Tất cả nhận tham số qua **query string** (GET) — hợp với action "Get Contents of URL"
trong Shortcuts. Thêm `&format=png` để nhận thẳng file ảnh QR thay vì JSON.

| Endpoint | Tham số bắt buộc | Tham số tùy chọn |
|---|---|---|
| `/api/vietqr` | `bank`, `account`, `holder` | `amount`, `message` |
| `/api/vcard` | `name` | `phone`, `email`, `org`, `address` |
| `/api/text` | `content` | — |
| `/api/link` | `url` | — |
| `/api/sms` | `phone` | `message` |
| `/api/wifi` | `ssid` | `password`, `enc` (WPA/WEP/nopass), `hidden` |
| `/api/email` | `to` | `subject`, `body` |
| `/api/shorten` | `url` | — |

## Ví dụ dùng trong Shortcuts (iPhone)

**Tạo QR chuyển khoản, lấy thẳng ảnh:**
```
GET https://qr-gerenate.vercel.app/api/vietqr?bank=970436&account=0123456789&holder=NGUYEN VAN A&amount=100000&message=Chuyen tien&format=png
```
→ Action "Get Contents of URL" trả về trực tiếp 1 file ảnh PNG, có thể "Quick Look" hoặc
"Save to Photos" ngay trong Shortcut.

**Rút gọn link, lấy JSON:**
```
GET https://qr-gerenate.vercel.app/api/shorten?url=https://example.com/duong-dan-rat-dai
```
Kết quả:
```json
{ "ok": true, "data": "https://cleanuri.com/xxxxx", "qr": "data:image/png;base64,..." }
```
Dùng action "Get Dictionary from Input" → lấy khóa `data` để có link rút gọn, hoặc lấy `qr`
(chuỗi base64) nếu muốn tự xử lý ảnh.

## Cấu trúc thư mục
```
api/
 ├── _lib/
 │    ├── generators.js   ← logic sinh chuỗi QR (dùng chung mọi endpoint)
 │    └── http.js         ← CORS + helper đọc tham số / trả JSON hoặc PNG
 ├── vietqr.js
 ├── vcard.js
 ├── text.js
 ├── link.js
 ├── sms.js
 ├── wifi.js
 ├── email.js
 └── shorten.js
```
