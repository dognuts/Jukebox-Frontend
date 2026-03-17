interface SectionDividerProps {
  className?: string
}

export function SectionDivider({ className = "" }: SectionDividerProps) {
  return (
    <div className={`section-divider ${className}`} aria-hidden="true" />
  )
}
