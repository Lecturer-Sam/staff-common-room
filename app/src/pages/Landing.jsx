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

/* ── Content ─────────────────────────────────────────────────────────────── */

const STEPS = [
  {
    n: '1',
    title: 'Choose your class',
    body: 'Pick your grade — Basic 1 through Basic 9 — and your subject. Every grade and subject in the NaCCA curriculum is covered.',
  },
  {
    n: '2',
    title: 'Choose the term',
    body: 'Term 1, 2 or 3, or the whole year at once. Add your school, class, name and year if you want them printed on the cover.',
  },
  {
    n: '3',
    title: 'Download it',
    body: 'A finished Word document lands in your downloads in about a second — ready to print, sign and submit.',
  },
]

const STATS = [
  { value: '13,140', label: 'curriculum-aligned lesson plans behind the generator' },
  { value: '1,791', label: 'NaCCA indicators, coded strand to indicator' },
  { value: 'B1–B9', label: 'every grade, 13 subjects' },
  { value: '180', label: 'teaching days mapped per subject, per year' },
]

const CONTRAST = {
  printed: [
    'One copy, passed around or photocopied',
    'Goes out of date and nobody tells you',
    'Blank lines for you to fill in by hand',
    'The same booklet as every other school',
  ],
  beacon: [
    'Yours to keep and regenerate any time',
    'Rebuilt for the term you are actually teaching',
    'Your school, class and name printed on the cover',
    'Matched to the indicators you are teaching that week',
  ],
}

/* ── Sections ────────────────────────────────────────────────────────────── */

function Check({ children }) {
  return (
    <li className="flex items-start gap-2 text-sm text-slate-600">
      <svg
        viewBox="0 0 20 20"
        fill="currentColor"
        className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500"
        aria-hidden="true"
      >
        <path
          fillRule="evenodd"
          d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm3.857-9.809a.75.75 0 0 0-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 1 0-1.06 1.061l2.5 2.5a.75.75 0 0 0 1.137-.089l4-5.5Z"
          clipRule="evenodd"
        />
      </svg>
      <span>{children}</span>
    </li>
  )
}

function Cross({ children }) {
  return (
    <li className="flex items-start gap-2 text-sm text-slate-500">
      <svg
        viewBox="0 0 20 20"
        fill="currentColor"
        className="mt-0.5 h-4 w-4 shrink-0 text-slate-300"
        aria-hidden="true"
      >
        <path
          fillRule="evenodd"
          d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16ZM6.75 9.25a.75.75 0 0 0 0 1.5h6.5a.75.75 0 0 0 0-1.5h-6.5Z"
          clipRule="evenodd"
        />
      </svg>
      <span>{children}</span>
    </li>
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
            <a href="#how" className="hover:text-white">How it works</a>
            <a href="#sample" className="hover:text-white">See a sample</a>
            <a href="#library" className="hover:text-white">The library</a>
            <Link to="/articles" className="hover:text-white">Articles</Link>
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
                  Create account
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* ── Hero ── */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:py-24">
        <div className="flex flex-col items-center gap-12 lg:flex-row lg:items-center lg:gap-16">
          <div className="flex-1 text-center lg:text-left">
            <p className="mb-3 text-sm font-semibold tracking-widest text-amber-600 uppercase">
              For Ghanaian basic school teachers
            </p>
            <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl">
              Get your <span className="text-indigo-700">Sundays</span> back.
            </h1>
            <p className="mx-auto mt-5 max-w-xl text-lg text-slate-600 lg:mx-0">
              Generate a complete Scheme of Learning or Record of Work for your
              class — NaCCA-aligned, printed with your school&rsquo;s name, ready
              in about a second. No more writing them out by hand every term.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3 lg:justify-start">
              <Link
                to="/signup"
                className="rounded-lg bg-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow hover:bg-indigo-700"
              >
                Create your account
              </Link>
              <a
                href="#sample"
                className="rounded-lg border border-slate-300 px-6 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                See a sample scheme
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
                Ready in seconds
              </span>
              <span className="flex items-center gap-1.5">
                <svg viewBox="0 0 16 16" fill="currentColor" className="h-4 w-4 text-emerald-500"><circle cx="8" cy="8" r="8" /></svg>
                Your school&rsquo;s name on it
              </span>
            </div>
          </div>

          {/* Right: the actual output */}
          <div className="hidden w-full sm:block sm:flex-1 lg:max-w-[520px]">
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl ring-1 ring-slate-900/5">
              <img
                src="/samples/scheme-sample.jpg"
                alt="A generated Scheme of Learning for Basic 4 Mathematics, showing the cover with the school name and a week-by-week table"
                className="w-full"
              />
            </div>
            <p className="mt-2 text-center text-xs text-slate-400">
              Basic 4 Mathematics — one page of a generated scheme
            </p>
          </div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section id="how" className="border-t border-slate-100 bg-slate-50 py-16">
        <div className="mx-auto max-w-6xl px-4">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-slate-900">How it works</h2>
            <p className="mt-2 text-slate-500">
              Three clicks between you and a finished scheme.
            </p>
          </div>
          <div className="mt-10 grid gap-6 sm:grid-cols-3">
            {STEPS.map((s) => (
              <div key={s.n} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-600 text-base font-bold text-white">
                  {s.n}
                </div>
                <h3 className="font-semibold text-slate-900">{s.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Sample ── */}
      <section id="sample" className="py-16">
        <div className="mx-auto max-w-4xl px-4">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-slate-900">This is what you get</h2>
            <p className="mx-auto mt-2 max-w-2xl text-slate-500">
              A real generated scheme. Your school, class, name and year are
              printed on the cover — not left blank for you to fill in.
            </p>
          </div>
          <div className="mt-8 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg">
            <img
              src="/samples/scheme-sample.jpg"
              alt="A generated Scheme of Learning showing the cover page with school and teacher details, and a week-by-week table of strands, content standards and indicators"
              className="w-full"
            />
          </div>
        </div>
      </section>

      {/* ── The library ── */}
      <section id="library" className="border-t border-slate-100 bg-slate-50 py-16">
        <div className="mx-auto max-w-6xl px-4">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-slate-900">What it&rsquo;s built on</h2>
            <p className="mt-2 text-slate-500">
              Every document is generated from a mapped curriculum library — not
              written from scratch each time.
            </p>
          </div>
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {STATS.map((s) => (
              <div key={s.label} className="rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm">
                <p className="text-3xl font-extrabold text-indigo-700">{s.value}</p>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">{s.label}</p>
              </div>
            ))}
          </div>
          <p className="mx-auto mt-8 max-w-3xl text-center text-sm leading-relaxed text-slate-500">
            Curriculum reference follows the official National Council for
            Curriculum and Assessment (NaCCA) documents of the Ministry of
            Education, Republic of Ghana.
          </p>
        </div>
      </section>

      {/* ── Why not printed ── */}
      <section className="py-16">
        <div className="mx-auto max-w-5xl px-4">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-slate-900">Why not just buy a printed booklet?</h2>
            <p className="mt-2 text-slate-500">
              An honest comparison — because you can, and plenty of teachers do.
            </p>
          </div>
          <div className="mt-8 grid gap-6 sm:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-white p-6">
              <h3 className="font-semibold text-slate-500">A printed booklet</h3>
              <ul className="mt-4 space-y-2">
                {CONTRAST.printed.map((t) => (
                  <Cross key={t}>{t}</Cross>
                ))}
              </ul>
            </div>
            <div className="rounded-2xl border border-indigo-200 bg-indigo-50 p-6">
              <h3 className="font-semibold text-indigo-900">Generated with Beacon</h3>
              <ul className="mt-4 space-y-2">
                {CONTRAST.beacon.map((t) => (
                  <Check key={t}>{t}</Check>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ── For headteachers — a door, not a second audience ── */}
      <section className="border-t border-slate-100 bg-slate-50 py-12">
        <div className="mx-auto max-w-3xl px-4 text-center">
          <h2 className="text-lg font-bold text-slate-900">
            Headteacher or proprietor?
          </h2>
          <p className="mt-3 leading-relaxed text-slate-600">
            Your teachers can each have this. If you would like your whole staff
            set up — with your school&rsquo;s name on every document they produce
            — send us a message and we&rsquo;ll arrange it.
          </p>
          <a
            href="#contact"
            className="mt-5 inline-block rounded-lg border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100"
          >
            Talk to us about your school
          </a>
        </div>
      </section>

      {/* ── Contact ── */}
      <section id="contact" className="border-t border-slate-100 py-16">
        <div className="mx-auto max-w-3xl px-4">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-slate-900">Contact us</h2>
            <p className="mt-3 text-slate-600">
              Questions about the generator, your subjects, or setting up a
              school? Send a message and we&rsquo;ll reply by email.
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
