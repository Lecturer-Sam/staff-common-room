import { Sigma, BookOpen, FlaskConical, Globe, Laptop, Wrench, HeartHandshake, Palette } from 'lucide-react'

const MAP = {
  sigma: Sigma, 'book-open': BookOpen, flask: FlaskConical, globe: Globe,
  laptop: Laptop, wrench: Wrench, 'heart-hands': HeartHandshake, palette: Palette,
}

export function SubjectIcon({ name, size = 20 }) {
  const Icon = MAP[name] ?? BookOpen
  return <Icon size={size} />
}