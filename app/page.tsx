'use client';

import { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
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
  keyMotivation: string;
  biggestHesitation: string;
  pdfUrl: string;
}

// ─── Toast ────────────────────────────────────────────────────────────────────

function ToastContainer({ toasts, onRemove }: { toasts: Toast[]; onRemove: (id: number) => void }) {
  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 max-w-sm">
      {toasts.map((t) => (
        <div
          key={t.id}
          onClick={() => onRemove(t.id)}
          className={`flex items-start gap-3 px-4 py-3 rounded-md shadow-lg cursor-pointer text-sm font-medium transition-all border
            ${t.type === 'success' ? 'bg-gray-900 text-white border-gray-800' : ''}
            ${t.type === 'error' ? 'bg-red-50 text-red-900 border-red-200' : ''}
            ${t.type === 'info' ? 'bg-white text-gray-900 border-gray-200' : ''}`}
        >
          <span className="shrink-0 mt-0.5">
            {t.type === 'success' ? '✓' : t.type === 'error' ? '✕' : 'ℹ'}
          </span>
          <span>{t.message}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Spinner ─────────────────────────────────────────────────────────────────

function Spinner({ size = 4 }: { size?: number }) {
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

function InlineMd({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
          return <strong key={i} className="font-semibold text-gray-900">{part.slice(2, -2)}</strong>;
        }
        return <span key={i}>{part}</span>;
      })}
    </>
  );
}

function MarkdownText({ text }: { text: string }) {
  const lines = text.split('\n');
  return (
    <span className="text-sm text-gray-700 leading-relaxed">
      {lines.map((line, li) => {
        const isLast = li === lines.length - 1;
        if (/^\*\s+/.test(line)) {
          const content = line.replace(/^\*\s+/, '');
          return (
            <span key={li} className="block pl-4 relative">
              <span className="absolute left-0 top-1.5 w-1.5 h-1.5 rounded-full bg-gray-400" />
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

function TranscriptViewer({ text, className = "max-h-[360px]" }: { text: string; className?: string }) {
  const lines = text.split('\n').filter((l) => l.trim());
  return (
    <div className={`${className} overflow-y-auto space-y-4 pr-3 py-2 custom-scrollbar`}>
      {lines.map((line, i) => {
        const colonIndex = line.indexOf(':');
        
        // If there's a colon early in the line, treat it as a speaker label
        if (colonIndex !== -1 && colonIndex < 20) {
          const speaker = line.slice(0, colonIndex).trim();
          const content = line.slice(colonIndex + 1).trim();
          const isBDA = speaker.toUpperCase() === 'BDA' || speaker.toUpperCase() === 'SCALER';
          
          return (
            <div key={i} className={`flex flex-col ${isBDA ? 'items-end' : 'items-start'}`}>
              <span className={`text-[10px] font-bold uppercase tracking-wider mb-1 px-1 ${isBDA ? 'text-gray-900' : 'text-gray-500'}`}>
                {speaker}
              </span>
              <div className={`px-4 py-2.5 rounded-2xl max-w-[85%] text-sm leading-relaxed shadow-sm ${
                isBDA 
                  ? 'bg-gray-900 text-white rounded-tr-sm' 
                  : 'bg-white border border-gray-200 text-gray-800 rounded-tl-sm'
              }`}>
                {content}
              </div>
            </div>
          );
        }
        
        // Fallback for lines without a clear speaker
        return (
          <div key={i} className="flex justify-center my-2">
            <span className="text-xs text-gray-400 bg-gray-50 border border-gray-100 px-3 py-1 rounded-full">
              {line}
            </span>
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
  const [hydrated, setHydrated] = useState(false);
  const [onboardingDone, setOnboardingDone] = useState(false);
  const [onboardingInput, setOnboardingInput] = useState('');
  const [onboardingError, setOnboardingError] = useState('');

  const [sessionStart] = useState(() => new Date());
  const [nowTime, setNowTime] = useState(() => new Date());

  const [bdaPhone, setBdaPhone] = useState('');
  const [bdaPhoneError, setBdaPhoneError] = useState('');

  const [profile, setProfile] = useState<LeadProfile>({ ...emptyProfile });
  const [activeTab, setActiveTab] = useState<'transcript' | 'audio'>('transcript');
  const [textTabMode, setTextTabMode] = useState<'edit' | 'preview'>('edit');

  const [nudgeLoading, setNudgeLoading] = useState(false);
  const [nudgeResult, setNudgeResult] = useState('');
  const [nudgeSent, setNudgeSent] = useState(false);

  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfData, setPdfData] = useState<any>(null);

  const [leadPhone, setLeadPhone] = useState('');
  const [leadPhoneError, setLeadPhoneError] = useState('');
  const [coveringMessage, setCoveringMessage] = useState('');
  const [editingMessage, setEditingMessage] = useState(false);

  const [sendLoading, setSendLoading] = useState(false);
  const [pdfSent, setPdfSent] = useState(false);
  const [pdfSkipped, setPdfSkipped] = useState(false);

  const [transcribeLoading, setTranscribeLoading] = useState(false);
  const [transcribeSuccess, setTranscribeSuccess] = useState(false);
  const [audioFileName, setAudioFileName] = useState('');
  const [audioFileSize, setAudioFileSize] = useState('');
  const [showAutoFillBanner, setShowAutoFillBanner] = useState(false);

  const [toasts, setToasts] = useState<Toast[]>([]);
  const toastId = useRef(0);

  const [pdfHistory, setPdfHistory] = useState<PdfRecord[]>([]);

  const audioInputRef = useRef<HTMLInputElement>(null);
  const pdfStepIndex = usePdfStepIndex(pdfLoading);

  useEffect(() => {
    const stored = localStorage.getItem('bdaPhone');
    if (stored) {
      setBdaPhone(stored);
      setOnboardingInput(stored);
      setOnboardingDone(true);
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => setNowTime(new Date()), 60000);
    return () => clearInterval(interval);
  }, []);

  function addToast(message: string, type: ToastType = 'info') {
    const id = ++toastId.current;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 5000);
  }

  function removeToast(id: number) {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }

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
    setShowAutoFillBanner(false);
    addToast(`Loaded ${PERSONAS[key].name}`, 'info');
  }

  function updateField<K extends keyof LeadProfile>(key: K, value: LeadProfile[K]) {
    setProfile((prev) => ({ ...prev, [key]: value }));
  }

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
    // Clear any existing PDF output so both don't show simultaneously
    setPdfData(null);
    setPdfSent(false);
    setPdfSkipped(false);
    setEditingMessage(false);
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
    // Clear any existing nudge output so both don't show simultaneously
    setNudgeResult('');
    setNudgeSent(false);
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
      setPdfHistory((prev) => [
        ...prev,
        {
          personaName: profile.name,
          openQuestions: (data.extraction?.openQuestions ?? []).slice(0, 2),
          headline: data.pdfContent?.headline ?? data.extraction?.keyMotivation ?? '',
          keyMotivation: data.extraction?.keyMotivation ?? '',
          biggestHesitation: data.extraction?.biggestHesitation ?? '',
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
    
    // Clear existing profile data before transcription starts
    setProfile({ ...emptyProfile });
    setShowAutoFillBanner(false);
    
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
    <div className="min-h-screen bg-[#FAFAFA] text-gray-900 font-sans selection:bg-gray-200">
      <ToastContainer toasts={toasts} onRemove={removeToast} />

      {/* Onboarding Modal */}
      {hydrated && !onboardingDone && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.6)' }}>
          <div className="bg-white rounded-xl shadow-2xl border border-gray-100 p-10 max-w-md w-full">
            {/* Logo */}
            <div className="flex items-center gap-3 mb-8">
              <div className="w-10 h-10 rounded-lg overflow-hidden flex items-center justify-center shrink-0 border border-gray-100 shadow-sm">
                <Image src="/scaler-logo.jpg" alt="Scaler Logo" width={40} height={40} className="object-contain" />
              </div>
              <span className="text-gray-900 text-xl font-bold tracking-tight">Scaler</span>
            </div>

            <h2 className="text-2xl font-bold text-gray-900 mb-3 leading-tight">Welcome to Scaler Sales AI</h2>
            <p className="text-gray-500 text-sm mb-8 leading-relaxed">
              Enter the BDA&apos;s WhatsApp number to get started. All messages during this session will route to this number.
            </p>

            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">
              WhatsApp Number
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
              className={`w-full border rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-gray-900 transition-shadow ${
                onboardingError ? 'border-red-300 focus:ring-red-500 focus:border-red-500' : 'border-gray-200'
              }`}
            />
            {onboardingError && <p className="text-red-600 text-xs mt-2 font-medium">{onboardingError}</p>}

            <button
              onClick={handleOnboardingSubmit}
              className="w-full mt-6 py-3 bg-gray-900 text-white text-sm font-semibold rounded-lg hover:bg-gray-800 active:bg-black transition-colors shadow-sm"
            >
              Start Session
            </button>
          </div>
        </div>
      )}

      {/* Main App */}
      <div className={hydrated && !onboardingDone ? 'pointer-events-none opacity-40 select-none transition-all' : 'transition-all'}>

        {/* Navbar */}
        <nav className="bg-white border-b border-gray-200 sticky top-0 z-40">
          <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 rounded-sm overflow-hidden flex items-center justify-center shrink-0">
                <Image src="/scaler-logo.jpg" alt="Scaler Logo" width={24} height={24} className="object-contain" />
              </div>
              <span className="text-gray-900 text-sm font-semibold tracking-tight">Scaler Sales AI</span>
              <div className="h-4 w-px bg-gray-200 mx-2" />
              <span className="text-gray-500 text-xs font-medium bg-gray-100 px-2 py-0.5 rounded-full">Internal Tool</span>
            </div>
            <div className="text-xs text-gray-500 font-medium flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-500"></span>
              System Operational
            </div>
          </div>
        </nav>

        <div className="max-w-7xl mx-auto px-6 py-8 space-y-6">

          {/* Quick Load & Setup Row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2 bg-white rounded-lg border border-gray-200 p-5 shadow-sm">
              <h2 className="text-sm font-semibold text-gray-900 mb-3">Quick Load Personas</h2>
              <div className="flex flex-wrap gap-2">
                {(['rohan', 'karthik', 'meera'] as const).map((key) => (
                  <button
                    key={key}
                    onClick={() => loadPersona(key)}
                    className="px-3 py-1.5 rounded-md border border-gray-200 text-gray-700 font-medium text-xs hover:bg-gray-50 hover:text-gray-900 transition-colors bg-white shadow-sm"
                  >
                    {PERSONAS[key].name}
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 p-5 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold text-gray-900">BDA Configuration</h2>
                <span className="text-[10px] uppercase tracking-wider font-bold text-gray-400">Settings</span>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">
                  WhatsApp Number
                </label>
                <input
                  type="tel"
                  placeholder="+91XXXXXXXXXX"
                  value={bdaPhone}
                  onChange={(e) => {
                    setBdaPhone(e.target.value);
                    localStorage.setItem('bdaPhone', e.target.value);
                    if (bdaPhoneError) setBdaPhoneError('');
                  }}
                  className={`w-full border rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-gray-900 focus:border-gray-900 transition-shadow ${
                    bdaPhoneError ? 'border-red-300' : 'border-gray-200'
                  }`}
                />
                {bdaPhoneError && <p className="text-red-600 text-xs mt-1.5 font-medium">{bdaPhoneError}</p>}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            {/* Lead Profile Input */}
            <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm flex flex-col">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-base font-semibold text-gray-900">Lead Profile</h2>
                <span className="text-xs text-gray-500 font-medium px-2 py-1 bg-gray-50 rounded-md border border-gray-100">
                  Data Entry
                </span>
              </div>

              <div className="space-y-4 flex-1">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1.5">Full Name *</label>
                    <input
                      type="text"
                      placeholder="e.g. Rohan Sharma"
                      value={profile.name}
                      onChange={(e) => updateField('name', e.target.value)}
                      className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-gray-900 focus:border-gray-900"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1.5">Role &amp; Company *</label>
                    <input
                      type="text"
                      placeholder="e.g. Software Engineer, TCS"
                      value={profile.roleAndCompany}
                      onChange={(e) => updateField('roleAndCompany', e.target.value)}
                      className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-gray-900 focus:border-gray-900"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1.5">Years of Experience</label>
                    <input
                      type="number"
                      min={0}
                      max={40}
                      value={profile.yearsOfExperience}
                      onChange={(e) => updateField('yearsOfExperience', parseInt(e.target.value) || 0)}
                      className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-gray-900 focus:border-gray-900"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1.5">Program of Interest</label>
                    <select
                      value={profile.programOfInterest}
                      onChange={(e) => updateField('programOfInterest', e.target.value)}
                      className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-gray-900 focus:border-gray-900 bg-white"
                    >
                      {PROGRAMS.map((p) => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1.5">Intent / Goal *</label>
                  <textarea
                    placeholder="What is the lead trying to achieve?"
                    value={profile.intent}
                    onChange={(e) => updateField('intent', e.target.value)}
                    rows={4}
                    className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-gray-900 focus:border-gray-900 resize-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1.5">
                    LinkedIn Summary <span className="text-gray-400 font-normal">(optional)</span>
                  </label>
                  <textarea
                    placeholder="Background, education, current role details..."
                    value={profile.linkedinSummary}
                    onChange={(e) => updateField('linkedinSummary', e.target.value)}
                    rows={3}
                    className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-gray-900 focus:border-gray-900 resize-none"
                  />
                </div>
              </div>
            </div>

            {/* Call Input */}
            <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm flex flex-col">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-base font-semibold text-gray-900">Call Input</h2>
                <div className="flex bg-gray-100 rounded-md p-0.5">
                  <button
                    onClick={() => setActiveTab('transcript')}
                    className={`px-3 py-1 rounded text-xs font-medium transition-all ${activeTab === 'transcript' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                  >
                    Text
                  </button>
                  <button
                    onClick={() => setActiveTab('audio')}
                    className={`px-3 py-1 rounded text-xs font-medium transition-all ${activeTab === 'audio' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                  >
                    Audio
                  </button>
                </div>
              </div>

              {activeTab === 'transcript' ? (
                <div className="flex-1 flex flex-col min-h-0">
                  <div className="flex items-center justify-between mb-3">
                    <label className="block text-xs font-medium text-gray-700">Raw Transcript</label>
                    {profile.transcript.trim() && (
                      <div className="flex bg-gray-100 rounded-md p-0.5">
                        <button
                          onClick={() => setTextTabMode('edit')}
                          className={`px-2.5 py-1 rounded text-[10px] uppercase tracking-wider font-bold transition-all ${textTabMode === 'edit' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => setTextTabMode('preview')}
                          className={`px-2.5 py-1 rounded text-[10px] uppercase tracking-wider font-bold transition-all ${textTabMode === 'preview' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                          Preview
                        </button>
                      </div>
                    )}
                  </div>
                  
                  {textTabMode === 'edit' || !profile.transcript.trim() ? (
                    <div className="flex-1 relative group">
                      <textarea
                        placeholder="Paste the call transcript here...&#10;&#10;BDA: Hi, am I speaking with Rohan?&#10;Lead: Yes, speaking."
                        value={profile.transcript}
                        onChange={(e) => updateField('transcript', e.target.value)}
                        className="w-full h-full min-h-[360px] border border-gray-200 rounded-md p-4 text-sm text-gray-700 leading-relaxed focus:outline-none focus:ring-1 focus:ring-gray-900 focus:border-gray-900 resize-none bg-gray-50/50 custom-scrollbar transition-colors"
                      />
                      {profile.transcript && (
                        <button 
                          onClick={() => updateField('transcript', '')}
                          className="absolute top-3 right-3 p-1.5 bg-white border border-gray-200 rounded-md text-gray-400 hover:text-gray-700 shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"
                          title="Clear transcript"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="border border-gray-200 rounded-md bg-white p-2">
                      <TranscriptViewer text={profile.transcript} className="h-[360px]" />
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex flex-col gap-4 flex-1">
                  <div
                    onClick={() => !transcribeLoading && audioInputRef.current?.click()}
                    className={`border border-dashed rounded-md p-8 text-center transition-colors flex flex-col items-center justify-center min-h-[140px] ${
                      transcribeLoading
                        ? 'border-gray-200 bg-gray-50 cursor-not-allowed'
                        : 'border-gray-300 cursor-pointer hover:border-gray-900 hover:bg-gray-50'
                    }`}
                  >
                    <svg className="w-6 h-6 text-gray-400 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                    </svg>
                    <p className="text-sm font-medium text-gray-900">Upload audio recording</p>
                    <p className="text-xs text-gray-500 mt-1">MP3, WAV, M4A up to 25MB</p>
                    {audioFileName && (
                      <div className="mt-4 px-3 py-1.5 bg-gray-100 rounded-md border border-gray-200 flex items-center gap-2">
                        <span className="text-xs text-gray-900 font-medium truncate max-w-[200px]">{audioFileName}</span>
                        <span className="text-xs text-gray-500">{audioFileSize}</span>
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
                    <div className="flex items-center gap-2 text-gray-900 text-sm font-medium bg-gray-50 p-3 rounded-md border border-gray-200">
                      <Spinner /> Transcribing &amp; extracting profile...
                    </div>
                  )}

                  {transcribeSuccess && !transcribeLoading && (
                    <div className="flex items-center gap-2 text-gray-900 text-sm font-medium bg-green-50 p-3 rounded-md border border-green-200">
                      <span className="text-green-600">✓</span> Processing complete
                    </div>
                  )}

                  {profile.transcript && !transcribeLoading && (
                    <div className="flex-1 flex flex-col min-h-0">
                      <label className="block text-xs font-medium text-gray-700 mb-1.5">Processed Transcript</label>
                      <div className="border border-gray-200 rounded-md bg-white flex-1 overflow-hidden p-2">
                        <TranscriptViewer text={profile.transcript} className="h-[360px]" />
                      </div>
                    </div>
                  )}

                  {showAutoFillBanner && (
                    <div className="flex items-start justify-between gap-3 bg-gray-900 text-white rounded-md px-4 py-3 text-sm shadow-md mt-2">
                      <span className="flex items-center gap-2">
                        <span className="text-gray-400">⚡</span> Profile auto-filled from audio.
                      </span>
                      <button
                        onClick={() => setShowAutoFillBanner(false)}
                        className="shrink-0 text-gray-400 hover:text-white transition-colors"
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

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-3 pt-2">
            <button
              onClick={generateNudge}
              disabled={nudgeLoading}
              className="flex items-center gap-2 px-5 py-2.5 bg-white border border-gray-200 text-gray-900 text-sm font-medium rounded-md hover:bg-gray-50 disabled:opacity-60 disabled:cursor-not-allowed transition-colors shadow-sm"
            >
              {nudgeLoading ? <Spinner /> : <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>}
              {nudgeLoading ? 'Generating Nudge...' : 'Generate Pre-Call Nudge'}
            </button>

            <button
              onClick={generatePDF}
              disabled={pdfLoading}
              className="flex items-center gap-2 px-5 py-2.5 bg-gray-900 text-white text-sm font-medium rounded-md hover:bg-gray-800 disabled:opacity-60 disabled:cursor-not-allowed transition-colors shadow-sm"
            >
              {pdfLoading ? <Spinner /> : <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>}
              {pdfLoading ? 'Generating PDF...' : 'Generate Post-Call PDF'}
            </button>
          </div>

          {/* PDF Progress Stepper */}
          {pdfLoading && (
            <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
              <p className="text-sm font-semibold text-gray-900 mb-5">Processing Document</p>
              <div className="space-y-4">
                {PDF_STEPS.map((step, i) => {
                  const done = i < pdfStepIndex;
                  const active = i === pdfStepIndex;
                  return (
                    <div
                      key={i}
                      className={`flex items-center gap-3 text-sm transition-colors ${
                        done ? 'text-gray-900' : active ? 'text-gray-900 font-medium' : 'text-gray-400'
                      }`}
                    >
                      {done ? (
                        <span className="w-5 h-5 shrink-0 flex items-center justify-center text-gray-900">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                        </span>
                      ) : active ? (
                        <span className="w-5 h-5 shrink-0 flex items-center justify-center">
                          <Spinner size={4} />
                        </span>
                      ) : (
                        <span className="w-5 h-5 shrink-0 flex items-center justify-center">
                          <div className="w-1.5 h-1.5 bg-gray-300 rounded-full" />
                        </span>
                      )}
                      <span>
                        {step}
                        {active ? <AnimatedDots /> : ''}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Nudge Output Panel */}
          {nudgeResult && (
            <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-semibold text-gray-900">Pre-Call Nudge</h2>
                {nudgeSent && (
                  <span className="inline-flex items-center gap-1.5 bg-gray-100 text-gray-700 text-xs font-medium px-2.5 py-1 rounded-md border border-gray-200">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                    Sent to BDA
                  </span>
                )}
              </div>
              <div className="bg-gray-50 rounded-md border border-gray-200 p-4">
                <MarkdownText text={nudgeResult} />
              </div>
            </div>
          )}

          {/* PDF Preview Panel */}
          {pdfData && !pdfSkipped && (
            <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-semibold text-gray-900">Document Review</h2>
                {pdfSent && (
                  <span className="inline-flex items-center gap-1.5 bg-gray-100 text-gray-700 text-xs font-medium px-2.5 py-1 rounded-md border border-gray-200">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                    Sent to Lead
                  </span>
                )}
              </div>

              {/* Extraction summary */}
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                {[
                  { label: 'Sentiment', value: pdfData.extraction?.leadSentiment },
                  { label: 'Key Motivation', value: pdfData.extraction?.keyMotivation },
                  { label: 'Biggest Hesitation', value: pdfData.extraction?.biggestHesitation },
                  { label: 'Questions Found', value: `${pdfData.extraction?.openQuestions?.length ?? 0} open` },
                ].map((item) => (
                  <div key={item.label} className="bg-gray-50 rounded-md p-3 border border-gray-200">
                    <p className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider mb-1">{item.label}</p>
                    <p className="text-sm text-gray-900 font-medium leading-snug">{item.value}</p>
                  </div>
                ))}
              </div>

              {/* Open questions */}
              {pdfData.extraction?.openQuestions?.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-900 uppercase tracking-wider mb-3">Open Questions</p>
                  <ul className="space-y-2">
                    {pdfData.extraction.openQuestions.map((q: any, i: number) => (
                      <li key={i} className="flex items-start gap-3 text-sm text-gray-700 bg-white border border-gray-200 rounded-md px-3 py-2.5">
                        <span className={`mt-0.5 text-[10px] font-bold px-2 py-0.5 rounded-sm shrink-0 uppercase tracking-wider ${
                          q.priority === 'high' ? 'bg-red-50 text-red-700 border border-red-100'
                          : q.priority === 'medium' ? 'bg-amber-50 text-amber-700 border border-amber-100'
                          : 'bg-gray-100 text-gray-600 border border-gray-200'
                        }`}>
                          {q.priority}
                        </span>
                        <span className="leading-relaxed">{q.question}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Preview PDF */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs font-semibold text-gray-900 uppercase tracking-wider">Preview</p>
                  <a
                    href={pdfData.pdfUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-600 hover:text-gray-900 transition-colors"
                  >
                    Open in new tab ↗
                  </a>
                </div>
                <div className="bg-gray-100 rounded-md p-1 border border-gray-200">
                  <iframe
                    src={pdfData.pdfUrl}
                    width="100%"
                    height="480"
                    className="rounded bg-white block"
                    title="PDF Preview"
                  />
                </div>
              </div>

              {/* Covering message + Actions */}
              {!pdfSent && (
                <div className="border-t border-gray-200 pt-6 space-y-5">
                  <div className="max-w-md">
                    <label className="block text-xs font-medium text-gray-700 mb-1.5">
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
                      className={`w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-gray-900 focus:border-gray-900 ${
                        leadPhoneError ? 'border-red-300' : 'border-gray-200'
                      }`}
                    />
                    {leadPhoneError && <p className="text-red-600 text-xs mt-1.5 font-medium">{leadPhoneError}</p>}
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-2">Covering Message</label>

                    {editingMessage ? (
                      <div className="space-y-3">
                        <textarea
                          value={coveringMessage}
                          onChange={(e) => setCoveringMessage(e.target.value)}
                          rows={5}
                          autoFocus
                          className="w-full border border-gray-900 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-gray-900 resize-none"
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={approveSend}
                            disabled={sendLoading}
                            className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-md hover:bg-gray-800 disabled:opacity-60 transition-colors shadow-sm"
                          >
                            {sendLoading ? <Spinner /> : null}
                            {sendLoading ? 'Sending...' : 'Save & Send'}
                          </button>
                          <button
                            onClick={() => {
                              setEditingMessage(false);
                              setCoveringMessage(pdfData.coveringMessage);
                            }}
                            disabled={sendLoading}
                            className="px-4 py-2 bg-white border border-gray-200 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-50 transition-colors disabled:opacity-50 shadow-sm"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="bg-gray-50 rounded-md p-4 text-sm text-gray-700 whitespace-pre-wrap leading-relaxed border border-gray-200">
                          {coveringMessage}
                        </div>

                        <div className="flex flex-wrap gap-2">
                          <button
                            onClick={approveSend}
                            disabled={sendLoading || pdfSent}
                            className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-md hover:bg-gray-800 disabled:opacity-60 transition-colors shadow-sm"
                          >
                            {sendLoading ? <Spinner /> : null}
                            {sendLoading ? 'Sending...' : 'Approve & Send'}
                          </button>

                          <button
                            onClick={() => setEditingMessage(true)}
                            disabled={sendLoading}
                            className="px-4 py-2 bg-white border border-gray-200 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-50 transition-colors disabled:opacity-50 shadow-sm"
                          >
                            Edit Message
                          </button>

                          <button
                            onClick={() => setPdfSkipped(true)}
                            disabled={sendLoading}
                            className="px-4 py-2 bg-transparent text-gray-500 text-sm font-medium rounded-md hover:text-gray-900 transition-colors disabled:opacity-50"
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

          {/* Persona Comparison Panel */}
          {pdfHistory.length >= 2 && (
            <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
              <h2 className="text-base font-semibold text-gray-900 mb-1">Persona Comparison</h2>
              <p className="text-xs text-gray-500 mb-5">Personalisation differences across generated PDFs</p>
              <div className="flex flex-row gap-4 overflow-x-auto pb-2 custom-scrollbar">
                {pdfHistory.map((record, i) => (
                  <div
                    key={i}
                    className="min-w-[260px] flex-1 bg-gray-50 rounded-md border border-gray-200 p-4 flex flex-col gap-4"
                  >
                    <p className="font-semibold text-gray-900 text-sm">{record.personaName}</p>

                    {record.headline && (
                      <p className="text-xs text-gray-600 font-medium italic leading-relaxed border-l-2 border-gray-300 pl-2.5">
                        &ldquo;{record.headline}&rdquo;
                      </p>
                    )}

                    {(record.keyMotivation || record.biggestHesitation) && (
                      <div className="space-y-2">
                        {record.keyMotivation && (
                          <div className="bg-white border border-gray-200 rounded px-2.5 py-2">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-0.5">Driving them</p>
                            <p className="text-xs text-gray-700 leading-relaxed">{record.keyMotivation}</p>
                          </div>
                        )}
                        {record.biggestHesitation && (
                          <div className="bg-white border border-gray-200 rounded px-2.5 py-2">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-0.5">Biggest blocker</p>
                            <p className="text-xs text-gray-700 leading-relaxed">{record.biggestHesitation}</p>
                          </div>
                        )}
                      </div>
                    )}

                    <div>
                      <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-2">Open Questions</p>
                      {record.openQuestions.length > 0 ? (
                        <ul className="space-y-2">
                          {record.openQuestions.map((q, j) => (
                            <li key={j} className="text-xs text-gray-700 bg-white rounded border border-gray-200 px-2.5 py-2 leading-relaxed shadow-sm">
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
                      className="mt-auto inline-flex items-center gap-1.5 text-xs text-gray-600 font-medium hover:text-gray-900 transition-colors pt-2"
                    >
                      View Document ↗
                    </a>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <footer className="mt-8 border-t border-gray-200 bg-white py-6 text-center">
          <div className="flex flex-col items-center gap-2">
            <div className="w-6 h-6 rounded-sm overflow-hidden flex items-center justify-center mb-1 shrink-0 grayscale opacity-80">
              <Image src="/scaler-logo.jpg" alt="Scaler Logo" width={24} height={24} className="object-contain" />
            </div>
            <p className="text-xs text-gray-500 font-medium">Scaler Sales AI Agent &middot; Internal Use Only</p>
            <p className="text-[10px] text-gray-400">
              Session started: {formatDateTime(sessionStart)} &middot; Local time: {nowTime.toLocaleTimeString('en-IN', { timeStyle: 'short' })}
            </p>
          </div>
        </footer>

      </div>
    </div>
  );
}
