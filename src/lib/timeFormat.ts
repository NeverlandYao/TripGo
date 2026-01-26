// 时间格式化工具，统一显示 JST 时区

export function formatDateTimeJST(date: Date | string, locale: string = "zh-CN"): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const isZh = locale.startsWith("zh");
  const options: Intl.DateTimeFormatOptions = {
    year: "numeric",
    month: isZh ? "numeric" : "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Tokyo",
    timeZoneName: "short"
  };
  const formatted = new Intl.DateTimeFormat(locale, options).format(d);
  // 确保显示 JST
  if (formatted.includes("JST") || formatted.includes("GMT+9")) {
    return formatted;
  }
  return `${formatted} (JST)`;
}

export function formatDateJST(date: Date | string, locale: string = "zh-CN"): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const isZh = locale.startsWith("zh");
  const options: Intl.DateTimeFormatOptions = {
    year: "numeric",
    month: isZh ? "numeric" : "short",
    day: "numeric",
    timeZone: "Asia/Tokyo"
  };
  return new Intl.DateTimeFormat(locale, options).format(d);
}

export function formatTimeJST(date: Date | string, locale: string = "zh-CN"): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const options: Intl.DateTimeFormatOptions = {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Tokyo"
  };
  const time = new Intl.DateTimeFormat(locale, options).format(d);
  return `${time} JST`;
}

