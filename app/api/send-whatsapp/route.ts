import { NextRequest, NextResponse } from 'next/server';
import { sendWhatsAppText, sendWhatsAppMedia } from '@/lib/twilio';

function isValidPhone(phone: string): boolean {
  return typeof phone === 'string' && phone.startsWith('+') && phone.replace(/\D/g, '').length >= 10;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const to = (body.to ?? '').trim();
    const message = (body.message ?? '').trim();
    const pdfUrl: string | undefined = body.pdfUrl;
    const type: string = body.type ?? 'text';

    if (!isValidPhone(to)) {
      return NextResponse.json(
        { error: 'Phone number must include country code (e.g. +91XXXXXXXXXX)' },
        { status: 400 }
      );
    }

    if (!message) {
      return NextResponse.json({ error: 'Message cannot be empty' }, { status: 400 });
    }

    if (type === 'pdf' && pdfUrl && !pdfUrl.startsWith('https://')) {
      return NextResponse.json(
        { error: 'PDF URL must be publicly accessible (https)' },
        { status: 400 }
      );
    }

    try {
      if (type === 'text') {
        await sendWhatsAppText(to, message);
      } else if (type === 'pdf') {
        await sendWhatsAppMedia(to, message, pdfUrl!);
      }
    } catch (twilioErr: any) {
      console.error('Twilio error:', twilioErr);
      const msg =
        twilioErr?.message ?? 'WhatsApp send failed — check number and Twilio configuration';
      return NextResponse.json({ error: msg }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('send-whatsapp error:', error);
    return NextResponse.json(
      { error: error.message ?? 'Internal server error' },
      { status: 500 }
    );
  }
}
