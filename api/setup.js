const axios = require("axios");
const { BOT_TOKEN } = require("./config");

module.exports = async function handler(req, res) {
  if (!BOT_TOKEN || BOT_TOKEN === "PASTE_NEW_BOT_TOKEN_HERE") {
    return res.status(500).json({
      ok: false,
      error: "BOT_TOKEN is not configured in api/config.js"
    });
  }

  const host = req.headers.host;
  const webhookUrl = `https://${host}/api/webhook`;
  const api = `https://api.telegram.org/bot${BOT_TOKEN}`;

  try {
    const webhook = await axios.post(`${api}/setWebhook`, {
      url: webhookUrl,
      allowed_updates: ["message", "callback_query"]
    });

    const commands = await axios.post(`${api}/setMyCommands`, {
      commands: [
        { command: "start", description: "Open the Grand X menu" },
        { command: "help", description: "Show all commands" },
        { command: "ping", description: "Check bot status" },
        { command: "qr", description: "Create a QR code from a link" },
        { command: "mute", description: "Admin: mute a replied-to member" },
        { command: "all", description: "Admin: mention observed members" },
        { command: "spam", description: "Admin: controlled emoji test" },
        { command: "image", description: "Get a configured random image" },
        { command: "video", description: "Get a configured random video" }
      ]
    });

    return res.status(200).json({
      ok: true,
      message: "Webhook and bot commands configured successfully.",
      webhook: webhookUrl,
      telegram: webhook.data,
      commands: commands.data
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      error: error.response?.data || error.message
    });
  }
};
