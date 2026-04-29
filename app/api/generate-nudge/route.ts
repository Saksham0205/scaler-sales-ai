import { NextRequest, NextResponse } from 'next/server';
import Groq from 'groq-sdk';
import { buildNudgePrompt } from '@/lib/prompts';
import { sendWhatsAppText } from '@/lib/twilio';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

function isValidPhone(phone: string): boolean {
  return phone.startsWith('+') && phone.replace(/\D/g, '').length >= 10;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const profile = {
      ...body.profile,
      name: (body.profile?.name ?? '').trim(),
      roleAndCompany: (body.profile?.roleAndCompany ?? '').trim(),
      intent: (body.profile?.intent ?? '').trim(),
      linkedinSummary: (body.profile?.linkedinSummary ?? '').trim(),
      transcript: (body.profile?.transcript ?? '').trim(),
    };
    const bdaPhone = (body.bdaPhone ?? '').trim();

    if (!profile.name) {
      return NextResponse.json({ error: 'Lead name is required' }, { status: 400 });
    }

    if (bdaPhone && !isValidPhone(bdaPhone)) {
      return NextResponse.json(
        { error: 'BDA phone number must include country code (e.g. +91XXXXXXXXXX)' },
        { status: 400 }
      );
    }

    const prompt = buildNudgePrompt(profile);

    const completion = await groq.chat.completions.create({
      model: 'meta-llama/llama-4-scout-17b-16e-instruct',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 600,
    });
    let nudgeText = completion.choices[0]?.message?.content?.trim() || '';

    // Retry once if Groq returned empty
    if (!nudgeText) {
      console.log('generate-nudge: empty response, retrying...');
      const retry = await groq.chat.completions.create({
        model: 'meta-llama/llama-4-scout-17b-16e-instruct',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 600,
      });
      nudgeText = retry.choices[0]?.message?.content?.trim() || '';
    }

    if (!nudgeText) {
      return NextResponse.json(
        { error: 'Failed to generate nudge — AI returned empty response' },
        { status: 500 }
      );
    }

    // Send to BDA — failure here must NOT fail the whole request
    let sent = false;
    if (bdaPhone) {
      try {
        await sendWhatsAppText(bdaPhone, `🎯 *Pre-Call Brief*\n\n${nudgeText}`);
        sent = true;
      } catch (twilioErr: any) {
        console.error('Twilio send failed (nudge):', twilioErr.message);
      }
    }

    return NextResponse.json({ nudge: nudgeText, sent });
  } catch (error: any) {
    console.error('generate-nudge error:', error);
    return NextResponse.json(
      { error: error.message ?? 'Internal server error' },
      { status: 500 }
    );
  }
}
