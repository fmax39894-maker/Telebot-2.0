const axios = require("axios");
const { BOT_TOKEN } = require("./config");

const API = `https://api.telegram.org/bot${BOT_TOKEN}`;

const memberCache =
  globalThis.__grandXMembersV7 ||
  (globalThis.__grandXMembersV7 = new Map());

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
  const p = path.join(process.cwd(), "intro.txt");
  if (fs.existsSync(p)) {
    const text = fs.readFileSync(p, "utf8").trim();
    if (text) INTRO = text;
  }
} catch (e) {
  console.error("intro.txt:", e.message);
}

function esc(v="") {
  return String(v).replace(/&/g,"&amp;").replace(/</g,"&lt;")
    .replace(/>/g,"&gt;").replace(/"/g,"&quot;");
}

function displayName(u) {
  return [u?.first_name,u?.last_name].filter(Boolean).join(" ")
    || (u?.username ? `@${u.username}` : String(u?.id || "User"));
}

function remember(chatId,u) {
  if (!u || u.is_bot) return;
  const k=String(chatId);
  if (!memberCache.has(k)) memberCache.set(k,new Map());
  memberCache.get(k).set(String(u.id),{
    id:u.id, first_name:u.first_name||"", last_name:u.last_name||"",
    username:u.username||""
  });
}

function getMembers(chatId) {
  return [...(memberCache.get(String(chatId))?.values() || [])];
}

async function tg(method,payload={}) {
  if (!BOT_TOKEN || BOT_TOKEN === "PASTE_NEW_BOT_TOKEN_HERE")
    throw new Error("BOT_TOKEN is not configured in api/config.js");

  const r=await axios.post(`${API}/${method}`,payload,{timeout:20000});
  if (!r.data?.ok) throw new Error(r.data?.description || `${method} failed`);
  return r.data.result;
}

function sendMessage(chatId,text,extra={}) {
  return tg("sendMessage",{chat_id:chatId,text,...extra});
}

function mainKeyboard() {
  return {inline_keyboard:[
    [
      {text:"🔳 QR Code",callback_data:"qr_help"},
      {text:"🛠️ Commands",callback_data:"help"}
    ],
    [
      {text:"🔇 Moderation",callback_data:"moderation"},
      {text:"❤️ About",callback_data:"about"}
    ],
    [
      {text:"🖼️ Image",callback_data:"image"},
      {text:"🎬 Video",callback_data:"video"}
    ],
    [{text:"🏓 Ping",callback_data:"ping"}]
  ]};
}

function backButton() {
  return {inline_keyboard:[[{
    text:"⬅️ Main Menu",callback_data:"start"
  }]]};
}

async function start(m) {
  await sendMessage(m.chat.id,INTRO,{reply_markup:mainKeyboard()});
}

async function help(m) {
  await sendMessage(m.chat.id,`🛠️ GRAND X — COMMANDS

🔳 QR
/Qr https://google.com

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
/ping`,{reply_markup:backButton()});
}

async function qrHelp(m) {
  await sendMessage(m.chat.id,`🔳 GRAND X — QR CODE

Use:
/Qr LINK

Example:
/Qr https://google.com

The bot creates a high-quality QR with a wide white border.`,{reply_markup:backButton()});
}

async function moderationHelp(m) {
  await sendMessage(m.chat.id,`🔇 GRAND X — MODERATION

Reply to the member's message and send:
/Mute

⏱️ Duration: 10 minutes

👑 Only administrators and the group owner can use it.`,{reply_markup:backButton()});
}

async function about(m) {
  await sendMessage(m.chat.id,`❤️ GRAND X

Professional Telegram group assistant.

⚡ Vercel Webhook
🔳 QR
🔇 Moderation
📢 Member tools
🖼️ Images
🎬 Videos`,{reply_markup:backButton()});
}

async function ping(m) {
  await sendMessage(m.chat.id,"🏓 Pong!\n\n✅ Grand X is online.");
}

async function isAdmin(chatId,userId) {
  const x=await tg("getChatMember",{chat_id:chatId,user_id:userId});
  return x.status==="creator" || x.status==="administrator";
}

async function requireAdmin(m) {
  try {
    if (m.from && await isAdmin(m.chat.id,m.from.id)) return true;
  } catch(e) {
    console.error("admin:",e.message);
    await sendMessage(m.chat.id,"❌ I could not verify your admin status. Make sure Grand X is an administrator.");
    return false;
  }
  await sendMessage(m.chat.id,"⛔ This command is available only to group administrators and the group owner.");
  return false;
}

async function qr(m,link) {
  if (!link) return qrHelp(m);
  let url;
  try { url=new URL(link).href; } catch {
    return sendMessage(m.chat.id,"❌ Invalid link.\n\nExample:\n/Qr https://google.com");
  }

  try {
    const QRCode=require("qrcode");
    const FormData=require("form-data");
    const buf=await QRCode.toBuffer(url,{
      type:"png",width:1600,margin:14,errorCorrectionLevel:"H",
      color:{dark:"#000000",light:"#FFFFFF"}
    });
    const form=new FormData();
    form.append("chat_id",String(m.chat.id));
    form.append("photo",buf,{filename:"grand-x-qr.png",contentType:"image/png"});
    form.append("caption",`🔳 GRAND X QR CODE\n\n🔗 ${url}`);
    const r=await axios.post(`${API}/sendPhoto`,form,{
      headers:form.getHeaders(),maxBodyLength:Infinity,timeout:20000
    });
    if (!r.data?.ok) throw new Error(r.data?.description || "QR upload failed");
  } catch(e) {
    console.error("qr:",e.message);
    await sendMessage(m.chat.id,`❌ QR generation failed.\n\n${e.message}`);
  }
}

async function mute(m) {
  if (!await requireAdmin(m)) return;
  const target=m.reply_to_message?.from;
  if (!target || target.is_bot)
    return sendMessage(m.chat.id,"🔇 Reply to a member's message and send /Mute");
  if (target.id===m.from?.id)
    return sendMessage(m.chat.id,"❌ You cannot mute yourself.");

  try {
    const tm=await tg("getChatMember",{chat_id:m.chat.id,user_id:target.id});
    if (tm.status==="creator" || tm.status==="administrator")
      return sendMessage(m.chat.id,"❌ This member is an administrator/owner and cannot be muted.");

    await tg("restrictChatMember",{
      chat_id:m.chat.id,user_id:target.id,
      until_date:Math.floor(Date.now()/1000)+600,
      permissions:{
        can_send_messages:false,can_send_audios:false,
        can_send_documents:false,can_send_photos:false,
        can_send_videos:false,can_send_video_notes:false,
        can_send_voice_notes:false,can_send_polls:false,
        can_send_other_messages:false,
        can_add_web_page_previews:false
      }
    });
    await sendMessage(m.chat.id,`🔇 ${esc(displayName(target))} has been muted for 10 minutes.`,{parse_mode:"HTML"});
  } catch(e) {
    await sendMessage(m.chat.id,`❌ Mute failed.\n\n${e.message}`);
  }
}

async function all(m) {
  if (!await requireAdmin(m)) return;
  const members=getMembers(m.chat.id);
  if (!members.length)
    return sendMessage(m.chat.id,"📢 I haven't observed any members yet.");
  const mentions=members.map(u=>`<a href="tg://user?id=${u.id}">${esc(displayName(u))}</a>`);
  for(let i=0;i<mentions.length;i+=20)
    await sendMessage(m.chat.id,"📢 "+mentions.slice(i,i+20).join(" "),{
      parse_mode:"HTML",disable_web_page_preview:true
    });
}

async function spam(m) {
  if (!await requireAdmin(m)) return;
  const e=["❤️","💓","💗","💖","🫀","✨","🔥","💙","💚","💛"];
  for(let i=0;i<5;i++){
    const text=Array.from({length:12},()=>e[Math.floor(Math.random()*e.length)]).join(" ");
    await sendMessage(m.chat.id,text);
    if(i<4) await new Promise(r=>setTimeout(r,700));
  }
}

/* =================================================
   IMPROVED MEDIA ENGINE
   - follows redirects
   - accepts direct image/video URLs
   - extracts img/srcset/og/twitter
   - extracts JSON-like URLs from page source
   - validates candidate media with HEAD/GET
   - tries multiple candidates
   - tries multiple sources
   ================================================= */

function absoluteUrl(base,value) {
  if(!value) return null;
  try {
    const u=new URL(value,base);
    if(!/^https?:$/.test(u.protocol)) return null;
    return u.href;
  } catch { return null; }
}

function cleanUrl(u) {
  if(!u) return null;
  return u.replace(/&amp;/g,"&").trim();
}

function looksLikeImage(u) {
  return /\.(jpe?g|png|gif|webp|bmp|avif)(?:[?#].*)?$/i.test(u);
}

function looksLikeVideo(u) {
  return /\.(mp4|webm|mov|m4v|mkv|avi)(?:[?#].*)?$/i.test(u);
}

async function fetchPage(url) {
  return axios.get(url,{
    timeout:7000,maxRedirects:8,responseType:"text",
    headers:{
      "User-Agent":"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131 Safari/537.36",
      "Accept":"text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
      "Accept-Language":"en-US,en;q=0.9"
    },
    validateStatus:s=>s>=200 && s<400
  });
}

function extractMedia(html,base,type) {
  const cheerio=require("cheerio");
  const $=cheerio.load(html);
  const urls=new Set();

  const add=v=>{
    const u=cleanUrl(absoluteUrl(base,v));
    if(!u) return;
    if(type==="image" && looksLikeImage(u)) urls.add(u);
    if(type==="video" && looksLikeVideo(u)) urls.add(u);
    // Also keep non-extension URLs from known media attributes.
    if(type==="image" && /\.(jpg|jpeg|png|gif|webp|avif|bmp)(?:[?#]|$)/i.test(u)) urls.add(u);
    if(type==="video" && /\.(mp4|webm|mov|m4v|mkv)(?:[?#]|$)/i.test(u)) urls.add(u);
  };

  if(type==="image"){
    $("img").each((_,el)=>{
      ["src","data-src","data-original","data-lazy-src","data-url"].forEach(a=>add($(el).attr(a)));
      const srcset=$(el).attr("srcset") || $(el).attr("data-srcset");
      if(srcset) srcset.split(",").forEach(x=>add(x.trim().split(/\s+/)[0]));
    });
    $('meta[property="og:image"],meta[name="twitter:image"],meta[name="twitter:image:src"]').each((_,el)=>add($(el).attr("content")));
    $("link[rel='image_src']").each((_,el)=>add($(el).attr("href")));
  } else {
    $("video,video source").each((_,el)=>add($(el).attr("src")));
    $("source").each((_,el)=>{
      const t=($(el).attr("type")||"").toLowerCase();
      if(t.includes("video")) add($(el).attr("src"));
    });
    $('meta[property="og:video"],meta[property="og:video:url"],meta[name="twitter:player:stream"]').each((_,el)=>add($(el).attr("content")));
  }

  // Fallback: find absolute media-looking URLs embedded in scripts/JSON.
  const raw=String(html);
  const re=/https?:\/\/[^"'\\\s<>]+/g;
  for(const match of raw.match(re)||[]){
    const u=cleanUrl(match.replace(/[),.;]+$/,""));
    if(type==="image" && looksLikeImage(u)) urls.add(u);
    if(type==="video" && looksLikeVideo(u)) urls.add(u);
  }

  return [...urls];
}

async function isUsableMedia(url,type) {
  try {
    const h=await axios.head(url,{
      timeout:5000,maxRedirects:5,
      headers:{ "User-Agent":"Mozilla/5.0 GrandXBot/7.0" },
      validateStatus:s=>s>=200 && s<400
    });
    const ct=(h.headers["content-type"]||"").toLowerCase();
    if(type==="image" && ct.startsWith("image/")) return true;
    if(type==="video" && ct.startsWith("video/")) return true;
  } catch {}

  // Some servers reject HEAD. Do a small GET instead.
  try {
    const r=await axios.get(url,{
      timeout:6000,maxRedirects:5,responseType:"stream",
      headers:{ "User-Agent":"Mozilla/5.0 GrandXBot/7.0" },
      validateStatus:s=>s>=200 && s<400
    });
    const ct=(r.headers["content-type"]||"").toLowerCase();
    if(r.data?.destroy) r.data.destroy();
    if(type==="image" && ct.startsWith("image/")) return true;
    if(type==="video" && ct.startsWith("video/")) return true;
  } catch {}

  return false;
}

function getSources(type) {
  try {
    const file=type==="image"
      ? "../src/data/imageSites"
      : "../src/data/videoSites";
    delete require.cache[require.resolve(file)];
    const sites=require(file);
    return Array.isArray(sites)
      ? sites.filter(x=>typeof x==="string" && /^https?:\/\//i.test(x))
      : [];
  } catch(e) {
    console.error(`${type}Sites:`,e.message);
    return [];
  }
}

async function media(m,type) {
  const sources=getSources(type);

  if(!sources.length){
    return sendMessage(m.chat.id,
      `${type==="image"?"🖼️":"🎬"} No ${type} sources are configured yet.\n\nAdd permitted website URLs to:\nsrc/data/${type}Sites.js`);
  }

  await sendMessage(m.chat.id,
    `${type==="image"?"🖼️":"🎬"} Searching for a ${type}...`);

  const shuffled=[...sources].sort(()=>Math.random()-0.5);

  // Up to 6 pages, up to 8 candidates per page.
  for(const site of shuffled.slice(0,6)){
    try {
      // Direct media URL can be used without scraping.
      const direct=type==="image" ? looksLikeImage(site) : looksLikeVideo(site);
      if(direct && await isUsableMedia(site,type)){
        return await sendMedia(m,type,site,site);
      }

      const page=await fetchPage(site);
      const finalUrl=page.request?.res?.responseUrl || site;
      const candidates=extractMedia(page.data,finalUrl,type);

      for(const candidate of candidates.slice(0,8)){
        if(await isUsableMedia(candidate,type)){
          try {
            await sendMedia(m,type,candidate,site);
            return;
          } catch(e) {
            console.error("Telegram media send failed:",e.message);
          }
        }
      }
    } catch(e) {
      console.error(`${type} source failed:`,site,e.message);
    }
  }

  await sendMessage(m.chat.id,
    `❌ No usable ${type} was found in the available sources.\n\nTry a public page with directly accessible media, or a direct ${type} URL.`);
}

async function sendMedia(m,type,url,source) {
  if(type==="image"){
    return tg("sendPhoto",{
      chat_id:m.chat.id,
      photo:url,
      caption:`🖼️ Grand X Image\n\nSource: ${source}`
    });
  }

  return tg("sendVideo",{
    chat_id:m.chat.id,
    video:url,
    caption:`🎬 Grand X Video\n\nSource: ${source}`
  });
}

async function welcome(m) {
  for(const user of m.new_chat_members||[]){
    if(user.is_bot) continue;
    remember(m.chat.id,user);

    let photoId=null;
    try {
      const p=await tg("getUserProfilePhotos",{user_id:user.id,limit:1});
      if(p.total_count && p.photos?.[0]?.[0]) photoId=p.photos[0][0].file_id;
    } catch(e) {
      console.error("profile:",e.message);
    }

    const caption=`❤️ <b>Welcome ${esc(displayName(user))}!</b>\n\n`+
      `Welcome to <b>${esc(m.chat.title||"our group")}</b> ❤️\n\n`+
      `🆔 Telegram ID: <code>${user.id}</code>`;

    try {
      if(photoId) await tg("sendPhoto",{chat_id:m.chat.id,photo:photoId,caption,parse_mode:"HTML"});
      else await sendMessage(m.chat.id,caption,{parse_mode:"HTML"});
    } catch(e) {
      console.error("welcome:",e.message);
    }
  }
}

async function callbackQuery(update) {
  const q=update.callback_query;
  if(!q) return;

  try { await tg("answerCallbackQuery",{callback_query_id:q.id}); } catch {}

  const m=q.message;
  if(!m) return;

  switch(q.data){
    case "start": return start(m);
    case "help": return help(m);
    case "qr_help": return qrHelp(m);
    case "moderation": return moderationHelp(m);
    case "about": return about(m);
    case "ping": return ping(m);
    case "image": return media(m,"image");
    case "video": return media(m,"video");
  }
}

async function messageUpdate(update) {
  const m=update.message;
  if(!m) return;

  if(m.from) remember(m.chat.id,m.from);
  for(const u of m.new_chat_members||[]) remember(m.chat.id,u);

  if(m.new_chat_members?.length) return welcome(m);
  if(!m.text) return;

  const match=m.text.match(/^\/([A-Za-z]+)(?:@\w+)?(?:\s+([\s\S]+))?$/);
  if(!match) return;

  const cmd=match[1].toLowerCase();
  const args=(match[2]||"").trim();

  switch(cmd){
    case "start": return start(m);
    case "help": return help(m);
    case "ping": return ping(m);
    case "qr": return qr(m,args);
    case "mute": return mute(m);
    case "all": return all(m);
    case "spam": return spam(m);
    case "image": return media(m,"image");
    case "video": return media(m,"video");
  }
}

module.exports=async function handler(req,res) {
  if(req.method==="GET"){
    return res.status(200).json({
      ok:true,
      service:"Grand X Telegram Bot V7",
      message:"Webhook endpoint is ready for Telegram POST updates."
    });
  }

  if(req.method!=="POST"){
    return res.status(405).json({ok:false,error:"Method not allowed"});
  }

  try {
    if(!BOT_TOKEN || BOT_TOKEN==="PASTE_NEW_BOT_TOKEN_HERE"){
      return res.status(500).json({ok:false,error:"BOT_TOKEN is not configured in api/config.js"});
    }

    const update=req.body||{};
    if(update.callback_query) await callbackQuery(update);
    else if(update.message) await messageUpdate(update);

    return res.status(200).json({ok:true});
  } catch(e) {
    console.error("GRAND X WEBHOOK ERROR:",e);
    return res.status(200).json({ok:false,error:e.message});
  }
};
