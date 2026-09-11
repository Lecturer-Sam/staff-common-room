import { cn } from './cn'
import { controlClass } from './controls'

export default function Select({ className, children, ...rest }) {
  return (
    <select className={cn(controlClass, 'appearance-none bg-white pr-8', className)} {...rest}>
      {children}
    </select>
  )
}
