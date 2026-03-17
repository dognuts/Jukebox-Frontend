'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

export function ProgressBar() {
  const [progress, setProgress] = useState(0)
  const [isVisible, setIsVisible] = useState(false)
  const router = useRouter()

  useEffect(() => {
    let progressInterval: NodeJS.Timeout

    const handleStart = () => {
      setProgress(0)
      setIsVisible(true)
      progressInterval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 90) return prev
          return prev + Math.random() * 30
        })
      }, 100)
    }

    const handleComplete = () => {
      setProgress(100)
      setTimeout(() => {
        setIsVisible(false)
        setProgress(0)
      }, 500)
    }

    // Listen for router events
    window.addEventListener('beforeunload', handleStart)
    
    // Simulate progress completion after page loads
    const handleLoad = () => handleComplete()
    window.addEventListener('load', handleLoad)

    return () => {
      clearInterval(progressInterval)
      window.removeEventListener('beforeunload', handleStart)
      window.removeEventListener('load', handleLoad)
    }
  }, [])

  if (!isVisible) return null

  return (
    <div
      className="fixed top-0 left-0 right-0 h-1 z-50 transition-opacity duration-300"
      style={{
        background: 'linear-gradient(90deg, var(--neon-amber), var(--neon-blue))',
        width: `${progress}%`,
        boxShadow: `0 0 10px var(--neon-amber), 0 0 20px ${
          progress > 50 ? 'var(--neon-blue)' : 'transparent'
        }`,
      }}
    />
  )
}
