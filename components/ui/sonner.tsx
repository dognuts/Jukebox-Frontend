'use client'

import { Toaster as Sonner, ToasterProps } from 'sonner'

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="dark"
      className="toaster group"
      toastOptions={{
        style: {
          background: 'var(--card)',
          border: '1px solid oklch(0.30 0.03 60 / 0.4)',
          color: 'var(--foreground)',
        },
        classNames: {
          success: '[&>svg]:text-[color:var(--text-success)]',
          error: '[&>svg]:text-[color:var(--text-error)]',
          warning: '[&>svg]:text-[color:var(--text-warning)]',
          info: '[&>svg]:text-neon-blue',
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
