// Left navigation. Real pages are <NavLink>s (focusable, Enter to open, and
// aria-current="page" on the active one). Future pages are rendered as
// disabled items with a "soon" tag: visible so people see the roadmap, but
// skipped by Tab because there's nothing to open.
import { NavLink } from 'react-router'
import { cn } from '@/lib/utils'
import { BRAND_ICON as BrandIcon, NAV_ITEMS } from './nav'

interface NavListProps {
  /** Called after a link is chosen (closes the mobile drawer). */
  onNavigate?: () => void
}

export function NavList({ onNavigate }: NavListProps) {
  return (
    <ul className="flex flex-col gap-1">
      {NAV_ITEMS.map(({ label, icon: Icon, to, soon }) => (
        <li key={label}>
          {to && !soon ? (
            <NavLink
              to={to}
              end={to === '/'}
              onClick={onNavigate}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                  'outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring',
                  isActive
                    ? 'bg-sidebar-accent text-sidebar-accent-foreground shadow-[inset_2px_0_0_var(--sidebar-primary)]'
                    : 'text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground',
                )
              }
            >
              {({ isActive }) => (
                <>
                  <Icon
                    aria-hidden
                    className={cn('size-4', isActive ? 'text-sidebar-primary' : 'opacity-80')}
                  />
                  {label}
                </>
              )}
            </NavLink>
          ) : (
            <span
              aria-disabled="true"
              className="flex cursor-not-allowed items-center gap-3 rounded-md px-3 py-2 text-sm text-sidebar-foreground/45"
            >
              <Icon aria-hidden className="size-4" />
              <span className="flex-1">{label}</span>
              <span className="rounded-full border border-sidebar-border px-1.5 py-px text-[10px] font-medium tracking-wide uppercase">
                soon
              </span>
            </span>
          )}
        </li>
      ))}
    </ul>
  )
}

export function Brand() {
  return (
    <div className="flex items-center gap-2.5 px-3">
      <span className="grid size-8 place-items-center rounded-lg bg-primary/15 text-primary">
        <BrandIcon aria-hidden className="size-4.5" />
      </span>
      <div className="leading-tight">
        <p className="text-sm font-semibold tracking-tight">pgPulse</p>
        <p className="text-xs text-muted-foreground">Postgres monitor</p>
      </div>
    </div>
  )
}

/** Desktop sidebar (md and up). Small screens use MobileNav instead. */
export function Sidebar() {
  return (
    <aside className="sticky top-0 hidden h-svh w-60 shrink-0 flex-col gap-6 border-r border-sidebar-border bg-sidebar py-5 md:flex">
      <Brand />
      <nav aria-label="Main" className="px-2">
        <NavList />
      </nav>
      <p className="mt-auto px-5 text-xs text-muted-foreground">Read-only · pg_monitor</p>
    </aside>
  )
}
