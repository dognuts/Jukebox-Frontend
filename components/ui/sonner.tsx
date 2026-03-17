'use client'

import { Toaster as Sonner, ToasterProps } from 'sonner'

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="dark"
      className="toaster group"
      toastOptions={{
        style: {
          background: 'oklch(0.16 0.01 280)',
          border: '1px solid oklch(0.30 0.03 60 / 0.4)',
          color: 'oklch(0.95 0 0)',
        },
        classNames: {
          success: '[&>svg]:text-green-500',
          error: '[&>svg]:text-red-500',
          warning: '[&>svg]:text-amber-500',
          info: '[&>svg]:text-blue-500',
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
