import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { buildNudgePrompt } from '@/lib/prompts';
import { sendWhatsAppText } from '@/lib/twilio';

const genai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function POST(req: NextRequest) {
  try {
    const { profile, bdaPhone } = await req.json();

    const prompt = buildNudgePrompt(profile);

    const model = genai.getGenerativeModel({ model: 'gemini-flash-latest' });
    const result = await model.generateContent(prompt);
    const nudgeText = result.response.text();

    if (bdaPhone) {
      await sendWhatsAppText(bdaPhone, `🎯 *Pre-Call Brief*\n\n${nudgeText}`);
    }

    return NextResponse.json({ nudge: nudgeText, sent: !!bdaPhone });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
