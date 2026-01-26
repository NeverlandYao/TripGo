import { Pool } from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

function generateId() {
  return Math.random().toString(36).substring(2, 15);
}

async function main() {
  const client = await pool.connect();
  try {
    // Vehicle types
    const { rows: existingVehicles } = await client.query('SELECT * FROM vehicle_types');
    
    if (existingVehicles.length === 0) {
      const vehicles = [
        {
          id: generateId(),
          name: "5座车（经济型）",
          seats: 4,
          luggageSmall: 2,
          luggageMedium: 1,
          luggageLarge: 1,
          description: "适合 1-3 人轻装出行"
        },
        {
          id: generateId(),
          name: "7座车（商务型）",
          seats: 6,
          luggageSmall: 4,
          luggageMedium: 3,
          luggageLarge: 2,
          description: "适合家庭/多人出行"
        },
        {
          id: generateId(),
          name: "9座车（大空间）",
          seats: 8,
          luggageSmall: 6,
          luggageMedium: 4,
          luggageLarge: 3,
          description: "适合行李较多或 6-8 人"
        },
        {
          id: generateId(),
          name: "豪华型（VIP）",
          seats: 4,
          luggageSmall: 3,
          luggageMedium: 2,
          luggageLarge: 2,
          is_luxury: true,
          description: "更舒适的商务接待"
        },
        {
          id: generateId(),
          name: "大巴车（团体）",
          seats: 20,
          luggageSmall: 20,
          luggageMedium: 20,
          luggageLarge: 20,
          is_bus: true,
          description: "团队出行与大型行李"
        }
      ];

      for (const v of vehicles) {
        await client.query(
          'INSERT INTO vehicle_types (id, name, seats, luggage_small, luggage_medium, luggage_large, is_luxury, is_bus, description) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)',
          [v.id, v.name, v.seats, v.luggageSmall, v.luggageMedium, v.luggageLarge, v.is_luxury || false, v.is_bus || false, v.description]
        );
      }
    }

    const { rows: allVehicles } = await client.query('SELECT * FROM vehicle_types');
    const byName = new Map(allVehicles.map((v) => [v.name, v.id]));

    // Pricing rules (demo)
    await client.query('DELETE FROM pricing_rules');
    
    const airports = ["NRT", "HND", "KIX", "NGO", "CTS"];
    const popularAreas = ["Shinjuku", "Shibuya", "Ginza", "Asakusa", "Ueno", "Ikebukuro", "Namba", "Umeda", "Dotonbori", "Gion", "Kyoto Station"];
    
    const routes: Array<{ fromArea: string; toArea: string; tripType: "PICKUP" | "DROPOFF" }> = [];
    
    for (const airport of airports) {
      for (const area of popularAreas) {
        routes.push({ fromArea: airport, toArea: area, tripType: "PICKUP" });
        routes.push({ fromArea: area, toArea: airport, tripType: "DROPOFF" });
      }
    }

    const vehiclePrice: Array<{ name: string; base: number; night: number; urgent: number }> = [
      { name: "5座车（经济型）", base: 16000, night: 2000, urgent: 3000 },
      { name: "7座车（商务型）", base: 22000, night: 3000, urgent: 4000 },
      { name: "9座车（大空间）", base: 28000, night: 4000, urgent: 5000 },
      { name: "豪华型（VIP）", base: 38000, night: 5000, urgent: 6000 },
      { name: "大巴车（团体）", base: 85000, night: 8000, urgent: 12000 }
    ];

    for (const r of routes) {
      for (const vp of vehiclePrice) {
        const vehicleTypeId = byName.get(vp.name);
        if (!vehicleTypeId) continue;
        await client.query(
          'INSERT INTO pricing_rules (id, from_area, to_area, trip_type, base_price_jpy, night_fee_jpy, urgent_fee_jpy, vehicle_type_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
          [generateId(), r.fromArea, r.toArea, r.tripType, vp.base, vp.night, vp.urgent, vehicleTypeId]
        );
      }
    }
    console.log("Seed done.");
  } catch (e) {
    console.error(e);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

main();
