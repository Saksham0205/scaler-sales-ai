import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import {
  buildExtractionPrompt,
  buildPDFContentPrompt,
  buildCoveringMessagePrompt,
} from '@/lib/prompts';
import { generatePDF, buildPDFHTML } from '@/lib/pdf';
import { put } from '@vercel/blob';

const genai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

function cleanJSON(raw: string): string {
  return raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
}

export async function POST(req: NextRequest) {
  try {
    const { profile, transcript } = await req.json();

    const model = genai.getGenerativeModel({ model: 'gemini-flash-latest' });

    // Step 1: Extract open questions from transcript
    const extractionResult = await model.generateContent(
      buildExtractionPrompt(profile, transcript)
    );
    const extractionText = extractionResult.response.text();
    const extraction = JSON.parse(cleanJSON(extractionText));

    // Step 2: Generate PDF content
    const contentResult = await model.generateContent(
      buildPDFContentPrompt(profile, extraction)
    );
    const contentText = contentResult.response.text();
    const pdfContent = JSON.parse(cleanJSON(contentText));

    // Step 3: Generate covering message
    const coveringResult = await model.generateContent(
      buildCoveringMessagePrompt(profile, extraction)
    );
    const coveringMessage = coveringResult.response.text();

    // Step 4: Generate PDF
    const htmlContent = buildPDFHTML(profile, pdfContent);
    const pdfBuffer = await generatePDF(htmlContent);

    // Upload PDF to Vercel Blob storage for a durable public URL
    const fileName = `scaler-${profile.name.replace(/\s+/g, '-').toLowerCase()}-${Date.now()}.pdf`;
    const blob = await put(fileName, pdfBuffer, {
      access: 'public',
      contentType: 'application/pdf',
    });

    const pdfUrl = blob.url;

    return NextResponse.json({
      extraction,
      pdfContent,
      coveringMessage,
      pdfUrl,
      fileName,
    });
  } catch (error: any) {
    console.error('PDF generation error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
