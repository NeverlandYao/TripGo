import { Pool } from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

async function init() {
  const client = await pool.connect();
  try {
    console.log('Starting database initialization...');

    // Drop existing tables if needed (optional, but for a clean start)
    // await client.query('DROP TABLE IF EXISTS bookings, pricing_rules, vehicle_types, verification_codes, user_emails, users CASCADE');

    // Create Tables
    await client.query(`
      CREATE EXTENSION IF NOT EXISTS pgcrypto;

      CREATE TABLE IF NOT EXISTS vehicle_types (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        seats INTEGER NOT NULL,
        luggage_small INTEGER NOT NULL,
        luggage_medium INTEGER NOT NULL,
        luggage_large INTEGER NOT NULL,
        is_luxury BOOLEAN DEFAULT FALSE,
        is_bus BOOLEAN DEFAULT FALSE,
        description TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS pricing_rules (
        id TEXT PRIMARY KEY,
        from_area TEXT NOT NULL,
        to_area TEXT NOT NULL,
        trip_type TEXT NOT NULL,
        base_price_jpy INTEGER NOT NULL,
        night_fee_jpy INTEGER DEFAULT 0,
        urgent_fee_jpy INTEGER DEFAULT 0,
        vehicle_type_id TEXT REFERENCES vehicle_types(id),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_pricing_rules_lookup ON pricing_rules(from_area, to_area, trip_type, vehicle_type_id);

      CREATE TABLE IF NOT EXISTS bookings (
        id TEXT PRIMARY KEY,
        status TEXT DEFAULT 'PENDING_PAYMENT',
        is_urgent BOOLEAN DEFAULT FALSE,
        currency TEXT DEFAULT 'JPY',
        trip_type TEXT NOT NULL,
        pickup_time TIMESTAMP WITH TIME ZONE NOT NULL,
        pickup_location TEXT NOT NULL,
        dropoff_location TEXT NOT NULL,
        flight_number TEXT,
        flight_date TIMESTAMP WITH TIME ZONE,
        flight_note TEXT,
        passengers INTEGER NOT NULL,
        child_seats INTEGER DEFAULT 0,
        luggage_small INTEGER DEFAULT 0,
        luggage_medium INTEGER DEFAULT 0,
        luggage_large INTEGER DEFAULT 0,
        contact_name TEXT NOT NULL,
        contact_phone TEXT NOT NULL,
        contact_email TEXT NOT NULL,
        contact_note TEXT,
        pricing_base_jpy INTEGER NOT NULL,
        pricing_night_jpy INTEGER DEFAULT 0,
        pricing_urgent_jpy INTEGER DEFAULT 0,
        pricing_child_seat_jpy INTEGER DEFAULT 0,
        pricing_manual_adjustment_jpy INTEGER DEFAULT 0,
        pricing_total_jpy INTEGER NOT NULL,
        pricing_note TEXT,
        cancel_reason TEXT,
        cancelled_at TIMESTAMP WITH TIME ZONE,
        vehicle_type_id TEXT REFERENCES vehicle_types(id),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        role TEXT DEFAULT 'USER',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS user_emails (
        id SERIAL PRIMARY KEY,
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        email TEXT UNIQUE NOT NULL,
        verified_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS verification_codes (
        email TEXT PRIMARY KEY,
        code TEXT NOT NULL,
        expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    console.log('Database initialization completed successfully.');
  } catch (error) {
    console.error('Error initializing database:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

init();
