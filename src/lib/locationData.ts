// 机场、航站楼、热门区域、酒店数据

export type AirportCode = "NRT" | "HND" | "KIX" | "NGO" | "CTS";

export interface AirportTerminal {
  code: AirportCode;
  name: { zh: string; en: string };
  terminals: Array<{ code: string; name: { zh: string; en: string } }>;
}

export interface PopularArea {
  code: string;
  name: { zh: string; en: string };
  city: string;
  lat?: number;
  lng?: number;
}

export interface PopularHotel {
  code: string;
  name: { zh: string; en: string };
  area: string;
  address?: string;
  lat?: number;
  lng?: number;
}

export const AIRPORTS: AirportTerminal[] = [
  {
    code: "NRT",
    name: { zh: "成田国际机场", en: "Narita International Airport" },
    terminals: [
      { code: "T1", name: { zh: "第1航站楼", en: "Terminal 1" } },
      { code: "T2", name: { zh: "第2航站楼", en: "Terminal 2" } },
      { code: "T3", name: { zh: "第3航站楼", en: "Terminal 3" } }
    ]
  },
  {
    code: "HND",
    name: { zh: "羽田机场", en: "Haneda Airport" },
    terminals: [
      { code: "T1", name: { zh: "第1航站楼", en: "Terminal 1" } },
      { code: "T2", name: { zh: "第2航站楼", en: "Terminal 2" } },
      { code: "T3", name: { zh: "第3航站楼", en: "Terminal 3" } }
    ]
  },
  {
    code: "KIX",
    name: { zh: "关西国际机场", en: "Kansai International Airport" },
    terminals: [
      { code: "T1", name: { zh: "第1航站楼", en: "Terminal 1" } },
      { code: "T2", name: { zh: "第2航站楼", en: "Terminal 2" } }
    ]
  },
  {
    code: "NGO",
    name: { zh: "中部国际机场", en: "Chubu Centrair International Airport" },
    terminals: [{ code: "T1", name: { zh: "航站楼", en: "Terminal" } }]
  },
  {
    code: "CTS",
    name: { zh: "新千岁机场", en: "New Chitose Airport" },
    terminals: [{ code: "T1", name: { zh: "航站楼", en: "Terminal" } }]
  }
];

export const POPULAR_AREAS: PopularArea[] = [
  { code: "Shinjuku", name: { zh: "新宿", en: "Shinjuku" }, city: "Tokyo", lat: 35.6938, lng: 139.7034 },
  { code: "Shibuya", name: { zh: "涩谷", en: "Shibuya" }, city: "Tokyo", lat: 35.6598, lng: 139.7006 },
  { code: "Ginza", name: { zh: "银座", en: "Ginza" }, city: "Tokyo", lat: 35.6719, lng: 139.7659 },
  { code: "Asakusa", name: { zh: "浅草", en: "Asakusa" }, city: "Tokyo", lat: 35.7148, lng: 139.7967 },
  { code: "Ueno", name: { zh: "上野", en: "Ueno" }, city: "Tokyo", lat: 35.7138, lng: 139.7773 },
  { code: "Ikebukuro", name: { zh: "池袋", en: "Ikebukuro" }, city: "Tokyo", lat: 35.7295, lng: 139.7169 },
  { code: "Namba", name: { zh: "难波", en: "Namba" }, city: "Osaka", lat: 34.6636, lng: 135.5017 },
  { code: "Umeda", name: { zh: "梅田", en: "Umeda" }, city: "Osaka", lat: 34.7054, lng: 135.4983 },
  { code: "Dotonbori", name: { zh: "道顿堀", en: "Dotonbori" }, city: "Osaka", lat: 34.6698, lng: 135.5019 },
  { code: "Gion", name: { zh: "祇园", en: "Gion" }, city: "Kyoto", lat: 35.0038, lng: 135.7749 },
  { code: "Kyoto Station", name: { zh: "京都站", en: "Kyoto Station" }, city: "Kyoto", lat: 34.9858, lng: 135.7581 }
];

export const POPULAR_HOTELS: PopularHotel[] = [
  {
    code: "shinjuku-grand",
    name: { zh: "新宿格兰贝尔酒店", en: "Shinjuku Grand Bell Hotel" },
    area: "Shinjuku",
    address: "Tokyo, Shinjuku"
  },
  {
    code: "shibuya-excel",
    name: { zh: "涩谷Excel酒店东急", en: "Shibuya Excel Hotel Tokyu" },
    area: "Shibuya",
    address: "Tokyo, Shibuya"
  },
  {
    code: "ginza-marriott",
    name: { zh: "银座万豪酒店", en: "Ginza Marriott Hotel" },
    area: "Ginza",
    address: "Tokyo, Ginza"
  },
  {
    code: "osaka-hilton",
    name: { zh: "大阪希尔顿酒店", en: "Osaka Hilton Hotel" },
    area: "Umeda",
    address: "Osaka, Umeda"
  },
  {
    code: "kyoto-hyatt",
    name: { zh: "京都凯悦酒店", en: "Kyoto Hyatt Regency" },
    area: "Kyoto Station",
    address: "Kyoto"
  }
];

export function findAirportByCode(code: string): AirportTerminal | undefined {
  return AIRPORTS.find((a) => a.code === code.toUpperCase());
}

export function findAreaByCode(code: string): PopularArea | undefined {
  return POPULAR_AREAS.find((a) => a.code === code);
}

export function searchLocations(query: string, locale: string = "zh"): Array<PopularArea | PopularHotel> {
  const q = query.toLowerCase().trim();
  if (!q) return [];
  const isZh = locale.startsWith("zh");
  const results: Array<PopularArea | PopularHotel> = [];
  // 搜索区域
  for (const area of POPULAR_AREAS) {
    const name = isZh ? area.name.zh : area.name.en;
    if (name.toLowerCase().includes(q) || area.code.toLowerCase().includes(q)) {
      results.push(area);
    }
  }
  // 搜索酒店
  for (const hotel of POPULAR_HOTELS) {
    const name = isZh ? hotel.name.zh : hotel.name.en;
    if (name.toLowerCase().includes(q) || hotel.code.toLowerCase().includes(q)) {
      results.push(hotel);
    }
  }
  return results.slice(0, 10);
}

/**
 * 从选中的地点字符串中提取用于匹配报价规则的代码
 * 1. 如果是机场格式 "NRT T1 - ..." -> 返回 "NRT"
 * 2. 如果是酒店名，尝试找到对应的区域代码
 * 3. 否则返回原字符串或匹配到的区域代码
 */
export function getPricingAreaCode(location: string): string {
  if (!location) return "";

  // 1. 检查是否为机场格式 (e.g., "NRT T1 - ...")
  const airportMatch = location.match(/^([A-Z]{3})\s/);
  if (airportMatch) {
    return airportMatch[1];
  }

  // 2. 检查是否为热门区域的代码或名称
  const area = POPULAR_AREAS.find(
    (a) => a.code === location || a.name.zh === location || a.name.en === location
  );
  if (area) return area.code;

  // 3. 检查是否为酒店
  const hotel = POPULAR_HOTELS.find(
    (h) => h.code === location || h.name.zh === location || h.name.en === location
  );
  if (hotel) return hotel.area; // 返回酒店所在的区域代码

  return location;
}

