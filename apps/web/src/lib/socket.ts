// The ONE Socket.IO connection for the whole app. Every component that needs
// live data uses this instance (through useSocket), so opening the dashboard
// never creates a second connection.
import { io, type Socket } from 'socket.io-client'
import { API_URL } from './api'
import type { ClientToServerEvents, ServerToClientEvents } from './types'

export type PgPulseSocket = Socket<ServerToClientEvents, ClientToServerEvents>

export const socket: PgPulseSocket = io(API_URL, {
  // Skip the HTTP long-polling handshake; every modern browser has WebSockets.
  transports: ['websocket'],
  // Keep retrying forever with backoff (1s → max 5s) when the server is down.
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
})
