module.exports = async function handler(req, res) {
  res.status(200).json({
    ok: true,
    service: "Grand X Telegram Bot V5",
    webhook: "/api/webhook",
    setup: "/api/setup"
  });
};
