'use strict'

const startTime = Date.now()

/** Normalisasi nomor WA: strip non-digit, ganti awalan 0 → 62 */
const normNum = (jid) =>
  jid.replace(/[^0-9]/g, '').replace(/^0/, '62')

/** Format uptime bot sejak proses jalan */
const getUptime = () => {
  const total = Math.floor((Date.now() - startTime) / 1000)
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  return `${h}j ${m}m ${s}d`
}

/** Cache metadata grup (TTL 5 menit agar tidak rate-limit) */
const metaCache = {}
const META_TTL  = 5 * 60 * 1000

const getGroupMeta = async (sock, gid) => {
  const now = Date.now()
  if (metaCache[gid] && (now - metaCache[gid].ts) < META_TTL) {
    return metaCache[gid].data
  }
  const meta = await sock.groupMetadata(gid)
  metaCache[gid] = { data: meta, ts: now }
  return meta
}

module.exports = { normNum, getUptime, getGroupMeta }
