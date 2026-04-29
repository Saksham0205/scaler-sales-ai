import { NextRequest, NextResponse } from 'next/server';
import { sendWhatsAppText, sendWhatsAppMedia } from '@/lib/twilio';

export async function POST(req: NextRequest) {
  try {
    const { to, message, pdfUrl, type } = await req.json();

    if (type === 'text') {
      await sendWhatsAppText(to, message);
    } else if (type === 'pdf') {
      await sendWhatsAppMedia(to, message, pdfUrl);
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
