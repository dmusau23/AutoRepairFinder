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
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
`)

// Additive profile fields for existing local databases.
for (const [table, column] of [['user_profiles', 'profile_image'], ['shop_profiles', 'profile_image'], ['user_profiles', 'welcome_seen_at']] as const) {
  try { db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} TEXT`) } catch { /* Column already exists. */ }
}

const count = db.prepare('SELECT COUNT(*) as count FROM shop_profiles').get() as { count: number }
if (count.count === 0) {
  const now = new Date().toISOString()
  const seed = db.prepare(`INSERT INTO shop_profiles
    (owner_user_id,name,description,address,city,state,postal_code,phone,email,rating,review_count,services,is_verified,created_at,updated_at)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`)
  // A seeded marketplace can exist before shop accounts are created.
  const seedUserId = 'seed-shop-owner'
  const userExists = db.prepare('SELECT id FROM users WHERE id=?').get(seedUserId)
  if (!userExists) {
    db.prepare('INSERT INTO users (id,name,email,password_hash,created_at) VALUES (?,?,?,?,?)')
      .run(seedUserId, 'Auto Repair Finder', 'seed-shop@autorepair.local', 'seed-account', now)
    db.prepare('INSERT INTO user_profiles (user_id,role,created_at,updated_at) VALUES (?,?,?,?)')
      .run(seedUserId, 'shop', now, now)
  }
  seed.run(seedUserId,'Peachtree Auto Care','Full-service neighborhood repair shop.','123 Peachtree Pkwy','Suwanee','GA','30024','770-555-0147','hello@peachtreeautocare.example',4.8,126,JSON.stringify(['Brakes','Oil change','Diagnostics','AC repair']),1,now,now)
  seed.run(seedUserId,'Southside Garage','Diagnostics, maintenance, and major repairs.','456 Main St','Lawrenceville','GA','30046','770-555-0192','service@southsidegarage.example',4.6,89,JSON.stringify(['Diagnostics','Engine','Tires','Maintenance']),1,now,now)
}
