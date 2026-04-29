import puppeteer from 'puppeteer-core';
import chromium from '@sparticuz/chromium-min';

export async function generatePDF(htmlContent: string): Promise<Buffer> {
  const browser = await puppeteer.launch({
    args: chromium.args,
    defaultViewport: { width: 1280, height: 900 },
    executablePath: await chromium.executablePath(
      'https://github.com/Sparticuz/chromium/releases/download/v121.0.0/chromium-v121.0.0-pack.tar'
    ),
    headless: true,
  });

  const page = await browser.newPage();
  await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
  const pdf = await page.pdf({ format: 'A4', printBackground: true });
  await browser.close();
  return Buffer.from(pdf);
}

export function buildPDFHTML(profile: any, content: any): string {
  const SCALER_BLUE = '#0052CC';
  const SCALER_ORANGE = '#FF6B35';
  const DARK_TEXT = '#1A1A2E';
  const LIGHT_BG = '#F8FAFF';
  const BORDER_COLOR = '#E5EBF5';

  const sectionsHTML = content.sections
    .map(
      (section: any) => `
    <div class="section">
      <h2 class="section-title">${section.title}</h2>
      <p class="section-content">${section.content}</p>
      ${section.supportingDetail ? `<div class="supporting-detail">${section.supportingDetail}</div>` : ''}
    </div>
  `
    )
    .join('');

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: ${DARK_TEXT}; background: white; }

  .header {
    background: ${SCALER_BLUE};
    padding: 32px 48px;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  .logo-area { display: flex; align-items: center; gap: 12px; }
  .logo-text { color: white; font-size: 24px; font-weight: 700; letter-spacing: -0.5px; }
  .logo-dot { color: ${SCALER_ORANGE}; }
  .header-tagline { color: rgba(255,255,255,0.7); font-size: 12px; margin-top: 4px; }
  .doc-label { color: rgba(255,255,255,0.5); font-size: 11px; text-align: right; }

  .hero {
    background: ${LIGHT_BG};
    border-bottom: 3px solid ${SCALER_ORANGE};
    padding: 40px 48px;
  }
  .hero-label { color: ${SCALER_ORANGE}; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 12px; }
  .hero-headline { font-size: 28px; font-weight: 700; color: ${DARK_TEXT}; line-height: 1.3; margin-bottom: 16px; }
  .hero-opening { font-size: 15px; color: #444; line-height: 1.7; }

  .content { padding: 40px 48px; }

  .section { margin-bottom: 36px; padding-bottom: 36px; border-bottom: 1px solid ${BORDER_COLOR}; }
  .section:last-child { border-bottom: none; }
  .section-title { font-size: 18px; font-weight: 700; color: ${SCALER_BLUE}; margin-bottom: 12px; padding-left: 12px; border-left: 4px solid ${SCALER_ORANGE}; }
  .section-content { font-size: 14px; line-height: 1.8; color: #333; margin-bottom: 12px; }
  .supporting-detail { background: ${LIGHT_BG}; border: 1px solid ${BORDER_COLOR}; border-radius: 8px; padding: 14px 18px; font-size: 13px; color: #555; line-height: 1.6; }

  .cta-box {
    background: linear-gradient(135deg, ${SCALER_BLUE} 0%, #003d99 100%);
    border-radius: 12px;
    padding: 36px 40px;
    margin: 40px 48px;
    text-align: center;
  }
  .cta-heading { color: white; font-size: 22px; font-weight: 700; margin-bottom: 12px; }
  .cta-body { color: rgba(255,255,255,0.85); font-size: 14px; line-height: 1.7; margin-bottom: 24px; }
  .cta-button { background: ${SCALER_ORANGE}; color: white; padding: 14px 36px; border-radius: 8px; font-size: 16px; font-weight: 700; text-decoration: none; display: inline-block; }

  .footer { background: ${DARK_TEXT}; padding: 24px 48px; display: flex; align-items: center; justify-content: space-between; }
  .footer-text { color: rgba(255,255,255,0.5); font-size: 11px; }
  .footer-closing { color: rgba(255,255,255,0.7); font-size: 12px; font-style: italic; }

  .recipient-chip { display: inline-block; background: rgba(255,107,53,0.12); border: 1px solid rgba(255,107,53,0.3); border-radius: 20px; padding: 4px 14px; font-size: 12px; color: ${SCALER_ORANGE}; margin-bottom: 20px; }
</style>
</head>
<body>

<div class="header">
  <div class="logo-area">
    <div>
      <div class="logo-text">Scaler<span class="logo-dot">.</span></div>
      <div class="header-tagline">Engineering Education</div>
    </div>
  </div>
  <div class="doc-label">Personalised Program Overview<br>Prepared exclusively for ${profile.name}</div>
</div>

<div class="hero">
  <div class="recipient-chip">For ${profile.name} · ${profile.roleAndCompany}</div>
  <div class="hero-label">Your Personalised Overview</div>
  <h1 class="hero-headline">${content.headline}</h1>
  <p class="hero-opening">${content.openingParagraph}</p>
</div>

<div class="content">
  ${sectionsHTML}
</div>

<div class="cta-box">
  <div class="cta-heading">${content.callToAction.heading}</div>
  <div class="cta-body">${content.callToAction.body}</div>
  <a href="https://www.scaler.com/test" class="cta-button">${content.callToAction.buttonText} →</a>
</div>

<div class="footer">
  <div class="footer-text">© ${new Date().getFullYear()} Scaler · scaler.com · This document was prepared specifically for ${profile.name}</div>
  <div class="footer-closing">${content.closingNote}</div>
</div>

</body>
</html>`;
}
