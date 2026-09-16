import { cn } from './cn'
import { controlClass } from './controls'

export default function Select({ className, children, ...rest }) {
  return <select className={cn(controlClass, className)} {...rest}>{children}</select>
}
