/* ---------------- Bank list (VietQR / Napas BINs) ----------------
   Danh sách được lấy trực tiếp từ API công khai của VietQR
   (https://api.vietqr.io/v2/banks) khi trang tải lên.
   Mảng bên dưới chỉ là dữ liệu dự phòng (fallback) dùng tạm trong
   lúc chờ gọi API, hoặc khi thiết bị không có mạng.
------------------------------------------------------------------- */
let BANKS = [
  {bin:"970436", name:"Vietcombank"},
  {bin:"970415", name:"VietinBank"},
  {bin:"970418", name:"BIDV"},
  {bin:"970405", name:"Agribank"},
  {bin:"970407", name:"Techcombank"},
  {bin:"970422", name:"MB Bank"},
  {bin:"970416", name:"ACB"},
  {bin:"970432", name:"VPBank"},
  {bin:"970423", name:"TPBank"},
  {bin:"970403", name:"Sacombank"}
];
let banksLoadedFromApi = false;

async function loadBanksFromVietQR(){
  try{
    const res = await fetch("https://api.vietqr.io/v2/banks");
    const json = await res.json();
    if (!Array.isArray(json.data) || !json.data.length) throw new Error("empty");
    const fresh = json.data
      .filter(b => b.transferSupported === 1 && b.bin)
      .map(b => ({bin: b.bin, name: b.shortName || b.name}))
      .sort((a,b) => a.name.localeCompare(b.name));
    if (fresh.length){
      BANKS = fresh;
      banksLoadedFromApi = true;
      // Nếu người dùng đang ở tab VietQR, làm mới danh sách chọn ngân hàng
      if (currentTab === "vietqr"){
        const prevSelected = document.getElementById("f_bank")?.value || "";
        renderForm();
        const sel = document.getElementById("f_bank");
        if (sel && prevSelected) sel.value = prevSelected;
      }
    }
  }catch(e){
    // Giữ nguyên danh sách dự phòng nếu không gọi được API (mất mạng, CORS...)
    console.warn("Không tải được danh sách ngân hàng từ VietQR API, dùng danh sách dự phòng.", e);
  }
}

/* ---------------- Tabs config ---------------- */
const TABS = [
  {id:"vietqr", label:"VietQR", color:"#EF5C48", icon:"♥"},
  {id:"vcard", label:"VCard", color:"#8B5CF6", icon:"◈"},
  {id:"text", label:"Text", color:"#2E7BF6", icon:"T"},
  {id:"link", label:"Link", color:"#2FA95C", icon:"⛓"},
  {id:"sms", label:"SMS", color:"#F2A900", icon:"✉"},
  {id:"wifi", label:"WiFi", color:"#F2751A", icon:"᯽"},
  {id:"email", label:"Email", color:"#EE4266", icon:"@"},
  {id:"shorten", label:"Rút gọn link", color:"#0D9488", icon:"✂"}
];

let currentTab = "vietqr";
const tabbar = document.getElementById("tabbar");
TABS.forEach(t=>{
  const el = document.createElement("div");
  el.className = "tab" + (t.id===currentTab ? " active":"");
  el.dataset.id = t.id;
  el.innerHTML = `<span class="ic" style="background:${t.color}">${t.icon}</span>${t.label}`;
  el.onclick = ()=>selectTab(t.id);
  tabbar.appendChild(el);
});

function selectTab(id){
  currentTab = id;
  document.querySelectorAll(".tab").forEach(el=>{
    el.classList.toggle("active", el.dataset.id===id);
  });
  const t = TABS.find(x=>x.id===id);
  const li = document.getElementById("leftIcon");
  li.style.background = t.color;
  li.textContent = t.icon;
  resetResult();
  renderForm();
}

/* ---------------- Helpers ---------------- */
function stripAccents(str){
  return str.normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/đ/g,"d").replace(/Đ/g,"D");
}
function formatVND(v){
  const digits = v.replace(/\D/g,"");
  return digits ? Number(digits).toLocaleString("en-US") : "";
}
function crc16(str){
  let crc = 0xFFFF;
  for (let i=0;i<str.length;i++){
    crc ^= (str.charCodeAt(i) << 8);
    for (let b=0;b<8;b++){
      crc = (crc & 0x8000) ? ((crc<<1) ^ 0x1021) & 0xFFFF : (crc<<1) & 0xFFFF;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4,"0");
}
function tlv(id, value){
  return id + String(value.length).padStart(2,"0") + value;
}
function buildVietQR({bin, account, amount, message}){
  const acc = tlv("00", bin) + tlv("01", account);
  const merchant = tlv("00","A000000727") + tlv("01", acc) + tlv("02","QRIBFTTA");
  let p = "";
  p += tlv("00","01");
  p += tlv("01", amount ? "12" : "11");
  p += tlv("38", merchant);
  p += tlv("53","704");
  if (amount) p += tlv("54", String(amount));
  p += tlv("58","VN");
  if (message) p += tlv("62", tlv("08", message));
  p += "6304";
  return p + crc16(p);
}
function showError(id, msg){
  const el = document.getElementById(id);
  if(!el) return;
  el.textContent = msg;
  el.style.display = msg ? "block" : "none";
}

/* ---------------- Form rendering per tab ---------------- */
const formArea = document.getElementById("formArea");

function renderForm(){
  formArea.innerHTML = "";
  showError("errBox","");
  if (currentTab==="vietqr") formArea.innerHTML = formVietQR();
  else if (currentTab==="vcard") formArea.innerHTML = formVCard();
  else if (currentTab==="text") formArea.innerHTML = formText();
  else if (currentTab==="link") formArea.innerHTML = formLink();
  else if (currentTab==="sms") formArea.innerHTML = formSMS();
  else if (currentTab==="wifi") formArea.innerHTML = formWifi();
  else if (currentTab==="email") formArea.innerHTML = formEmail();
  else if (currentTab==="shorten") formArea.innerHTML = formShorten();
  wireExtras();
}

function fieldWrap(inner){
  return `<div class="field">${inner}</div>`;
}

function formVietQR(){
  const options = BANKS.map(b=>`<option value="${b.bin}">${b.name}</option>`).join("");
  return `
    <label>Ngân hàng thụ hưởng <span class="req">*</span></label>
    ${fieldWrap(`<select id="f_bank"><option value="">Chọn ngân hàng</option>${options}</select>`)}
    <div class="hint">${banksLoadedFromApi ? "Danh sách đồng bộ trực tiếp từ VietQR.io." : "Đang tải danh sách ngân hàng từ VietQR.io..."}</div>

    <label>Số tài khoản <span class="req">*</span></label>
    ${fieldWrap(`<input id="f_account" placeholder="Số tài khoản" inputmode="numeric" maxlength="19">`)}
    <div class="hint">Chỉ nhập số, tối đa 19 ký tự.</div>

    <label>Chủ tài khoản <span class="req">*</span></label>
    ${fieldWrap(`<input id="f_holder" placeholder="Chủ tài khoản" maxlength="50">`)}
    <div class="hint">Nhập tiếng Việt không dấu, viết hoa, tối đa 50 ký tự (chỉ ký tự ASCII).</div>

    <label>Số tiền (VND) <span style="color:var(--muted);font-weight:500;">(Tùy chọn)</span></label>
    ${fieldWrap(`<input id="f_amount" placeholder="0" inputmode="numeric">`)}

    <label>Nội dung chuyển khoản <span style="color:var(--muted);font-weight:500;">(Tùy chọn)</span></label>
    ${fieldWrap(`<input id="f_message" placeholder="Nội dung chuyển khoản" maxlength="50">`)}
    <div class="error-msg" id="errBox"></div>
  `;
}
function formVCard(){
  return `
    <label>Họ và tên <span class="req">*</span></label>
    ${fieldWrap(`<input id="f_name" placeholder="Nguyễn Văn A">`)}
    <div class="row2">
      <div>
        <label>Số điện thoại</label>
        ${fieldWrap(`<input id="f_phone" placeholder="09xxxxxxxx">`)}
      </div>
      <div>
        <label>Email</label>
        ${fieldWrap(`<input id="f_email" placeholder="ban@vidu.com">`)}
      </div>
    </div>
    <label>Công ty / Chức danh</label>
    ${fieldWrap(`<input id="f_org" placeholder="Công ty · Chức danh">`)}
    <label>Địa chỉ</label>
    ${fieldWrap(`<input id="f_addr" placeholder="Địa chỉ liên hệ">`)}
    <div class="error-msg" id="errBox"></div>
  `;
}
function formText(){
  return `
    <label>Nội dung văn bản <span class="req">*</span></label>
    ${fieldWrap(`<textarea id="f_text" placeholder="Nhập nội dung bất kỳ..."></textarea>`)}
    <div class="error-msg" id="errBox"></div>
  `;
}
function formLink(){
  return `
    <label>Đường dẫn (URL) <span class="req">*</span></label>
    ${fieldWrap(`<input id="f_url" placeholder="https://vidu.com">`)}
    <div class="error-msg" id="errBox"></div>
  `;
}
function formSMS(){
  return `
    <label>Số điện thoại <span class="req">*</span></label>
    ${fieldWrap(`<input id="f_smsphone" placeholder="09xxxxxxxx">`)}
    <label>Nội dung tin nhắn <span style="color:var(--muted);font-weight:500;">(Tùy chọn)</span></label>
    ${fieldWrap(`<textarea id="f_smsmsg" placeholder="Nội dung tin nhắn"></textarea>`)}
    <div class="error-msg" id="errBox"></div>
  `;
}
function formWifi(){
  return `
    <label>Tên mạng (SSID) <span class="req">*</span></label>
    ${fieldWrap(`<input id="f_ssid" placeholder="Tên WiFi">`)}
    <label>Mật khẩu</label>
    ${fieldWrap(`<input id="f_wpass" placeholder="Mật khẩu WiFi">`)}
    <div class="row2">
      <div>
        <label>Loại bảo mật</label>
        ${fieldWrap(`<select id="f_wenc"><option value="WPA">WPA/WPA2</option><option value="WEP">WEP</option><option value="nopass">Không mật khẩu</option></select>`)}
      </div>
      <div>
        <label>&nbsp;</label>
        <div class="checkline" style="margin-top:11px;"><input type="checkbox" id="f_whidden"> Mạng ẩn (hidden)</div>
      </div>
    </div>
    <div class="error-msg" id="errBox"></div>
  `;
}
function formEmail(){
  return `
    <label>Email người nhận <span class="req">*</span></label>
    ${fieldWrap(`<input id="f_eto" placeholder="ban@vidu.com">`)}
    <label>Tiêu đề</label>
    ${fieldWrap(`<input id="f_esub" placeholder="Tiêu đề email">`)}
    <label>Nội dung</label>
    ${fieldWrap(`<textarea id="f_ebody" placeholder="Nội dung email"></textarea>`)}
    <div class="error-msg" id="errBox"></div>
  `;
}
function formShorten(){
  return `
    <label>Đường dẫn cần rút gọn <span class="req">*</span></label>
    ${fieldWrap(`<input id="f_longurl" placeholder="https://vidu.com/duong-dan-rat-dai">`)}
    <div class="hint">Dùng dịch vụ rút gọn công khai (cleanuri.com). Cần kết nối internet.</div>
    <div class="error-msg" id="errBox"></div>
  `;
}

function wireExtras(){
  const acc = document.getElementById("f_account");
  if (acc) acc.addEventListener("input", ()=>{ acc.value = acc.value.replace(/\D/g,"").slice(0,19); });
  const holder = document.getElementById("f_holder");
  if (holder) holder.addEventListener("input", ()=>{
    const cursor = holder.selectionStart;
    holder.value = stripAccents(holder.value).toUpperCase().replace(/[^A-Z0-9 .]/g,"");
  });
  const amt = document.getElementById("f_amount");
  if (amt) amt.addEventListener("input", ()=>{ amt.value = formatVND(amt.value); });
}

/* ---------------- QR rendering / actions ---------------- */
const qrStage = document.getElementById("qrStage");
const qrRenderBox = document.getElementById("qrRender");
const qrPlaceholderText = document.getElementById("qrPlaceholderText");
const btnDownload = document.getElementById("btnDownload");
const btnPrint = document.getElementById("btnPrint");
const step3 = document.getElementById("step3");
const shortResult = document.getElementById("shortResult");

function resetResult(){
  qrRenderBox.innerHTML = "";
  qrStage.classList.remove("filled");
  qrPlaceholderText.textContent = "Chưa có mã QR";
  qrStage.querySelector(".ph-icon").style.display = "";
  btnDownload.disabled = true;
  btnPrint.disabled = true;
  step3.classList.remove("done");
  shortResult.style.display = "none";
  shortResult.innerHTML = "";
}

function renderQR(dataString){
  qrRenderBox.innerHTML = "";
  new QRCode(qrRenderBox, {
    text: dataString,
    width: 208,
    height: 208,
    correctLevel: QRCode.CorrectLevel.M
  });
  qrStage.classList.add("filled");
  qrStage.querySelector(".ph-icon").style.display = "none";
  qrPlaceholderText.textContent = "";
  btnDownload.disabled = false;
  btnPrint.disabled = false;
  step3.classList.add("done");
}

btnDownload.onclick = ()=>{
  const canvas = qrRenderBox.querySelector("canvas");
  if(!canvas) return;
  const a = document.createElement("a");
  a.href = canvas.toDataURL("image/png");
  a.download = "ma-qr.png";
  a.click();
};
btnPrint.onclick = ()=>{
  const canvas = qrRenderBox.querySelector("canvas");
  if(!canvas) return;
  const dataUrl = canvas.toDataURL("image/png");
  const w = window.open("", "_blank", "width=420,height=520");
  w.document.write(`<html><head><title>In mã QR</title></head>
  <body style="display:flex;align-items:center;justify-content:center;height:100vh;margin:0;">
  <img src="${dataUrl}" style="width:280px;height:280px;" onload="window.print();"></body></html>`);
  w.document.close();
};

/* ---------------- QR "API" layer ----------------
   Mỗi loại mã QR có một hàm xử lý riêng (giống 1 API endpoint),
   luôn trả về cùng 1 cấu trúc: { ok, data, error, meta }
------------------------------------------------- */
const QRApi = {

  vietqr(){
    const bin = document.getElementById("f_bank").value;
    const account = document.getElementById("f_account").value.trim();
    const holder = document.getElementById("f_holder").value.trim();
    const amount = document.getElementById("f_amount").value.replace(/\D/g,"");
    const message = document.getElementById("f_message").value.trim();
    if (!bin || !account || !holder){
      return {ok:false, error:"Vui lòng chọn ngân hàng, nhập số tài khoản và chủ tài khoản."};
    }
    return {ok:true, data: buildVietQR({bin, account, amount, message})};
  },

  vcard(){
    const name = document.getElementById("f_name").value.trim();
    const phone = document.getElementById("f_phone").value.trim();
    const email = document.getElementById("f_email").value.trim();
    const org = document.getElementById("f_org").value.trim();
    const addr = document.getElementById("f_addr").value.trim();
    if (!name) return {ok:false, error:"Vui lòng nhập họ và tên."};
    const vcard = `BEGIN:VCARD\nVERSION:3.0\nN:${name}\nFN:${name}\n${org?`ORG:${org}\n`:""}${phone?`TEL:${phone}\n`:""}${email?`EMAIL:${email}\n`:""}${addr?`ADR:;;${addr};;;;\n`:""}END:VCARD`;
    return {ok:true, data: vcard};
  },

  text(){
    const text = document.getElementById("f_text").value.trim();
    if (!text) return {ok:false, error:"Vui lòng nhập nội dung văn bản."};
    return {ok:true, data: text};
  },

  link(){
    let url = document.getElementById("f_url").value.trim();
    if (!url) return {ok:false, error:"Vui lòng nhập đường dẫn."};
    if (!/^https?:\/\//i.test(url)) url = "https://" + url;
    return {ok:true, data: url};
  },

  sms(){
    const phone = document.getElementById("f_smsphone").value.trim();
    const msg = document.getElementById("f_smsmsg").value.trim();
    if (!phone) return {ok:false, error:"Vui lòng nhập số điện thoại."};
    return {ok:true, data: `SMSTO:${phone}:${msg}`};
  },

  wifi(){
    const ssid = document.getElementById("f_ssid").value.trim();
    const pass = document.getElementById("f_wpass").value.trim();
    const enc = document.getElementById("f_wenc").value;
    const hidden = document.getElementById("f_whidden").checked;
    if (!ssid) return {ok:false, error:"Vui lòng nhập tên mạng (SSID)."};
    const esc = s => s.replace(/([\\;,:"])/g,"\\$1");
    const data = `WIFI:T:${enc};S:${esc(ssid)};${enc!=="nopass"?`P:${esc(pass)};`:""}H:${hidden?"true":"false"};;`;
    return {ok:true, data};
  },

  email(){
    const to = document.getElementById("f_eto").value.trim();
    const sub = document.getElementById("f_esub").value.trim();
    const body = document.getElementById("f_ebody").value.trim();
    if (!to) return {ok:false, error:"Vui lòng nhập email người nhận."};
    return {ok:true, data: `mailto:${to}?subject=${encodeURIComponent(sub)}&body=${encodeURIComponent(body)}`};
  },

  // Loại duy nhất thật sự gọi ra một API bên ngoài (cleanuri.com)
  async shorten(){
    let url = document.getElementById("f_longurl").value.trim();
    if (!url) return {ok:false, error:"Vui lòng nhập đường dẫn cần rút gọn."};
    if (!/^https?:\/\//i.test(url)) url = "https://" + url;
    try{
      const res = await fetch("https://cleanuri.com/api/v1/shorten", {
        method:"POST",
        headers:{"Content-Type":"application/x-www-form-urlencoded"},
        body:"url=" + encodeURIComponent(url)
      });
      const json = await res.json();
      if (!json.result_url){
        throw new Error(json.error || "Không rút gọn được liên kết.");
      }
      return {ok:true, data: json.result_url, meta:{shortUrl: json.result_url}};
    }catch(e){
      return {ok:false, error:"Không thể rút gọn liên kết lúc này (mạng hoặc dịch vụ ngoài bị chặn). Vui lòng thử lại sau."};
    }
  }
};

document.getElementById("btnGenerate").onclick = async ()=>{
  showError("errBox","");
  const btn = document.getElementById("btnGenerate");
  const handler = QRApi[currentTab];
  if (!handler) return;

  const isAsync = currentTab === "shorten";
  if (isAsync){ btn.disabled = true; btn.textContent = "Đang rút gọn..."; }

  try{
    const result = await handler();
    if (!result.ok){
      showError("errBox", result.error);
      return;
    }
    renderQR(result.data);
    if (result.meta && result.meta.shortUrl){
      shortResult.style.display = "block";
      shortResult.innerHTML = `Liên kết rút gọn: <a href="${result.meta.shortUrl}" target="_blank">${result.meta.shortUrl}</a>`;
    }
  }catch(e){
    showError("errBox","Đã có lỗi xảy ra: " + e.message);
  }finally{
    if (isAsync){ btn.disabled = false; btn.textContent = "Tạo mã QR ⚙"; }
  }
};

/* init */
renderForm();
loadBanksFromVietQR();
