import { NextRequest, NextResponse } from 'next/server';
import Groq from 'groq-sdk';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

function cleanJSON(raw: string): string {
  return raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
}

export async function POST(req: NextRequest) {
  try {
    const { transcript } = await req.json();

    if (!transcript || typeof transcript !== 'string' || !transcript.trim()) {
      return NextResponse.json({ error: 'No transcript text provided' }, { status: 400 });
    }

    const extractionCompletion = await groq.chat.completions.create({
      model: 'meta-llama/llama-4-scout-17b-16e-instruct',
      messages: [
        {
          role: 'user',
          content: `From this sales call transcript, extract the lead's profile information. Return ONLY a JSON object, no markdown, no explanation.

{
  "name": "lead's full name if mentioned, else empty string",
  "roleAndCompany": "their current role and company, e.g. Product Intern, Aftershoot",
  "yearsOfExperience": number or 0 if fresher/student,
  "intent": "their career goal or reason for interest in Scaler",
  "linkedinSummary": "any background details mentioned in the call",
  "programOfInterest": "most relevant Scaler program based on their goals — one of: Scaler Academy, Scaler Data Science & ML, Scaler DevOps & Cloud"
}

Transcript:
${transcript.trim()}`,
        },
      ],
      max_tokens: 500,
    });

    let extractedProfile = null;
    try {
      const profileText = extractionCompletion.choices[0]?.message?.content || '{}';
      extractedProfile = JSON.parse(cleanJSON(profileText));
    } catch {
      extractedProfile = null;
    }

    if (!extractedProfile) {
      return NextResponse.json({ error: 'Could not extract profile from transcript' }, { status: 422 });
    }

    return NextResponse.json({ extractedProfile });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Profile extraction failed — please try again';
    console.error('extract-profile error:', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
