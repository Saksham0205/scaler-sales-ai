import twilio from 'twilio';

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID!,
  process.env.TWILIO_AUTH_TOKEN!
);

const FROM = process.env.TWILIO_WHATSAPP_FROM!; // whatsapp:+14155238886

export async function sendWhatsAppText(to: string, message: string) {
  const toFormatted = to.startsWith('whatsapp:') ? to : `whatsapp:${to}`;
  return client.messages.create({
    from: FROM,
    to: toFormatted,
    body: message,
  });
}

export async function sendWhatsAppMedia(to: string, message: string, mediaUrl: string) {
  const toFormatted = to.startsWith('whatsapp:') ? to : `whatsapp:${to}`;
  return client.messages.create({
    from: FROM,
    to: toFormatted,
    body: message,
    mediaUrl: [mediaUrl],
  });
}
