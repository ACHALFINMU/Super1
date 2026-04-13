'use strict'

const {
  default: makeWASocket,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  DisconnectReason
} = require('@whiskeysockets/baileys')

const pino      = require('pino')
const readline  = require('readline')
const { Boom }  = require('@hapi/boom')

const welcome = require('./lib/welcome')
const handler = require('./handler')

// ======================
// INPUT TERMINAL
// ======================
const question = (text) => {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
  return new Promise(resolve => rl.question(text, resolve))
}

// ======================
// MESSAGE QUEUE
// Membatasi & mengantrikan pesan agar tidak spam ke server WA
// ======================
const MAX_QUEUE   = 50
const MSG_DELAY   = 300 // ms antar pesan

const msgQueue = []
let isProcessing = false

async function processQueue() {
  if (isProcessing || msgQueue.length === 0) return
  isProcessing = true

  while (msgQueue.length > 0) {
    const { sock, msg } = msgQueue.shift()
    try {
      await handler(sock, msg)
    } catch (e) {
      console.log('Error proses pesan:', e.message)
    }
    await new Promise(r => setTimeout(r, MSG_DELAY))
  }

  isProcessing = false
}

// ======================
// START BOT
// ======================
async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState('session')
  const { version }          = await fetchLatestBaileysVersion()

  const sock = makeWASocket({
    version,
    logger:               pino({ level: 'silent' }),
    auth:                 state,
    browser:              ['Ubuntu', 'Chrome', '20.0.04'],
    connectTimeoutMs:     60_000,
    keepAliveIntervalMs:  25_000,
    retryRequestDelayMs:  2_000
  })

  let isReady = false

  // --- Pairing code login (jika belum terdaftar) ---
  if (!sock.authState.creds.registered) {
    let number = await question('Masukkan nomor (628xxx): ')
    number = number.replace(/[^0-9]/g, '')
    const code = await sock.requestPairingCode(number)
    console.log('\n✅ Pairing Code:', code)
    console.log('Masukkan ke WhatsApp > Linked Devices\n')
  }

  // --- Simpan session ---
  sock.ev.on('creds.update', saveCreds)

  // --- Status koneksi ---
  sock.ev.on('connection.update', ({ connection, lastDisconnect }) => {
    if (connection === 'close') {
      isReady = false
      const reason = new Boom(lastDisconnect?.error)?.output.statusCode

      if (reason === DisconnectReason.loggedOut) {
        console.log('❌ Session keluar. Hapus folder session lalu jalankan ulang.')
      } else if (reason === DisconnectReason.badSession) {
        console.log('❌ Session rusak. Hapus folder session lalu jalankan ulang.')
      } else {
        const delay = reason === 428 ? 10_000 : 5_000
        console.log(`🔄 Reconnecting dalam ${delay / 1000} detik... (reason: ${reason})`)
        setTimeout(startBot, delay)
      }
    }

    if (connection === 'open') {
      // Tunggu 3 detik setelah connect agar socket stabil sebelum proses pesan
      setTimeout(() => {
        isReady = true
        console.log('✅ Bot berhasil connect & siap')
      }, 3_000)
    }
  })

  // --- Event: member masuk / keluar grup ---
  sock.ev.on('group-participants.update', async (anu) => {
    if (!isReady) return
    await welcome(sock, anu)
  })

  // --- Event: pesan masuk ---
  sock.ev.on('messages.upsert', async ({ messages }) => {
    if (!isReady) return
    const msg = messages[0]
    if (!msg.message) return

    // Buang pesan paling lama jika queue penuh
    if (msgQueue.length >= MAX_QUEUE) msgQueue.shift()
    msgQueue.push({ sock, msg })
    processQueue()
  })
}

startBot()
