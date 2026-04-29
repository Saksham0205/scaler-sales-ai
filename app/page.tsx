'use client';

import { useState, useRef, useEffect } from 'react';
import { PERSONAS, LeadProfile } from '@/lib/personas';

// ─── Types ────────────────────────────────────────────────────────────────────

type ToastType = 'success' | 'error' | 'info';
interface Toast {
  id: number;
  message: string;
  type: ToastType;
}

interface PdfRecord {
  personaName: string;
  openQuestions: Array<{ question: string; priority: string }>;
  headline: string;
  pdfUrl: string;
}

// ─── Toast ────────────────────────────────────────────────────────────────────

function ToastContainer({ toasts, onRemove }: { toasts: Toast[]; onRemove: (id: number) => void }) {
  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-sm">
      {toasts.map((t) => (
        <div
          key={t.id}
          onClick={() => onRemove(t.id)}
          className={`flex items-start gap-3 px-4 py-3 rounded-lg shadow-lg cursor-pointer text-sm font-medium transition-all
            ${t.type === 'success' ? 'bg-green-600 text-white' : ''}
            ${t.type === 'error' ? 'bg-red-600 text-white' : ''}
            ${t.type === 'info' ? 'bg-[#0052CC] text-white' : ''}`}
        >
          <span className="shrink-0 mt-0.5">{t.type === 'success' ? '✓' : t.type === 'error' ? '✕' : 'ℹ'}</span>
          <span>{t.message}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Spinner ─────────────────────────────────────────────────────────────────

function Spinner({ size = 5 }: { size?: number }) {
  return (
    <svg className={`animate-spin h-${size} w-${size} shrink-0`} viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
    </svg>
  );
}

// ─── Animated Dots (for stepper) ──────────────────────────────────────────────

function AnimatedDots() {
  const [dots, setDots] = useState('');
  useEffect(() => {
    const interval = setInterval(() => {
      setDots((prev) => (prev.length >= 3 ? '' : prev + '.'));
    }, 500);
    return () => clearInterval(interval);
  }, []);
  return <span className="inline-block w-5 text-left">{dots}</span>;
}

// ─── PDF Loading Steps ────────────────────────────────────────────────────────

const PDF_STEPS = [
  'Analyzing transcript',
  'Extracting open questions',
  'Generating personalised content',
  'Building PDF',
];

function usePdfStepIndex(active: boolean) {
  const [stepIndex, setStepIndex] = useState(0);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
    if (!active) {
      setStepIndex(0);
      return;
    }
    setStepIndex(0);
    // Step 0→1 after 3s, Step 1→2 after 6s, Step 2→3 after 10s
    timersRef.current.push(setTimeout(() => setStepIndex(1), 3000));
    timersRef.current.push(setTimeout(() => setStepIndex(2), 6000));
    timersRef.current.push(setTimeout(() => setStepIndex(3), 10000));
    return () => timersRef.current.forEach(clearTimeout);
  }, [active]);

  return stepIndex;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function isValidPhone(phone: string): boolean {
  return phone.startsWith('+') && phone.replace(/\D/g, '').length >= 10;
}

function formatDateTime(d: Date): string {
  return d.toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
}

// ─── Markdown renderer (handles **bold**, bullet * lines, and line breaks) ────

/** Renders inline bold/italic in a single line of text. */
function InlineMd({ text }: { text: string }) {
  // Split on **...** capturing group
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
          return <strong key={i}>{part.slice(2, -2)}</strong>;
        }
        return <span key={i}>{part}</span>;
      })}
    </>
  );
}

function MarkdownText({ text }: { text: string }) {
  const lines = text.split('\n');
  return (
    <span>
      {lines.map((line, li) => {
        const isLast = li === lines.length - 1;
        // Bullet line: starts with "* " — render as "• text"
        if (/^\*\s+/.test(line)) {
          const content = line.replace(/^\*\s+/, '');
          return (
            <span key={li} className="block pl-3">
              <span className="mr-1.5 select-none">•</span>
              <InlineMd text={content} />
              {!isLast && <br />}
            </span>
          );
        }
        return (
          <span key={li}>
            <InlineMd text={line} />
            {!isLast && <br />}
          </span>
        );
      })}
    </span>
  );
}

// ─── Transcript Viewer — speaker-labeled display ──────────────────────────────

function TranscriptViewer({ text }: { text: string }) {
  const lines = text.split('\n').filter((l) => l.trim());
  return (
    <div className="max-h-[300px] overflow-y-auto space-y-1 pr-1">
      {lines.map((line, i) => {
        if (line.startsWith('BDA:')) {
          const content = line.slice(4).trim();
          return (
            <div key={i} className="flex items-start gap-2 bg-blue-50 border-l-4 border-blue-400 rounded-md px-3 py-2">
              <span className="text-xs font-bold text-blue-600 shrink-0 mt-0.5 w-8">BDA</span>
              <span className="text-sm text-gray-700 leading-snug">{content}</span>
            </div>
          );
        }
        if (line.startsWith('Lead:')) {
          const content = line.slice(5).trim();
          return (
            <div key={i} className="flex items-start gap-2 bg-orange-50 border-l-4 border-orange-400 rounded-md px-3 py-2">
              <span className="text-xs font-bold text-orange-500 shrink-0 mt-0.5 w-8">Lead</span>
              <span className="text-sm text-gray-700 leading-snug">{content}</span>
            </div>
          );
        }
        if (line.startsWith('Speaker:')) {
          const content = line.slice(8).trim();
          return (
            <div key={i} className="flex items-start gap-2 bg-gray-50 border-l-4 border-gray-300 rounded-md px-3 py-2">
              <span className="text-xs font-bold text-gray-500 shrink-0 mt-0.5 w-8">???</span>
              <span className="text-sm text-gray-600 leading-snug">{content}</span>
            </div>
          );
        }
        return (
          <div key={i} className="px-3 py-1">
            <span className="text-sm text-gray-500">{line}</span>
          </div>
        );
      })}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

const PROGRAMS = ['Scaler Academy', 'Scaler Data Science & ML', 'Scaler DevOps & Cloud'];

const emptyProfile: LeadProfile = {
  name: '',
  roleAndCompany: '',
  yearsOfExperience: 0,
  intent: '',
  linkedinSummary: '',
  programOfInterest: 'Scaler Academy',
  transcript: '',
};

export default function Home() {
  // ── Onboarding (Fix 1) ──
  const [onboardingDone, setOnboardingDone] = useState(false);
  const [onboardingInput, setOnboardingInput] = useState('');
  const [onboardingError, setOnboardingError] = useState('');

  // ── Session clock (Fix 9) ──
  const [sessionStart] = useState(() => new Date());
  const [nowTime, setNowTime] = useState(() => new Date());

  // ── BDA setup ──
  const [bdaPhone, setBdaPhone] = useState('');
  const [bdaPhoneError, setBdaPhoneError] = useState('');

  // ── Lead profile ──
  const [profile, setProfile] = useState<LeadProfile>({ ...emptyProfile });
  const [activeTab, setActiveTab] = useState<'transcript' | 'audio'>('transcript');

  // ── Nudge ──
  const [nudgeLoading, setNudgeLoading] = useState(false);
  const [nudgeResult, setNudgeResult] = useState('');
  const [nudgeSent, setNudgeSent] = useState(false);

  // ── PDF ──
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfData, setPdfData] = useState<any>(null);

  // ── Lead phone & covering message ──
  const [leadPhone, setLeadPhone] = useState('');
  const [leadPhoneError, setLeadPhoneError] = useState('');
  const [coveringMessage, setCoveringMessage] = useState('');
  const [editingMessage, setEditingMessage] = useState(false);

  // ── Send flow ──
  const [sendLoading, setSendLoading] = useState(false);
  const [pdfSent, setPdfSent] = useState(false);
  const [pdfSkipped, setPdfSkipped] = useState(false);

  // ── Audio transcription ──
  const [transcribeLoading, setTranscribeLoading] = useState(false);
  const [transcribeSuccess, setTranscribeSuccess] = useState(false);
  const [audioFileName, setAudioFileName] = useState('');
  const [audioFileSize, setAudioFileSize] = useState('');
  const [showAutoFillBanner, setShowAutoFillBanner] = useState(false);

  // ── Toast ──
  const [toasts, setToasts] = useState<Toast[]>([]);
  const toastId = useRef(0);

  // ── Persona history (Fix 7) ──
  const [pdfHistory, setPdfHistory] = useState<PdfRecord[]>([]);

  const audioInputRef = useRef<HTMLInputElement>(null);
  const pdfStepIndex = usePdfStepIndex(pdfLoading);

  // ── Effects ──

  // Fix 1: restore BDA phone from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem('bdaPhone');
    if (stored) {
      setBdaPhone(stored);
      setOnboardingDone(true);
    }
  }, []);

  // Fix 9: live clock — updates every minute
  useEffect(() => {
    const interval = setInterval(() => setNowTime(new Date()), 60000);
    return () => clearInterval(interval);
  }, []);

  // ── Helpers ──

  function addToast(message: string, type: ToastType = 'info') {
    const id = ++toastId.current;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 5000);
  }

  function removeToast(id: number) {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }

  // Fix 1: onboarding submit
  function handleOnboardingSubmit() {
    const val = onboardingInput.trim();
    if (!val) {
      setOnboardingError('Please enter a WhatsApp number');
      return;
    }
    if (!isValidPhone(val)) {
      setOnboardingError('Must include country code, e.g. +91XXXXXXXXXX');
      return;
    }
    localStorage.setItem('bdaPhone', val);
    setBdaPhone(val);
    setOnboardingDone(true);
  }

  function loadPersona(key: string) {
    setProfile({ ...PERSONAS[key] });
    setNudgeResult('');
    setNudgeSent(false);
    setPdfData(null);
    setPdfSent(false);
    setPdfSkipped(false);
    setLeadPhone('+91');
    setLeadPhoneError('');
    setCoveringMessage('');
    setEditingMessage(false);
    setTranscribeSuccess(false);
    setAudioFileName('');
    setAudioFileSize('');
    addToast(`Loaded ${PERSONAS[key].name}`, 'info');
  }

  function updateField<K extends keyof LeadProfile>(key: K, value: LeadProfile[K]) {
    setProfile((prev) => ({ ...prev, [key]: value }));
  }

  // ── Actions ──

  async function generateNudge() {
    if (!profile.name.trim()) {
      return addToast("Please fill in the lead's name first.", 'error');
    }
    if (bdaPhone && !isValidPhone(bdaPhone)) {
      setBdaPhoneError('Must include country code e.g. +91XXXXXXXXXX');
      return;
    }
    setBdaPhoneError('');
    setNudgeLoading(true);
    setNudgeResult('');
    setNudgeSent(false);
    try {
      const res = await fetch('/api/generate-nudge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profile, bdaPhone }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setNudgeResult(data.nudge);
      setNudgeSent(data.sent);
      addToast(
        data.sent ? 'Nudge generated & sent to BDA!' : 'Nudge generated (no BDA number set).',
        'success'
      );
    } catch (e: any) {
      addToast(e.message, 'error');
    } finally {
      setNudgeLoading(false);
    }
  }

  async function generatePDF() {
    if (!profile.name.trim()) {
      return addToast("Please fill in the lead's name first.", 'error');
    }
    if (!profile.transcript.trim()) {
      return addToast(
        activeTab === 'audio'
          ? 'Please upload and transcribe an audio file first.'
          : 'Please add a call transcript or upload an audio file.',
        'error'
      );
    }
    setPdfLoading(true);
    setPdfData(null);
    setPdfSent(false);
    setPdfSkipped(false);
    setEditingMessage(false);
    try {
      const res = await fetch('/api/generate-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profile, transcript: profile.transcript }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setPdfData(data);
      setCoveringMessage(data.coveringMessage);
      // Fix 7: push to history for persona comparison
      setPdfHistory((prev) => [
        ...prev,
        {
          personaName: profile.name,
          openQuestions: (data.extraction?.openQuestions ?? []).slice(0, 2),
          headline: data.pdfContent?.headline ?? data.extraction?.keyMotivation ?? '',
          pdfUrl: data.pdfUrl,
        },
      ]);
      addToast('PDF generated — review before sending.', 'success');
    } catch (e: any) {
      addToast(e.message, 'error');
    } finally {
      setPdfLoading(false);
    }
  }

  async function approveSend() {
    const phone = leadPhone.trim();
    if (!phone) {
      setLeadPhoneError('Phone number is required');
      return;
    }
    if (!isValidPhone(phone)) {
      setLeadPhoneError('Must include country code e.g. +91XXXXXXXXXX');
      return;
    }
    setLeadPhoneError('');
    setSendLoading(true);
    try {
      const res = await fetch('/api/send-whatsapp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: phone,
          message: coveringMessage,
          pdfUrl: pdfData.pdfUrl,
          type: 'pdf',
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setPdfSent(true);
      setEditingMessage(false);
      addToast('PDF sent to lead via WhatsApp!', 'success');
    } catch (e: any) {
      addToast(e.message, 'error');
    } finally {
      setSendLoading(false);
    }
  }

  async function handleAudioUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setAudioFileName(file.name);
    setAudioFileSize(formatBytes(file.size));
    setTranscribeSuccess(false);
    setTranscribeLoading(true);
    e.target.value = '';
    try {
      const formData = new FormData();
      formData.append('audio', file);
      const res = await fetch('/api/transcribe', { method: 'POST', body: formData });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      if (data.extractedProfile) {
        const p = data.extractedProfile;
        setProfile({
          name: p.name || '',
          roleAndCompany: p.roleAndCompany || '',
          yearsOfExperience: p.yearsOfExperience ?? 0,
          intent: p.intent || '',
          linkedinSummary: p.linkedinSummary || '',
          programOfInterest: p.programOfInterest || 'Scaler Academy',
          transcript: data.transcript,
        });
        setShowAutoFillBanner(true);
      } else {
        updateField('transcript', data.transcript);
      }
      setTranscribeSuccess(true);
      addToast('Audio transcribed successfully!', 'success');
    } catch (e: any) {
      addToast(e.message, 'error');
      setAudioFileName('');
      setAudioFileSize('');
    } finally {
      setTranscribeLoading(false);
    }
  }

  // ── Render ──
  return (
    <div className="min-h-screen bg-gray-50 text-gray-800">
      <ToastContainer toasts={toasts} onRemove={removeToast} />

      {/* ── Fix 1: Onboarding Modal ── */}
      {!onboardingDone && (
        <div className="fixed inset-0 z-[100] bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full">
            <div className="mb-3">
              <span className="text-[#0052CC] text-3xl font-bold tracking-tight">
                Scaler<span className="text-[#FF6B35]">.</span>
              </span>
            </div>
            <h2 className="text-xl font-bold text-gray-800 mb-2">Welcome to Scaler Sales AI Agent</h2>
            <p className="text-gray-500 text-sm mb-6">
              Enter the BDA&apos;s WhatsApp number to get started. All messages will be sent to this number.
            </p>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              WhatsApp Number (with country code, e.g. +91XXXXXXXXXX)
            </label>
            <input
              type="tel"
              placeholder="+91XXXXXXXXXX"
              value={onboardingInput}
              autoFocus
              onChange={(e) => {
                setOnboardingInput(e.target.value);
                if (onboardingError) setOnboardingError('');
              }}
              onKeyDown={(e) => e.key === 'Enter' && handleOnboardingSubmit()}
              className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0052CC] mb-1 ${
                onboardingError ? 'border-red-400 bg-red-50' : 'border-gray-300'
              }`}
            />
            {onboardingError && <p className="text-red-500 text-xs mb-2">{onboardingError}</p>}
            <button
              onClick={handleOnboardingSubmit}
              className="w-full mt-3 py-2.5 bg-[#0052CC] text-white font-semibold rounded-xl hover:bg-blue-700 transition-colors"
            >
              Get Started
            </button>
          </div>
        </div>
      )}

      {/* ── Main App (dimmed until onboarding complete) ── */}
      <div className={!onboardingDone ? 'pointer-events-none opacity-40 select-none' : ''}>

        {/* Navbar — "Powered by Llama 4 & Groq" */}
        <nav className="bg-[#0052CC] shadow-lg sticky top-0 z-40">
          <div className="max-w-6xl mx-auto px-6 py-4 flex items-center gap-3">
            <div>
              <span className="text-white text-2xl font-bold tracking-tight">
                Scaler<span className="text-[#FF6B35]">.</span>
              </span>
            </div>
            <div className="h-6 w-px bg-white/30 mx-2" />
            <div>
              <p className="text-white font-semibold text-base leading-tight">Sales AI Agent</p>
              <p className="text-blue-200 text-xs">Powered by Llama 4 &amp; Groq</p>
            </div>
          </div>
        </nav>

        <div className="max-w-6xl mx-auto px-6 py-8 space-y-6">

          {/* A. Setup Section */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-bold text-gray-800 mb-1">Setup</h2>
            <p className="text-xs text-amber-600 font-medium mb-4 flex items-center gap-1">
              <span>⚠</span> All lead-facing messages require BDA approval before sending
            </p>
            <div className="max-w-sm">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                BDA WhatsApp Number
              </label>
              <input
                type="tel"
                placeholder="+91XXXXXXXXXX"
                value={bdaPhone}
                onChange={(e) => {
                  setBdaPhone(e.target.value);
                  if (bdaPhoneError) setBdaPhoneError('');
                }}
                className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0052CC] focus:border-transparent ${
                  bdaPhoneError ? 'border-red-400 bg-red-50' : 'border-gray-300'
                }`}
              />
              {bdaPhoneError && <p className="text-red-500 text-xs mt-1">{bdaPhoneError}</p>}
            </div>
          </div>

          {/* D. Quick Load Personas */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-bold text-gray-800 mb-3">Quick Load — Standard Personas</h2>
            <div className="flex flex-wrap gap-3">
              {(['rohan', 'karthik', 'meera'] as const).map((key) => (
                <button
                  key={key}
                  onClick={() => loadPersona(key)}
                  className="px-4 py-2 rounded-lg border-2 border-[#0052CC] text-[#0052CC] font-semibold text-sm hover:bg-[#0052CC] hover:text-white transition-colors"
                >
                  Load {PERSONAS[key].name}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            {/* B. Lead Profile Input */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-4">
              <h2 className="text-lg font-bold text-gray-800">Lead Profile</h2>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Rohan Sharma"
                  value={profile.name}
                  onChange={(e) => updateField('name', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0052CC]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Role &amp; Company *</label>
                <input
                  type="text"
                  placeholder="e.g. Software Engineer, TCS"
                  value={profile.roleAndCompany}
                  onChange={(e) => updateField('roleAndCompany', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0052CC]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Years of Experience</label>
                <input
                  type="number"
                  min={0}
                  max={40}
                  value={profile.yearsOfExperience}
                  onChange={(e) => updateField('yearsOfExperience', parseInt(e.target.value) || 0)}
                  className="w-32 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0052CC]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Intent / Goal *</label>
                <textarea
                  placeholder="What is the lead trying to achieve?"
                  value={profile.intent}
                  onChange={(e) => updateField('intent', e.target.value)}
                  rows={3}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0052CC] resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  LinkedIn Summary <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <textarea
                  placeholder="Background, education, current role details..."
                  value={profile.linkedinSummary}
                  onChange={(e) => updateField('linkedinSummary', e.target.value)}
                  rows={3}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0052CC] resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Program of Interest</label>
                <select
                  value={profile.programOfInterest}
                  onChange={(e) => updateField('programOfInterest', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0052CC] bg-white"
                >
                  {PROGRAMS.map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>

              {/* Fix 8: Lead WhatsApp Number in Lead Profile form */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Lead WhatsApp Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  placeholder="+91XXXXXXXXXX"
                  value={leadPhone}
                  onChange={(e) => {
                    setLeadPhone(e.target.value);
                    if (leadPhoneError) setLeadPhoneError('');
                  }}
                  className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0052CC] ${
                    leadPhoneError ? 'border-red-400 bg-red-50' : 'border-gray-300'
                  }`}
                />
                {leadPhoneError && <p className="text-red-500 text-xs mt-1">{leadPhoneError}</p>}
                <p className="text-xs text-gray-400 mt-1">Used automatically when sending the PDF to the lead.</p>
              </div>
            </div>

            {/* C. Call Input — Two Tabs */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex flex-col">
              <h2 className="text-lg font-bold text-gray-800 mb-4">Call Input</h2>

              <div className="flex rounded-lg border border-gray-200 p-1 mb-4 w-fit gap-1">
                <button
                  onClick={() => setActiveTab('transcript')}
                  className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${activeTab === 'transcript' ? 'bg-[#0052CC] text-white' : 'text-gray-600 hover:text-gray-800'}`}
                >
                  Transcript
                </button>
                <button
                  onClick={() => setActiveTab('audio')}
                  className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${activeTab === 'audio' ? 'bg-[#0052CC] text-white' : 'text-gray-600 hover:text-gray-800'}`}
                >
                  Audio File
                </button>
              </div>

              {activeTab === 'transcript' ? (
                <textarea
                  placeholder="Paste the call transcript here..."
                  value={profile.transcript}
                  onChange={(e) => updateField('transcript', e.target.value)}
                  className="flex-1 min-h-[320px] w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0052CC] resize-none"
                />
              ) : (
                <div className="flex flex-col gap-4">
                  <div
                    onClick={() => !transcribeLoading && audioInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
                      transcribeLoading
                        ? 'border-gray-200 bg-gray-50 cursor-not-allowed'
                        : 'border-gray-300 cursor-pointer hover:border-[#0052CC] hover:bg-blue-50'
                    }`}
                  >
                    <div className="text-3xl mb-2">🎙</div>
                    <p className="text-sm font-medium text-gray-700">Click to upload audio</p>
                    <p className="text-xs text-gray-400 mt-1">.mp3, .wav, .m4a, .webm — max 25 MB</p>
                    {audioFileName && (
                      <div className="mt-3 flex flex-col items-center gap-1">
                        <p className="text-xs text-[#0052CC] font-semibold truncate max-w-full">{audioFileName}</p>
                        {audioFileSize && <p className="text-xs text-gray-400">{audioFileSize}</p>}
                      </div>
                    )}
                  </div>
                  <input
                    ref={audioInputRef}
                    type="file"
                    accept=".mp3,.wav,.m4a,.webm,.mp4"
                    className="hidden"
                    onChange={handleAudioUpload}
                  />

                  {transcribeLoading && (
                    <div className="flex items-center gap-2 text-[#0052CC] text-sm font-medium">
                      <Spinner /> Transcribing audio...
                    </div>
                  )}

                  {transcribeSuccess && !transcribeLoading && (
                    <div className="flex items-center gap-2 text-green-600 text-sm font-semibold">
                      <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-semibold">
                        ✓ Transcribed successfully
                      </span>
                    </div>
                  )}

                  {profile.transcript && !transcribeLoading && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Transcription Result</label>
                      <div className="border border-gray-200 rounded-lg px-3 py-2 bg-gray-50">
                        <TranscriptViewer text={profile.transcript} />
                      </div>
                    </div>
                  )}

                  {showAutoFillBanner && (
                    <div className="flex items-start justify-between gap-3 bg-amber-50 border border-amber-300 rounded-lg px-4 py-3 text-sm text-amber-800">
                      <span>⚡ Profile auto-filled from audio. Please review and correct if needed.</span>
                      <button
                        onClick={() => setShowAutoFillBanner(false)}
                        className="shrink-0 text-amber-600 hover:text-amber-900 font-bold text-base leading-none"
                        aria-label="Dismiss"
                      >
                        ✕
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* E. Action Buttons */}
          <div className="flex flex-wrap gap-4">
            <button
              onClick={generateNudge}
              disabled={nudgeLoading}
              className="flex items-center gap-2 px-6 py-3 bg-[#0052CC] text-white font-semibold rounded-xl hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors shadow-sm"
            >
              {nudgeLoading ? <Spinner /> : <span>🎯</span>}
              {nudgeLoading ? 'Generating Nudge...' : 'Generate Pre-Call Nudge'}
            </button>

            <button
              onClick={generatePDF}
              disabled={pdfLoading}
              className="flex items-center gap-2 px-6 py-3 bg-[#FF6B35] text-white font-semibold rounded-xl hover:bg-orange-600 disabled:opacity-60 disabled:cursor-not-allowed transition-colors shadow-sm"
            >
              {pdfLoading ? <Spinner /> : <span>📄</span>}
              {pdfLoading ? 'Generating PDF...' : 'Generate Post-Call PDF'}
            </button>
          </div>

          {/* Fix 6: PDF Progress Stepper */}
          {pdfLoading && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <p className="text-sm font-bold text-gray-700 mb-5">Generating personalised PDF&hellip;</p>
              <div className="space-y-4">
                {PDF_STEPS.map((step, i) => {
                  const done = i < pdfStepIndex;
                  const active = i === pdfStepIndex;
                  return (
                    <div
                      key={i}
                      className={`flex items-center gap-3 text-sm transition-colors ${
                        done ? 'text-green-600' : active ? 'text-[#0052CC]' : 'text-gray-400'
                      }`}
                    >
                      {done ? (
                        <span className="w-7 h-7 shrink-0 bg-green-100 rounded-full flex items-center justify-center text-green-600 font-bold text-base">
                          ✓
                        </span>
                      ) : active ? (
                        <span className="w-7 h-7 shrink-0 bg-blue-100 rounded-full flex items-center justify-center">
                          <span className="w-2.5 h-2.5 bg-[#0052CC] rounded-full animate-pulse" />
                        </span>
                      ) : (
                        <span className="w-7 h-7 shrink-0 bg-gray-100 rounded-full flex items-center justify-center">
                          <span className="w-2.5 h-2.5 bg-gray-300 rounded-full" />
                        </span>
                      )}
                      <span className={active ? 'font-semibold' : ''}>
                        {step}
                        {active ? <AnimatedDots /> : '...'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* F1. Nudge Output Panel — Fix 3: WhatsApp bubble style */}
          {nudgeResult && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <h2 className="text-lg font-bold text-gray-800 mb-3">Pre-Call Nudge</h2>

              {/* Fix 3: Sent badge at top */}
              {nudgeSent && (
                <div className="mb-3">
                  <span className="inline-flex items-center gap-1.5 bg-green-100 text-green-700 text-xs font-semibold px-3 py-1.5 rounded-full">
                    ✓ Sent to BDA
                  </span>
                </div>
              )}

              {/* Fix 3: WhatsApp-style bubble */}
              <div className="max-w-2xl">
                <div className="relative bg-[#DCF8C6] rounded-2xl rounded-tl-none px-4 py-3 shadow-sm border border-green-200">
                  <p className="text-sm text-gray-800 leading-relaxed" style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' }}>
                    <MarkdownText text={nudgeResult} />
                  </p>
                  {/* WhatsApp tail */}
                  <div className="absolute top-0 -left-2 w-0 h-0 border-t-[10px] border-t-[#DCF8C6] border-l-[10px] border-l-transparent" />
                </div>
              </div>
            </div>
          )}

          {/* F2. PDF Preview Panel */}
          {pdfData && !pdfSkipped && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-5">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-gray-800">Post-Call PDF — Review Before Sending</h2>
                {pdfSent && (
                  <span className="flex items-center gap-1.5 bg-green-100 text-green-700 text-xs font-semibold px-3 py-1 rounded-full">
                    ✓ Sent to Lead
                  </span>
                )}
              </div>

              {/* Extraction summary */}
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {[
                  { label: 'Sentiment', value: pdfData.extraction?.leadSentiment },
                  { label: 'Key Motivation', value: pdfData.extraction?.keyMotivation },
                  { label: 'Biggest Hesitation', value: pdfData.extraction?.biggestHesitation },
                  { label: 'Questions Found', value: `${pdfData.extraction?.openQuestions?.length ?? 0} open` },
                ].map((item) => (
                  <div key={item.label} className="bg-blue-50 rounded-xl p-3 border border-blue-100">
                    <p className="text-xs text-blue-500 font-semibold uppercase tracking-wide mb-1">{item.label}</p>
                    <p className="text-sm text-gray-800 font-medium leading-snug">{item.value}</p>
                  </div>
                ))}
              </div>

              {/* Open questions */}
              {pdfData.extraction?.openQuestions?.length > 0 && (
                <div>
                  <p className="text-sm font-semibold text-gray-700 mb-2">Open Questions from Call</p>
                  <ul className="space-y-2">
                    {pdfData.extraction.openQuestions.map((q: any, i: number) => (
                      <li key={i} className="flex items-start gap-3 text-sm text-gray-700 bg-gray-50 rounded-lg px-3 py-2">
                        <span className={`mt-0.5 text-xs font-bold px-2 py-0.5 rounded-full shrink-0 ${
                          q.priority === 'high' ? 'bg-red-100 text-red-600'
                          : q.priority === 'medium' ? 'bg-yellow-100 text-yellow-700'
                          : 'bg-gray-200 text-gray-500'
                        }`}>
                          {q.priority}
                        </span>
                        <span>{q.question}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Fix 4: Preview PDF button + inline iframe */}
              <div>
                <div className="flex items-center gap-3 mb-3">
                  <a
                    href={pdfData.pdfUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-[#0052CC] text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    🔗 Preview PDF in new tab
                  </a>
                </div>
                <iframe
                  src={pdfData.pdfUrl}
                  width="100%"
                  height="400"
                  className="rounded-xl border border-gray-200 block"
                  title="PDF Preview"
                />
              </div>

              {/* G. Covering message + Approve/Edit/Skip — Fix 5 & Fix 8 */}
              {!pdfSent && (
                <div className="border-t border-gray-100 pt-5 space-y-4">

                  {/* Lead phone — pre-filled from profile form (Fix 8) */}
                  <div className="max-w-sm">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Lead&apos;s WhatsApp Number <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="tel"
                      placeholder="+91XXXXXXXXXX"
                      value={leadPhone}
                      onChange={(e) => {
                        setLeadPhone(e.target.value);
                        if (leadPhoneError) setLeadPhoneError('');
                      }}
                      className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0052CC] ${
                        leadPhoneError ? 'border-red-400 bg-red-50' : 'border-gray-300'
                      }`}
                    />
                    {leadPhoneError && <p className="text-red-500 text-xs mt-1">{leadPhoneError}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Covering Message</label>

                    {/* Fix 5: Edit mode — textarea + Save & Send + Cancel */}
                    {editingMessage ? (
                      <div className="space-y-3">
                        <textarea
                          value={coveringMessage}
                          onChange={(e) => setCoveringMessage(e.target.value)}
                          rows={6}
                          autoFocus
                          className="w-full border border-[#0052CC] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0052CC] resize-none"
                        />
                        <div className="flex gap-3">
                          <button
                            onClick={approveSend}
                            disabled={sendLoading}
                            className="flex items-center gap-2 px-5 py-2.5 bg-green-600 text-white font-semibold rounded-xl hover:bg-green-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
                          >
                            {sendLoading ? <Spinner /> : <span>✓</span>}
                            {sendLoading ? 'Sending...' : 'Save & Send'}
                          </button>
                          <button
                            onClick={() => {
                              setEditingMessage(false);
                              setCoveringMessage(pdfData.coveringMessage);
                            }}
                            disabled={sendLoading}
                            className="px-5 py-2.5 border-2 border-gray-300 text-gray-600 font-semibold rounded-xl hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div className="bg-gray-50 rounded-xl p-3 text-sm text-gray-700 whitespace-pre-wrap leading-relaxed border border-gray-200">
                          {coveringMessage}
                        </div>

                        {/* Approve / Edit / Skip */}
                        <div className="flex flex-wrap gap-3 pt-1">
                          <button
                            onClick={approveSend}
                            disabled={sendLoading || pdfSent}
                            className="flex items-center gap-2 px-5 py-2.5 bg-green-600 text-white font-semibold rounded-xl hover:bg-green-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
                          >
                            {sendLoading ? <Spinner /> : <span>✓</span>}
                            {sendLoading ? 'Sending...' : 'Approve & Send'}
                          </button>

                          <button
                            onClick={() => setEditingMessage(true)}
                            disabled={sendLoading}
                            className="px-5 py-2.5 border-2 border-[#0052CC] text-[#0052CC] font-semibold rounded-xl hover:bg-blue-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            ✏ Edit Message
                          </button>

                          <button
                            onClick={() => setPdfSkipped(true)}
                            disabled={sendLoading}
                            className="px-5 py-2.5 border-2 border-gray-300 text-gray-500 font-semibold rounded-xl hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            Skip
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Fix 7: Persona Comparison Panel — shows after 2+ PDFs generated */}
          {pdfHistory.length >= 2 && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <h2 className="text-lg font-bold text-gray-800 mb-1">Persona Comparison</h2>
              <p className="text-xs text-gray-500 mb-4">Personalisation differences across generated PDFs</p>
              <div className="flex flex-row gap-4 overflow-x-auto pb-2">
                {pdfHistory.map((record, i) => (
                  <div
                    key={i}
                    className="min-w-[240px] flex-1 bg-blue-50 rounded-xl border border-blue-100 p-4 flex flex-col gap-3"
                  >
                    <p className="font-bold text-[#0052CC] text-base">{record.personaName}</p>

                    {record.headline && (
                      <p className="text-xs text-gray-600 font-medium italic leading-snug border-l-2 border-[#0052CC] pl-2">
                        &ldquo;{record.headline}&rdquo;
                      </p>
                    )}

                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Top Questions</p>
                      {record.openQuestions.length > 0 ? (
                        <ul className="space-y-1.5">
                          {record.openQuestions.map((q, j) => (
                            <li key={j} className="text-xs text-gray-700 bg-white rounded-lg px-2 py-1.5 border border-gray-100 leading-snug">
                              {q.question}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-xs text-gray-400 italic">No questions extracted</p>
                      )}
                    </div>

                    <a
                      href={record.pdfUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-auto inline-flex items-center gap-1.5 text-xs text-[#0052CC] font-semibold hover:underline"
                    >
                      📄 View PDF
                    </a>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>

        {/* Footer — Fix 2 & Fix 9 */}
        <footer className="mt-12 border-t border-gray-200 bg-white py-6 text-center text-xs text-gray-400 space-y-1">
          <p>Scaler Sales AI Agent &middot; Powered by Llama 4 &amp; Groq &middot; For internal use only</p>
          <p>Session started: {formatDateTime(sessionStart)} &middot; Now: {nowTime.toLocaleTimeString('en-IN', { timeStyle: 'short' })}</p>
        </footer>

      </div>
    </div>
  );
}
