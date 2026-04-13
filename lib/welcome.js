'use strict'

const { getGS } = require('./database')

module.exports = async (sock, anu) => {
  try {
    const metadata    = await sock.groupMetadata(anu.id)
    const memberCount = metadata.participants.length
    const gs          = getGS(anu.id)

    for (const num of anu.participants) {
      const user = num.split('@')[0]

      // Welcome: member baru masuk
      if (anu.action === 'add') {
        if (gs.welcomeOn === false) continue

        const teks = gs.welcome
          ? gs.welcome
              .replace(/{user}/g, user)
              .replace(/{group}/g, metadata.subject)
              .replace(/{count}/g, memberCount)
          : `
╭─❖「 *WELCOME* 」❖
│ 👤 @${user}
│ 📌 Grup: ${metadata.subject}
│ 👥 Member ke: ${memberCount}
│ 🎉 Selamat datang!
│
│ Jangan lupa patuhi rules ya 😉
│ Butuh linkps? ketik .linkps
╰───────────────
          `.trim()

        await sock.sendMessage(anu.id, { text: teks, mentions: [num] })
      }

      // Goodbye: member keluar / dikick
      if (anu.action === 'remove') {
        if (gs.byeOn === false) continue

        const teks = gs.bye
          ? gs.bye
              .replace(/{user}/g, user)
              .replace(/{group}/g, metadata.subject)
              .replace(/{count}/g, memberCount)
          : `
╭─❖「 *GOODBYE* 」❖
│ 👤 @${user}
│ 📌 ${metadata.subject}
│ 👥 Sisa member: ${memberCount}
│ 😢 Telah keluar dari grup
│
│ Sampai jumpa 👋
╰───────────────
          `.trim()

        await sock.sendMessage(anu.id, { text: teks, mentions: [num] })
      }
    }
  } catch (err) {
    console.log('Error welcome:', err)
  }
}
