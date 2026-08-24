const axios = require("axios");
const { BOT_TOKEN } = require("./config");

const API = `https://api.telegram.org/bot${BOT_TOKEN}`;

const memberCache =
  globalThis.__grandXMembersV8 ||
  (globalThis.__grandXMembersV8 = new Map());

// ==================================================
// INTRO
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
    const text = fs
      .readFileSync(introPath, "utf8")
      .trim();

    if (text) INTRO = text;
  }
} catch (e) {
  console.error(
    "intro.txt:",
    e.message
  );
}

// ==================================================
// BASIC HELPERS
// ==================================================

function esc(v = "") {
  return String(v)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function displayName(u) {
  return (
    [u?.first_name, u?.last_name]
      .filter(Boolean)
      .join(" ") ||
    (u?.username
      ? `@${u.username}`
      : String(u?.id || "User"))
  );
}

function remember(chatId, u) {
  if (!u || u.is_bot) return;

  const key = String(chatId);

  if (!memberCache.has(key)) {
    memberCache.set(
      key,
      new Map()
    );
  }

  memberCache.get(key).set(
    String(u.id),
    {
      id: u.id,
      first_name:
        u.first_name || "",
      last_name:
        u.last_name || "",
      username:
        u.username || ""
    }
  );
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

function sendMessage(
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
// KEYBOARD
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

async function start(m) {
  await sendMessage(
    m.chat.id,
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

async function help(m) {
  await sendMessage(
    m.chat.id,
`🛠️ GRAND X — COMMANDS

🔳 QR

/Qr https://google.com

Example:
/Qr https://youtube.com

🔇 MUTE

Reply to a member and send:

/Mute

⏱️ 10 minutes
👑 Admin/owner only

📢 ALL

/all

👑 Admin/owner only

❤️ SPAM

/Spam

👑 Admin/owner only

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

async function qrHelp(m) {
  await sendMessage(
    m.chat.id,
`🔳 GRAND X — QR CODE

Create a QR code from a web link.

📌 Command:

/Qr LINK

✅ Example:

/Qr https://google.com

The bot creates a high-quality QR with a wide white border.`,
    {
      reply_markup:
        backButton()
    }
  );
}

// ==================================================
// MODERATION HELP
// ==================================================

async function moderationHelp(m) {
  await sendMessage(
    m.chat.id,
`🔇 GRAND X — MODERATION

Reply to the member's message and send:

/Mute

⏱️ Duration: 10 minutes

👑 Only group administrators and the owner can use it.`,
    {
      reply_markup:
        backButton()
    }
  );
}

// ==================================================
// ABOUT
// ==================================================

async function about(m) {
  await sendMessage(
    m.chat.id,
`❤️ GRAND X

Professional Telegram group assistant.

⚡ Vercel Webhook
🔳 QR
🔇 Moderation
📢 Member tools
🖼️ Images
🎬 Videos`,
    {
      reply_markup:
        backButton()
    }
  );
}

// ==================================================
// PING
// ==================================================

async function ping(m) {
  await sendMessage(
    m.chat.id,
    "🏓 Pong!\n\n✅ Grand X is online."
  );
}

// ==================================================
// ADMIN
// ==================================================

async function isAdmin(
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

async function requireAdmin(m) {
  try {
    if (
      m.from &&
      await isAdmin(
        m.chat.id,
        m.from.id
      )
    ) {
      return true;
    }
  } catch (e) {
    console.error(
      "admin:",
      e.message
    );

    await sendMessage(
      m.chat.id,
      "❌ I could not verify your admin status. Make sure Grand X is an administrator."
    );

    return false;
  }

  await sendMessage(
    m.chat.id,
    "⛔ This command is available only to group administrators and the group owner."
  );

  return false;
}

// ==================================================
// QR
// ==================================================

async function qr(
  m,
  link
) {
  if (!link) {
    return qrHelp(m);
  }

  let url;

  try {
    url =
      new URL(link).href;
  } catch {
    return sendMessage(
      m.chat.id,
      "❌ Invalid link.\n\nExample:\n/Qr https://google.com"
    );
  }

  try {
    const QRCode =
      require("qrcode");

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
      String(m.chat.id)
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

    const response =
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

    if (!response.data?.ok) {
      throw new Error(
        response.data?.description ||
          "QR upload failed"
      );
    }

  } catch (e) {
    console.error(
      "QR:",
      e.message
    );

    await sendMessage(
      m.chat.id,
      `❌ QR generation failed.\n\n${e.message}`
    );
  }
}

// ==================================================
// MUTE
// ==================================================

async function mute(m) {
  if (
    !await requireAdmin(m)
  ) {
    return;
  }

  const target =
    m.reply_to_message?.from;

  if (
    !target ||
    target.is_bot
  ) {
    return sendMessage(
      m.chat.id,
      "🔇 Reply to a member's message and send /Mute"
    );
  }

  if (
    target.id ===
    m.from?.id
  ) {
    return sendMessage(
      m.chat.id,
      "❌ You cannot mute yourself."
    );
  }

  try {
    const member =
      await tg(
        "getChatMember",
        {
          chat_id:
            m.chat.id,
          user_id:
            target.id
        }
      );

    if (
      member.status ===
        "creator" ||
      member.status ===
        "administrator"
    ) {
      return sendMessage(
        m.chat.id,
        "❌ This member is an administrator/owner and cannot be muted."
      );
    }

    await tg(
      "restrictChatMember",
      {
        chat_id:
          m.chat.id,
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
      m.chat.id,
      `🔇 ${esc(
        displayName(target)
      )} has been muted for 10 minutes.`,
      {
        parse_mode:
          "HTML"
      }
    );

  } catch (e) {
    await sendMessage(
      m.chat.id,
      `❌ Mute failed.\n\n${e.message}`
    );
  }
}

// ==================================================
// ALL
// ==================================================

async function all(m) {
  if (
    !await requireAdmin(m)
  ) {
    return;
  }

  const members =
    getMembers(
      m.chat.id
    );

  if (!members.length) {
    return sendMessage(
      m.chat.id,
      "📢 I haven't observed any members yet."
    );
  }

  const mentions =
    members.map(
      u =>
        `<a href="tg://user?id=${u.id}">${esc(
          displayName(u)
        )}</a>`
    );

  for (
    let i = 0;
    i < mentions.length;
    i += 20
  ) {
    await sendMessage(
      m.chat.id,
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
// SPAM
// ==================================================

async function spam(m) {
  if (
    !await requireAdmin(m)
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
      m.chat.id,
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
// MEDIA ENGINE V8
//
// IMPORTANT:
// Do NOT rely on the URL extension.
//
// A URL such as:
//
// https://example.com/file?id=123&token=abc
//
// can still be:
// Content-Type: video/mp4
//
// We therefore inspect Content-Type first.
// ==================================================

function absoluteUrl(
  base,
  value
) {
  if (!value) {
    return null;
  }

  try {
    const u =
      new URL(
        value,
        base
      );

    if (
      !/^https?:$/i.test(
        u.protocol
      )
    ) {
      return null;
    }

    return u.href;

  } catch {
    return null;
  }
}

function cleanUrl(value) {
  if (!value) {
    return null;
  }

  return String(value)
    .replace(
      /&amp;/g,
      "&"
    )
    .trim();
}

// ==================================================
// EXTENSION CHECK
// Only used as a fallback.
// ==================================================

function looksLikeImage(
  url
) {
  try {
    const u =
      new URL(url);

    return /\.(jpg|jpeg|png|gif|webp|avif|bmp|svg)$/i
      .test(u.pathname);

  } catch {
    return false;
  }
}

function looksLikeVideo(
  url
) {
  try {
    const u =
      new URL(url);

    return /\.(mp4|webm|mov|m4v|mkv|avi|m3u8)$/i
      .test(u.pathname);

  } catch {
    return false;
  }
}

// ==================================================
// CONTENT TYPE
// ==================================================

function normalizeContentType(
  value
) {
  return String(
    value || ""
  )
    .split(";")[0]
    .trim()
    .toLowerCase();
}

function contentTypeMatches(
  contentType,
  type
) {
  const ct =
    normalizeContentType(
      contentType
    );

  if (
    type === "image"
  ) {
    return ct.startsWith(
      "image/"
    );
  }

  if (
    type === "video"
  ) {
    return (
      ct.startsWith(
        "video/"
      ) ||
      ct ===
        "application/vnd.apple.mpegurl" ||
      ct ===
        "application/x-mpegurl"
    );
  }

  return false;
}

// ==================================================
// DETECT DIRECT MEDIA
//
// HEAD first.
// GET fallback if HEAD is blocked.
// ==================================================

async function detectDirectMedia(
  url
) {
  // ----------------------------
  // HEAD
  // ----------------------------

  try {
    const response =
      await axios.head(
        url,
        {
          timeout: 6000,
          maxRedirects: 8,

          headers: {
            "User-Agent":
              "Mozilla/5.0 GrandXBot/8.0",
            Accept:
              "*/*"
          },

          validateStatus:
            status =>
              status >= 200 &&
              status < 400
        }
      );

    const type =
      normalizeContentType(
        response.headers[
          "content-type"
        ]
      );

    if (
      type.startsWith(
        "image/"
      )
    ) {
      return {
        type: "image",
        contentType: type,
        url:
          response.request
            ?.res
            ?.responseUrl ||
          url
      };
    }

    if (
      type.startsWith(
        "video/"
      ) ||
      type ===
        "application/vnd.apple.mpegurl" ||
      type ===
        "application/x-mpegurl"
    ) {
      return {
        type: "video",
        contentType: type,
        url:
          response.request
            ?.res
            ?.responseUrl ||
          url
      };
    }

  } catch (e) {
    console.log(
      "HEAD unavailable:",
      url
    );
  }

  // ----------------------------
  // GET fallback
  // ----------------------------

  try {
    const response =
      await axios.get(
        url,
        {
          timeout: 7000,
          maxRedirects: 8,

          responseType:
            "stream",

          headers: {
            "User-Agent":
              "Mozilla/5.0 GrandXBot/8.0",
            Accept:
              "*/*",
            Range:
              "bytes=0-1023"
          },

          validateStatus:
            status =>
              status >= 200 &&
              status < 400
        }
      );

    const type =
      normalizeContentType(
        response.headers[
          "content-type"
        ]
      );

    if (
      response.data?.destroy
    ) {
      response.data.destroy();
    }

    if (
      type.startsWith(
        "image/"
      )
    ) {
      return {
        type: "image",
        contentType: type,
        url:
          response.request
            ?.res
            ?.responseUrl ||
          url
      };
    }

    if (
      type.startsWith(
        "video/"
      ) ||
      type ===
        "application/vnd.apple.mpegurl" ||
      type ===
        "application/x-mpegurl"
    ) {
      return {
        type: "video",
        contentType: type,
        url:
          response.request
            ?.res
            ?.responseUrl ||
          url
      };
    }

  } catch (e) {
    console.log(
      "GET media check failed:",
      e.message
    );
  }

  return null;
}

// ==================================================
// FETCH WEBPAGE
// ==================================================

async function fetchPage(
  url
) {
  return axios.get(
    url,
    {
      timeout: 8000,
      maxRedirects: 8,
      responseType: "text",

      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131 Safari/537.36",

        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",

        "Accept-Language":
          "en-US,en;q=0.9"
      },

      validateStatus:
        status =>
          status >= 200 &&
          status < 400
    }
  );
}

// ==================================================
// EXTRACT CANDIDATES
//
// We intentionally DON'T require .jpg/.mp4 here.
// Every candidate gets checked by detectDirectMedia().
// ==================================================

function extractMedia(
  html,
  base,
  type
) {
  const cheerio =
    require("cheerio");

  const $ =
    cheerio.load(html);

  const urls =
    new Set();

  function add(value) {
    const url =
      cleanUrl(
        absoluteUrl(
          base,
          value
        )
      );

    if (!url) {
      return;
    }

    urls.add(url);
  }

  // ----------------------------
  // IMAGE ELEMENTS
  // ----------------------------

  if (
    type === "image"
  ) {
    $("img").each(
      (_, el) => {
        [
          "src",
          "data-src",
          "data-original",
          "data-lazy-src",
          "data-url",
          "data-image",
          "data-original-src"
        ].forEach(
          attribute => {
            add(
              $(el).attr(
                attribute
              )
            );
          }
        );

        const srcset =
          $(el).attr(
            "srcset"
          ) ||
          $(el).attr(
            "data-srcset"
          );

        if (srcset) {
          srcset
            .split(",")
            .forEach(
              item => {
                add(
                  item
                    .trim()
                    .split(
                      /\s+/
                    )[0]
                );
              }
            );
        }
      }
    );

    $(
      'meta[property="og:image"],' +
      'meta[name="twitter:image"],' +
      'meta[name="twitter:image:src"]'
    ).each(
      (_, el) => {
        add(
          $(el).attr(
            "content"
          )
        );
      }
    );

    $(
      'link[rel="image_src"]'
    ).each(
      (_, el) => {
        add(
          $(el).attr("href")
        );
      }
    );
  }

  // ----------------------------
  // VIDEO ELEMENTS
  // ----------------------------

  if (
    type === "video"
  ) {
    $(
      "video"
    ).each(
      (_, el) => {
        add(
          $(el).attr("src")
        );

        add(
          $(el).attr(
            "data-src"
          )
        );
      }
    );

    $(
      "video source, source"
    ).each(
      (_, el) => {
        add(
          $(el).attr("src")
        );
      }
    );

    $(
      'meta[property="og:video"],' +
      'meta[property="og:video:url"],' +
      'meta[name="twitter:player:stream"]'
    ).each(
      (_, el) => {
        add(
          $(el).attr(
            "content"
          )
        );
      }
    );
  }

  // ----------------------------
  // JSON / JAVASCRIPT FALLBACK
  // ----------------------------

  const raw =
    String(html);

  /*
    Find quoted HTTP/HTTPS URLs.
    We don't require a media extension.
    Every candidate will be checked by
    detectDirectMedia().
  */

  const urlRegex =
    /https?:\/\/[^"'\\<>\s]+/g;

  const matches =
    raw.match(
      urlRegex
    ) || [];

  for (
    const match of matches
  ) {
    const cleaned =
      cleanUrl(
        match.replace(
          /[),.;]+$/,
          ""
        )
      );

    if (
      cleaned
    ) {
      urls.add(
        cleaned
      );
    }
  }

  /*
    Remove obvious page/document URLs
    only when they are clearly HTML.
    Media detection still decides the final type.
  */

  return [
    ...urls
  ];
}

// ==================================================
// SOURCE FILES
// ==================================================

function getSources(
  type
) {
  try {
    const file =
      type === "image"
        ? "../src/data/imageSites"
        : "../src/data/videoSites";

    delete require.cache[
      require.resolve(file)
    ];

    const sites =
      require(file);

    if (
      !Array.isArray(
        sites
      )
    ) {
      return [];
    }

    return sites.filter(
      value =>
        typeof value ===
          "string" &&
        /^https?:\/\//i.test(
          value.trim()
        )
    );

  } catch (e) {
    console.error(
      `${type}Sites:`,
      e.message
    );

    return [];
  }
}

// ==================================================
// SEND MEDIA
// ==================================================

async function sendMedia(
  m,
  type,
  url,
  source
) {
  if (
    type === "image"
  ) {
    return tg(
      "sendPhoto",
      {
        chat_id:
          m.chat.id,

        photo: url,

        caption:
          `🖼️ Grand X Image\n\nSource: ${source}`
      }
    );
  }

  return tg(
    "sendVideo",
    {
      chat_id:
        m.chat.id,

      video: url,

      caption:
        `🎬 Grand X Video\n\nSource: ${source}`,

      supports_streaming:
        true
    }
  );
}

// ==================================================
// MEDIA
// ==================================================

async function media(
  m,
  requestedType
) {
  const sources =
    getSources(
      requestedType
    );

  if (
    !sources.length
  ) {
    return sendMessage(
      m.chat.id,
      `${
        requestedType ===
        "image"
          ? "🖼️"
          : "🎬"
      } No ${requestedType} sources are configured yet.\n\nAdd permitted website URLs to:\nsrc/data/${requestedType}Sites.js`
    );
  }

  await sendMessage(
    m.chat.id,
    `${
      requestedType ===
      "image"
        ? "🖼️"
        : "🎬"
    } Searching for a ${requestedType}...`
  );

  const shuffled =
    [...sources].sort(
      () =>
        Math.random() -
        0.5
    );

  /*
    Maximum 6 source pages per command.
  */

  for (
    const source of
      shuffled.slice(
        0,
        6
      )
  ) {
    try {

      // =================================================
      // STEP 1
      // Treat the configured source itself as a possible
      // direct media URL.
      //
      // IMPORTANT:
      // No extension is required.
      // Content-Type decides.
      // =================================================

      const direct =
        await detectDirectMedia(
          source
        );

      if (
        direct &&
        direct.type ===
          requestedType
      ) {
        try {
          await sendMedia(
            m,
            requestedType,
            direct.url ||
              source,
            source
          );

          return;

        } catch (e) {
          console.error(
            "Direct Telegram send failed:",
            e.message
          );
        }
      }

      // =================================================
      // STEP 2
      // Treat source as webpage.
      // =================================================

      const page =
        await fetchPage(
          source
        );

      const finalUrl =
        page.request
          ?.res
          ?.responseUrl ||
        source;

      const candidates =
        extractMedia(
          page.data,
          finalUrl,
          requestedType
        );

      /*
        Try up to 12 candidates from
        each webpage.
      */

      for (
        const candidate of
          candidates.slice(
            0,
            12
          )
      ) {
        try {

          const detected =
            await detectDirectMedia(
              candidate
            );

          /*
            Only send if the server says
            the candidate is actually the
            requested media type.
          */

          if (
            !detected ||
            detected.type !==
              requestedType
          ) {
            continue;
          }

          const mediaUrl =
            detected.url ||
            candidate;

          try {
            await sendMedia(
              m,
              requestedType,
              mediaUrl,
              source
            );

            return;

          } catch (sendError) {
            console.error(
              "Telegram rejected media:",
              sendError.message
            );

            /*
              Try next candidate.
            */
            continue;
          }

        } catch (candidateError) {
          console.error(
            "Candidate check:",
            candidateError.message
          );
        }
      }

    } catch (e) {
      console.error(
        `${requestedType} source failed:`,
        source,
        e.message
      );
    }
  }

  await sendMessage(
    m.chat.id,
    `❌ No usable ${requestedType} was found in the available sources.

The source may require JavaScript, authentication, hotlink permission, or may block server requests.`
  );
}

// ==================================================
// WELCOME
// ==================================================

async function welcome(m) {
  for (
    const user of
      m.new_chat_members ||
      []
  ) {
    if (
      user.is_bot
    ) {
      continue;
    }

    remember(
      m.chat.id,
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

    } catch (e) {
      console.error(
        "profile:",
        e.message
      );
    }

    const caption =
      `❤️ <b>Welcome ${esc(
        displayName(user)
      )}!</b>\n\n` +
      `Welcome to <b>${esc(
        m.chat.title ||
          "our group"
      )}</b> ❤️\n\n` +
      `🆔 Telegram ID: <code>${user.id}</code>`;

    try {
      if (
        photoId
      ) {
        await tg(
          "sendPhoto",
          {
            chat_id:
              m.chat.id,
            photo:
              photoId,
            caption,
            parse_mode:
              "HTML"
          }
        );
      } else {
        await sendMessage(
          m.chat.id,
          caption,
          {
            parse_mode:
              "HTML"
          }
        );
      }

    } catch (e) {
      console.error(
        "welcome:",
        e.message
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
  const q =
    update.callback_query;

  if (!q) {
    return;
  }

  try {
    await tg(
      "answerCallbackQuery",
      {
        callback_query_id:
          q.id
      }
    );
  } catch {}

  const m =
    q.message;

  if (!m) {
    return;
  }

  switch (
    q.data
  ) {
    case "start":
      return start(m);

    case "help":
      return help(m);

    case "qr_help":
      return qrHelp(m);

    case "moderation":
      return moderationHelp(
        m
      );

    case "about":
      return about(m);

    case "ping":
      return ping(m);

    case "image":
      return media(
        m,
        "image"
      );

    case "video":
      return media(
        m,
        "video"
      );

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
  const m =
    update.message;

  if (!m) {
    return;
  }

  if (m.from) {
    remember(
      m.chat.id,
      m.from
    );
  }

  for (
    const user of
      m.new_chat_members ||
      []
  ) {
    remember(
      m.chat.id,
      user
    );
  }

  if (
    m.new_chat_members?.length
  ) {
    return welcome(m);
  }

  if (!m.text) {
    return;
  }

  const match =
    m.text.match(
      /^\/([A-Za-z]+)(?:@\w+)?(?:\s+([\s\S]+))?$/
    );

  if (!match) {
    return;
  }

  const command =
    match[1].toLowerCase();

  const args =
    (
      match[2] ||
      ""
    ).trim();

  switch (
    command
  ) {
    case "start":
      return start(m);

    case "help":
      return help(m);

    case "ping":
      return ping(m);

    case "qr":
      return qr(
        m,
        args
      );

    case "mute":
      return mute(m);

    case "all":
      return all(m);

    case "spam":
      return spam(m);

    case "image":
      return media(
        m,
        "image"
      );

    case "video":
      return media(
        m,
        "video"
      );

    default:
      return;
  }
}

// ==================================================
// VERCEL WEBHOOK
// ==================================================

module.exports =
  async function handler(
    req,
    res
  ) {

    // Browser / health test
    if (
      req.method ===
      "GET"
    ) {
      return res
        .status(200)
        .json({
          ok: true,
          service:
            "Grand X Telegram Bot V8",
          message:
            "Webhook endpoint is ready for Telegram POST updates."
        });
    }

    if (
      req.method !==
      "POST"
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

    } catch (e) {

      console.error(
        "GRAND X WEBHOOK ERROR:",
        e
      );

      /*
        Return HTTP 200 so Telegram
        does not repeatedly retry
        the same update.
      */

      return res
        .status(200)
        .json({
          ok: false,
          error:
            e.message
        });
    }
  };