import { NextRequest, NextResponse } from 'next/server';
import Groq from 'groq-sdk';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const ALLOWED_MIME_TYPES = new Set([
  'audio/mpeg',
  'audio/wav',
  'audio/mp4',
  'audio/webm',
  'audio/m4a',
  'audio/x-m4a',
  'video/mp4',
]);

const ALLOWED_EXTENSIONS = new Set(['mp3', 'wav', 'm4a', 'webm', 'mp4']);

const MAX_SIZE_BYTES = 25 * 1024 * 1024; // 25 MB

function cleanJSON(raw: string): string {
  return raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('audio') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No audio file provided' }, { status: 400 });
    }

    if (file.size > MAX_SIZE_BYTES) {
      return NextResponse.json(
        { error: 'Audio file too large. Maximum size is 25MB.' },
        { status: 400 }
      );
    }

    const extension = file.name.split('.').pop()?.toLowerCase() ?? '';
    if (!ALLOWED_MIME_TYPES.has(file.type) && !ALLOWED_EXTENSIONS.has(extension)) {
      return NextResponse.json(
        {
          error:
            'Invalid file type. Please upload an MP3, WAV, M4A, or WebM file.',
        },
        { status: 400 }
      );
    }

    const transcription = await groq.audio.transcriptions.create({
      file,
      model: 'whisper-large-v3-turbo',
      response_format: 'text',
    });

    // Groq returns a plain string when response_format is 'text'
    const rawTranscript = ((transcription as unknown) as string).trim();

    if (!rawTranscript) {
      return NextResponse.json(
        {
          error:
            'Could not transcribe audio. Please check the file has clear speech.',
        },
        { status: 400 }
      );
    }

    // Format into speaker-labeled dialogue
    const formattingCompletion = await groq.chat.completions.create({
      model: 'meta-llama/llama-4-scout-17b-16e-instruct',
      messages: [
        {
          role: 'user',
          content: `The following is a raw transcription of a sales call between a Scaler sales agent (Priya) and a lead/prospect. Format it as a clean dialogue with speaker labels.

Rules:
- Label the Scaler agent lines as "BDA:"
- Label the prospect/lead lines as "Lead:"
- Each speaker turn on its own line
- Do not add, remove, or change any words — only add labels
- If you cannot determine the speaker, label as "Speaker:"
- Output only the formatted transcript, nothing else

Raw transcript:
${rawTranscript}`,
        },
      ],
      max_tokens: 2000,
    });

    const formattedTranscript =
      formattingCompletion.choices[0]?.message?.content || rawTranscript;

    // Extract lead profile from the formatted transcript
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
${formattedTranscript}`,
        },
      ],
      max_tokens: 500,
    });

    let extractedProfile = null;
    try {
      const profileText =
        extractionCompletion.choices[0]?.message?.content || '{}';
      extractedProfile = JSON.parse(cleanJSON(profileText));
    } catch {
      extractedProfile = null;
    }

    return NextResponse.json({ transcript: formattedTranscript, extractedProfile });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Transcription failed — please try again';
    console.error('transcribe error:', error);
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
