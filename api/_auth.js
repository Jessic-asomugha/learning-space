const crypto = require("crypto");

// Returns true when the request carries the right access password.
// Sends the error response itself and returns false otherwise.
function checkAuth(req, res) {
  const expected = process.env.APP_PASSWORD;
  if (!expected) {
    res.status(500).json({ error: "server_not_configured", detail: "APP_PASSWORD is not set" });
    return false;
  }
  const given = String(req.headers["x-app-password"] || "");
  const a = crypto.createHash("sha256").update(given).digest();
  const b = crypto.createHash("sha256").update(expected).digest();
  if (!crypto.timingSafeEqual(a, b)) {
    res.status(401).json({ error: "unauthorized" });
    return false;
  }
  return true;
}

module.exports = { checkAuth };
