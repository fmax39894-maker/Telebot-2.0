const axios = require("axios");

const { BOT_TOKEN } = require("./config");

const API = `https://api.telegram.org/bot${BOT_TOKEN}`;

// ==================================================
// GRAND X TELEGRAM BOT
// Stable Vercel Webhook
// ==================================================

const memberCache =
  globalThis.__grandXMembersV6 ||
  (globalThis.__grandXMembersV6 = new Map());

// ==================================================
// SAFE INTRO
// ==================================================

let INTRO = `❤️ GRAND X

Welcome! I'm Grand X, your Telegram group assistant.

🔳 QR Code
🔇 Moderation
📢 Member tools
🖼️ Image
🎬 Video
🏓 Ping

Type /help to see all commands.`;

try {
  const fs = require("fs");
  const path = require("path");

  const introPath = path.join(
    process.cwd(),
    "intro.txt"
  );

  if (fs.existsSync(introPath)) {
    const customIntro = fs
      .readFileSync(introPath, "utf8")
      .trim();

    if (customIntro) {
      INTRO = customIntro;
    }
  }
} catch (error) {
  console.error(
    "intro.txt load error:",
    error.message
  );
}

// ==================================================
// BASIC HELPERS
// ==================================================

function esc(value = "") {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function displayName(user) {
  if (!user) return "User";

  return (
    [user.first_name, user.last_name]
      .filter(Boolean)
      .join(" ") ||
    (user.username
      ? `@${user.username}`
      : String(user.id))
  );
}

function remember(chatId, user) {
  if (!user || user.is_bot) return;

  const key = String(chatId);

  if (!memberCache.has(key)) {
    memberCache.set(
      key,
      new Map()
    );
  }

  memberCache
    .get(key)
    .set(String(user.id), {
      id: user.id,
      first_name:
        user.first_name || "",
      last_name:
        user.last_name || "",
      username:
        user.username || ""
    });
}

function getMembers(chatId) {
  return [
    ...(memberCache
      .get(String(chatId))
      ?.values() || [])
  ];
}

// ==================================================
// TELEGRAM API
// ==================================================

async function tg(
  method,
  payload = {}
) {
  if (
    !BOT_TOKEN ||
    BOT_TOKEN ===
      "PASTE_NEW_BOT_TOKEN_HERE"
  ) {
    throw new Error(
      "BOT_TOKEN is not configured in api/config.js"
    );
  }

  const response =
    await axios.post(
      `${API}/${method}`,
      payload,
      {
        timeout: 20000
      }
    );

  if (!response.data?.ok) {
    throw new Error(
      response.data?.description ||
        `${method} failed`
    );
  }

  return response.data.result;
}

async function sendMessage(
  chatId,
  text,
  extra = {}
) {
  return tg(
    "sendMessage",
    {
      chat_id: chatId,
      text,
      ...extra
    }
  );
}

// ==================================================
// BUTTONS
// ==================================================

function mainKeyboard() {
  return {
    inline_keyboard: [
      [
        {
          text: "🔳 QR Code",
          callback_data:
            "qr_help"
        },
        {
          text: "🛠️ Commands",
          callback_data:
            "help"
        }
      ],
      [
        {
          text: "🔇 Moderation",
          callback_data:
            "moderation"
        },
        {
          text: "❤️ About",
          callback_data:
            "about"
        }
      ],
      [
        {
          text: "🖼️ Image",
          callback_data:
            "image"
        },
        {
          text: "🎬 Video",
          callback_data:
            "video"
        }
      ],
      [
        {
          text: "🏓 Ping",
          callback_data:
            "ping"
        }
      ]
    ]
  };
}

function backButton() {
  return {
    inline_keyboard: [
      [
        {
          text: "⬅️ Main Menu",
          callback_data:
            "start"
        }
      ]
    ]
  };
}

// ==================================================
// START
// ==================================================

async function start(msg) {
  await sendMessage(
    msg.chat.id,
    INTRO,
    {
      reply_markup:
        mainKeyboard()
    }
  );
}

// ==================================================
// HELP
// ==================================================

async function help(msg) {
  await sendMessage(
    msg.chat.id,
`🛠️ GRAND X — COMMANDS

🔳 QR CODE

/Qr https://google.com

Example:
/Qr https://youtube.com

Creates a high-quality QR image with a wide white border.

🔇 MUTE

Reply to a member's message and send:

/Mute

⏱️ Duration: 10 minutes

👑 Only group administrators and the owner can use this command.

📢 ALL

/all

👑 Admin/owner only.

❤️ SPAM

/Spam

👑 Admin/owner only.

🖼️ IMAGE

/Image

🎬 VIDEO

/Video

🏓 STATUS

/ping`,
    {
      reply_markup:
        backButton()
    }
  );
}

// ==================================================
// QR HELP
// ==================================================

async function qrHelp(msg) {
  await sendMessage(
    msg.chat.id,
`🔳 GRAND X — QR CODE

Create a QR code from any web link.

📌 Command:

/Qr LINK

✅ Example:

/Qr https://google.com

Another example:

/Qr https://youtube.com

The QR image has a wide white scanning border.`,
    {
      reply_markup:
        backButton()
    }
  );
}

// ==================================================
// MODERATION HELP
// ==================================================

async function moderationHelp(
  msg
) {
  await sendMessage(
    msg.chat.id,
`🔇 GRAND X — MODERATION

👑 ADMIN / OWNER ONLY

To mute a member:

1️⃣ Reply to their message.

2️⃣ Send:

/Mute

⏱️ Duration: 10 minutes

The bot must have permission to restrict members.`,
    {
      reply_markup:
        backButton()
    }
  );
}

// ==================================================
// ABOUT
// ==================================================

async function about(msg) {
  await sendMessage(
    msg.chat.id,
`❤️ GRAND X

Professional Telegram group assistant.

⚡ Vercel Webhook
🔳 QR Generator
🔇 Moderation
📢 Member Tools
🖼️ Image Module
🎬 Video Module`,
    {
      reply_markup:
        backButton()
    }
  );
}

// ==================================================
// PING
// ==================================================

async function ping(msg) {
  await sendMessage(
    msg.chat.id,
    "🏓 Pong!\n\n✅ Grand X is online."
  );
}

// ==================================================
// ADMIN CHECK
// ==================================================

async function isAdminOrOwner(
  chatId,
  userId
) {
  const member =
    await tg(
      "getChatMember",
      {
        chat_id: chatId,
        user_id: userId
      }
    );

  return (
    member.status ===
      "creator" ||
    member.status ===
      "administrator"
  );
}

async function requireAdminOrOwner(
  msg
) {
  if (!msg.from) {
    return false;
  }

  try {
    if (
      await isAdminOrOwner(
        msg.chat.id,
        msg.from.id
      )
    ) {
      return true;
    }
  } catch (error) {
    console.error(
      "Admin check error:",
      error.message
    );

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

// ==================================================
// QR CODE
// ==================================================

async function qr(
  msg,
  link
) {
  if (!link) {
    return qrHelp(msg);
  }

  let url;

  try {
    url =
      new URL(link).href;
  } catch {
    return sendMessage(
      msg.chat.id,
      "❌ Invalid link.\n\nExample:\n/Qr https://google.com"
    );
  }

  try {
    // Lazy-load QRCode
    const QRCode =
      require("qrcode");

    // Lazy-load FormData
    const FormData =
      require("form-data");

    const buffer =
      await QRCode.toBuffer(
        url,
        {
          type: "png",
          width: 1600,
          margin: 14,
          errorCorrectionLevel:
            "H",
          color: {
            dark: "#000000",
            light: "#FFFFFF"
          }
        }
      );

    const form =
      new FormData();

    form.append(
      "chat_id",
      String(msg.chat.id)
    );

    form.append(
      "photo",
      buffer,
      {
        filename:
          "grand-x-qr.png",
        contentType:
          "image/png"
      }
    );

    form.append(
      "caption",
      `🔳 GRAND X QR CODE\n\n🔗 ${url}`
    );

    const result =
      await axios.post(
        `${API}/sendPhoto`,
        form,
        {
          headers:
            form.getHeaders(),
          maxBodyLength:
            Infinity,
          timeout: 20000
        }
      );

    if (!result.data?.ok) {
      throw new Error(
        result.data?.description ||
          "QR upload failed"
      );
    }
  } catch (error) {
    console.error(
      "QR error:",
      error.message
    );

    await sendMessage(
      msg.chat.id,
      `❌ QR generation failed.\n\n${error.message}`
    );
  }
}

// ==================================================
// MUTE
// ==================================================

async function mute(msg) {
  if (
    !await requireAdminOrOwner(
      msg
    )
  ) {
    return;
  }

  const target =
    msg.reply_to_message?.from;

  if (
    !target ||
    target.is_bot
  ) {
    return sendMessage(
      msg.chat.id,
      "🔇 To mute a member:\n\n1️⃣ Reply to their message.\n2️⃣ Send /Mute"
    );
  }

  if (
    target.id ===
    msg.from?.id
  ) {
    return sendMessage(
      msg.chat.id,
      "❌ You cannot mute yourself."
    );
  }

  try {
    const targetMember =
      await tg(
        "getChatMember",
        {
          chat_id:
            msg.chat.id,
          user_id:
            target.id
        }
      );

    if (
      targetMember.status ===
        "creator" ||
      targetMember.status ===
        "administrator"
    ) {
      return sendMessage(
        msg.chat.id,
        "❌ This member is an administrator/owner and cannot be muted by this bot."
      );
    }

    await tg(
      "restrictChatMember",
      {
        chat_id:
          msg.chat.id,

        user_id:
          target.id,

        until_date:
          Math.floor(
            Date.now() / 1000
          ) + 600,

        permissions: {
          can_send_messages:
            false,
          can_send_audios:
            false,
          can_send_documents:
            false,
          can_send_photos:
            false,
          can_send_videos:
            false,
          can_send_video_notes:
            false,
          can_send_voice_notes:
            false,
          can_send_polls:
            false,
          can_send_other_messages:
            false,
          can_add_web_page_previews:
            false
        }
      }
    );

    await sendMessage(
      msg.chat.id,
      `🔇 ${esc(
        displayName(target)
      )} has been muted for 10 minutes.`,
      {
        parse_mode:
          "HTML"
      }
    );
  } catch (error) {
    console.error(
      "Mute error:",
      error.message
    );

    await sendMessage(
      msg.chat.id,
      `❌ Mute failed.\n\n${error.message}`
    );
  }
}

// ==================================================
// ALL
// ==================================================

async function all(msg) {
  if (
    !await requireAdminOrOwner(
      msg
    )
  ) {
    return;
  }

  const members =
    getMembers(
      msg.chat.id
    );

  if (!members.length) {
    return sendMessage(
      msg.chat.id,
      "📢 I haven't observed any members yet."
    );
  }

  const mentions =
    members.map(
      user =>
        `<a href="tg://user?id=${user.id}">${esc(
          displayName(user)
        )}</a>`
    );

  for (
    let i = 0;
    i < mentions.length;
    i += 20
  ) {
    await sendMessage(
      msg.chat.id,
      "📢 " +
        mentions
          .slice(i, i + 20)
          .join(" "),
      {
        parse_mode:
          "HTML",
        disable_web_page_preview:
          true
      }
    );
  }
}

// ==================================================
// CONTROLLED EMOJI TEST
// ==================================================

async function spam(msg) {
  if (
    !await requireAdminOrOwner(
      msg
    )
  ) {
    return;
  }

  const emojis = [
    "❤️",
    "💓",
    "💗",
    "💖",
    "🫀",
    "✨",
    "🔥",
    "💙",
    "💚",
    "💛"
  ];

  for (
    let i = 0;
    i < 5;
    i++
  ) {
    const text =
      Array.from(
        { length: 12 },
        () =>
          emojis[
            Math.floor(
              Math.random() *
                emojis.length
            )
          ]
      ).join(" ");

    await sendMessage(
      msg.chat.id,
      text
    );

    if (i < 4) {
      await new Promise(
        resolve =>
          setTimeout(
            resolve,
            700
          )
      );
    }
  }
}

// ==================================================
// MEDIA HELPERS
// ==================================================

function absoluteUrl(
  base,
  value
) {
  if (!value) {
    return null;
  }

  try {
    return new URL(
      value,
      base
    ).href;
  } catch {
    return null;
  }
}

async function fetchHtml(url) {
  const response =
    await axios.get(
      url,
      {
        timeout: 7000,
        maxRedirects: 5,

        headers: {
          "User-Agent":
            "Mozilla/5.0 GrandXBot/6.0"
        },

        validateStatus:
          status =>
            status >= 200 &&
            status < 400
      }
    );

  return response.data;
}

// ==================================================
// IMAGE EXTRACTION
// ==================================================

function extractImages(
  html,
  baseUrl
) {
  // Lazy-load cheerio
  const cheerio =
    require("cheerio");

  const $ =
    cheerio.load(html);

  const urls =
    new Set();

  $("img").each(
    (_, el) => {
      for (
        const attr of [
          "src",
          "data-src",
          "data-original",
          "data-lazy-src"
        ]
      ) {
        const url =
          absoluteUrl(
            baseUrl,
            $(el).attr(attr)
          );

        if (url) {
          urls.add(url);
        }
      }
    }
  );

  $(
    'meta[property="og:image"], meta[name="twitter:image"]'
  ).each(
    (_, el) => {
      const url =
        absoluteUrl(
          baseUrl,
          $(el).attr(
            "content"
          )
        );

      if (url) {
        urls.add(url);
      }
    }
  );

  return [
    ...urls
  ];
}

// ==================================================
// VIDEO EXTRACTION
// ==================================================

function extractVideos(
  html,
  baseUrl
) {
  const cheerio =
    require("cheerio");

  const $ =
    cheerio.load(html);

  const urls =
    new Set();

  $("video").each(
    (_, el) => {
      const direct =
        absoluteUrl(
          baseUrl,
          $(el).attr(
            "src"
          )
        );

      if (direct) {
        urls.add(direct);
      }

      $(el)
        .find("source")
        .each(
          (__, source) => {
            const url =
              absoluteUrl(
                baseUrl,
                $(source).attr(
                  "src"
                )
              );

            if (url) {
              urls.add(url);
            }
          }
        );
    }
  );

  $(
    'meta[property="og:video"], meta[property="og:video:url"], meta[name="twitter:player:stream"]'
  ).each(
    (_, el) => {
      const url =
        absoluteUrl(
          baseUrl,
          $(el).attr(
            "content"
          )
        );

      if (url) {
        urls.add(url);
      }
    }
  );

  return [
    ...urls
  ];
}

function randomItem(
  list
) {
  return list[
    Math.floor(
      Math.random() *
        list.length
    )
  ];
}

function shuffled(
  list
) {
  return [
    ...list
  ].sort(
    () =>
      Math.random() -
      0.5
  );
}

// ==================================================
// LOAD MEDIA SOURCE FILES SAFELY
// ==================================================

function getImageSites() {
  try {
    const sites =
      require(
        "../src/data/imageSites"
      );

    return Array.isArray(sites)
      ? sites
      : [];
  } catch (error) {
    console.error(
      "imageSites load error:",
      error.message
    );

    return [];
  }
}

function getVideoSites() {
  try {
    const sites =
      require(
        "../src/data/videoSites"
      );

    return Array.isArray(sites)
      ? sites
      : [];
  } catch (error) {
    console.error(
      "videoSites load error:",
      error.message
    );

    return [];
  }
}

// ==================================================
// IMAGE
// ==================================================

async function image(msg) {
  const imageSites =
    getImageSites();

  if (!imageSites.length) {
    return sendMessage(
      msg.chat.id,
      "🖼️ No image sources are configured yet.\n\nAdd permitted website URLs to:\nsrc/data/imageSites.js"
    );
  }

  const sources =
    shuffled(
      imageSites
    );

  await sendMessage(
    msg.chat.id,
    "🖼️ Searching for an image..."
  );

  const maxAttempts =
    Math.min(
      sources.length,
      8
    );

  for (
    let i = 0;
    i < maxAttempts;
    i++
  ) {
    const site =
      sources[i];

    try {
      const html =
        await fetchHtml(
          site
        );

      const images =
        extractImages(
          html,
          site
        );

      if (!images.length) {
        console.log(
          "No image found:",
          site
        );

        continue;
      }

      await tg(
        "sendPhoto",
        {
          chat_id:
            msg.chat.id,

          photo:
            randomItem(
              images
            ),

          caption:
            `🖼️ Grand X Image\n\nSource: ${site}`
        }
      );

      return;

    } catch (error) {
      console.error(
        "Image source failed:",
        site,
        error.message
      );
    }
  }

  await sendMessage(
    msg.chat.id,
    "❌ No usable image was found in the available sources."
  );
}

// ==================================================
// VIDEO
// ==================================================

async function video(msg) {
  const videoSites =
    getVideoSites();

  if (!videoSites.length) {
    return sendMessage(
      msg.chat.id,
      "🎬 No video sources are configured yet.\n\nAdd permitted website URLs to:\nsrc/data/videoSites.js"
    );
  }

  const sources =
    shuffled(
      videoSites
    );

  await sendMessage(
    msg.chat.id,
    "🎬 Searching for a video..."
  );

  const maxAttempts =
    Math.min(
      sources.length,
      8
    );

  for (
    let i = 0;
    i < maxAttempts;
    i++
  ) {
    const site =
      sources[i];

    try {
      const html =
        await fetchHtml(
          site
        );

      const videos =
        extractVideos(
          html,
          site
        );

      if (!videos.length) {
        console.log(
          "No video found:",
          site
        );

        continue;
      }

      await tg(
        "sendVideo",
        {
          chat_id:
            msg.chat.id,

          video:
            randomItem(
              videos
            ),

          caption:
            `🎬 Grand X Video\n\nSource: ${site}`
        }
      );

      return;

    } catch (error) {
      console.error(
        "Video source failed:",
        site,
        error.message
      );
    }
  }

  await sendMessage(
    msg.chat.id,
    "❌ No usable video was found in the available sources."
  );
}

// ==================================================
// WELCOME
// ==================================================

async function welcome(msg) {
  for (
    const user of
      msg.new_chat_members ||
      []
  ) {
    if (user.is_bot) {
      continue;
    }

    remember(
      msg.chat.id,
      user
    );

    let photoId =
      null;

    try {
      const photos =
        await tg(
          "getUserProfilePhotos",
          {
            user_id:
              user.id,
            limit: 1
          }
        );

      if (
        photos.total_count &&
        photos.photos?.[0]?.[0]
      ) {
        photoId =
          photos
            .photos[0][0]
            .file_id;
      }

    } catch (error) {
      console.error(
        "Profile photo error:",
        error.message
      );
    }

    const caption =
      `❤️ <b>Welcome ${esc(
        displayName(user)
      )}!</b>\n\n` +
      `Welcome to <b>${esc(
        msg.chat.title ||
          "our group"
      )}</b> ❤️\n\n` +
      `🆔 Telegram ID: <code>${user.id}</code>`;

    try {
      if (photoId) {
        await tg(
          "sendPhoto",
          {
            chat_id:
              msg.chat.id,
            photo:
              photoId,
            caption,
            parse_mode:
              "HTML"
          }
        );
      } else {
        await sendMessage(
          msg.chat.id,
          caption,
          {
            parse_mode:
              "HTML"
          }
        );
      }
    } catch (error) {
      console.error(
        "Welcome error:",
        error.message
      );
    }
  }
}

// ==================================================
// CALLBACK QUERY
// ==================================================

async function callbackQuery(
  update
) {
  const query =
    update.callback_query;

  if (!query) {
    return;
  }

  try {
    await tg(
      "answerCallbackQuery",
      {
        callback_query_id:
          query.id
      }
    );
  } catch (error) {
    console.error(
      "Callback error:",
      error.message
    );
  }

  const msg =
    query.message;

  if (!msg) {
    return;
  }

  switch (
    query.data
  ) {
    case "start":
      return start(msg);

    case "help":
      return help(msg);

    case "qr_help":
      return qrHelp(msg);

    case "moderation":
      return moderationHelp(
        msg
      );

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

// ==================================================
// MESSAGE UPDATE
// ==================================================

async function messageUpdate(
  update
) {
  const msg =
    update.message;

  if (!msg) {
    return;
  }

  if (msg.from) {
    remember(
      msg.chat.id,
      msg.from
    );
  }

  for (
    const user of
      msg.new_chat_members ||
      []
  ) {
    remember(
      msg.chat.id,
      user
    );
  }

  if (
    msg.new_chat_members?.length
  ) {
    return welcome(msg);
  }

  if (!msg.text) {
    return;
  }

  const match =
    msg.text.match(
      /^\/([A-Za-z]+)(?:@\w+)?(?:\s+([\s\S]+))?$/
    );

  if (!match) {
    return;
  }

  const command =
    match[1].toLowerCase();

  const args =
    (match[2] || "")
      .trim();

  switch (command) {
    case "start":
      return start(msg);

    case "help":
      return help(msg);

    case "ping":
      return ping(msg);

    case "qr":
      return qr(
        msg,
        args
      );

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

    default:
      return;
  }
}

// ==================================================
// VERCEL HANDLER
// ==================================================

module.exports =
  async function handler(
    req,
    res
  ) {

    // GET = browser/webhook test
    if (
      req.method === "GET"
    ) {
      return res
        .status(200)
        .json({
          ok: true,
          service:
            "Grand X Telegram Bot V6",
          message:
            "Webhook endpoint is ready for Telegram POST updates."
        });
    }

    if (
      req.method !== "POST"
    ) {
      return res
        .status(405)
        .json({
          ok: false,
          error:
            "Method not allowed"
        });
    }

    try {
      if (
        !BOT_TOKEN ||
        BOT_TOKEN ===
          "PASTE_NEW_BOT_TOKEN_HERE"
      ) {
        return res
          .status(500)
          .json({
            ok: false,
            error:
              "BOT_TOKEN is not configured in api/config.js"
          });
      }

      const update =
        req.body || {};

      if (
        update.callback_query
      ) {
        await callbackQuery(
          update
        );
      } else if (
        update.message
      ) {
        await messageUpdate(
          update
        );
      }

      return res
        .status(200)
        .json({
          ok: true
        });

    } catch (error) {
      console.error(
        "GRAND X WEBHOOK ERROR:",
        error
      );

      // Return 200 so Telegram does not
      // repeatedly retry a broken update.

      return res
        .status(200)
        .json({
          ok: false,
          error:
            error.message
        });
    }
  };