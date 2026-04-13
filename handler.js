'use strict'

const { db }                      = require('./lib/database')
const { normNum, getGroupMeta }   = require('./lib/helpers')
const { setSock }                 = require('./lib/scheduler')
const antiSpam                    = require('./lib/middleware/antiSpam')

// Daftar command handler — urutan penting (cek dari atas ke bawah)
const commands = [
  require('./lib/commands/menu'),
  require('./lib/commands/info'),
  require('./lib/commands/settings'),
  require('./lib/commands/jadwal'),
  require('./lib/commands/group'),
  require('./lib/commands/owner'),
]

module.exports = async (sock, msg) => {
  try {
    setSock(sock)

    const from         = msg.key.remoteJid
    const sender       = msg.key.participant || msg.key.remoteJid
    const senderNumber = normNum(sender.split('@')[0])

    const body = msg.message?.conversation || msg.message?.extendedTextMessage?.text
    const text = body ? body.toLowerCase() : ''

    const isGroup = from.endsWith('@g.us')

    // Ambil data grup jika diperlukan
    let groupMetadata = {}
    let participants  = []
    let groupAdmins   = []

    if (isGroup) {
      groupMetadata = await getGroupMeta(sock, from)
      participants  = groupMetadata.participants
      groupAdmins   = participants
        .filter(v => v.admin !== null)
        .map(v => v.id)
    }

    const isAdmin   = groupAdmins.some(a => normNum(a.split('@')[0]) === senderNumber)
    const isOwner   = db.owners.map(normNum).includes(senderNumber)
    const isAllowed = isAdmin || isOwner || db.allowedUsers.map(normNum).includes(senderNumber)

    /** Context yang diteruskan ke semua middleware & command */
    const ctx = {
      from, sender, senderNumber,
      body, text,
      isGroup, isAdmin, isOwner, isAllowed,
      groupAdmins, groupMetadata, participants
    }

    // Middleware: blokir spam/link/teruskan sebelum cek perintah
    if (await antiSpam(sock, msg, ctx)) return

    // Dispatch ke command yang cocok (stop di handler pertama yang return true)
    for (const cmd of commands) {
      if (await cmd(sock, msg, ctx)) return
    }

  } catch (err) {
    console.log('Error handler:', err)
  }
}
