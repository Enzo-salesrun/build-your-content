import { Link, useLocation, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  IconHome,
  IconSparkles,
  IconTemplate,
  IconSettings,
  IconTargetArrow,
  IconHash,
  IconClick,
  IconWorld,
  IconFolder,
  IconPaperclip,
  IconBook,
  IconUsers,
  IconLibrary,
  IconUserCircle,
  IconChevronRight,
  IconPlus,
  IconUsersGroup,
  IconLayoutDashboard,
  IconMessageChatbot,
  IconLogout,
  IconChevronDown,
  IconFishHook,
  IconMessageCircle,
  } from '@tabler/icons-react'
import { cn } from '@/lib/utils'
import { useState } from 'react'
import { useAuth } from '@/hooks'

interface NavItem {
  href: string
  label: string
  icon: React.ElementType
  children?: NavItem[]
}

const navItems: NavItem[] = [
  { href: '/assistant', label: 'Assistant IA', icon: IconMessageChatbot },
  { href: '/', label: 'Accueil', icon: IconHome },
  {
    href: '/studio',
    label: 'Studio',
    icon: IconSparkles,
    children: [
      { href: '/studio/create', label: 'Créer', icon: IconPlus },
      { href: '/studio/templates', label: 'Templates', icon: IconTemplate },
    ],
  },
  { href: '/content', label: 'Dashboard', icon: IconLayoutDashboard },
  {
    href: '/settings',
    label: 'Réglages',
    icon: IconSettings,
    children: [
      { href: '/settings/hooks', label: 'Types de Hooks', icon: IconFishHook },
      { href: '/studio/audiences', label: 'Audiences', icon: IconTargetArrow },
      { href: '/studio/topics', label: 'Thématiques', icon: IconHash },
      { href: '/studio/cta', label: 'Appels à l\'action', icon: IconClick },
      { href: '/studio/platforms', label: 'Plateformes', icon: IconWorld },
    ],
  },
  {
    href: '/ressources',
    label: 'Ressources',
    icon: IconFolder,
    children: [
      { href: '/ressources', label: 'Pièces jointes', icon: IconPaperclip },
      { href: '/studio/knowledge', label: 'Base de connaissances', icon: IconBook },
    ],
  },
  {
    href: '/creators',
    label: 'Créateurs viraux',
    icon: IconUsers,
    children: [
      { href: '/creators/post-bank', label: 'Bibliothèque de posts', icon: IconLibrary },
      { href: '/creators', label: 'Bibliothèque de créateurs', icon: IconUserCircle },
    ],
  },
  {
    href: '/team',
    label: 'Créateurs interne',
    icon: IconUsersGroup,
    children: [
      { href: '/team', label: 'Membres', icon: IconUsersGroup },
      { href: '/team/engagement', label: 'Engagement (désactivé)', icon: IconMessageCircle },
    ],
  },
]

function NavLink({ item, isActive }: { item: NavItem; isActive: boolean }) {
  const [isOpen, setIsOpen] = useState(false)
  const hasChildren = item.children && item.children.length > 0
  const location = useLocation()

  if (hasChildren) {
    const isChildActive = item.children?.some(child => location.pathname === child.href)
    
    return (
      <div className="space-y-0.5">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={cn(
            "w-full flex items-center justify-between px-3 py-2 rounded-lg text-[13px] font-medium transition-all",
            isChildActive
              ? "text-violet-600"
              : "text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50"
          )}
        >
          <span className="flex items-center gap-2.5">
            <item.icon className="h-[18px] w-[18px]" strokeWidth={1.75} />
            {item.label}
          </span>
          <motion.span
            animate={{ rotate: isOpen ? 90 : 0 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
          >
            <IconChevronRight className="h-3.5 w-3.5 text-neutral-400" />
          </motion.span>
        </button>
        <AnimatePresence initial={false}>
          {isOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2, ease: "easeInOut" }}
              className="overflow-hidden"
            >
              <div className="ml-3 pl-3 border-l border-neutral-100 space-y-0.5">
                {item.children?.map((child) => (
                  <Link
                    key={child.href}
                    to={child.href}
                    className={cn(
                      "flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-[13px] transition-all",
                      location.pathname === child.href
                        ? "bg-violet-50 text-violet-600 font-medium"
                        : "text-neutral-500 hover:text-neutral-900 hover:bg-neutral-50"
                    )}
                  >
                    <child.icon className="h-4 w-4" strokeWidth={1.75} />
                    {child.label}
                  </Link>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    )
  }

  return (
    <Link
      to={item.href}
      className={cn(
        "flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium transition-all",
        isActive
          ? "bg-violet-50 text-violet-600"
          : "text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50"
      )}
    >
      <item.icon className="h-[18px] w-[18px]" strokeWidth={1.75} />
      {item.label}
    </Link>
  )
}

function UserProfileMenu() {
  const [isOpen, setIsOpen] = useState(false)
  const { profile, loading, signOut } = useAuth()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await signOut()
    navigate('/login')
  }

  if (loading) {
    return (
      <div className="px-3 py-2">
        <div className="h-9 bg-neutral-100 rounded-lg animate-pulse" />
      </div>
    )
  }

  const initials = profile?.full_name
    ?.split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) ?? '?'

  return (
    <div className="px-1">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center gap-2.5 px-2 py-2 rounded-lg hover:bg-neutral-50 transition-all"
      >
        {profile?.avatar_url ? (
          <img
            src={profile.avatar_url}
            alt={profile.full_name}
            className="w-8 h-8 rounded-full object-cover"
          />
        ) : (
          <div className="w-8 h-8 rounded-full bg-violet-100 flex items-center justify-center">
            <span className="text-[11px] font-semibold text-violet-600">{initials}</span>
          </div>
        )}
        <div className="flex-1 text-left min-w-0">
          <p className="text-[13px] font-medium text-neutral-900 truncate">
            {profile?.full_name ?? 'Utilisateur'}
          </p>
          <p className="text-[11px] text-neutral-500 truncate">
            {profile?.email ?? ''}
          </p>
        </div>
        <motion.span
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.15 }}
        >
          <IconChevronDown className="h-4 w-4 text-neutral-400" />
        </motion.span>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="overflow-hidden"
          >
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-2.5 px-3 py-2 mt-1 rounded-lg text-[13px] text-red-600 hover:bg-red-50 transition-all"
            >
              <IconLogout className="h-4 w-4" strokeWidth={1.75} />
              Se déconnecter
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export function Sidebar() {
  const location = useLocation()

  return (
    <motion.aside
      initial={{ x: -10, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="fixed left-0 top-0 h-screen w-56 bg-white/80 backdrop-blur-xl border-r border-neutral-100 p-3 flex flex-col"
    >
      {/* Logo Build Your Content */}
      <Link to="/" className="flex items-center gap-2.5 px-3 py-4 mb-2">
        <img 
          src="https://imagedelivery.net/0BeFhrpWiV47eVOg1oVieg/3f314661-efa3-4775-2599-a646625c0600/public" 
          alt="Build Your Content" 
          className="w-8 h-8 rounded-lg object-contain"
        />
        <span className="text-[15px] font-semibold text-neutral-900 tracking-tight">Build Your Content</span>
      </Link>

      {/* Bouton Nouveau Post - Modern pill style */}
      <Link to="/studio/create" className="mb-5 px-1">
        <motion.button
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.98 }}
          className="w-full flex items-center justify-center gap-2 bg-neutral-900 hover:bg-neutral-800 text-white rounded-lg h-9 text-[13px] font-medium shadow-sm"
        >
          <IconPlus className="h-4 w-4" strokeWidth={2.5} />
          Nouveau Post
        </motion.button>
      </Link>

      {/* Navigation */}
      <nav className="flex-1 space-y-0.5 overflow-y-auto px-1">
        {navItems.map((item) => (
          <NavLink
            key={item.href}
            item={item}
            isActive={location.pathname === item.href}
          />
        ))}
      </nav>

      {/* User Profile Section */}
      <div className="pt-3 mt-3 border-t border-neutral-100">
        <UserProfileMenu />
      </div>
    </motion.aside>
  )
}
