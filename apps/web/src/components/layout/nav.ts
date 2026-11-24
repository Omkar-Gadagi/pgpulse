import type { LucideIcon } from 'lucide-react'
import { Activity, Bell, Gauge, Lock, ScrollText, Settings, Table2 } from 'lucide-react'

export interface NavItem {
  label: string
  icon: LucideIcon
  /** route path; absent for pages that don't exist yet */
  to?: string
  /** shown greyed-out with a "soon" tag */
  soon?: boolean
}

// Single list used by both the desktop sidebar and the mobile drawer.
export const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', icon: Gauge, to: '/' },
  { label: 'Queries', icon: ScrollText, to: '/queries' },
  { label: 'Activity & Locks', icon: Lock, soon: true },
  { label: 'Tables & Indexes', icon: Table2, soon: true },
  { label: 'Alerts', icon: Bell, soon: true },
  { label: 'Settings', icon: Settings, soon: true },
]

export const BRAND_ICON = Activity
