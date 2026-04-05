import { NextResponse } from 'next/server';

import { getCoopFundConfig } from '@/lib/coop-config';
import { ACTIVATION_PAI_THRESHOLD } from '@/lib/pai-store';

/** Публічні реквізити та параметри ПК (без секретів) */
export async function GET() {
  const paymentDetails =
    process.env.NEXT_PUBLIC_PAI_PAYMENT_DETAILS ??
    'Вкажіть реквізити в змінній середовища NEXT_PUBLIC_PAI_PAYMENT_DETAILS (картка / IBAN / інше).';

  const coop = getCoopFundConfig();

  return NextResponse.json({
    uahPerPai: 5,
    paymentDetails,
    entranceUah: coop.entranceUah,
    monthlyUah: coop.monthlyUah,
    activationPai: ACTIVATION_PAI_THRESHOLD,
  });
}
