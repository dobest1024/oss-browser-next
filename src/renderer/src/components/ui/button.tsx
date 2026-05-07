import React from 'react'
import { cn } from '@/lib/utils'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'ghost' | 'outline' | 'destructive' | 'link'
  size?: 'default' | 'sm' | 'icon'
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', size = 'default', ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50',
          {
            'bg-primary text-primary-foreground hover:bg-primary/90': variant === 'default',
            'hover:bg-accent hover:text-accent-foreground': variant === 'ghost',
            'border border-input bg-background hover:bg-accent': variant === 'outline',
            'bg-destructive text-destructive-foreground hover:bg-destructive/90': variant === 'destructive',
            'underline-offset-4 hover:underline': variant === 'link'
          },
          {
            'h-9 px-4 py-2 text-sm': size === 'default',
            'h-7 px-3 text-xs': size === 'sm',
            'h-8 w-8': size === 'icon'
          },
          className
        )}
        {...props}
      />
    )
  }
)
Button.displayName = 'Button'
