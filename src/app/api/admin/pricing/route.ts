import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/adminAuth";
import { AdminPricingRuleSchema } from "@/lib/validators";
import { getT } from "@/lib/i18n";
import { z } from "zod";

function generateId() {
  return Math.random().toString(36).substring(2, 15);
}

// GET: 获取所有价格规则
export async function GET(req: Request) {
  const { t } = await getT();
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: t(auth.error) }, { status: 401 });

  try {
    const { searchParams } = new URL(req.url);
    const vehicleTypeId = searchParams.get("vehicleTypeId");
    const fromArea = searchParams.get("fromArea");
    const toArea = searchParams.get("toArea");
    const tripType = searchParams.get("tripType");

    let query = `
      SELECT r.*, v.name as "vehicleName", v.seats as "vehicleSeats"
      FROM pricing_rules r
      JOIN vehicle_types v ON r.vehicle_type_id = v.id
      WHERE 1=1
    `;
    const params: any[] = [];
    let paramIndex = 1;

    if (vehicleTypeId) {
      query += ` AND r.vehicle_type_id = $${paramIndex++}`;
      params.push(vehicleTypeId);
    }
    if (fromArea) {
      query += ` AND r.from_area = $${paramIndex++}`;
      params.push(fromArea);
    }
    if (toArea) {
      query += ` AND r.to_area = $${paramIndex++}`;
      params.push(toArea);
    }
    if (tripType) {
      query += ` AND r.trip_type = $${paramIndex++}`;
      params.push(tripType);
    }

    query += ` ORDER BY r.from_area ASC, r.to_area ASC, r.trip_type ASC, v.seats ASC`;

    const { rows } = await db.query(query, params);
    
    const rules = rows.map(r => ({
      id: r.id,
      fromArea: r.from_area,
      toArea: r.to_area,
      tripType: r.trip_type,
      basePriceJpy: r.base_price_jpy,
      nightFeeJpy: r.night_fee_jpy,
      urgentFeeJpy: r.urgent_fee_jpy,
      vehicleTypeId: r.vehicle_type_id,
      vehicleType: {
        id: r.vehicle_type_id,
        name: r.vehicleName,
        seats: r.vehicleSeats
      }
    }));

    return NextResponse.json({ rules });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ error: e?.message ?? t("api.serverError") }, { status: 500 });
  }
}

// POST: 创建新的价格规则
export async function POST(req: Request) {
  const { t } = await getT();
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: t(auth.error) }, { status: 401 });

  try {
    const json = await req.json();
    const parsed = AdminPricingRuleSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: t("api.invalidParams"), details: parsed.error.flatten() }, { status: 400 });
    }

    const { fromArea, toArea, tripType, vehicleTypeId, basePriceJpy, nightFeeJpy, urgentFeeJpy } = parsed.data;

    // 检查是否已存在相同的规则
    const { rows: existing } = await db.query(
      "SELECT id FROM pricing_rules WHERE from_area = $1 AND to_area = $2 AND trip_type = $3 AND vehicle_type_id = $4",
      [fromArea, toArea, tripType, vehicleTypeId]
    );

    if (existing.length > 0) {
      return NextResponse.json({ error: t("api.pricingRuleExists") }, { status: 400 });
    }

    // 验证车型是否存在
    const { rows: vehicleTypes } = await db.query("SELECT * FROM vehicle_types WHERE id = $1", [vehicleTypeId]);
    if (vehicleTypes.length === 0) {
      return NextResponse.json({ error: t("api.vehicleTypeNotFound") }, { status: 404 });
    }

    const id = generateId();
    await db.query(
      `INSERT INTO pricing_rules (id, from_area, to_area, trip_type, vehicle_type_id, base_price_jpy, night_fee_jpy, urgent_fee_jpy)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [id, fromArea, toArea, tripType, vehicleTypeId, basePriceJpy, nightFeeJpy ?? 0, urgentFeeJpy ?? 0]
    );

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ error: e?.message ?? t("api.serverError") }, { status: 500 });
  }
}

// PUT: 更新价格规则
export async function PUT(req: Request) {
  const { t } = await getT();
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: t(auth.error) }, { status: 401 });

  try {
    const json = await req.json();
    const parsed = AdminPricingRuleSchema.extend({
      id: z.string().min(1)
    }).safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: t("api.invalidParams"), details: parsed.error.flatten() }, { status: 400 });
    }

    const { id, fromArea, toArea, tripType, vehicleTypeId, basePriceJpy, nightFeeJpy, urgentFeeJpy } = parsed.data;

    // 检查规则是否存在
    const { rows: existing } = await db.query("SELECT * FROM pricing_rules WHERE id = $1", [id]);
    if (existing.length === 0) {
      return NextResponse.json({ error: t("api.pricingRuleNotFound") }, { status: 404 });
    }

    // 如果路线或车型改变，检查是否会产生冲突
    const rule = existing[0];
    if (fromArea !== rule.from_area || toArea !== rule.to_area || tripType !== rule.trip_type || vehicleTypeId !== rule.vehicle_type_id) {
      const { rows: conflict } = await db.query(
        "SELECT id FROM pricing_rules WHERE from_area = $1 AND to_area = $2 AND trip_type = $3 AND vehicle_type_id = $4 AND id != $5",
        [fromArea, toArea, tripType, vehicleTypeId, id]
      );

      if (conflict.length > 0) {
        return NextResponse.json({ error: t("api.pricingRuleExists") }, { status: 400 });
      }
    }

    await db.query(
      `UPDATE pricing_rules SET from_area = $1, to_area = $2, trip_type = $3, vehicle_type_id = $4, base_price_jpy = $5, night_fee_jpy = $6, urgent_fee_jpy = $7, updated_at = NOW()
       WHERE id = $8`,
      [fromArea, toArea, tripType, vehicleTypeId, basePriceJpy, nightFeeJpy ?? 0, urgentFeeJpy ?? 0, id]
    );

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ error: e?.message ?? t("api.serverError") }, { status: 500 });
  }
}

// DELETE: 删除价格规则
export async function DELETE(req: Request) {
  const { t } = await getT();
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: t(auth.error) }, { status: 401 });

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: t("api.invalidParams") }, { status: 400 });
    }

    const { rowCount } = await db.query("DELETE FROM pricing_rules WHERE id = $1", [id]);
    if (rowCount === 0) {
      return NextResponse.json({ error: t("api.pricingRuleNotFound") }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ error: e?.message ?? t("api.serverError") }, { status: 500 });
  }
}
