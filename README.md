## What I built
I built a two-part AI agent for Scaler's sales team. Before a call, the BDA gets a WhatsApp message — a short, plain-English brief on who they're about to call: what's likely driving the lead, the objections to expect and a suggested opening line specific to that person. After the call, the agent reads the transcript (or transcribes a call recording), pulls out every open question the lead raised and generates a personalised 2–3 page PDF that actually answers those questions — no generic marketing copy, no fabricated curriculum claims. The BDA reviews the PDF and a draft covering message, then hits Approve to send both to the lead's WhatsApp. The whole thing runs in a Next.js app deployed on Vercel, uses Llama 4 via Groq for generation and Whisper for transcription, and stores PDFs on Vercel Blob for stable public URLs.

## One failure I found
Honest example: when the lead profile has very little 
information (e.g. Meera with no LinkedIn), the PDF 
content becomes more generic because the extraction 
has less to work with. The personalisation depth 
drops when input signal is thin.

## Scale plan
At 100k leads/month the first bottleneck is the PDF 
generation pipeline — each PDF makes 3 sequential LLM 
calls plus a Puppeteer render, taking 15-20 seconds per 
lead. At scale this needs a job queue (BullMQ/Redis), 
async PDF generation with webhook callbacks, and 
distributed Puppeteer instances. The second constraint 
is Twilio's WhatsApp throughput limits on the sandbox tier.