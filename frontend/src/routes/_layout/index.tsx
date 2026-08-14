import { createFileRoute, redirect, Link } from '@tanstack/react-router'
import useAuth, { isLoggedIn } from '../../hooks/useAuth'

export const Route = createFileRoute('/_layout/')({
  component: Index
})

function Index() {
  const { logout, user: currentUser } = useAuth()
  console.log(currentUser);
  return (
    <div className="flex flex-col gap-5">
      <div className="topbar flex">
        <div className="brand">Your Songs</div>
        <div><Link to="/audio">start uploading</Link></div>
      </div>
      <h3>Welcome Home!, { currentUser?.full_name }</h3>
    </div>
  )
}