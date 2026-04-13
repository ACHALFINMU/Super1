'use strict'

const fs = require('fs')

const DB_PATH = './database.json'

let db
try {
  db = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'))
} catch {
  db = {}
}

// Inisialisasi field wajib
if (!db.owners)        db.owners        = []
if (!db.allowedUsers)  db.allowedUsers  = []
if (!db.groupSettings) db.groupSettings = {}
if (!db.jadwal)        db.jadwal        = []

db.owners       = [...new Set(db.owners)]
db.allowedUsers = [...new Set(db.allowedUsers)]

/** Simpan database ke file */
const save = () => {
  db.owners       = [...new Set(db.owners)]
  db.allowedUsers = [...new Set(db.allowedUsers)]
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2))
}

/** Ambil (dan inisialisasi jika belum ada) setting grup */
const getGS = (gid) => {
  if (!db.groupSettings[gid]) {
    db.groupSettings[gid] = {
      antilink:     true,
      antiteruskan: true,
      welcome:      '',
      bye:          '',
      autoClose:    '',
      autoOpen:     ''
    }
    save()
  }

  const gs = db.groupSettings[gid]
  const defaults = {
    antilink:     false,
    antiteruskan: false,
    autoClose:    '',
    autoOpen:     '',
    welcomeOn:    true,
    byeOn:        true,
    botLock:      false,
    linkPS:       '',
    promosi:      ''
  }

  for (const [k, v] of Object.entries(defaults)) {
    if (gs[k] === undefined) gs[k] = v
  }

  return gs
}

save()

module.exports = { db, save, getGS }
