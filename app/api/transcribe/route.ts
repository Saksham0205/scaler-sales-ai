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
    const transcript = ((transcription as unknown) as string).trim();

    if (!transcript) {
      return NextResponse.json(
        {
          error:
            'Could not transcribe audio. Please check the file has clear speech.',
        },
        { status: 400 }
      );
    }

    return NextResponse.json({ transcript });
  } catch (error: any) {
    console.error('transcribe error:', error);
    return NextResponse.json(
      { error: error.message ?? 'Transcription failed — please try again' },
      { status: 500 }
    );
  }
}
