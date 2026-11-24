// App shell: sidebar + top bar + status banner around the current page.
// Pages fade in on navigation; MotionConfig reducedMotion="user" turns that
// (and every other motion animation) off when the OS asks for reduced motion.
import { MotionConfig, motion } from 'motion/react'
import { Outlet, useLocation } from 'react-router'
import { TooltipProvider } from '@/components/ui/tooltip'
import { Sidebar } from '@/components/layout/Sidebar'
import { Topbar } from '@/components/layout/Topbar'
import { StatusBanner } from '@/components/layout/StatusBanner'
import { LiveStatusProvider } from './LiveStatusProvider'

export function Layout() {
  const location = useLocation()

  return (
    <MotionConfig reducedMotion="user">
      <TooltipProvider delayDuration={300}>
        <LiveStatusProvider>
          {/* First Tab stop: lets keyboard users jump past the navigation */}
          <a
            href="#main"
            className="sr-only z-50 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
          >
            Skip to content
          </a>

          <div className="flex min-h-svh">
            <Sidebar />
            <div className="flex min-w-0 flex-1 flex-col">
              <Topbar />
              <main id="main" tabIndex={-1} className="flex-1 px-4 py-5 outline-none md:px-6 md:py-6">
                <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-5">
                  <StatusBanner />
                  <motion.div
                    key={location.pathname}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.18, ease: 'easeOut' }}
                  >
                    <Outlet />
                  </motion.div>
                </div>
              </main>
            </div>
          </div>
        </LiveStatusProvider>
      </TooltipProvider>
    </MotionConfig>
  )
}
