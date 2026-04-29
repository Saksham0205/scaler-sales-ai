import { LeadProfile } from './personas';

export function buildNudgePrompt(profile: LeadProfile, curriculumContext: string = ''): string {
  const curriculumSection = curriculumContext
    ? `
VERIFIED SCALER PROGRAM DATA (sourced live from scaler.com — use this for any specific claims):
---
${curriculumContext.slice(0, 2000)}
---
When mentioning curriculum modules, fees, or alumni outcomes, reference the data above. If a specific detail is not covered, say "verify with the team" — never invent it.
`
    : `
NOTE: No live curriculum data available. Do NOT fabricate specific module names, placement percentages, or salary figures. Refer to Scaler programs generally and suggest the BDA confirm specifics on the call.
`;

  return `You are a sharp sales intelligence assistant briefing a BDA (Business Development Associate) at Scaler, an ed-tech company for software engineers. The BDA is reading this on their phone 2 minutes before calling the lead.

Write a WhatsApp message to the BDA. It must be:
- Short and scannable (under 200 words total)
- Written like a smart teammate's message, not a corporate memo
- Use short paragraphs and line breaks (no markdown headers)
- Honest about what is inferred vs. confirmed fact
${curriculumSection}
Include:
1. Who this person is in plain English (2-3 lines max)
2. Their likely persona/motivation (what's really driving them)
3. 2-3 angles that will resonate in the call (each tied to something specific from their profile)
4. 2-3 objections to expect with a one-line handle for each
5. A suggested opening line for the call (specific to this person, not generic)

Lead Profile:
- Name: ${profile.name}
- Role: ${profile.roleAndCompany}
- Experience: ${profile.yearsOfExperience} years
- Intent: ${profile.intent}
- LinkedIn/Background: ${profile.linkedinSummary}
- Program of Interest: ${profile.programOfInterest}

Keep it under 200 words. Be specific to this person, not generic.`;
}

export function buildExtractionPrompt(profile: LeadProfile, transcript: string): string {
  return `You are analyzing a sales call transcript between a Scaler BDA and a lead named ${profile.name}.

Extract and return a JSON object with this exact structure:
{
  "openQuestions": [
    {
      "question": "The exact question or concern the lead raised",
      "context": "Brief context about why they asked this",
      "priority": "high|medium|low"
    }
  ],
  "leadSentiment": "positive|neutral|skeptical|very_skeptical",
  "keyMotivation": "The single strongest thing driving this lead",
  "biggestHesitation": "The single biggest blocker or doubt",
  "personalContext": "Any personal details that should inform the PDF tone"
}

Transcript:
${transcript}

Lead Profile:
- Name: ${profile.name}
- Role: ${profile.roleAndCompany}  
- Experience: ${profile.yearsOfExperience} years
- Intent: ${profile.intent}
- Background: ${profile.linkedinSummary}

Return only valid JSON. No markdown, no preamble.`;
}

export function buildPDFContentPrompt(
  profile: LeadProfile,
  extraction: any,
  curriculumContext: string = ''
): string {
  const curriculumSection = curriculumContext
    ? `
LIVE CURRICULUM DATA (fetched directly from scaler.com — use this as your primary source for any curriculum, placement, or program claims):
---
${curriculumContext}
---
When answering questions about curriculum modules, placement stats, salary outcomes, or program structure — reference the data above. Quote it directly where possible. If the data above does not cover a specific claim, say explicitly: "Our team will confirm this detail" — never invent it.
`
    : `
NOTE: Live curriculum data could not be fetched. Do NOT fabricate curriculum details, module names, placement percentages, or salary figures. For any claim you cannot confirm from your training data, write: "Our curriculum team will follow up with the exact details on this."
`;

  return `You are writing the content for a personalised 2-3 page PDF document for ${profile.name}, a ${profile.roleAndCompany} with ${profile.yearsOfExperience} years of experience.

This PDF will be sent to ${profile.name} after their sales call with Scaler. Its job is to build enough trust that ${profile.name} takes Scaler's entrance test.
${curriculumSection}
Lead context:
- Their motivation: ${extraction.keyMotivation}
- Their biggest hesitation: ${extraction.biggestHesitation}
- Their sentiment from the call: ${extraction.leadSentiment}
- Personal context: ${extraction.personalContext}

Their open questions from the call:
${extraction.openQuestions.map((q: any, i: number) => `${i + 1}. ${q.question} (Priority: ${q.priority})`).join('\n')}

Write the PDF content as a JSON object with this structure:
{
  "badge": "A 3-5 word label for the top of the PDF — specific to this lead's situation (e.g. 'Breaking Into Product' or 'Applied AI at Senior Level' or 'First Job, Right Choice'). Not generic. Not marketing fluff.",
  "headline": "A personalised headline for ${profile.name} — not generic, references their specific situation",
  "openingParagraph": "2-3 sentences that show we listened to their call and understand exactly where they are",
  "sections": [
    {
      "title": "Section title addressing one of their questions",
      "content": "Substantive answer to their question. Ground every curriculum or placement claim in the live data above. If a specific detail is not in the live data, say so explicitly rather than fabricating.",
      "supportingDetail": "A concrete data point, alumni outcome reference, or logical argument that supports the answer — cite the live data where available"
    }
  ],
  "callToAction": {
    "heading": "A personalised CTA heading for ${profile.name}",
    "body": "2-3 sentences specific to their situation explaining why taking the entrance test now makes sense for them",
    "buttonText": "Take the Entrance Test"
  },
  "closingNote": "A warm, human closing line from 'The Scaler Team' — specific to their situation, not generic"
}

CRITICAL RULES:
- Every section must be specific to ${profile.name}'s situation. Mention their company, role, or specific question.
- Do NOT use generic ed-tech marketing language ("transform your career", "unlock your potential")
- Curriculum claims MUST be grounded in the live data above. If the live data doesn't cover it, flag it explicitly.
- If referencing salary outcomes, only use figures found in the live data. If none are present, write directionally: "Scaler alumni in similar profiles have reported significant jumps — our team will share verified numbers."
- The tone should match the lead's sentiment: ${extraction.leadSentiment === 'skeptical' || extraction.leadSentiment === 'very_skeptical' ? 'be direct, honest, evidence-forward — skip the hype' : 'be warm and encouraging but still specific'}
- For ${profile.name} specifically: ${profile.yearsOfExperience === 0 ? 'they are a student with family pressure — be reassuring about placement support and financing, acknowledge the risk they are taking' : profile.yearsOfExperience >= 8 ? 'they are experienced — treat them as a peer, not a customer. They will see through fluff instantly.' : 'they are mid-career — focus on the career trajectory shift and concrete ROI'}

Return only valid JSON. No markdown, no preamble.`;
}

export function buildCoveringMessagePrompt(profile: LeadProfile, extraction: any): string {
  return `Write a short WhatsApp covering message (3-4 sentences max) that accompanies a personalised PDF being sent to ${profile.name}.

Context:
- They just had a call with our BDA
- The PDF answers their specific questions
- We want them to read the PDF and take the entrance test
- Sign off as "The Scaler Team"

Their key concern: ${extraction.biggestHesitation}
Their motivation: ${extraction.keyMotivation}

The message should:
- Feel personal, not templated
- Reference something specific from their situation
- End with a soft nudge to look at the PDF and consider the entrance test
- Be warm but not pushy

Write only the message text. No quotes. No preamble.`;
}
