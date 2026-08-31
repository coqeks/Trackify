import { createFileRoute, redirect, Link } from '@tanstack/react-router'
import useAuth from '../../hooks/useAuth'

export const Route = createFileRoute('/_layout/')({
  component: Index
})



function Index() {
  const { user: currentUser } = useAuth()
  return (
    <div className="flex flex-col gap-5">
      <div className="topbar justify-between">
        <div className="brand">Your Tracks</div>
        <div className="border hover:bg-gray-200"><Link to="/audio">start uploading</Link></div>
      </div>
      <h3>Welcome Home!, { currentUser?.full_name }</h3>
    </div>
  )
}