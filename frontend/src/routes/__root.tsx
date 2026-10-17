import { createRootRoute, Outlet } from '@tanstack/react-router'
// import { TanStackRouterDevtools } from '@tanstack/react-router-devtools'
import { Toaster } from 'sonner'

const RootLayout = () => (
  <>
    <Outlet />
    <Toaster position="bottom-right" richColors closeButton />
    {/* <TanStackRouterDevtools /> */}
  </>
)

export const Route = createRootRoute({ component: RootLayout })
