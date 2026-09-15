import { cn } from './cn'
import { controlClass } from './controls'

export default function Input({ className, ...rest }) {
  return <input className={cn(controlClass, className)} {...rest} />
}
