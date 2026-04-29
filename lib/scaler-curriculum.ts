/**
 * Fetches live curriculum data from scaler.com to ground the PDF generation
 * in verified facts rather than LLM training data.
 *
 * Strategy:
 * 1. Map the lead's program of interest to the correct scaler.com URL.
 * 2. Attempt a live fetch + text extraction from that page.
 * 3. If the live fetch fails or returns no useful content, fall back to the
 *    curated static snapshot captured from scaler.com on 29 Apr 2026.
 * 4. Return a clean string that is injected directly into the LLM prompt as
 *    the authoritative source for any curriculum / pricing / outcomes claims.
 */

// ---------------------------------------------------------------------------
// Curated static snapshots — scraped from scaler.com on 29 Apr 2026
// Update these whenever a major curriculum change is announced.
// ---------------------------------------------------------------------------

const STATIC_CURRICULUM: Record<string, string> = {
  academy: `
=== Scaler Academy: Modern Software & AI Engineering (sourced from scaler.com/academy) ===

PROGRAM BASICS
- Duration: 12 months
- Next cohort: May 2026
- Rating: 4.8+ (25,000+ ratings)
- Fee: ₹3,99,000 total | No-cost EMI from ₹9,791/month with ₹20,000 upfront commitment
- Lifelong access to curriculum, recordings, and future updates included
- Career support: resume review, mock interviews, placement assistance

WHO IT IS FOR
- 1-4 YoE: SDEs, QA Engineers, Frontend Developers — move beyond execution-only roles
- 2-6 YoE: Fullstack / Backend / API Engineers — deepen system design and AI-assisted workflows
- 3-8 YoE: Software Engineers, Senior Engineers, Tech Leads
- 5-10+ YoE: Solution Engineers and AI-first Product Builders

CURRICULUM MODULES (Beginner/Intermediate track, 12 months)
1. Programming Fundamentals — 2 months, 27 sessions
   Operators, data types, loops, functions, arrays. AI-assisted debugging from day one.
2. Intermediate DSA: AI-Assisted Problem Solving — 1 month, 12 sessions
   Time complexity, array techniques, bit manipulation, strings. AI as pair programmer.
3. AI & Agents: From Talking to AI to Building One — 1 month, 11 sessions
   Prompt engineering, RAG, multi-agent orchestration, production AI apps. No-code AI builds.
4. Advanced DSA: Foundations, Core Techniques & Optimisation — 4 months, 59 sessions
   Arrays, recursion, hashing, sorting, bit manipulation. Sudoku solvers, chess engines.
5. Advanced DSA: DP, Heaps & Graphs with AI Edge — 4 months, 18 sessions
   Dynamic programming, heaps, greedy, graph theory. Mandatory skill evaluations.

PROJECTS (interview-ready, AI-integrated)
- LinkForge AI: AI-powered resume-to-portfolio converter (HTML/CSS/AI)
- SkyAI Advisor: Smart weather app with AI-driven personalised advice (JavaScript/Fetch API)
- Kanban Board: AI-enhanced task prioritisation and workflow (JavaScript/DOM/AI)
- ShowKart: Full BookMyShow-style MERN booking system with AI recommendations (MongoDB/React/Node.js/Auth)

AI INTEGRATION ACROSS THE PROGRAM
- 24×7 AI Companion: hints, critiques, pair-programs on every lab and DSA problem
- Prompt → Review → Own workflow in every module
- AI mock interviews trained on real SWE formats (DSA, LLD, system design)
- AI-driven project portfolio — every project is deployed and AI-integrated
- Terminal-based judges and AI mock interviews built in-house by Scaler

KEY INSTRUCTORS (all currently employed industry professionals)
- Anshuman Singh: Co-Founder Scaler, two-time ACM ICPC World Finalist, built Facebook Messenger. 15+ YoE. Rated 4.9.
- Shivank Agarwal: SVP Engineering at Scaler, decade at Microsoft and Oracle. 14+ YoE. Rated 4.7.
- Naman Bhalla: Co-Founder Scaler AI Labs, Google Kickstart global rank 135, ACM ICPC rank 37. 6+ YoE. Rated 4.8.
- Anurag Khanna: Principal SWE at Cadence, ex-Amazon SDE. Large-scale systems at Microsoft. 7+ YoE. Rated 4.8.
- Utkarsh Gupta: VP Academic Course Architect at Scaler, AIR 1 Google Hash Code 2019, Codeforces Master. 7+ YoE. Rated 4.9.
- Umang Agrawal: SDE-II at Amazon (Everyday Essentials), ex-Microsoft. 750+ live sessions, rated 4.87. 5+ YoE.

COMMUNITY & OUTCOMES
- 37,000+ active tech professionals in cohort community
- 1,00,000+ Scaler alumni network
- Software engineers at Indian product companies earn 20–40 LPA; senior engineers and AI specialists command significantly more.
- 163% growth in AI-related job postings between 2024 and 2025 (LinkedIn)
- "AI Engineer" is the fastest-growing job title in the US (LinkedIn Jobs Report 2026)
- $206K average AI engineer salary in 2025, up $50K in one year (MRJ Recruitment 2026)
- 78% of all IT job postings now demand AI expertise (IntuitionLabs 2025)

ALUMNI OUTCOMES (verified examples from scaler.com/review)
- Shivam Prakash: Backend Engineer at Ericsson → Computer Scientist at Adobe (3 offers)
- Rajesh Somasundaram: SWE-II at HERE Technologies → ML Ops Engineer at NinjaCart

DIFFERENTIATOR vs. FREE COURSES (Coursera, Andrew Ng, etc.)
- Live interactive cohort (not self-paced video consumption)
- 1:1 mentorship from currently-employed practitioners who are actively hiring
- Evaluated practice with mandatory skill evaluations — accountability built in
- AI mock interviews against avatars trained on real interview formats
- Career support: resume review, placement assistance, 900+ hiring partners
- Lifelong curriculum access — updates as the market shifts, no extra cost
- Community of 37,000+ peers who are going through the same transition
`,

  dsml: `
=== Scaler: Modern Data Science and ML with Specialisation in AI (sourced from scaler.com/data-science-course) ===

PROGRAM BASICS
- Duration: 12 months (sometimes listed as 12+ months for advanced track)
- Next cohort: May 2026
- Rating: 4.7+ (15,000+ ratings)
- Fee: ₹3,99,000 total | No-cost EMI from ₹9,791/month with ₹20,000 upfront commitment
- Lifelong access included
- Career support included

WHO IT IS FOR
- 0-4 YoE: SDEs, QA Engineers, Analysts, Non-Tech Graduates — build data and AI skills
- 1-4 YoE: Software Engineers transitioning to AI/ML
- 2-6 YoE: Self-learners and professionals future-proofing against AI
- 4-10+ YoE: Mid-level professionals seeking growth

CURRICULUM MODULES
1. Advanced SQL & AI for Data Professionals — 2 months, 25 sessions
   Schema design, joins, window functions, CTEs, query optimisation.
   AI-powered SQL workflows: query generation, debugging, data exploration.
2. Excel & Dashboarding with AI Storytelling — 1 month, 12 sessions
   Excel cleanup, pivot tables, Tableau, AI-assisted insight generation.
3. Python Foundations + AI Coding Assistants — 1 month, 12 sessions
   Data types, control flow, functions, data structures, file handling. AI-accelerated learning.
4. Data to Decisions: Product Analytics with AI — 1 month, 12 sessions
   Metrics frameworks, event tracking, funnel/cohort/retention analysis. AI insight generation.
5. Generative AI for Data Analytics & Automation — 1 month, 12 sessions
   Prompt engineering for SQL and Python, AI-powered data cleaning, EDA, report generation, AI analytics pipelines.

PROJECTS (industry-grade, AI-integrated)
- Swiggy Order Intelligence: SQL-driven revenue diagnostics, CLV analysis, AI-augmented queries on millions of food delivery orders (PostgreSQL/AI SQL Assistants/DBeaver)
- AI-Powered Business Insights Engine (Quick Commerce): AI pipeline for anomaly detection and NL reports (OpenAI API/Pandas/Prompt Engineering)
- Meesho A/B Experimentation Platform: Bayesian testing for checkout conversion at 150M+ users (SciPy/statsmodels/PyMC)
- Myntra Real-Time Sales Intelligence Pipeline on AWS (S3/Glue/Athena/Tableau)
- Credit Risk & Loan Default Prediction: XGBoost, LightGBM, SHAP explainability, Flask API (scikit-learn)
- Customer Support Intelligence: Fine-tune BERT for classification, custom NER, auto-escalation (Hugging Face/BERT/spaCy/OpenAI API)

AI INTEGRATION
- Generate → Validate → Improve workflow across all modules
- AI-assisted labs, AI mock interviews (case-based, reasoning-first)
- 24×7 AI Companion

KEY INSTRUCTORS
- Anshuman Singh: Co-Founder Scaler, two-time ACM ICPC World Finalist. 15+ YoE. Rated 4.9.
- Shivank Agarwal: Ex-SDE Manager at Microsoft, now SVP Engineering at Scaler. 14+ YoE. Rated 4.7.
- Saurabh Kango: Senior Manager DS&A at Meesho, ex-LinkedIn Analytics Lead, ex-Airbnb Data Scientist. 10+ YoE. Rated 4.8.
- Thanish Batcha: Senior Data Scientist II at Poshmark. Built ML at Amazon with BERT/RoBERTa. 8+ YoE. Rated 4.7.
- Shubham Singh: SWE at Uber (global scale), ex-Dream11. 5+ YoE. Rated 4.7.

MARKET DEMAND DATA (all sourced from scaler.com/data-science-course)
- 11 million data science & analytics job openings projected in India alone by 2026 (NASSCOM/Taggd 2026)
- 56% wage premium for AI-skilled workers over peers in equivalent roles (PwC Global AI Jobs Barometer 2025)
- 30–50% extra salary for ML specialists over generalists at the same experience level (Wealthvieu/BLS 2026)
- 60–73% demand-supply gap for ML Engineers and Data Scientists in India (NASSCOM/Taggd 2026)
- Median salary increase post-Scaler: ~110% (based on 2024 Scaler career transition assessment)
- Overall median CTC post-Scaler: up from ₹9 LPA pre-Scaler (exact post figure shown as animated number on site — confirm with team)
- 900+ hiring partner companies

ROLES THIS PROGRAM LEADS TO
- Applied AI Data Scientist
- ML Systems Engineer
- AI Platform & LLMOps Engineer
- Multimodal AI Engineer
- AI-Augmented Decision Scientist
- Growth Scientist
- Insights Analyst

ALUMNI OUTCOMES
- Divyanshu Tanter: Data Scientist at Wipro → AI Researcher and Developer at Dassault Systems (4 offers)
- Madhuri Kukreja: Associate Analyst at XL Dynamics → Associate Analyst at Razorpay
- Sayyam Bhandari: Sr BI Analyst at USEReady → Data Engineer at Amazon (2 offers)
- "50+ hands-on projects and real-world case studies" per program page
`,

  devops: `
=== Scaler: DevOps, Cloud & AI Platform Engineering (sourced from scaler.com) ===

PROGRAM BASICS
- Duration: 12 months
- Rating: 4.7+ (8,000+ ratings)
- Fee: approximately ₹3,99,000 (confirm with advisor — same tier as other programs)

WHO IT IS FOR
- Engineers building a scalable career in DevOps, Cloud, and AI-driven infrastructure

CURRICULUM AREAS (from scaler.com home page program description)
1. DevOps and Cloud Engineering: Linux to Kubernetes, CI/CD, Terraform, and AWS as one system for real-world deployment
2. AI-native operations: Observability, anomaly detection, and agentic automation to run self-healing intelligent systems
3. Specialisation in AI-powered infrastructure: Kubeflow, KServe, LangChain, Bedrock, and modern cloud tooling

ROLES THIS PROGRAM LEADS TO (per scaler.com)
- AIOps Systems Architect: design AI-driven systems to monitor, automate, and optimise complex infrastructure

COMMUNITY & OUTCOMES
- 37,000+ tech professionals in cohort network
- 1,00,000+ Scaler alumni
- Same placement support and career services as other programs
`,

  advanced_ai: `
=== Scaler: Advanced AIML with Specialisation in Agentic AI (sourced from scaler.com) ===

PROGRAM BASICS
- Duration: 12 months
- Rating: 4.6+ (4,000+ ratings)
- Fee: approximately ₹3,99,000 (confirm with advisor)

WHO IT IS FOR
- Engineers who want to go deep on production AI systems end to end

CURRICULUM AREAS (from scaler.com home page)
1. ML fundamentals to full AI engineering: Theory, deep learning, NLP, computer vision → RAG pipelines, fine-tuning, production deployment with observability and security built in
2. Agentic system design as a core discipline: LangChain, LangGraph, CrewAI, Autogen — with the judgement to know when to prompt, when to RAG, and when to fine-tune
3. One connected programme covering the complete AI lifecycle — owned end to end

ROLES THIS PROGRAM LEADS TO
- AI Engineers who build and integrate AI-powered features into products

DIFFERENTIATOR
- This is NOT introductory AI — it is for engineers who want to own the full AI system lifecycle
- Covers RAG, agents, evals, fine-tuning, and deployment in production — not just theory
`,
};

// ---------------------------------------------------------------------------
// URL map: normalise the program-of-interest string to a fetch URL
// ---------------------------------------------------------------------------

function resolveUrl(programOfInterest: string): { key: string; url: string } {
  const p = programOfInterest.toLowerCase();
  if (p.includes('data science') || p.includes('dsml') || p.includes('ml')) {
    return { key: 'dsml', url: 'https://www.scaler.com/data-science-course/' };
  }
  if (p.includes('devops') || p.includes('cloud') || p.includes('platform')) {
    return { key: 'devops', url: 'https://www.scaler.com/devops-and-cloud-computing-course/' };
  }
  if (p.includes('advanced') || p.includes('agentic') || p.includes('aiml')) {
    return { key: 'advanced_ai', url: 'https://www.scaler.com/advanced-ai-ml-course/' };
  }
  // Default: Scaler Academy / software engineering / AI engineering
  return { key: 'academy', url: 'https://www.scaler.com/academy/' };
}

// ---------------------------------------------------------------------------
// Text extractor: strips HTML tags and collapses whitespace
// ---------------------------------------------------------------------------

function extractText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s{3,}/g, '\n\n')
    .trim();
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

/**
 * Returns a verified curriculum context string for the given program.
 * Tries a live fetch first; falls back to the curated static snapshot.
 *
 * The returned string is injected verbatim into the LLM prompt as the
 * authoritative source for curriculum, pricing, and outcomes claims.
 */
export async function fetchScalerCurriculum(programOfInterest: string): Promise<string> {
  const { key, url } = resolveUrl(programOfInterest);

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const resp = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (compatible; ScalerSalesAgent/1.0; +https://scaler.com)',
        Accept: 'text/html',
      },
    });

    clearTimeout(timeout);

    if (!resp.ok) {
      throw new Error(`HTTP ${resp.status}`);
    }

    const html = await resp.text();
    const text = extractText(html);

    if (text.length > 500) {
      // Got real content — prepend the static snapshot and then append the live
      // extract so the LLM has the most reliable structured data first, then
      // any additional live detail after.
      return (
        STATIC_CURRICULUM[key] +
        '\n\n=== LIVE PAGE CONTENT (additional detail, may contain noise) ===\n' +
        text.slice(0, 6000)
      );
    }

    throw new Error('Live page returned too little text');
  } catch {
    // Network failure, timeout, non-200, or bad content — use curated snapshot
    return STATIC_CURRICULUM[key] ?? STATIC_CURRICULUM['academy'];
  }
}
