const axios = require("axios");
const QRCode = require("qrcode");
const FormData = require("form-data");
const cheerio = require("cheerio");
const fs = require("fs");
const path = require("path");

const { BOT_TOKEN } = require("./config");
const imageSites = require("../src/data/imageSites");
const videoSites = require("../src/data/videoSites");

const API = `https://api.telegram.org/bot${BOT_TOKEN}`;

const memberCache = globalThis.__grandXMembersV5 ||
  (globalThis.__grandXMembersV5 = new Map());

const INTRO = fs.readFileSync(
  path.join(process.cwd(), "intro.txt"),
  "utf8"
).trim();

function esc(value = "") {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function displayName(user) {
  return [user.first_name, user.last_name].filter(Boolean).join(" ")
    || (user.username ? `@${user.username}` : String(user.id));
}

function remember(chatId, user) {
  if (!user || user.is_bot) return;

  const key = String(chatId);

  if (!memberCache.has(key)) {
    memberCache.set(key, new Map());
  }

  memberCache.get(key).set(String(user.id), {
    id: user.id,
    first_name: user.first_name || "",
    last_name: user.last_name || "",
    username: user.username || ""
  });
}

function getMembers(chatId) {
  return [...(memberCache.get(String(chatId))?.values() || [])];
}

async function tg(method, payload = {}) {
  if (!BOT_TOKEN || BOT_TOKEN === "PASTE_NEW_BOT_TOKEN_HERE") {
    throw new Error("BOT_TOKEN is not configured in api/config.js");
  }

  const response = await axios.post(`${API}/${method}`, payload, {
    timeout: 25000
  });

  if (!response.data?.ok) {
    throw new Error(response.data?.description || `${method} failed`);
  }

  return response.data.result;
}

async function sendMessage(chatId, text, extra = {}) {
  return tg("sendMessage", {
    chat_id: chatId,
    text,
    ...extra
  });
}

function mainKeyboard() {
  return {
    inline_keyboard: [
      [
        { text: "🔳 QR Code", callback_data: "qr_help" },
        { text: "🛠️ Commands", callback_data: "help" }
      ],
      [
        { text: "🔇 Moderation", callback_data: "moderation" },
        { text: "❤️ About", callback_data: "about" }
      ],
      [
        { text: "🖼️ Image", callback_data: "image" },
        { text: "🎬 Video", callback_data: "video" }
      ],
      [
        { text: "🏓 Ping", callback_data: "ping" }
      ]
    ]
  };
}

function backButton() {
  return {
    inline_keyboard: [
      [{ text: "⬅️ Main Menu", callback_data: "start" }]
    ]
  };
}

async function start(msg) {
  await sendMessage(msg.chat.id, INTRO, {
    reply_markup: mainKeyboard()
  });
}

async function help(msg) {
  const text =
`🛠️ GRAND X — COMMANDS

🔳 QR CODE
Send:
 /Qr https://google.com

Example:
 /Qr https://youtube.com

The bot creates a high-quality QR image with a wide white border.

🔇 MUTE — ADMINS / OWNER ONLY
Reply to a member's message and send:
 /Mute

The selected member will be restricted for 10 minutes.

📢 ALL — ADMINS / OWNER ONLY
 /all

Mentions members observed by the bot.

❤️ SPAM — ADMINS / OWNER ONLY
 /Spam

Sends a small controlled emoji test.

🖼️ IMAGE
 /Image

Gets a random image from your configured sources.

🎬 VIDEO
 /Video

Gets a random video from your configured sources.

🏓 STATUS
 /ping

Checks whether Grand X is online.`;

  await sendMessage(msg.chat.id, text, {
    reply_markup: backButton()
  });
}

async function qrHelp(msg) {
  const text =
`🔳 GRAND X — QR CODE

Create a QR code from any web link.

📌 Command:
 /Qr LINK

✅ Example:
 /Qr https://google.com

Another example:
 /Qr https://youtube.com

The QR image is generated in high quality with a wide white scanning area.`;

  await sendMessage(msg.chat.id, text, {
    reply_markup: backButton()
  });
}

async function moderationHelp(msg) {
  const text =
`🔇 GRAND X — MODERATION

👑 ADMIN / OWNER ONLY

To mute a member:

1. Reply to the member's message.
2. Send:
 /Mute

⏱️ Duration:
10 minutes

Example:
[Reply to member]
/Mute

The bot must have permission to restrict members.`;

  await sendMessage(msg.chat.id, text, {
    reply_markup: backButton()
  });
}

async function about(msg) {
  await sendMessage(
    msg.chat.id,
`❤️ GRAND X

Professional Telegram group assistant.

⚡ Running on Vercel
🔗 Telegram Webhook
🛠️ Group utilities
🔳 QR generation
🖼️ Media modules`,
    { reply_markup: backButton() }
  );
}

async function ping(msg) {
  await sendMessage(
    msg.chat.id,
    "🏓 Pong!\n\n✅ Grand X is online."
  );
}

async function isAdminOrOwner(chatId, userId) {
  const member = await tg("getChatMember", {
    chat_id: chatId,
    user_id: userId
  });

  return member.status === "creator" || member.status === "administrator";
}

async function requireAdminOrOwner(msg) {
  if (!msg.from) return false;

  try {
    const allowed = await isAdminOrOwner(
      msg.chat.id,
      msg.from.id
    );

    if (allowed) return true;
  } catch (error) {
    await sendMessage(
      msg.chat.id,
      "❌ I could not verify your admin status. Make sure Grand X is an administrator in this group."
    );
    return false;
  }

  await sendMessage(
    msg.chat.id,
    "⛔ This command is available only to group administrators and the group owner."
  );

  return false;
}

async function qr(msg, link) {
  if (!link) {
    return qrHelp(msg);
  }

  let url;

  try {
    url = new URL(link).href;
  } catch {
    return sendMessage(
      msg.chat.id,
      "❌ Invalid link.\n\nExample:\n/Qr https://google.com"
    );
  }

  const buffer = await QRCode.toBuffer(url, {
    type: "png",
    width: 1600,
    margin: 14,
    errorCorrectionLevel: "H",
    color: {
      dark: "#000000",
      light: "#FFFFFF"
    }
  });

  const form = new FormData();

  form.append("chat_id", String(msg.chat.id));

  form.append("photo", buffer, {
    filename: "grand-x-qr.png",
    contentType: "image/png"
  });

  form.append(
    "caption",
    `🔳 GRAND X QR CODE\n\n🔗 ${url}`
  );

  const result = await axios.post(
    `${API}/sendPhoto`,
    form,
    {
      headers: form.getHeaders(),
      maxBodyLength: Infinity,
      timeout: 25000
    }
  );

  if (!result.data?.ok) {
    throw new Error(
      result.data?.description || "QR image upload failed"
    );
  }
}

async function mute(msg) {
  if (!await requireAdminOrOwner(msg)) return;

  const target = msg.reply_to_message?.from;

  if (!target || target.is_bot) {
    return sendMessage(
      msg.chat.id,
      "🔇 To mute a member:\n\n1️⃣ Reply to their message.\n2️⃣ Send /Mute"
    );
  }

  if (target.id === msg.from?.id) {
    return sendMessage(
      msg.chat.id,
      "❌ You cannot mute yourself."
    );
  }

  try {
    const targetMember = await tg("getChatMember", {
      chat_id: msg.chat.id,
      user_id: target.id
    });

    if (
      targetMember.status === "creator" ||
      targetMember.status === "administrator"
    ) {
      return sendMessage(
        msg.chat.id,
        "❌ This member is an administrator/owner and cannot be muted by this bot."
      );
    }

    await tg("restrictChatMember", {
      chat_id: msg.chat.id,
      user_id: target.id,
      until_date: Math.floor(Date.now() / 1000) + 600,
      permissions: {
        can_send_messages: false,
        can_send_audios: false,
        can_send_documents: false,
        can_send_photos: false,
        can_send_videos: false,
        can_send_video_notes: false,
        can_send_voice_notes: false,
        can_send_polls: false,
        can_send_other_messages: false,
        can_add_web_page_previews: false
      }
    });

    await sendMessage(
      msg.chat.id,
      `🔇 ${esc(displayName(target))} has been muted for 10 minutes.`,
      { parse_mode: "HTML" }
    );
  } catch (error) {
    await sendMessage(
      msg.chat.id,
      `❌ Mute failed.\n\n${error.message}`
    );
  }
}

async function all(msg) {
  if (!await requireAdminOrOwner(msg)) return;

  const members = getMembers(msg.chat.id);

  if (!members.length) {
    return sendMessage(
      msg.chat.id,
      "📢 I haven't observed any members yet.\n\nOnce members send messages while I'm present, I can mention the observed members."
    );
  }

  const mentions = members.map(user =>
    `<a href="tg://user?id=${user.id}">${esc(displayName(user))}</a>`
  );

  for (let i = 0; i < mentions.length; i += 20) {
    await sendMessage(
      msg.chat.id,
      "📢 " + mentions.slice(i, i + 20).join(" "),
      {
        parse_mode: "HTML",
        disable_web_page_preview: true
      }
    );
  }
}

async function spam(msg) {
  if (!await requireAdminOrOwner(msg)) return;

  const emojis = [
    "❤️", "💓", "💗", "💖", "🫀",
    "✨", "🔥", "💙", "💚", "💛"
  ];

  for (let i = 0; i < 5; i++) {
    const text = Array.from(
      { length: 12 },
      () => emojis[Math.floor(Math.random() * emojis.length)]
    ).join(" ");

    await sendMessage(msg.chat.id, text);

    if (i < 4) {
      await new Promise(resolve => setTimeout(resolve, 700));
    }
  }
}

function absoluteUrl(base, value) {
  if (!value) return null;

  try {
    return new URL(value, base).href;
  } catch {
    return null;
  }
}

async function fetchHtml(url) {
  const response = await axios.get(url, {
    timeout: 15000,
    maxRedirects: 5,
    headers: {
      "User-Agent": "Mozilla/5.0 GrandXBot/5.0"
    },
    validateStatus: status => status >= 200 && status < 400
  });

  return response.data;
}

function extractImages(html, baseUrl) {
  const $ = cheerio.load(html);
  const urls = new Set();

  $("img").each((_, el) => {
    for (const attr of [
      "src",
      "data-src",
      "data-original"
    ]) {
      const url = absoluteUrl(
        baseUrl,
        $(el).attr(attr)
      );

      if (url) urls.add(url);
    }
  });

  $(
    'meta[property="og:image"], meta[name="twitter:image"]'
  ).each((_, el) => {
    const url = absoluteUrl(
      baseUrl,
      $(el).attr("content")
    );

    if (url) urls.add(url);
  });

  return [...urls];
}

function extractVideos(html, baseUrl) {
  const $ = cheerio.load(html);
  const urls = new Set();

  $("video").each((_, el) => {
    const direct = absoluteUrl(
      baseUrl,
      $(el).attr("src")
    );

    if (direct) urls.add(direct);

    $(el).find("source").each((__, source) => {
      const url = absoluteUrl(
        baseUrl,
        $(source).attr("src")
      );

      if (url) urls.add(url);
    });
  });

  $(
    'meta[property="og:video"], meta[property="og:video:url"], meta[name="twitter:player:stream"]'
  ).each((_, el) => {
    const url = absoluteUrl(
      baseUrl,
      $(el).attr("content")
    );

    if (url) urls.add(url);
  });

  return [...urls];
}

function randomItem(items) {
  return items[
    Math.floor(Math.random() * items.length)
  ];
}

async function image(msg) {
  if (!imageSites.length) {
    return sendMessage(
      msg.chat.id,
      "🖼️ No image sources are configured yet.\n\nAdd permitted website URLs to:\nsrc/data/imageSites.js"
    );
  }

  const site = randomItem(imageSites);
  const html = await fetchHtml(site);
  const images = extractImages(html, site);

  if (!images.length) {
    return sendMessage(
      msg.chat.id,
      "❌ No directly accessible image was found on the selected page."
    );
  }

  await tg("sendPhoto", {
    chat_id: msg.chat.id,
    photo: randomItem(images),
    caption: `🖼️ Grand X Image\n\nSource: ${site}`
  });
}

async function video(msg) {
  if (!videoSites.length) {
    return sendMessage(
      msg.chat.id,
      "🎬 No video sources are configured yet.\n\nAdd permitted website URLs to:\nsrc/data/videoSites.js"
    );
  }

  const site = randomItem(videoSites);
  const html = await fetchHtml(site);
  const videos = extractVideos(html, site);

  if (!videos.length) {
    return sendMessage(
      msg.chat.id,
      "❌ No directly accessible video was found on the selected page."
    );
  }

  await tg("sendVideo", {
    chat_id: msg.chat.id,
    video: randomItem(videos),
    caption: `🎬 Grand X Video\n\nSource: ${site}`
  });
}

async function welcome(msg) {
  for (const user of msg.new_chat_members || []) {
    if (user.is_bot) continue;

    remember(msg.chat.id, user);

    let photoId = null;

    try {
      const photos = await tg(
        "getUserProfilePhotos",
        {
          user_id: user.id,
          limit: 1
        }
      );

      if (
        photos.total_count &&
        photos.photos?.[0]?.[0]
      ) {
        photoId = photos.photos[0][0].file_id;
      }
    } catch {}

    const caption =
`❤️ <b>Welcome ${esc(displayName(user))}!</b>

Welcome to <b>${esc(msg.chat.title || "our group")}</b> ❤️

🆔 Telegram ID: <code>${user.id}</code>`;

    if (photoId) {
      await tg("sendPhoto", {
        chat_id: msg.chat.id,
        photo: photoId,
        caption,
        parse_mode: "HTML"
      });
    } else {
      await sendMessage(
        msg.chat.id,
        caption,
        { parse_mode: "HTML" }
      );
    }
  }
}

async function callbackQuery(update) {
  const query = update.callback_query;

  if (!query) return;

  await tg(
    "answerCallbackQuery",
    {
      callback_query_id: query.id
    }
  );

  const msg = query.message;

  if (!msg) return;

  switch (query.data) {
    case "start":
      return start(msg);

    case "help":
      return help(msg);

    case "qr_help":
      return qrHelp(msg);

    case "moderation":
      return moderationHelp(msg);

    case "about":
      return about(msg);

    case "ping":
      return ping(msg);

    case "image":
      return image(msg);

    case "video":
      return video(msg);

    default:
      return;
  }
}

async function messageUpdate(update) {
  const msg = update.message;

  if (!msg) return;

  if (msg.from) {
    remember(msg.chat.id, msg.from);
  }

  for (const user of msg.new_chat_members || []) {
    remember(msg.chat.id, user);
  }

  if (msg.new_chat_members?.length) {
    await welcome(msg);
    return;
  }

  if (!msg.text) return;

  const match = msg.text.match(
    /^\/([A-Za-z]+)(?:@\w+)?(?:\s+([\s\S]+))?$/
  );

  if (!match) return;

  const command = match[1].toLowerCase();
  const args = (match[2] || "").trim();

  switch (command) {
    case "start":
      return start(msg);

    case "help":
      return help(msg);

    case "ping":
      return ping(msg);

    case "qr":
      return qr(msg, args);

    case "mute":
      return mute(msg);

    case "all":
      return all(msg);

    case "spam":
      return spam(msg);

    case "image":
      return image(msg);

    case "video":
      return video(msg);
  }
}

module.exports = async function handler(req, res) {
  if (req.method === "GET") {
    return res.status(200).json({
      ok: true,
      service: "Grand X Telegram Bot V5",
      message: "Webhook endpoint is ready for Telegram POST updates."
    });
  }

  if (req.method !== "POST") {
    return res.status(405).json({
      ok: false,
      error: "Method not allowed"
    });
  }

  try {
    if (
      !BOT_TOKEN ||
      BOT_TOKEN === "PASTE_NEW_BOT_TOKEN_HERE"
    ) {
      return res.status(500).json({
        ok: false,
        error: "BOT_TOKEN is not configured."
      });
    }

    if (req.body?.callback_query) {
      await callbackQuery(req.body);
    } else {
      await messageUpdate(req.body);
    }

    return res.status(200).json({
      ok: true
    });
  } catch (error) {
    console.error(
      "Grand X webhook error:",
      error
    );

    return res.status(200).json({
      ok: false,
      error: error.message
    });
  }
};
