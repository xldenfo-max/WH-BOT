const { 
    makeWASocket, 
    useMultiFileAuthState, 
    DisconnectReason,
    fetchLatestBaileysVersion,
    getContentType
} = require('@whiskeysockets/baileys');
const { Boom } = require('@hapi/boom');
const { File } = require('megajs')
const pino = require('pino');
const path = require('path');
const fs = require('fs');
const fetch = require('node-fetch');
const axios = require('axios');
const os = require('os');
const { exec } = require('child_process');

const config = require('./config.js');

const express = require("express")
const app = express()
const port = process.env.PORT || 9090

// CREATE SESSION ID SAVR FOLDER
const SESSION_DIR = 'auth_info_baileys';
if (!fs.existsSync("./" + SESSION_DIR)) {
        fs.mkdirSync("./" + SESSION_DIR, { recursive: true });
        console.log("📂 Created session id save folder");
}

// SESSION ID DOWNLOAD PATH BASE64, MEGA
const sessionFilePath = path.join(__dirname, SESSION_DIR, 'creds.json');

// Fixed Session ID logic: Check if it starts with the name before splitting
const sessionIdSandipa = config.SESSION_ID.startsWith(config.SESSION_NAME) 
    ? config.SESSION_ID.split(config.SESSION_NAME)[1] 
    : config.SESSION_ID;

if (!fs.existsSync(sessionFilePath)) {
    if (!config.SESSION_ID) {
        console.log("┌─────────────────────────┐");
        console.log("│ PLEASE ADD YOUR SESSION ID 😒");
        console.log("└─────────────────────────┘")
    }
    
    // Mega, base64 session id working
    (async () => {
        try {
            console.log("📥 Downloading your session id");
            if (/^[A-Za-z0-9+/=]+$/.test(sessionIdSandipa) && sessionIdSandipa.length > 100) {
                const decodedData = Buffer.from(sessionIdSandipa, 'base64').toString('utf-8');
                const sessionData = JSON.parse(decodedData);
                await fs.promises.writeFile(sessionFilePath, JSON.stringify(sessionData, null, 2));
            } else if (sessionIdSandipa.includes("#")) {
                const [fileId, key] = sessionIdSandipa.split('#');
                const fileUrl = `https://mega.nz/file/${fileId}#${key}`;
                const filer = File.fromURL(fileUrl);
                filer.download((err, data) => {
                    if(err) throw err
                    fs.writeFileSync(sessionFilePath, data);
                })
            }
            console.log("✅ Session id downloaded");
        } catch (sesse) {
            console.error("❌ Sesssion id download error: " + sesse)
        }
        
    })();
};
// ==========

let socket;

async function connectToWhatsappTharusha() {
  try {
      console.log("⏳ Connecting to whatsapp...");
      
      const { state, saveCreds } = await useMultiFileAuthState(__dirname + '/auth_info_baileys/');
      const { version } = await fetchLatestBaileysVersion()
      
      socket = makeWASocket({
          auth: state,
          printQRInTerminal: false,
          logger: pino({ level: 'silent' })
      });
      
      socket.ev.on("connection.update", async (sandipa) => {
          const { connection, lastDisconnect } = sandipa;
          
          if (connection === 'close') {
              const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut
              if (shouldReconnect) {
                  await connectToWhatsappTharusha()
              }
          } else if (connection === 'open') {
              console.log("┌───────────────────┐");
              console.log("│ BOT CONNECTED TO WA ✅");
              console.log("│ creator: @Tharusha-Sandipa");
              console.log("└───────────────────┘");
              socket.sendMessage(socket.user.id, { image: { url: config.LOGO }, caption: `✅ *Hᴇʟʟᴏ ʙᴏᴛ ꜱᴜᴄᴄᴇꜱꜱꜰᴜʟʟʏ ᴄᴏɴɴᴇᴄᴛᴇᴅ!*` });
          }
      });
      
      socket.ev.on('creds.update', saveCreds);
      
      socket.ev.on("messages.upsert", async (tharusha) => {
          const msg = tharusha.messages[0];
          if (!msg.message) return;
          
          const from = msg.key.remoteJid;
          const type = getContentType(msg.message);
          const body = (type === 'conversation') ? msg.message.conversation : (type === 'extendedTextMessage') ? msg.message.extendedTextMessage.text : (type == 'imageMessage') && msg.message.imageMessage.caption ? msg.message.imageMessage.caption : (type == 'videoMessage') && msg.message.videoMessage.caption ? msg.message.videoMessage.caption : '';
          const quoted = type == 'extendedTextMessage' && msg.message.extendedTextMessage.contextInfo != null ? msg.message.extendedTextMessage.contextInfo.quotedMessage || [] : [];
          const args = body.trim().split(/ +/).slice(1)
          const query = args.join(' ')
          const prefix = config.PREFIX || ".";
          const isCmd = body.startsWith(prefix);
          const command = isCmd ? body.slice(prefix.length).trim().split(' ')[0].toLowerCase() : "";
          
          switch (command) {
              // Menu Command
              case 'list':
              case 'menu': {
                  try {
                      await socket.sendMessage(from, { react: { text: "📂", key: msg.key}});
                      
                      const data = fs.readFileSync('./commandslist.json', 'utf8');
                      const categories = JSON.parse(data);
                      
                      let menuMsg = "*📜 `WHATSAPP BOT COMMAND LIST`*\n\n";
                      
                      for (const category in categories) {
                          menuMsg += `*┌─ ❛❛${category} COMMANDS❟❟ ───┐*\n*│*\n`;
                          
                          categories[category].forEach(cmd => {
                              menuMsg += `*│📍 \`ηαмє:\` ${prefix}${cmd.name}*\n*│📄 \`∂єѕ¢яιρтιση:\` ${cmd.description}*\n*│*\n`;
                          });
                          menuMsg += "*└──────────────┘*\n\n";
                      }
                      
                      menuMsg += `${config.FOOTER}`
                      
                      await socket.sendMessage(from, {text: menuMsg}, {quoted: msg});
                      
                  } catch (menue) {
                      console.error("❌ Menu command error: " + menue)
                  }
                  break;
              }
              
              // Ping Command
              case 'pong':
              case 'speed':
              case 'ping': {
                  try {
                  const start = new Date().getTime();
                  
                  const reactionEmojis = ['🔥', '⚡', '🚀', '💨', '🎯', '🎉', '🌟', '💥', '🕐', '🔹'];
                  const textEmojis = ['💎', '🏆', '⚡️', '🚀', '🌿', '🌠', '🌀', '📍', '️🚀', '✨', '🇱🇰'];
                  
                  const reactionEmoji = reactionEmojis[Math.floor(Math.random() * reactionEmojis.length)];
                  const textEmoji = textEmojis[Math.floor(Math.random() * textEmojis.length)];
                  
                  await socket.sendMessage(from, { react: { text: reactionEmoji, key: msg.key}});
                  
                  const end = new Date().getTime();
                  const responseTime = (end - start) / 1000;
                  
                  await socket.sendMessage(from, {
                      text: `*${textEmoji} ρσηg: ${responseTime.toFixed(2)}мѕ*`
                  });
                  } catch (pinge) {
                      console.error("❌ Ping command error: " + pinge)
                  }
                  break;
              }
              
              default:
                
          }
      })
      
  } catch (connecte) {
      console.error("❌ Bot connect error: " + connecte)
  }
};

app.get('/', (req, res) => {
  res.send('Whatsapp Bot is Working ✅');
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

setTimeout(() => {
    connectToWhatsappTharusha()
}, 4000);
