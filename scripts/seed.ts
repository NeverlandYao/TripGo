import { prisma } from "../src/lib/prisma";

async function main() {
  // Vehicle types
  const vehicles = await prisma.vehicleType.findMany();
  if (vehicles.length === 0) {
    await prisma.vehicleType.createMany({
      data: [
        {
          name: "5座车（经济型）",
          seats: 4,
          luggageSmall: 2,
          luggageMedium: 1,
          luggageLarge: 1,
          description: "适合 1-3 人轻装出行"
        },
        {
          name: "7座车（商务型）",
          seats: 6,
          luggageSmall: 4,
          luggageMedium: 3,
          luggageLarge: 2,
          description: "适合家庭/多人出行"
        },
        {
          name: "9座车（大空间）",
          seats: 8,
          luggageSmall: 6,
          luggageMedium: 4,
          luggageLarge: 3,
          description: "适合行李较多或 6-8 人"
        },
        {
          name: "豪华型（VIP）",
          seats: 4,
          luggageSmall: 3,
          luggageMedium: 2,
          luggageLarge: 2,
          isLuxury: true,
          description: "更舒适的商务接待"
        },
        {
          name: "大巴车（团体）",
          seats: 20,
          luggageSmall: 20,
          luggageMedium: 20,
          luggageLarge: 20,
          isBus: true,
          description: "团队出行与大型行李"
        }
      ]
    });
  }

  const allVehicles = await prisma.vehicleType.findMany();
  const byName = new Map(allVehicles.map((v) => [v.name, v.id]));

  // Pricing rules (demo)
  // 清除旧的报价规则，重新生成
  await prisma.pricingRule.deleteMany();
  
  const airports = ["NRT", "HND", "KIX", "NGO", "CTS"];
    const popularAreas = ["Shinjuku", "Shibuya", "Ginza", "Asakusa", "Ueno", "Ikebukuro", "Namba", "Umeda", "Dotonbori", "Gion", "Kyoto Station"];
    
    const routes: Array<{ fromArea: string; toArea: string; tripType: "PICKUP" | "DROPOFF" }> = [];
    
    // 生成所有机场到热门区域的接机路由
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
        await prisma.pricingRule.create({
          data: {
            fromArea: r.fromArea,
            toArea: r.toArea,
            tripType: r.tripType,
            basePriceJpy: vp.base,
            nightFeeJpy: vp.night,
            urgentFeeJpy: vp.urgent,
            vehicleTypeId
          }
        });
      }
    }
  }

main()
  .then(async () => {
    await prisma.$disconnect();
    console.log("Seed done.");
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });


