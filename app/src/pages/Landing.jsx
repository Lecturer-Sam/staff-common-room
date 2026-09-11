import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const CONTACT_EMAIL = 'lecturersamdotcom@gmail.com'
// 0503606073 in international format (Ghana +233, leading 0 dropped)
const WHATSAPP_NUMBER = '233503606073'
const WHATSAPP_URL = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(
  'Hello Beacon Educational Consult, I have a question.',
)}`
// Web3Forms access key — public by design (it lives in client code). Delivers
// submissions to lecturersamdotcom@gmail.com. Override via env if you rotate it.
const WEB3FORMS_ACCESS_KEY =
  import.meta.env.VITE_WEB3FORMS_ACCESS_KEY || '7b30e1a5-c946-48a3-9e28-e672ec7a9f42'

/* ── Contact form (delivers to CONTACT_EMAIL via Web3Forms) ───────────────── */
function ContactForm() {
  const [form, setForm] = useState({ name: '', email: '', message: '' })
  const [status, setStatus] = useState('idle') // idle | sending | success | error
  const [error, setError] = useState('')
  const set = (patch) => setForm((f) => ({ ...f, ...patch }))

  async function handleSubmit(e) {
    e.preventDefault()
    setStatus('sending')
    setError('')
    try {
      const res = await fetch('https://api.web3forms.com/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          access_key: WEB3FORMS_ACCESS_KEY,
          subject: `New Beacon website enquiry from ${form.name || 'a visitor'}`,
          from_name: 'Beacon Educational Consult',
          name: form.name,
          email: form.email,
          message: form.message,
          botcheck: '',
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok && data.success) {
        setStatus('success')
        setForm({ name: '', email: '', message: '' })
      } else {
        setStatus('error')
        setError(
          data.message ||
            'Something went wrong sending your message. Please try WhatsApp or email below.',
        )
      }
    } catch {
      setStatus('error')
      setError('Network error. Please try again, or reach us on WhatsApp or email below.')
    }
  }

  if (status === 'success') {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6 text-center">
        <p className="text-sm font-semibold text-emerald-800">
          Thanks — your message has been sent.
        </p>
        <p className="mt-1 text-sm text-emerald-700">We’ll reply to your email soon.</p>
        <button
          type="button"
          onClick={() => setStatus('idle')}
          className="mt-4 text-sm font-semibold text-emerald-700 underline"
        >
          Send another message
        </button>
      </div>
    )
  }

  const inputCls =
    'w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:border-indigo-500 focus:outline-none'

  return (
    <form onSubmit={handleSubmit} className="space-y-3 text-left">
      <div className="grid gap-3 sm:grid-cols-2">
        <input
          required
          value={form.name}
          onChange={(e) => set({ name: e.target.value })}
          placeholder="Your name"
          className={inputCls}
        />
        <input
          required
          type="email"
          value={form.email}
          onChange={(e) => set({ email: e.target.value })}
          placeholder="Your email"
          className={inputCls}
        />
      </div>
      <textarea
        required
        rows={5}
        value={form.message}
        onChange={(e) => set({ message: e.target.value })}
        placeholder="How can we help?"
        className={inputCls}
      />
      {/* Honeypot — hidden from humans, catches bots */}
      <input
        type="checkbox"
        name="botcheck"
        tabIndex={-1}
        autoComplete="off"
        className="hidden"
        aria-hidden="true"
      />
      {error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      )}
      <button
        type="submit"
        disabled={status === 'sending'}
        className="w-full rounded-lg bg-indigo-600 px-6 py-3 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
      >
        {status === 'sending' ? 'Sending…' : 'Send message'}
      </button>
    </form>
  )
}

const features = [
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6 text-indigo-600">
        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
      </svg>
    ),
    title: 'NaCCA Curriculum Library',
    body: 'Browse every strand, sub-strand, content standard and indicator for all subjects — exactly as coded by NaCCA — from Basic 1 to Basic 9.',
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6 text-amber-500">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
      </svg>
    ),
    title: 'Indicator-Tagged Lesson Plans',
    body: 'Members share lesson plans tagged to specific curriculum indicators. Find ready-to-adapt material for the exact lesson you are teaching.',
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6 text-emerald-600">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
    title: 'A Network of Teachers',
    body: 'Connect with fellow consortium members across Ghana — share classroom wins, ask questions and consult colleagues by subject.',
  },
]

/* ── Portal mockup rendered in the hero ──────────────────────────────────── */
function PortalMockup() {
  return (
    <div className="relative w-full select-none overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 shadow-2xl ring-1 ring-slate-900/5">
      {/* Browser chrome */}
      <div className="flex items-center gap-1.5 border-b border-slate-200 bg-white px-3 py-2 sm:px-4 sm:py-2.5">
        <span className="h-2 w-2 shrink-0 rounded-full bg-red-400 sm:h-2.5 sm:w-2.5" />
        <span className="h-2 w-2 shrink-0 rounded-full bg-amber-400 sm:h-2.5 sm:w-2.5" />
        <span className="h-2 w-2 shrink-0 rounded-full bg-emerald-400 sm:h-2.5 sm:w-2.5" />
        <div className="mx-2 min-w-0 flex-1 truncate rounded-md bg-slate-100 px-2 py-0.5 text-[9px] text-slate-400 sm:mx-3 sm:px-3 sm:py-1 sm:text-[10px]">
          beacon-consult.vercel.app/portal
        </div>
      </div>

      {/* App shell */}
      <div className="flex h-[260px] sm:h-[340px]">
        {/* Sidebar */}
        <aside className="hidden w-24 flex-col gap-0.5 border-r border-black/10 bg-nav p-2 min-[400px]:flex sm:w-32 sm:p-2.5">
          <div className="mb-2 flex items-center gap-1 px-1">
            <img src="/beaconlogo.png" alt="" className="h-4 w-4 shrink-0 object-contain sm:h-5 sm:w-5" />
            <span className="min-w-0 truncate text-[8px] font-bold text-slate-900 sm:text-[9px]">BEC</span>
          </div>
          {[
            { label: 'Feed',        active: true  },
            { label: 'Curriculum',  active: false },
            { label: 'Schemes',     active: false },
            { label: 'Lesson Plans',active: false },
            { label: 'Questions',   active: false },
            { label: 'Articles',    active: false },
          ].map(({ label, active }) => (
            <div
              key={label}
              className={`truncate rounded-md px-1.5 py-0.5 text-[8px] font-semibold sm:px-2 sm:py-1 sm:text-[10px] ${
                active ? 'bg-brand text-white' : 'text-slate-800'
              }`}
            >
              {label}
            </div>
          ))}
        </aside>

        {/* Main content — Teacher Feed */}
        <div className="flex-1 overflow-hidden p-2 sm:p-3">
          {/* Page title */}
          <div className="mb-2">
            <div className="text-[10px] font-bold text-slate-800 sm:text-[11px]">Teacher Feed</div>
            <div className="mt-0.5 hidden text-[9px] text-slate-400 sm:block">Share ideas, questions and classroom wins</div>
          </div>

          {/* Calendar widget */}
          <div className="mb-1.5 flex items-center gap-1.5 rounded-lg bg-emerald-50 px-2 py-1">
            <span className="relative flex h-2 w-2 shrink-0">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
            </span>
            <span className="text-[8px] font-semibold text-emerald-700">First Term — Wk 4</span>
          </div>

          {/* Composer box */}
          <div className="mb-2 rounded-lg border border-slate-200 bg-white p-1.5 sm:p-2">
            <div className="flex items-center gap-1.5">
              <div className="h-5 w-5 shrink-0 rounded-full bg-indigo-100 sm:h-6 sm:w-6" />
              <div className="flex-1 rounded-md bg-slate-50 px-1.5 py-1 text-[8px] text-slate-400">
                Share an idea or classroom win…
              </div>
            </div>
          </div>

          {/* Feed posts */}
          <div className="space-y-1.5">
            {[
              { name: 'Abena M.', text: 'Used role-play for the market scene in English today — pupils loved it!', color: 'bg-indigo-100' },
              { name: 'Kofi A.', text: 'Anyone have a B4 Fractions scheme they can share?', color: 'bg-emerald-100' },
              { name: 'Ama S.', text: 'Reminder: submit 5 questions to the bank before Friday.', color: 'bg-amber-100' },
            ].map((p) => (
              <div key={p.name} className="flex items-start gap-1.5 rounded-lg border border-slate-100 bg-white p-1.5">
                <div className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[7px] font-bold text-slate-600 ${p.color}`}>
                  {p.name[0]}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[8px] font-semibold text-slate-700">{p.name}</p>
                  <p className="line-clamp-1 text-[7px] text-slate-500">{p.text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function Landing() {
  const { user } = useAuth()

  return (
    <div className="min-h-screen bg-white">
      {/* Public nav */}
      <header className="sticky top-0 z-10 border-b border-white/10 bg-gradient-to-r from-[#1e293b] to-[#0f172a] backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-2 px-4 py-4 sm:gap-4">
          <span className="flex items-center gap-2">
            <img src="/beaconlogo.png" alt="Beacon Educational Consult" className="h-11 w-11 shrink-0 object-contain" />
            {/* Short on very small, full on sm+ */}
            <span className="text-sm font-bold text-white sm:hidden">BEC</span>
            <div className="hidden sm:block">
              <p className="text-sm font-bold leading-tight text-white">Beacon Educational</p>
              <p className="text-sm font-bold leading-tight text-slate-300">Consult</p>
            </div>
          </span>
          <nav className="hidden items-center gap-6 text-sm text-slate-300 sm:flex">
            <a href="#about" className="hover:text-white">About</a>
            <a href="#features" className="hover:text-white">What we offer</a>
            <Link to="/articles" className="hover:text-white">Articles</Link>
            <Link to="/quotes" className="hover:text-white">Quotes</Link>
            <Link to="/calendar" className="hover:text-white">Calendar</Link>
            <Link to="/vacancies" className="hover:text-white">Vacancies</Link>
            <a href="#contact" className="hover:text-white">Contact</a>
          </nav>
          <div className="flex shrink-0 items-center gap-2">
            {user ? (
              <Link to="/portal" className="rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-indigo-700 sm:px-4">
                Open portal
              </Link>
            ) : (
              <>
                <Link to="/login" className="rounded-md px-2 py-1.5 text-sm font-medium text-slate-300 hover:bg-white/10 hover:text-white sm:px-3">
                  Member login
                </Link>
                <Link to="/signup" className="rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-indigo-700 sm:px-4">
                  Apply to join
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* ── Hero ── */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:py-24">
        <div className="flex flex-col items-center gap-12 lg:flex-row lg:items-center lg:gap-16">
          {/* Left: text */}
          <div className="flex-1 text-center lg:text-left">
            <p className="mb-3 text-sm font-semibold tracking-widest text-amber-600 uppercase">
              For Ghanaian school teachers
            </p>
            <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl">
              Plan, share and consult around the{' '}
              <span className="text-indigo-700">NaCCA curriculum</span>
            </h1>
            <p className="mx-auto mt-5 max-w-xl text-lg text-slate-600 lg:mx-0">
              Beacon Educational Consult gives vetted consortium teachers a shared
              curriculum library, an indicator-tagged lesson plan bank, schemes of
              learning, a question bank, and a professional network — all in one place.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3 lg:justify-start">
              <Link
                to="/signup"
                className="rounded-lg bg-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow hover:bg-indigo-700"
              >
                Apply for membership
              </Link>
              <a
                href="#features"
                className="rounded-lg border border-slate-300 px-6 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                See what's inside
              </a>
            </div>

            {/* Social proof row */}
            <div className="mt-8 flex flex-wrap justify-center gap-6 text-sm text-slate-500 lg:justify-start">
              <span className="flex items-center gap-1.5">
                <svg viewBox="0 0 16 16" fill="currentColor" className="h-4 w-4 text-emerald-500"><circle cx="8" cy="8" r="8" /></svg>
                NaCCA-aligned, B1–B9
              </span>
              <span className="flex items-center gap-1.5">
                <svg viewBox="0 0 16 16" fill="currentColor" className="h-4 w-4 text-emerald-500"><circle cx="8" cy="8" r="8" /></svg>
                Vetted members only
              </span>
              <span className="flex items-center gap-1.5">
                <svg viewBox="0 0 16 16" fill="currentColor" className="h-4 w-4 text-emerald-500"><circle cx="8" cy="8" r="8" /></svg>
                Free to join
              </span>
            </div>
          </div>

          {/* Right: portal mockup — hidden on xs, shown from sm */}
          <div className="hidden w-full sm:block sm:flex-1 lg:max-w-[520px]">
            <PortalMockup />
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section id="features" className="border-t border-slate-100 bg-slate-50 py-16">
        <div className="mx-auto max-w-6xl px-4">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-slate-900">What members get</h2>
            <p className="mt-2 text-slate-500">Everything a Ghanaian teacher needs — in one members-only portal.</p>
          </div>
          <div className="mt-10 grid gap-6 sm:grid-cols-3">
            {features.map((f) => (
              <div key={f.title} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-slate-50">
                  {f.icon}
                </div>
                <h3 className="font-semibold text-slate-900">{f.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">{f.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── About ── */}
      <section id="about" className="py-16">
        <div className="mx-auto max-w-3xl px-4 text-center">
          <h2 className="text-2xl font-bold text-slate-900">About the consortium</h2>
          <p className="mt-4 leading-relaxed text-slate-600">
            The portal is reserved for vetted members of the consortium.
            Teachers apply with their school and subjects; an administrator
            reviews and approves each application. Once approved, members gain
            access to the curriculum library, the shared lesson-plan bank and
            the teacher network. Our curriculum reference follows the official
            National Council for Curriculum and Assessment (NaCCA) documents of
            the Ministry of Education, Republic of Ghana.
          </p>
        </div>
      </section>

      {/* ── Vacancies ── */}
      <section className="border-t border-slate-100 py-16">
        <div className="mx-auto max-w-3xl px-4 text-center">
          <h2 className="text-2xl font-bold text-slate-900">Teaching vacancies</h2>
          <p className="mt-4 leading-relaxed text-slate-600">
            Schools in the consortium advertise open teaching positions right
            here on the website. Browse current openings, or join the network
            to post vacancies from your own school.
          </p>
          <Link
            to="/vacancies"
            className="mt-5 inline-block rounded-lg bg-amber-500 px-6 py-3 text-sm font-semibold text-white hover:bg-amber-600"
          >
            View open vacancies
          </Link>
        </div>
      </section>

      {/* ── Contact ── */}
      <section id="contact" className="border-t border-slate-100 bg-slate-50 py-16">
        <div className="mx-auto max-w-3xl px-4">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-slate-900">Contact us</h2>
            <p className="mt-3 text-slate-600">
              Questions about membership or the consortium? Send a message and we’ll reply
              by email.
            </p>
          </div>

          <div className="mx-auto mt-8 max-w-xl">
            <ContactForm />

            {/* Direct channels */}
            <div className="mt-6 flex flex-col items-center gap-3 border-t border-slate-200 pt-6 sm:flex-row sm:justify-center">
              <a
                href={WHATSAPP_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-lg bg-[#25D366] px-5 py-2.5 text-sm font-semibold text-white transition hover:brightness-95"
              >
                <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51l-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.71.306 1.263.489 1.694.625.712.227 1.36.195 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z" />
                </svg>
                Chat on WhatsApp
              </a>
              <a
                href={`mailto:${CONTACT_EMAIL}`}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-5 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                  <rect x="2" y="4" width="20" height="16" rx="2" />
                  <path d="m22 7-10 5L2 7" />
                </svg>
                {CONTACT_EMAIL}
              </a>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-slate-200 py-6 text-center text-xs text-slate-400">
        © {new Date().getFullYear()} Beacon Educational Consult · Curriculum
        source: NaCCA, Ministry of Education, Ghana
      </footer>
    </div>
  )
}
