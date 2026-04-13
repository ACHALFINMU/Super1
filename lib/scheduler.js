'use strict'

const { db, save } = require('./database')

let _sock = null

/** Dipanggil handler.js setiap pesan masuk agar scheduler punya referensi socket */
const setSock = (sock) => { _sock = sock }

const pad = (n) => String(n).padStart(2, '0')

setInterval(async () => {
  if (!_sock) return

  const now   = new Date()
  const waktu = `${pad(now.getHours())}:${pad(now.getMinutes())}`
  const tgl   = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
  const key   = `${tgl} ${waktu}`

  // Kirim jadwal pesan
  for (const j of db.jadwal) {
    if (j.waktu !== waktu || j.lastSent === waktu) continue
    try {
      await _sock.sendMessage(j.groupId, { text: `📅 *Pesan Terjadwal*\n\n${j.pesan}` })
      j.lastSent = waktu
      save()
    } catch (e) {
      console.log('Gagal kirim jadwal:', e.message)
    }
  }

  // Auto close & auto open grup
  for (const [gid, gs] of Object.entries(db.groupSettings)) {
    if (gs.autoClose === waktu && gs.lastAutoClose !== key) {
      try {
        await _sock.groupSettingUpdate(gid, 'announcement')
        await _sock.sendMessage(gid, { text: '🔒 Grup otomatis ditutup' })
        gs.lastAutoClose = key
        save()
      } catch (e) { console.log('Gagal auto close:', e.message) }
    }

    if (gs.autoOpen === waktu && gs.lastAutoOpen !== key) {
      try {
        await _sock.groupSettingUpdate(gid, 'not_announcement')
        await _sock.sendMessage(gid, { text: '🔓 Grup otomatis dibuka' })
        gs.lastAutoOpen = key
        save()
      } catch (e) { console.log('Gagal auto open:', e.message) }
    }
  }
}, 60_000)

module.exports = { setSock }
