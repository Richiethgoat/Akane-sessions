const { makeid } = require('./id');
const QRCode = require('qrcode');
const express = require('express');
const path = require('path');
const fs = require('fs');
let router = express.Router()
const pino = require("pino");
const { default: makeWASocket, useMultiFileAuthState, Browsers, delay, Baileys} = require('@whiskeysockets/baileys');
const { Octokit } = require("@octokit/core")
const octokit = new Octokit({ auth: "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", });

function removeFile(FilePath) {
    if (!fs.existsSync(FilePath)) return false;
    fs.rmSync(FilePath, { recursive: true, force: true })
};

router.get('/', async (req, res) => {
    const id = makeid();
    async function generateQRCode() {
        const { state, saveCreds } = await useMultiFileAuthState('./temp/' + id)
        try {
            const ednut = makeWASocket({
        printQRInTerminal: false,
        logger: pino({
          level: 'silent',
        }),
        browser: ['Ubuntu', 'Chrome', '20.0.04'],
        auth: state,
      });

            ednut.ev.on('creds.update', saveCreds)

            ednut.ev.on("connection.update", async (s) => {
                const { connection, lastDisconnect, qr } = s;
                if (qr) {
                    const qrCodeBuffer = await QRCode.toBuffer(qr)
                    res.writeHead(200, {
                        'Content-Type': 'image/png',
                        'Content-Length': qrCodeBuffer.length
                    });
                    res.end(qrCodeBuffer);
                }
                if (connection == "open") {
                    await delay(5000);
                    let data = fs.readFileSync(__dirname + `/temp/${id}/creds.json`, "utf-8")
                    await delay(800);
                    let a = await octokit.request("POST /gists", {
                        files: {
                            'creds.json': { content: data },
                        },
                    });
                    const ss_id = 'Akane_' + a.data.id;
                    console.log("SESSION_ID: ", ss_id)
                    let session = await ednut.sendMessage(ednut.user.id, { text: ss_id });
                    await ednut.sendMessage(ednut.user.id, {
                        text: `𝗔𝗞𝗔𝗡𝗘 𝗠𝗗:
✅ Session successfully generated!  
Here’s everything you need to stay in touch with Akane MD :

📣 *Telegram Channel:*
https://t.me/akanemd

💬 *WhatsApp Channel:*
https://whatsapp.com/channel/0029VbAdqowK0IBd0uqhyl38

🌐 *Official Website:*
https://zaddy-richie.netlify.app

> ⚡ Powered by Richie`,
                    }, { quoted: session })
                    await delay(1000)
                    await ednut.groupAcceptInvite("HrXLS86BylDEOnv87a70td")
                    await delay(1000);
                    await ednut.ws.close();
                    return await removeFile("temp/" + id);
                } else if (connection === "close" && lastDisconnect && lastDisconnect.error && lastDisconnect.error.output.statusCode != 401) {
                    await delay(10000);
                    generateQRCode();
                }
            });
        } catch (err) {
            if (!res.headersSent) {
                await res.json({ code: "Service Unavailable" });
            }
            console.log(err);
            await removeFile("temp/" + id);
        }
    }
    return await generateQRCode()
});

module.exports = router
