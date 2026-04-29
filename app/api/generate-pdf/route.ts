import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import {
  buildExtractionPrompt,
  buildPDFContentPrompt,
  buildCoveringMessagePrompt,
} from '@/lib/prompts';
import { generatePDF, buildPDFHTML } from '@/lib/pdf';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';

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

    // Save PDF to public folder with unique name
    const fileName = `scaler-${profile.name.replace(/\s+/g, '-').toLowerCase()}-${Date.now()}.pdf`;
    const pdfDir = path.join(process.cwd(), 'public', 'pdfs');
    await mkdir(pdfDir, { recursive: true });
    await writeFile(path.join(pdfDir, fileName), pdfBuffer);

    const pdfUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/pdfs/${fileName}`;

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
