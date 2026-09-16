import { cn } from './cn'
import { controlClass } from './controls'

export default function Textarea({ className, rows = 4, ...rest }) {
  return <textarea rows={rows} className={cn(controlClass, className)} {...rest} />
}
