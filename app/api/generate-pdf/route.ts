import { NextRequest, NextResponse } from 'next/server';
import Groq from 'groq-sdk';
import {
  buildExtractionPrompt,
  buildPDFContentPrompt,
  buildCoveringMessagePrompt,
} from '@/lib/prompts';
import { generatePDF, buildPDFHTML, buildPDFFooter } from '@/lib/pdf';
import { put } from '@vercel/blob';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const TIMEOUT_MS = 45_000;

function cleanJSON(raw: string): string {
  return raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
}

async function generateJSON(prompt: string, stepName: string): Promise<any> {
  let raw = '';
  try {
    const completion = await groq.chat.completions.create({
      model: 'meta-llama/llama-4-scout-17b-16e-instruct',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 1000,
    });
    raw = completion.choices[0]?.message?.content || '{}';
    return JSON.parse(cleanJSON(raw));
  } catch {
    console.log(`${stepName}: JSON parse failed, retrying with strict JSON prompt...`);
    const strictPrompt =
      prompt + '\n\nReturn ONLY raw JSON. No markdown. No backticks. No explanation.';
    const retry = await groq.chat.completions.create({
      model: 'meta-llama/llama-4-scout-17b-16e-instruct',
      messages: [{ role: 'user', content: strictPrompt }],
      max_tokens: 1000,
    });
    raw = retry.choices[0]?.message?.content || '{}';
    return JSON.parse(cleanJSON(raw));
  }
}

async function handleRequest(req: NextRequest): Promise<NextResponse> {
  const body = await req.json();

  const profile = {
    ...body.profile,
    name: (body.profile?.name ?? '').trim(),
    roleAndCompany: (body.profile?.roleAndCompany ?? '').trim(),
    intent: (body.profile?.intent ?? '').trim(),
    linkedinSummary: (body.profile?.linkedinSummary ?? '').trim(),
  };
  const transcript = (body.transcript ?? '').trim();

  if (!profile.name) {
    return NextResponse.json({ error: "Lead name is required" }, { status: 400 });
  }

  if (!transcript || transcript.length < 20) {
    return NextResponse.json(
      { error: 'Transcript too short to extract questions from' },
      { status: 400 }
    );
  }

  // Step 1
  console.log('Step 1: Extracting questions...');
  const extraction = await generateJSON(
    buildExtractionPrompt(profile, transcript),
    'Step 1'
  );

  // Step 2
  console.log('Step 2: Generating PDF content...');
  const pdfContent = await generateJSON(
    buildPDFContentPrompt(profile, extraction),
    'Step 2'
  );

  // Ensure sections array is present and non-empty
  if (!Array.isArray(pdfContent.sections) || pdfContent.sections.length === 0) {
    pdfContent.sections = [
      {
        title: 'About Scaler',
        content: 'Our team will follow up with detailed information.',
        supportingDetail: '',
      },
    ];
  }

  // Step 3
  console.log('Step 3: Generating covering message...');
  const coveringCompletion = await groq.chat.completions.create({
    model: 'meta-llama/llama-4-scout-17b-16e-instruct',
    messages: [{ role: 'user', content: buildCoveringMessagePrompt(profile, extraction) }],
    max_tokens: 2000,
  });
  const coveringMessage = coveringCompletion.choices[0]?.message?.content?.trim() || '';

  // Step 4
  console.log('Step 4: Building PDF...');
  let pdfBuffer: Buffer;
  try {
    const htmlContent = buildPDFHTML(profile, pdfContent);
    const footerHtml = buildPDFFooter(
      pdfContent?.closingNote ?? '— The Scaler Team',
      new Date().getFullYear()
    );
    pdfBuffer = await generatePDF(htmlContent, footerHtml);
  } catch (e: any) {
    console.error('Puppeteer PDF generation failed:', e);
    return NextResponse.json(
      { error: 'PDF generation failed — try again' },
      { status: 500 }
    );
  }

  // Step 5
  console.log('Step 5: Saving PDF file...');
  const firstName = profile.name.trim().split(/\s+/)[0].toLowerCase();
  const fileName = `scaler-${firstName}.pdf`;
  const blob = await put(fileName, pdfBuffer, {
    access: 'public',
    contentType: 'application/pdf',
    allowOverwrite: true,
  });

  return NextResponse.json({
    extraction,
    pdfContent,
    coveringMessage,
    pdfUrl: blob.url,
    fileName,
  });
}

export async function POST(req: NextRequest) {
  const timeoutPromise = new Promise<never>((_, reject) =>
    setTimeout(
      () => reject(new Error('Request timed out — please try again')),
      TIMEOUT_MS
    )
  );

  try {
    return await Promise.race([handleRequest(req), timeoutPromise]);
  } catch (error: any) {
    console.error('generate-pdf error:', error);
    const isTimeout = error.message?.includes('timed out');
    return NextResponse.json(
      { error: error.message ?? 'Internal server error' },
      { status: isTimeout ? 504 : 500 }
    );
  }
}
