import { useContext } from 'react'
import { LiveStatusContext, type LiveStatus } from '@/app/liveStatusContext'

export function useLiveStatus(): LiveStatus {
  const value = useContext(LiveStatusContext)
  if (!value) throw new Error('useLiveStatus must be used inside <LiveStatusProvider>')
  return value
}
