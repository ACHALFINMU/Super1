'use strict'

const { getGS } = require('../database')

const CHANNEL_REGEX = /whatsapp\.com\/channel|wa\.me\/channel|whatsapp\.com\/newsletter/i
const WALINK_REGEX  = /chat\.whatsapp\.com|wa\.me|whatsapp\.com\/channel|whatsapp\.com\/newsletter/i

/**
 * Middleware anti-spam (antilink & anti-teruskan saluran).
 * @returns {boolean} true jika pesan diblokir dan sudah dihapus
 */
module.exports = async (sock, msg, ctx) => {
  const { from, sender, senderNumber, isGroup, isAdmin, isOwner } = ctx
  if (!isGroup || isAdmin || isOwner) return false

  const gs = getGS(from)
  const m  = msg.message

  // --- Anti-teruskan saluran ---
  if (gs.antiteruskan) {
    const ctxInfo =
      m?.extendedTextMessage?.contextInfo   ||
      m?.imageMessage?.contextInfo          ||
      m?.videoMessage?.contextInfo          ||
      m?.documentMessage?.contextInfo       ||
      m?.audioMessage?.contextInfo          ||
      m?.stickerMessage?.contextInfo        ||
      m?.buttonsMessage?.contextInfo        ||
      m?.listMessage?.contextInfo           ||
      m?.templateMessage?.contextInfo       ||
      m?.viewOnceMessage?.message?.imageMessage?.contextInfo ||
      m?.viewOnceMessage?.message?.videoMessage?.contextInfo

    const allTexts = [
      m?.conversation,
      m?.extendedTextMessage?.text,
      m?.imageMessage?.caption,
      m?.videoMessage?.caption,
      m?.documentMessage?.caption,
      m?.buttonsMessage?.contentText,
      m?.listMessage?.description,
    ]

    const isForwardedChannel =
      ctxInfo?.forwardedNewsletterMessageInfo       ||
      ctxInfo?.forwardAttribution === 'NEWSLETTER'  ||
      m?.newsletterAdminInviteMessage               ||
      m?.scheduledCallCreationMessage               ||
      ctxInfo?.participant?.endsWith('@newsletter') ||
      ctxInfo?.remoteJid?.endsWith('@newsletter')   ||
      msg.key?.remoteJid?.endsWith('@newsletter')   ||
      m?.extendedTextMessage?.contextInfo?.isForwarded ||
      allTexts.filter(Boolean).some(t => CHANNEL_REGEX.test(t))

    if (isForwardedChannel) {
      await deleteMsg(sock, from, msg, sender)
      sock.sendMessage(from, {
        text: `🚫 @${senderNumber} dilarang meneruskan pesan dari saluran!`,
        mentions: [sender]
      })
      return true
    }
  }

  // --- Antilink WhatsApp ---
  if (gs.antilink) {
    const allText = [
      m?.conversation,
      m?.extendedTextMessage?.text,
      m?.imageMessage?.caption,
      m?.videoMessage?.caption,
    ].filter(Boolean).join(' ')

    if (WALINK_REGEX.test(allText)) {
      await deleteMsg(sock, from, msg, sender)
      sock.sendMessage(from, {
        text: `⚠️ @${senderNumber} dilarang mengirim link WhatsApp!`,
        mentions: [sender]
      })
      return true
    }
  }

  return false
}

async function deleteMsg(sock, from, msg, sender) {
  try {
    await sock.sendMessage(from, {
      delete: { remoteJid: from, fromMe: false, id: msg.key.id, participant: sender }
    })
  } catch (e) {
    console.log('Gagal hapus pesan:', e.message)
  }
}
