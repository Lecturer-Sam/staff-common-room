/**
 * Per-subject color theme used across Curriculum cards and SubjectBrowser.
 *
 * accent  — Tailwind bg class for the icon badge background
 * text    — Tailwind text class for the icon and label
 * border  — Tailwind border class on hover
 * icon    — string key into SUBJECT_ICONS (defined in subjectThemes.jsx)
 */

const themes = {
  mathematics:          { accent: 'bg-blue-50',    text: 'text-blue-600',   border: 'hover:border-blue-300',   icon: 'mathematics' },
  english:              { accent: 'bg-violet-50',  text: 'text-violet-600', border: 'hover:border-violet-300', icon: 'english' },
  science:              { accent: 'bg-emerald-50', text: 'text-emerald-600',border: 'hover:border-emerald-300',icon: 'science' },
  'creative-arts':      { accent: 'bg-pink-50',    text: 'text-pink-600',   border: 'hover:border-pink-300',   icon: 'creative-arts' },
  'creative-arts-design':{ accent: 'bg-pink-50',   text: 'text-pink-600',   border: 'hover:border-pink-300',   icon: 'creative-arts' },
  history:              { accent: 'bg-amber-50',   text: 'text-amber-600',  border: 'hover:border-amber-300',  icon: 'history' },
  owop:                 { accent: 'bg-teal-50',    text: 'text-teal-600',   border: 'hover:border-teal-300',   icon: 'owop' },
  rme:                  { accent: 'bg-orange-50',  text: 'text-orange-600', border: 'hover:border-orange-300', icon: 'rme' },
  'ghanaian-language':  { accent: 'bg-lime-50',    text: 'text-lime-700',   border: 'hover:border-lime-300',   icon: 'ghanaian-language' },
  computing:            { accent: 'bg-cyan-50',    text: 'text-cyan-600',   border: 'hover:border-cyan-300',   icon: 'computing' },
  'career-technology':  { accent: 'bg-indigo-50',  text: 'text-indigo-600', border: 'hover:border-indigo-300', icon: 'career-technology' },
  'physical-education': { accent: 'bg-sky-50',     text: 'text-sky-600',    border: 'hover:border-sky-300',    icon: 'physical-education' },
}

const fallback = {
  accent: 'bg-slate-100', text: 'text-slate-500', border: 'hover:border-slate-300', icon: 'default',
}

export function getSubjectTheme(subjectId = '') {
  if (themes[subjectId]) return themes[subjectId]
  const key = Object.keys(themes).find(
    (k) => subjectId.startsWith(k) || k.startsWith(subjectId.split('-')[0]),
  )
  return themes[key] ?? fallback
}
