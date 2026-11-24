// Route table. Each page is lazy-loaded, so the Queries page's code (and its
// SQL formatter) isn't downloaded until someone opens it.
import { createBrowserRouter } from 'react-router'
import { Layout } from './Layout'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    children: [
      { index: true, lazy: async () => ({ Component: (await import('@/pages/Dashboard')).default }) },
      { path: 'queries', lazy: async () => ({ Component: (await import('@/pages/Queries')).default }) },
      { path: '*', lazy: async () => ({ Component: (await import('@/pages/NotFound')).default }) },
    ],
  },
])
