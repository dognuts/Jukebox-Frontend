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
          success: '[&>svg]:text-[oklch(0.65_0.15_155)]',
          error: '[&>svg]:text-[oklch(0.62_0.28_30)]',
          warning: '[&>svg]:text-[oklch(0.75_0.20_60)]',
          info: '[&>svg]:text-[oklch(0.72_0.18_250)]',
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
