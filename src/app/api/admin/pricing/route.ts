import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/adminAuth";
import { AdminPricingRuleSchema } from "@/lib/validators";
import { getT } from "@/lib/i18n";
import { z } from "zod";

// GET: 获取所有价格规则
export async function GET(req: Request) {
  const { t } = await getT();
  const auth = requireAdmin(req);
  if (!auth.ok) return NextResponse.json({ error: t(auth.error) }, { status: 401 });

  try {
    const { searchParams } = new URL(req.url);
    const vehicleTypeId = searchParams.get("vehicleTypeId");
    const fromArea = searchParams.get("fromArea");
    const toArea = searchParams.get("toArea");
    const tripType = searchParams.get("tripType");

    const where: any = {};
    if (vehicleTypeId) where.vehicleTypeId = vehicleTypeId;
    if (fromArea) where.fromArea = fromArea;
    if (toArea) where.toArea = toArea;
    if (tripType) where.tripType = tripType;

    const rules = await prisma.pricingRule.findMany({
      where,
      include: { vehicleType: true },
      orderBy: [
        { fromArea: "asc" },
        { toArea: "asc" },
        { tripType: "asc" },
        { vehicleType: { seats: "asc" } }
      ]
    });

    return NextResponse.json({ rules });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? t("api.serverError") }, { status: 500 });
  }
}

// POST: 创建新的价格规则
export async function POST(req: Request) {
  const { t } = await getT();
  const auth = requireAdmin(req);
  if (!auth.ok) return NextResponse.json({ error: t(auth.error) }, { status: 401 });

  try {
    const json = await req.json();
    const parsed = AdminPricingRuleSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: t("api.invalidParams"), details: parsed.error.flatten() }, { status: 400 });
    }

    const { fromArea, toArea, tripType, vehicleTypeId, basePriceJpy, nightFeeJpy, urgentFeeJpy } = parsed.data;

    // 检查是否已存在相同的规则
    const existing = await prisma.pricingRule.findFirst({
      where: {
        fromArea,
        toArea,
        tripType,
        vehicleTypeId
      }
    });

    if (existing) {
      return NextResponse.json({ error: t("api.pricingRuleExists") }, { status: 400 });
    }

    // 验证车型是否存在
    const vehicleType = await prisma.vehicleType.findUnique({ where: { id: vehicleTypeId } });
    if (!vehicleType) {
      return NextResponse.json({ error: t("api.vehicleTypeNotFound") }, { status: 404 });
    }

    const rule = await prisma.pricingRule.create({
      data: {
        fromArea,
        toArea,
        tripType,
        vehicleTypeId,
        basePriceJpy,
        nightFeeJpy: nightFeeJpy ?? 0,
        urgentFeeJpy: urgentFeeJpy ?? 0
      },
      include: { vehicleType: true }
    });

    return NextResponse.json({ rule });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? t("api.serverError") }, { status: 500 });
  }
}

// PUT: 更新价格规则
export async function PUT(req: Request) {
  const { t } = await getT();
  const auth = requireAdmin(req);
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
    const existing = await prisma.pricingRule.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: t("api.pricingRuleNotFound") }, { status: 404 });
    }

    // 如果路线或车型改变，检查是否会产生冲突
    if (fromArea !== existing.fromArea || toArea !== existing.toArea || tripType !== existing.tripType || vehicleTypeId !== existing.vehicleTypeId) {
      const conflict = await prisma.pricingRule.findFirst({
        where: {
          fromArea,
          toArea,
          tripType,
          vehicleTypeId,
          NOT: { id }
        }
      });

      if (conflict) {
        return NextResponse.json({ error: t("api.pricingRuleExists") }, { status: 400 });
      }
    }

    // 验证车型是否存在
    if (vehicleTypeId !== existing.vehicleTypeId) {
      const vehicleType = await prisma.vehicleType.findUnique({ where: { id: vehicleTypeId } });
      if (!vehicleType) {
        return NextResponse.json({ error: t("api.vehicleTypeNotFound") }, { status: 404 });
      }
    }

    const rule = await prisma.pricingRule.update({
      where: { id },
      data: {
        fromArea,
        toArea,
        tripType,
        vehicleTypeId,
        basePriceJpy,
        nightFeeJpy: nightFeeJpy ?? 0,
        urgentFeeJpy: urgentFeeJpy ?? 0
      },
      include: { vehicleType: true }
    });

    return NextResponse.json({ rule });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? t("api.serverError") }, { status: 500 });
  }
}

// DELETE: 删除价格规则
export async function DELETE(req: Request) {
  const { t } = await getT();
  const auth = requireAdmin(req);
  if (!auth.ok) return NextResponse.json({ error: t(auth.error) }, { status: 401 });

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: t("api.invalidParams") }, { status: 400 });
    }

    const existing = await prisma.pricingRule.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: t("api.pricingRuleNotFound") }, { status: 404 });
    }

    await prisma.pricingRule.delete({ where: { id } });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? t("api.serverError") }, { status: 500 });
  }
}

