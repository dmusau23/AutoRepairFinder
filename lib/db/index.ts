import Database from 'better-sqlite3'
import path from 'path'
import fs from 'fs'

const dataDir = path.join(process.cwd(), 'data')
fs.mkdirSync(dataDir, { recursive: true })

const globalForDb = globalThis as unknown as { sqlite?: Database.Database }
export const db = globalForDb.sqlite ?? new Database(path.join(dataDir, 'autorepair.db'))
if (process.env.NODE_ENV !== 'production') globalForDb.sqlite = db

db.pragma('journal_mode = WAL')
db.pragma('foreign_keys = ON')

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE COLLATE NOCASE,
  password_hash TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS sessions (
  token TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS user_profiles (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'customer' CHECK(role IN ('customer','shop','admin')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS vehicles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  year INTEGER NOT NULL,
  make TEXT NOT NULL,
  model TEXT NOT NULL,
  trim TEXT,
  mileage INTEGER,
  vin TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS shop_profiles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  owner_user_id TEXT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  postal_code TEXT,
  phone TEXT,
  email TEXT,
  rating REAL DEFAULT 0,
  review_count INTEGER DEFAULT 0,
  services TEXT DEFAULT '[]',
  is_verified INTEGER DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS repair_requests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  vehicle_id INTEGER REFERENCES vehicles(id) ON DELETE SET NULL,
  service TEXT NOT NULL,
  description TEXT,
  symptoms TEXT DEFAULT '[]',
  status TEXT NOT NULL DEFAULT 'open',
  distance TEXT,
  timing TEXT,
  selected_quote_id INTEGER,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS quotes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  repair_request_id INTEGER NOT NULL REFERENCES repair_requests(id) ON DELETE CASCADE,
  shop_id INTEGER NOT NULL REFERENCES shop_profiles(id) ON DELETE CASCADE,
  price REAL NOT NULL,
  estimate TEXT,
  timing TEXT,
  warranty TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(repair_request_id, shop_id)
);
CREATE TABLE IF NOT EXISTS appointments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  quote_id INTEGER NOT NULL UNIQUE REFERENCES quotes(id) ON DELETE CASCADE,
  scheduled_at TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK(status IN ('scheduled','completed','cancelled')),
  note TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS quote_notes (
  quote_id INTEGER NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  note TEXT NOT NULL DEFAULT '',
  updated_at TEXT NOT NULL,
  PRIMARY KEY (quote_id, user_id)
);
CREATE TABLE IF NOT EXISTS saved_shops (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  shop_id INTEGER NOT NULL REFERENCES shop_profiles(id) ON DELETE CASCADE,
  shop TEXT NOT NULL,
  created_at TEXT NOT NULL,
  UNIQUE(user_id, shop_id)
);
CREATE TABLE IF NOT EXISTS notifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  read_at TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_requests_user ON repair_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_requests_status ON repair_requests(status);
CREATE INDEX IF NOT EXISTS idx_quotes_request ON quotes(repair_request_id);
CREATE INDEX IF NOT EXISTS idx_appointments_scheduled ON appointments(scheduled_at,status);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
`)

// Additive fields for existing local databases.
for (const [table, column] of [
  ['user_profiles', 'profile_image'],
  ['shop_profiles', 'profile_image'],
  ['user_profiles', 'welcome_seen_at'],
  ['appointments', 'customer_response'],
  ['appointments', 'customer_message'],
  ['appointments', 'customer_updated_at'],
] as const) {
  try { db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} TEXT`) } catch { /* Column already exists. */ }
}

const count = db.prepare('SELECT COUNT(*) as count FROM shop_profiles').get() as { count: number }
if (count.count === 0) {
  const now = new Date().toISOString()
  const seed = db.prepare(`INSERT INTO shop_profiles
    (owner_user_id,name,description,address,city,state,postal_code,phone,email,rating,review_count,services,is_verified,created_at,updated_at)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`)
  const seedUser = db.prepare('INSERT OR IGNORE INTO users (id,name,email,password_hash,created_at) VALUES (?,?,?,?,?)')
  const seedProfile = db.prepare('INSERT OR IGNORE INTO user_profiles (user_id,role,created_at,updated_at) VALUES (?,?,?,?)')
  const shops = [
    { id:'seed-peachtree-owner', owner:'Peachtree Auto Care', email:'peachtree@autorepair.local', name:'Peachtree Auto Care', description:'Full-service neighborhood repair shop.', address:'123 Peachtree Pkwy', city:'Suwanee', state:'GA', zip:'30024', phone:'770-555-0147', contact:'hello@peachtreeautocare.example', rating:4.8, reviews:126, services:['Brakes','Oil change','Diagnostics','AC repair'] },
    { id:'seed-southside-owner', owner:'Southside Garage', email:'southside@autorepair.local', name:'Southside Garage', description:'Diagnostics, maintenance, and major repairs.', address:'456 Main St', city:'Lawrenceville', state:'GA', zip:'30046', phone:'770-555-0192', contact:'service@southsidegarage.example', rating:4.6, reviews:89, services:['Diagnostics','Engine','Tires','Maintenance'] },
  ]
  for (const shop of shops) {
    seedUser.run(shop.id, shop.owner, shop.email, 'seed-account', now)
    seedProfile.run(shop.id, 'shop', now, now)
    seed.run(shop.id, shop.name, shop.description, shop.address, shop.city, shop.state, shop.zip, shop.phone, shop.contact, shop.rating, shop.reviews, JSON.stringify(shop.services), 1, now, now)
  }
}
