import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'

export function Layout() {
  return (
    <div className="min-h-screen bg-white flex">
      <Sidebar />
      <main className="flex-1 ml-56">
        <Outlet />
      </main>
    </div>
  )
}
