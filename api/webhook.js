module.exports = async function handler(req, res) {
  return res.status(200).json({
    ok: true,
    service: "Grand X Telegram Bot",
    webhook: "working"
  });
};