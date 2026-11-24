// Hooks around the shared socket.
//
//   useSocket()                → { socket, connected }  (re-renders on connect/disconnect)
//   useSocketEvent(evt, fn)    → subscribe to a server event for the component's lifetime
import { useEffect, useRef, useSyncExternalStore } from 'react'
import { socket, type PgPulseSocket } from '@/lib/socket'
import type { ServerToClientEvents } from '@/lib/types'

// useSyncExternalStore is React's built-in way to read state that lives
// outside React (here: the socket's connection flag) without tearing.
function subscribeConnection(onChange: () => void) {
  socket.on('connect', onChange)
  socket.on('disconnect', onChange)
  return () => {
    socket.off('connect', onChange)
    socket.off('disconnect', onChange)
  }
}

const getConnected = () => socket.connected

export function useSocket(): { socket: PgPulseSocket; connected: boolean } {
  const connected = useSyncExternalStore(subscribeConnection, getConnected, getConnected)
  return { socket, connected }
}

/**
 * Listen to a server event. The latest handler is kept in a ref, so callers
 * can pass an inline function without re-subscribing on every render.
 */
export function useSocketEvent<E extends keyof ServerToClientEvents>(
  event: E,
  handler: ServerToClientEvents[E],
): void {
  const handlerRef = useRef(handler)
  useEffect(() => {
    handlerRef.current = handler
  })

  useEffect(() => {
    const listener = ((...args: Parameters<ServerToClientEvents[E]>) => {
      ;(handlerRef.current as (...a: Parameters<ServerToClientEvents[E]>) => void)(...args)
    }) as ServerToClientEvents[E]
    // Socket.IO's typed overloads don't narrow well with a generic event name
    ;(socket.on as (e: E, l: ServerToClientEvents[E]) => void)(event, listener)
    return () => {
      ;(socket.off as (e: E, l: ServerToClientEvents[E]) => void)(event, listener)
    }
  }, [event])
}
