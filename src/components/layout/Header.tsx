import { Link, useLocation } from 'react-router-dom'
import { Settings, LayoutDashboard } from 'lucide-react'
import { cn } from '@/lib/utils'

export function Header() {
  const location = useLocation()
  
  const navItems = [
    { href: '/', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/settings', label: 'Settings', icon: Settings },
  ]

  return (
    <header className="sticky top-0 z-50 w-full border-b border-neutral-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60">
      <div className="flex h-14 items-center px-6">
        <Link to="/" className="flex items-center gap-2 mr-8">
          <img 
            src="https://imagedelivery.net/0BeFhrpWiV47eVOg1oVieg/3f314661-efa3-4775-2599-a646625c0600/public" 
            alt="Build Your Content" 
            className="w-6 h-6 rounded-md object-contain"
          />
          <span className="font-semibold text-lg">Build Your Content</span>
        </Link>
        
        <nav className="flex items-center gap-1">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = location.pathname === item.href
            return (
              <Link
                key={item.href}
                to={item.href}
                className={cn(
                  "flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md transition-colors",
                  isActive 
                    ? "bg-neutral-100 text-neutral-900" 
                    : "text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900"
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            )
          })}
        </nav>
      </div>
    </header>
  )
}
