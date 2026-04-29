'use client';

import { useState, useRef } from 'react';
import { PERSONAS, LeadProfile } from '@/lib/personas';

// ─── Toast ───────────────────────────────────────────────────────────────────

type ToastType = 'success' | 'error' | 'info';
interface Toast {
  id: number;
  message: string;
  type: ToastType;
}

function ToastContainer({ toasts, onRemove }: { toasts: Toast[]; onRemove: (id: number) => void }) {
  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          onClick={() => onRemove(t.id)}
          className={`flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg cursor-pointer text-sm font-medium transition-all
            ${t.type === 'success' ? 'bg-green-600 text-white' : ''}
            ${t.type === 'error' ? 'bg-red-600 text-white' : ''}
            ${t.type === 'info' ? 'bg-[#0052CC] text-white' : ''}`}
        >
          <span>{t.type === 'success' ? '✓' : t.type === 'error' ? '✕' : 'ℹ'}</span>
          <span>{t.message}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Spinner ─────────────────────────────────────────────────────────────────

function Spinner() {
  return (
    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
    </svg>
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
  // ── state ──
  const [bdaPhone, setBdaPhone] = useState('');
  const [profile, setProfile] = useState<LeadProfile>({ ...emptyProfile });
  const [activeTab, setActiveTab] = useState<'transcript' | 'audio'>('transcript');

  const [nudgeLoading, setNudgeLoading] = useState(false);
  const [nudgeResult, setNudgeResult] = useState('');
  const [nudgeSent, setNudgeSent] = useState(false);

  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfData, setPdfData] = useState<any>(null);

  const [leadPhone, setLeadPhone] = useState('');
  const [coveringMessage, setCoveringMessage] = useState('');
  const [editingMessage, setEditingMessage] = useState(false);

  const [sendLoading, setSendLoading] = useState(false);
  const [pdfSent, setPdfSent] = useState(false);
  const [pdfSkipped, setPdfSkipped] = useState(false);

  const [transcribeLoading, setTranscribeLoading] = useState(false);
  const [audioFileName, setAudioFileName] = useState('');

  const [toasts, setToasts] = useState<Toast[]>([]);
  const toastId = useRef(0);

  const audioInputRef = useRef<HTMLInputElement>(null);

  // ── helpers ──
  function addToast(message: string, type: ToastType = 'info') {
    const id = ++toastId.current;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000);
  }

  function removeToast(id: number) {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }

  function loadPersona(key: string) {
    setProfile({ ...PERSONAS[key] });
    setNudgeResult('');
    setNudgeSent(false);
    setPdfData(null);
    setPdfSent(false);
    setPdfSkipped(false);
    setLeadPhone('');
    setCoveringMessage('');
    addToast(`Loaded ${PERSONAS[key].name}`, 'info');
  }

  function updateField<K extends keyof LeadProfile>(key: K, value: LeadProfile[K]) {
    setProfile((prev) => ({ ...prev, [key]: value }));
  }

  // ── actions ──
  async function generateNudge() {
    if (!profile.name) return addToast('Please fill in at least the lead name.', 'error');
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
      addToast(data.sent ? 'Nudge generated & sent to BDA!' : 'Nudge generated (no BDA number set).', 'success');
    } catch (e: any) {
      addToast(e.message, 'error');
    } finally {
      setNudgeLoading(false);
    }
  }

  async function generatePDF() {
    if (!profile.name) return addToast('Please fill in the lead profile first.', 'error');
    if (!profile.transcript) return addToast('Please add a call transcript first.', 'error');
    setPdfLoading(true);
    setPdfData(null);
    setPdfSent(false);
    setPdfSkipped(false);
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
      addToast('PDF generated — review before sending.', 'success');
    } catch (e: any) {
      addToast(e.message, 'error');
    } finally {
      setPdfLoading(false);
    }
  }

  async function approveSend() {
    if (!leadPhone) return addToast('Enter the lead\'s WhatsApp number first.', 'error');
    setSendLoading(true);
    try {
      const res = await fetch('/api/send-whatsapp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: leadPhone, message: coveringMessage, pdfUrl: pdfData.pdfUrl, type: 'pdf' }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setPdfSent(true);
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
    setTranscribeLoading(true);
    try {
      const formData = new FormData();
      formData.append('audio', file);
      const res = await fetch('/api/transcribe', { method: 'POST', body: formData });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      updateField('transcript', data.transcript);
      addToast('Audio transcribed successfully!', 'success');
    } catch (e: any) {
      addToast(e.message, 'error');
    } finally {
      setTranscribeLoading(false);
    }
  }

  // ── render ──
  return (
    <div className="min-h-screen bg-gray-50 text-gray-800">
      <ToastContainer toasts={toasts} onRemove={removeToast} />

      {/* Navbar */}
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
            <p className="text-blue-200 text-xs">Powered by Claude</p>
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
              onChange={(e) => setBdaPhone(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0052CC] focus:border-transparent"
            />
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
              <label className="block text-sm font-medium text-gray-700 mb-1">Role & Company *</label>
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
          </div>

          {/* C. Call Input — Two Tabs */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex flex-col">
            <h2 className="text-lg font-bold text-gray-800 mb-4">Call Input</h2>

            {/* Tabs */}
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
                  onClick={() => audioInputRef.current?.click()}
                  className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center cursor-pointer hover:border-[#0052CC] hover:bg-blue-50 transition-colors"
                >
                  <div className="text-3xl mb-2">🎙</div>
                  <p className="text-sm font-medium text-gray-700">Click to upload audio</p>
                  <p className="text-xs text-gray-400 mt-1">.mp3, .wav, .m4a, .webm</p>
                  {audioFileName && (
                    <p className="text-xs text-[#0052CC] font-medium mt-2 truncate">{audioFileName}</p>
                  )}
                </div>
                <input
                  ref={audioInputRef}
                  type="file"
                  accept=".mp3,.wav,.m4a,.webm"
                  className="hidden"
                  onChange={handleAudioUpload}
                />

                {transcribeLoading && (
                  <div className="flex items-center gap-2 text-[#0052CC] text-sm font-medium">
                    <Spinner /> Transcribing audio...
                  </div>
                )}

                {profile.transcript && !transcribeLoading && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Transcription Result</label>
                    <textarea
                      readOnly
                      value={profile.transcript}
                      rows={8}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-gray-50 resize-none focus:outline-none"
                    />
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

        {/* F1. Nudge Output Panel */}
        {nudgeResult && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-800">Pre-Call Nudge</h2>
              {nudgeSent && (
                <span className="flex items-center gap-1.5 bg-green-100 text-green-700 text-xs font-semibold px-3 py-1 rounded-full">
                  ✓ Sent to BDA
                </span>
              )}
            </div>
            <div className="bg-gray-50 rounded-xl p-4 text-sm text-gray-700 whitespace-pre-wrap leading-relaxed font-mono border border-gray-200">
              {nudgeResult}
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
                      <span className={`mt-0.5 text-xs font-bold px-2 py-0.5 rounded-full ${q.priority === 'high' ? 'bg-red-100 text-red-600' : q.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-200 text-gray-500'}`}>
                        {q.priority}
                      </span>
                      <span>{q.question}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* PDF link */}
            <div className="flex items-center gap-3">
              <a
                href={pdfData.pdfUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-[#0052CC] font-medium underline underline-offset-2 hover:text-blue-800"
              >
                📎 Preview PDF
              </a>
            </div>

            {/* G. Lead WhatsApp + covering message */}
            {!pdfSent && (
              <div className="border-t border-gray-100 pt-5 space-y-4">
                <div className="max-w-sm">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Lead's WhatsApp Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    placeholder="+91XXXXXXXXXX"
                    value={leadPhone}
                    onChange={(e) => setLeadPhone(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0052CC]"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-sm font-medium text-gray-700">Covering Message</label>
                    <button
                      onClick={() => setEditingMessage((v) => !v)}
                      className="text-xs text-[#0052CC] font-medium hover:underline"
                    >
                      {editingMessage ? 'Done editing' : 'Edit'}
                    </button>
                  </div>
                  {editingMessage ? (
                    <textarea
                      value={coveringMessage}
                      onChange={(e) => setCoveringMessage(e.target.value)}
                      rows={4}
                      className="w-full border border-[#0052CC] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0052CC] resize-none"
                    />
                  ) : (
                    <div className="bg-gray-50 rounded-xl p-3 text-sm text-gray-700 whitespace-pre-wrap leading-relaxed border border-gray-200">
                      {coveringMessage}
                    </div>
                  )}
                </div>

                {/* Approve / Edit / Skip */}
                <div className="flex flex-wrap gap-3 pt-1">
                  <button
                    onClick={approveSend}
                    disabled={sendLoading || !leadPhone}
                    className="flex items-center gap-2 px-5 py-2.5 bg-green-600 text-white font-semibold rounded-xl hover:bg-green-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
                  >
                    {sendLoading ? <Spinner /> : <span>✓</span>}
                    {sendLoading ? 'Sending...' : 'Approve & Send'}
                  </button>

                  <button
                    onClick={() => setEditingMessage(true)}
                    className="px-5 py-2.5 border-2 border-[#0052CC] text-[#0052CC] font-semibold rounded-xl hover:bg-blue-50 transition-colors"
                  >
                    ✏ Edit Message
                  </button>

                  <button
                    onClick={() => setPdfSkipped(true)}
                    className="px-5 py-2.5 border-2 border-gray-300 text-gray-500 font-semibold rounded-xl hover:bg-gray-100 transition-colors"
                  >
                    Skip
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

      </div>

      {/* Footer */}
      <footer className="mt-12 border-t border-gray-200 bg-white py-6 text-center text-xs text-gray-400">
        Scaler Sales AI Agent · Built with Claude &amp; Next.js · For internal use only
      </footer>
    </div>
  );
}
