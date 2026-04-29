import puppeteer from 'puppeteer-core';
import chromium from '@sparticuz/chromium-min';

export async function generatePDF(htmlContent: string): Promise<Buffer> {
  let browser;
  try {
    browser = await puppeteer.launch({
      args: chromium.args,
      defaultViewport: { width: 1280, height: 900 },
      executablePath: await chromium.executablePath(
        'https://github.com/Sparticuz/chromium/releases/download/v121.0.0/chromium-v121.0.0-pack.tar'
      ),
      headless: true,
    });
  } catch (e: any) {
    throw new Error('PDF engine failed to start');
  }

  try {
    const page = await browser.newPage();
    await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
    const pdf = await page.pdf({ format: 'A4', printBackground: true });
    return Buffer.from(pdf);
  } finally {
    await browser.close().catch(() => {});
  }
}

function safe(value: unknown, fallback: string): string {
  if (value === null || value === undefined || value === '') return fallback;
  return String(value);
}

export function buildPDFHTML(profile: any, content: any): string {
  const SCALER_BLUE = '#0052CC';
  const SCALER_ORANGE = '#FF6B35';
  const DARK_TEXT = '#1A1A2E';
  const LIGHT_BG = '#F8FAFF';
  const BORDER_COLOR = '#E5EBF5';

  const logoBase64 = 'data:image/jpeg;base64,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';

  const yoe = typeof profile?.yearsOfExperience === 'number' ? profile.yearsOfExperience : -1;
  const fallbackBadge =
    yoe === 0 ? 'Your Path to a Product Company' :
    yoe >= 8  ? 'Senior Engineer — Peer Review' :
                'Career Transition Plan';
  const heroBadge = safe(content?.badge, fallbackBadge);

  const headline = safe(content?.headline, 'Your Personalised Scaler Overview');
  const openingParagraph = safe(
    content?.openingParagraph,
    'Thank you for speaking with us.'
  );
  const ctaHeading = safe(
    content?.callToAction?.heading,
    'Ready to take the next step?'
  );
  const ctaBody = safe(
    content?.callToAction?.body,
    'Take the entrance test to get started.'
  );
  const ctaButtonText = safe(content?.callToAction?.buttonText, 'Take the Entrance Test');
  const closingNote = safe(content?.closingNote, '— The Scaler Team');

  const sections: any[] = Array.isArray(content?.sections) ? content.sections : [];

  const sectionsHTML = sections
    .map(
      (section: any) => `
    <div class="section">
      <div class="section-header">
        <svg class="section-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
        <h2>${safe(section?.title, 'Overview')}</h2>
      </div>
      <p class="section-content">${safe(section?.content, '')}</p>
      ${
        section?.supportingDetail
          ? `
          <div class="insight-box">
            <svg class="insight-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
            <div class="insight-text">${section.supportingDetail}</div>
          </div>
          `
          : ''
      }
    </div>
  `
    )
    .join('');

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>
  :root {
    --scaler-blue: #0052CC;
    --scaler-orange: #FF6B35;
    --text-main: #0F172A;
    --text-muted: #475569;
    --bg-light: #F8FAFC;
    --border: #E2E8F0;
  }
  
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { 
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; 
    color: var(--text-main); 
    background: white; 
    -webkit-font-smoothing: antialiased;
  }

  .page-header { 
    display: flex; 
    justify-content: space-between; 
    align-items: center; 
    padding: 32px 48px; 
    border-bottom: 1px solid var(--border); 
  }
  .logo-container { display: flex; align-items: center; gap: 12px; }
  .logo-img { height: 32px; width: 32px; object-fit: contain; }
  .logo-text { font-size: 22px; font-weight: 700; color: var(--text-main); letter-spacing: -0.5px; }
  .logo-text span { color: var(--scaler-orange); }
  .header-meta { text-align: right; font-size: 12px; color: var(--text-muted); line-height: 1.4; }
  .header-meta strong { color: var(--text-main); font-weight: 600; }

  .hero { 
    background: var(--scaler-blue); 
    color: white; 
    padding: 56px 48px; 
    position: relative; 
    overflow: hidden; 
  }
  .hero-badge { 
    display: inline-block; 
    background: rgba(255,107,53,0.15); 
    color: #FFDbc9; 
    border: 1px solid rgba(255,107,53,0.3); 
    padding: 6px 16px; 
    border-radius: 20px; 
    font-size: 11px; 
    font-weight: 600; 
    letter-spacing: 1px; 
    text-transform: uppercase; 
    margin-bottom: 24px; 
  }
  .hero h1 { 
    font-size: 36px; 
    font-weight: 700; 
    line-height: 1.25; 
    margin-bottom: 20px; 
    letter-spacing: -1px; 
    max-width: 90%;
  }
  .hero p { 
    font-size: 16px; 
    color: rgba(255,255,255,0.9); 
    max-width: 85%; 
    line-height: 1.7; 
  }

  .content-wrapper { padding: 48px; }
  
  .section { margin-bottom: 48px; page-break-inside: avoid; }
  .section:last-child { margin-bottom: 0; }
  
  .section-header { display: flex; align-items: center; gap: 12px; margin-bottom: 16px; }
  .section-icon { width: 24px; height: 24px; color: var(--scaler-orange); }
  .section h2 { font-size: 22px; font-weight: 700; color: var(--text-main); letter-spacing: -0.5px; }
  
  .section-content { 
    font-size: 15px; 
    color: var(--text-muted); 
    line-height: 1.8; 
    margin-bottom: 24px; 
    padding-left: 36px; 
  }

  .insight-box { 
    background: var(--bg-light); 
    border-left: 4px solid var(--scaler-orange); 
    padding: 20px 24px; 
    border-radius: 0 8px 8px 0; 
    display: flex; 
    gap: 16px; 
    align-items: flex-start; 
    margin-left: 36px;
  }
  .insight-icon { width: 20px; height: 20px; color: var(--scaler-orange); flex-shrink: 0; margin-top: 2px; }
  .insight-text { font-size: 14px; color: var(--text-main); font-weight: 500; line-height: 1.6; }

  .cta-section { 
    background: var(--bg-light); 
    border: 1px solid var(--border); 
    border-radius: 16px; 
    padding: 48px; 
    text-align: center; 
    margin: 0 48px 48px; 
    page-break-inside: avoid; 
  }
  .cta-section h3 { font-size: 24px; font-weight: 700; color: var(--text-main); margin-bottom: 16px; letter-spacing: -0.5px; }
  .cta-section p { font-size: 15px; color: var(--text-muted); margin-bottom: 32px; max-width: 80%; margin-left: auto; margin-right: auto; line-height: 1.7; }
  .cta-btn { 
    display: inline-block; 
    background: var(--scaler-orange); 
    color: white; 
    padding: 16px 32px; 
    border-radius: 8px; 
    font-weight: 600; 
    text-decoration: none; 
    font-size: 16px; 
  }

  .footer { 
    padding: 32px 48px; 
    border-top: 1px solid var(--border); 
    display: flex; 
    justify-content: space-between; 
    align-items: center; 
  }
  .footer p { font-size: 12px; color: var(--text-muted); }
  .footer .signature { font-style: italic; font-weight: 500; }
</style>
</head>
<body>

<div class="page-header">
  <div class="logo-container">
    <img src="${logoBase64}" class="logo-img" alt="Scaler Logo" />
    <div class="logo-text">Scaler<span>.</span></div>
  </div>
  <div class="header-meta">
    Prepared exclusively for<br><strong>${safe(profile?.name, 'You')}</strong>
  </div>
</div>

<div class="hero">
  <div class="hero-badge">${heroBadge}</div>
  <h1>${headline}</h1>
  <p>${openingParagraph}</p>
</div>

<div class="content-wrapper">
  ${sectionsHTML}
</div>

<div class="cta-section">
  <h3>${ctaHeading}</h3>
  <p>${ctaBody}</p>
  <a href="https://www.scaler.com/test" class="cta-btn">${ctaButtonText}</a>
</div>

<div class="footer">
  <p>© ${new Date().getFullYear()} Scaler. All rights reserved.</p>
  <p class="signature">${closingNote}</p>
</div>

</body>
</html>`;
}
