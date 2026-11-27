// Turns the flat session list (each with blockedBy pids) into a forest of
// "who blocks whom" trees for display.
//
//   root  = a session that blocks others but isn't blocked itself (the culprit)
//   child = a session waiting on its parent's lock
//
// A session waiting on two blockers appears under each of them. Postgres
// resolves real deadlocks within deadlock_timeout (1s), but a snapshot can
// still catch a cycle, so a visited set stops infinite recursion.
import type { Session } from './types'

export interface BlockingNode {
  session: Session
  children: BlockingNode[]
}

export function buildBlockingTrees(sessions: Session[]): BlockingNode[] {
  const byPid = new Map(sessions.map((s) => [s.pid, s]))

  const build = (session: Session, path: Set<number>): BlockingNode => {
    const nextPath = new Set(path).add(session.pid)
    const children = session.blocking
      .map((pid) => byPid.get(pid))
      .filter((child): child is Session => child !== undefined && !nextPath.has(child.pid))
      .map((child) => build(child, nextPath))
    return { session, children }
  }

  // Roots: blockers that aren't (visibly) blocked themselves
  let roots = sessions.filter(
    (s) => s.blocking.length > 0 && !s.blockedBy.some((pid) => byPid.has(pid)),
  )

  // Pure cycle (everyone blocked by someone): start from the lowest pid so it still shows
  if (roots.length === 0) {
    const involved = sessions.filter((s) => s.blocking.length > 0)
    if (involved.length > 0) roots = [involved.reduce((a, b) => (a.pid < b.pid ? a : b))]
  }

  return roots
    .map((root) => build(root, new Set()))
    .sort((a, b) => (b.session.xactSeconds ?? 0) - (a.session.xactSeconds ?? 0))
}

/** Total sessions waiting somewhere below this node. */
export function countWaiting(node: BlockingNode): number {
  return node.children.reduce((sum, child) => sum + 1 + countWaiting(child), 0)
}
