import { join } from 'node:path'
import { networkInterfaces, hostname } from 'node:os'
import { app } from 'electron'
import fs from 'node:fs'
import log from './logger'

const REPORT_URL = 'http://8.163.43.7:3000/report-ip'

function getPendingPath() {
  return join(app.getPath('userData'), 'pending-reports.json')
}

function savePending(payload: Record<string, string>) {
  let pending: Record<string, string>[] = []
  try {
    if (fs.existsSync(getPendingPath())) {
      pending = JSON.parse(fs.readFileSync(getPendingPath(), 'utf-8'))
    }
  } catch { /* ignore */ }
  pending.push(payload)
  fs.writeFileSync(getPendingPath(), JSON.stringify(pending, null, 2), 'utf-8')
  log.info('Saved offline report to local, total pending:', pending.length)
}

function loadPending(): Record<string, string>[] {
  try {
    if (fs.existsSync(getPendingPath())) {
      return JSON.parse(fs.readFileSync(getPendingPath(), 'utf-8'))
    }
  } catch { /* ignore */ }
  return []
}

function clearPending() {
  try { fs.unlinkSync(getPendingPath()) } catch { /* ignore */ }
}

async function uploadOne(payload: Record<string, string>): Promise<boolean> {
  try {
    await fetch(REPORT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    return true
  } catch {
    return false
  }
}

async function flushPending(): Promise<boolean> {
  const pending = loadPending()
  if (pending.length === 0) return true
  const failed: Record<string, string>[] = []
  for (const record of pending) {
    if (await uploadOne(record)) {
      log.info('Flushed pending report:', record['公网IP'], record['上报时间'])
    } else {
      failed.push(record)
    }
  }
  if (failed.length === 0) {
    clearPending()
    log.info('All pending reports flushed')
    return true
  }
  fs.writeFileSync(getPendingPath(), JSON.stringify(failed, null, 2), 'utf-8')
  return false
}

async function getIPInfo(): Promise<Record<string, string>> {
  const apis = [
    async () => {
      const r = await fetch('https://qifu.baidu.com/opus/api/ip/local', {
        headers: { 'Referer': 'https://www.baidu.com' },
      }).then(r => r.json()) as any
      const d = r?.data
      if (!d?.ip) throw new Error('empty')
      return {
        '公网IP': d.ip,
        '国家': d.country || '',
        '省份': d.province || '',
        '城市': d.city || '',
        '区县': d.district || d.area || '',
        '详细地址': [d.country, d.province, d.city, d.district || d.area].filter(Boolean).join(''),
        '运营商': d.isp || '',
      }
    },
    async () => {
      const r = await fetch('http://whois.pconline.com.cn/ipJson.jsp').then(r => r.arrayBuffer())
      const text = new TextDecoder('gbk').decode(r)
      const data = JSON.parse(text)
      if (!data.ip) throw new Error('empty')
      return {
        '公网IP': data.ip,
        '国家': '中国',
        '省份': data.pro || '',
        '城市': data.city || '',
        '区县': data.region || '',
        '详细地址': data.addr || '',
        '运营商': data.addr?.split(' ')?.[1] || '',
      }
    },
    async () => {
      const r = await fetch('http://ip-api.com/json/?lang=zh-CN').then(r => r.json()) as any
      if (!r.query) throw new Error('empty')
      return {
        '公网IP': r.query, '国家': r.country, '省份': r.regionName,
        '城市': r.city, '区县': '', '详细地址': `${r.country}${r.regionName}${r.city}`,
        '运营商': r.isp, '纬度': String(r.lat ?? ''), '经度': String(r.lon ?? ''),
      }
    },
  ]
  for (const api of apis) {
    try { return await api() } catch { continue }
  }
  return { '公网IP': '', '国家': '', '省份': '', '城市': '', '区县': '', '详细地址': '', '运营商': '' }
}

function getLocalIP(): string {
  const nets = networkInterfaces()
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]!) {
      if (net.family === 'IPv4' && !net.internal) return net.address
    }
  }
  return '127.0.0.1'
}

export async function reportIP() {
  const localIP = getLocalIP()
  const payload = {
    '电脑名': hostname(),
    '局域网IP': localIP,
    '上报时间': new Date().toISOString(),
  }

  let ipInfo: Record<string, string>
  try {
    ipInfo = await getIPInfo()
  } catch {
    ipInfo = { '公网IP': '', '国家': '', '省份': '', '城市': '', '区县': '', '详细地址': '', '运营商': '' }
  }

  const fullPayload = { ...payload, ...ipInfo }

  const ok = await uploadOne(fullPayload)
  if (ok) {
    log.info('IP reported:', ipInfo['公网IP'], ipInfo['省份'], ipInfo['城市'])
    flushPending()
  } else {
    log.info('Network unavailable, saving report locally')
    savePending(fullPayload)
  }
}

export function retryPending() {
  const pending = loadPending()
  if (pending.length > 0) {
    flushPending()
  }
}
