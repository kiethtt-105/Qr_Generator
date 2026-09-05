/* Helper dùng chung cho mọi endpoint trong /api */

// Cho phép gọi từ bất kỳ đâu (web, app, iOS Shortcuts...)
function cors(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

// Trả về true nếu đã tự xử lý xong request (preflight OPTIONS)
function handlePreflight(req, res) {
  cors(req, res);
  if (req.method === "OPTIONS") {
    res.status(204).end();
    return true;
  }
  return false;
}

// Gộp tham số từ query string (GET) và body JSON (POST) thành 1 object
function getParams(req) {
  const query = req.query || {};
  const body = typeof req.body === "object" && req.body ? req.body : {};
  return { ...query, ...body };
}

function sendJson(res, status, obj) {
  res.status(status).json(obj);
}

function sendPng(res, buffer) {
  res.setHeader("Content-Type", "image/png");
  res.status(200).send(buffer);
}

module.exports = { cors, handlePreflight, getParams, sendJson, sendPng };
