import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import fs from 'node:fs'
import path from 'node:path'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { fileURLToPath } from 'node:url'

dotenv.config()
const app = express()
const PORT = process.env.PORT || 4000
const SECRET = process.env.JWT_SECRET || 'dev-only-change-this-secret'
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DB_FILE = path.join(__dirname, 'data.json')

app.use(cors())
app.use(express.json({ limit: '1mb' }))

function readDB() {
  if (!fs.existsSync(DB_FILE)) fs.writeFileSync(DB_FILE, JSON.stringify({ users: [], orders: [], reservations: [] }, null, 2))
  return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'))
}
function writeDB(db) { fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2)) }
function tokenFor(user) { return jwt.sign({ id: user.id, email: user.email, role: user.role }, SECRET, { expiresIn: '7d' }) }
function auth(req, res, next) {
  const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '')
  try { req.user = jwt.verify(token, SECRET); next() }
  catch { res.status(401).json({ message: 'Avval tizimga kiring.' }) }
}
function admin(req, res, next) {
  if (req.user?.role !== 'admin') return res.status(403).json({ message: 'Bu sahifa faqat administrator uchun.' })
  next()
}
async function telegramNotify(message) {
  const { TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID } = process.env
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) return false
  try {
    const response = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, text: message })
    })
    return response.ok
  } catch (error) { console.error('Telegram xabari yuborilmadi:', error.message); return false }
}
function safeUser(user) { return { id: user.id, name: user.name, email: user.email, role: user.role } }

app.get('/api/health', (_req, res) => res.json({ ok: true }))
app.post('/api/auth/register', async (req, res) => {
  const { name, email, password } = req.body || {}
  if (!name?.trim() || !email?.trim() || !password || password.length < 6)
    return res.status(400).json({ message: 'Ism, email va kamida 6 belgili parol kiriting.' })
  const db = readDB()
  if (db.users.some(u => u.email.toLowerCase() === email.toLowerCase()))
    return res.status(409).json({ message: 'Bu email oldin roʻyxatdan oʻtgan.' })
  const user = { id: Date.now().toString(), name: name.trim(), email: email.trim().toLowerCase(), password: await bcrypt.hash(password, 10), role: 'user', createdAt: new Date().toISOString() }
  db.users.push(user); writeDB(db)
  res.status(201).json({ token: tokenFor(user), user: safeUser(user) })
})
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body || {}
  const db = readDB()
  let user = db.users.find(u => u.email === String(email || '').toLowerCase())
  const adminEmail = (process.env.ADMIN_EMAIL || 'admin@xonbaliq.uz').toLowerCase()
  const adminPassword = process.env.ADMIN_PASSWORD || 'ChangeMe123!'
  if (!user && String(email || '').toLowerCase() === adminEmail && password === adminPassword) {
    user = { id: 'admin', name: 'Administrator', email: adminEmail, role: 'admin' }
  }
  if (!user || (user.id !== 'admin' && !(await bcrypt.compare(password || '', user.password))))
    return res.status(401).json({ message: 'Email yoki parol notoʻgʻri.' })
  res.json({ token: tokenFor(user), user: safeUser(user) })
})
app.get('/api/auth/me', auth, (req, res) => {
  if (req.user.id === 'admin') return res.json({ user: { id: 'admin', name: 'Administrator', email: req.user.email, role: 'admin' } })
  const user = readDB().users.find(u => u.id === req.user.id)
  if (!user) return res.status(404).json({ message: 'Foydalanuvchi topilmadi.' })
  res.json({ user: safeUser(user) })
})
app.post('/api/orders', async (req, res) => {
  const { customerName, phone, address, items, total } = req.body || {}
  if (!customerName || !phone || !address || !Array.isArray(items) || !items.length)
    return res.status(400).json({ message: 'Buyurtma maʼlumotlarini toʻliq kiriting.' })
  const db = readDB()
  const order = { id: 'XB-' + Date.now(), customerName, phone, address, items, total: Number(total) || 0, status: 'Yangi', createdAt: new Date().toISOString(), userId: req.body.userId || null }
  db.orders.unshift(order); writeDB(db)
  const lines = items.map(i => `• ${i.name} × ${i.qty} — ${Number(i.price * i.qty).toLocaleString('uz-UZ')} soʻm`).join('\n')
  const sent = await telegramNotify(`🍣 YANGI BUYURTMA ${order.id}\nIsm: ${customerName}\nTelefon: ${phone}\nManzil: ${address}\n${lines}\nJami: ${order.total.toLocaleString('uz-UZ')} soʻm`)
  res.status(201).json({ message: 'Buyurtma saqlandi.', order, telegramSent: sent })
})
app.post('/api/reservations', async (req, res) => {
  const { name, phone, date, time, guests, note } = req.body || {}
  if (!name || !phone || !date || !time || !guests) return res.status(400).json({ message: 'Barcha majburiy maydonlarni toʻldiring.' })
  const db = readDB()
  const reservation = { id: 'RS-' + Date.now(), name, phone, date, time, guests, note: note || '', status: 'Yangi', createdAt: new Date().toISOString() }
  db.reservations.unshift(reservation); writeDB(db)
  const sent = await telegramNotify(`📅 YANGI STOL BANDLOVI ${reservation.id}\nIsm: ${name}\nTelefon: ${phone}\nSana: ${date} ${time}\nMehmonlar: ${guests}\nIzoh: ${note || 'Yoʻq'}`)
  res.status(201).json({ message: 'Bandlov soʻrovi saqlandi.', reservation, telegramSent: sent })
})
app.get('/api/admin/data', auth, admin, (_req, res) => {
  const db = readDB()
  res.json({ orders: db.orders, reservations: db.reservations, users: db.users.map(safeUser) })
})
app.patch('/api/admin/orders/:id', auth, admin, (req, res) => {
  const db = readDB(), order = db.orders.find(x => x.id === req.params.id)
  if (!order) return res.status(404).json({ message: 'Buyurtma topilmadi.' })
  order.status = req.body.status || order.status; writeDB(db); res.json({ order })
})
app.patch('/api/admin/reservations/:id', auth, admin, (req, res) => {
  const db = readDB(), item = db.reservations.find(x => x.id === req.params.id)
  if (!item) return res.status(404).json({ message: 'Bandlov topilmadi.' })
  item.status = req.body.status || item.status; writeDB(db); res.json({ reservation: item })
})

app.listen(PORT, () => console.log(`XON BALIQ server: http://localhost:${PORT}`))
