/** Параметри розподілу внесків ПК (сервер + публічний прев’ю) */
export function getCoopFundConfig() {
  const entrance = Number(
    process.env.NEXT_PUBLIC_COOP_ENTRANCE_UAH ?? process.env.COOP_ENTRANCE_UAH ?? 50,
  );
  const monthly = Number(
    process.env.NEXT_PUBLIC_COOP_MONTHLY_UAH ?? process.env.COOP_MONTHLY_UAH ?? 0,
  );

  return {
    entranceUah: Number.isFinite(entrance) && entrance >= 0 ? entrance : 50,
    monthlyUah: Number.isFinite(monthly) && monthly >= 0 ? monthly : 0,
  };
}
