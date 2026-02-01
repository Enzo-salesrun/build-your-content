import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  IconPencil,
  IconChartBar,
  IconUsers,
  IconSparkles,
  IconBrain,
  IconTarget,
  IconTemplate,
  IconHash,
  IconPlus,
  IconArrowRight,
  IconCalendar,
  IconClock,
  IconCheck,
} from '@tabler/icons-react'
import { Badge } from '@/components/ui'
import { supabase } from '@/lib/supabase'
import { DRAFT_STATUSES, getPostStatusConfig } from '@/lib/config'
import { cn } from '@/lib/utils'

interface RealStats {
  totalPosts: number
  publishedPosts: number
  scheduledPosts: number
  draftPosts: number
  totalHooks: number
  totalTopics: number
  totalTemplates: number
  totalCreators: number
}

interface RecentPost {
  id: string
  status: string
  created_at: string
  target_topic: string | null
  selected_hook_data: any
}

export function Home() {
  const [stats, setStats] = useState<RealStats>({
    totalPosts: 0,
    publishedPosts: 0,
    scheduledPosts: 0,
    draftPosts: 0,
    totalHooks: 0,
    totalTopics: 0,
    totalTemplates: 0,
    totalCreators: 0,
  })
  const [recentPosts, setRecentPosts] = useState<RecentPost[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchRealStats()
  }, [])

  async function fetchRealStats() {
    setLoading(true)

    const [
      postsResult,
      hooksResult,
      topicsResult,
      templatesResult,
      creatorsResult,
      recentResult,
    ] = await Promise.all([
      supabase.from('production_posts').select('id, status', { count: 'exact' }),
      supabase.from('generated_hooks').select('id', { count: 'exact' }),
      supabase.from('topics').select('id', { count: 'exact' }),
      (supabase as any).from('post_templates').select('id', { count: 'exact' }),
      supabase.from('profiles').select('id', { count: 'exact' }).eq('type', 'external_influencer'),
      supabase.from('production_posts').select('id, status, created_at, target_topic, selected_hook_data').order('created_at', { ascending: false }).limit(5),
    ])

    const posts = postsResult.data || []
    const published = posts.filter((p: any) => p.status === 'published').length
    const scheduled = posts.filter((p: any) => p.status === 'scheduled').length
    const drafts = posts.filter((p: any) => DRAFT_STATUSES.includes(p.status)).length

    setStats({
      totalPosts: posts.length,
      publishedPosts: published,
      scheduledPosts: scheduled,
      draftPosts: drafts,
      totalHooks: hooksResult.count || 0,
      totalTopics: topicsResult.count || 0,
      totalTemplates: templatesResult.count || 0,
      totalCreators: creatorsResult.count || 0,
    })

    setRecentPosts((recentResult.data || []) as RecentPost[])
    setLoading(false)
  }

  const quickActions = [
    {
      title: 'Créer un post',
      description: 'Workflow IA complet',
      icon: IconPencil,
      href: '/studio/create',
      gradient: 'from-violet-500 to-purple-600',
    },
    {
      title: 'Thématiques',
      description: 'Gérer les topics',
      icon: IconHash,
      href: '/studio/topics',
      gradient: 'from-blue-500 to-cyan-500',
    },
    {
      title: 'Templates',
      description: 'Structures de posts',
      icon: IconTemplate,
      href: '/studio/templates',
      gradient: 'from-pink-500 to-rose-500',
    },
    {
      title: 'Créateurs',
      description: 'Analyser les styles',
      icon: IconUsers,
      href: '/creators',
      gradient: 'from-emerald-500 to-teal-500',
    },
  ]


  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section with texture */}
      <div 
        className="px-8 py-10 border-b border-neutral-100 relative overflow-hidden"
        style={{
          backgroundImage: 'url(https://imagedelivery.net/0BeFhrpWiV47eVOg1oVieg/b4706e66-edd5-43f4-0e50-9ec1ffde6700/public)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        {/* Overlay pour lisibilité */}
        <div className="absolute inset-0 bg-white/90 backdrop-blur-sm" />
        <div className="relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <h1 className="text-[32px] font-semibold text-neutral-900 tracking-tight leading-tight">
              Créez du contenu viral
              <br />
              <span className="text-neutral-400">en quelques clics.</span>
            </h1>
            <p className="mt-4 text-[15px] text-neutral-500 max-w-lg">
              Analysez les meilleurs créateurs, générez des hooks percutants et publiez du contenu qui engage votre audience.
            </p>
          </motion.div>

          {/* CTA Button */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="mt-6 flex items-center gap-3"
          >
            <Link to="/studio/create">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="inline-flex items-center gap-2 bg-neutral-900 hover:bg-neutral-800 text-white px-5 py-2.5 rounded-lg text-[13px] font-medium shadow-sm"
              >
                <IconPlus className="h-4 w-4" strokeWidth={2.5} />
                Nouveau post
              </motion.button>
            </Link>
            <Link to="/content">
              <button className="inline-flex items-center gap-2 text-neutral-600 hover:text-neutral-900 px-4 py-2.5 text-[13px] font-medium">
                Voir le dashboard
                <IconArrowRight className="h-4 w-4" />
              </button>
            </Link>
          </motion.div>
        </div>
      </div>

      <div className="px-8 py-8">
        <div>
          {/* Stats Grid - Minimal cards */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.15 }}
            className="grid grid-cols-4 gap-4 mb-10"
          >
            {[
              { label: 'Posts créés', value: stats.totalPosts, icon: IconSparkles, color: 'text-violet-500', bg: 'bg-violet-50' },
              { label: 'Hooks générés', value: stats.totalHooks, icon: IconBrain, color: 'text-blue-500', bg: 'bg-blue-50' },
              { label: 'Thématiques', value: stats.totalTopics, icon: IconTarget, color: 'text-rose-500', bg: 'bg-rose-50' },
              { label: 'Créateurs', value: stats.totalCreators, icon: IconUsers, color: 'text-emerald-500', bg: 'bg-emerald-50' },
            ].map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.2 + i * 0.05 }}
                className="group"
              >
                <div className="p-4 rounded-xl border border-neutral-100 hover:border-neutral-200 transition-all bg-white">
                  <div className="flex items-center gap-3">
                    <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center", stat.bg)}>
                      <stat.icon className={cn("h-[18px] w-[18px]", stat.color)} strokeWidth={1.75} />
                    </div>
                    <div>
                      <p className="text-xl font-semibold text-neutral-900 tabular-nums">
                        {loading ? '—' : stat.value}
                      </p>
                      <p className="text-[12px] text-neutral-500">{stat.label}</p>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>

          {/* Quick Actions - Modern grid */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.25 }}
            className="mb-10"
          >
            <h2 className="text-[13px] font-medium text-neutral-400 uppercase tracking-wider mb-4">
              Actions rapides
            </h2>
            <div className="grid grid-cols-4 gap-3">
              {quickActions.map((action, i) => (
                <Link key={action.href} to={action.href}>
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: 0.3 + i * 0.05 }}
                    whileHover={{ y: -2, scale: 1.01 }}
                    whileTap={{ scale: 0.98 }}
                    className="group p-4 rounded-xl border border-neutral-100 hover:border-neutral-200 hover:shadow-sm transition-all bg-white cursor-pointer"
                  >
                    <div className={cn("w-9 h-9 rounded-lg bg-gradient-to-br flex items-center justify-center mb-3 shadow-sm", action.gradient)}>
                      <action.icon className="h-[18px] w-[18px] text-white" strokeWidth={2} />
                    </div>
                    <h3 className="text-[14px] font-medium text-neutral-900 group-hover:text-violet-600 transition-colors">
                      {action.title}
                    </h3>
                    <p className="text-[12px] text-neutral-500 mt-0.5">{action.description}</p>
                  </motion.div>
                </Link>
              ))}
            </div>
          </motion.div>

          {/* Recent Posts - Clean list */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.35 }}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-[13px] font-medium text-neutral-400 uppercase tracking-wider">
                Posts récents
              </h2>
              <Link to="/content" className="text-[13px] text-neutral-500 hover:text-neutral-900 flex items-center gap-1 transition-colors">
                Voir tout <IconArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            <div className="rounded-xl border border-neutral-100 overflow-hidden bg-white">
              {loading ? (
                <div className="p-6 text-center">
                  <div className="w-5 h-5 border-2 border-neutral-200 border-t-neutral-400 rounded-full animate-spin mx-auto" />
                </div>
              ) : recentPosts.length === 0 ? (
                <div className="p-10 text-center">
                  <div className="w-12 h-12 rounded-xl bg-neutral-50 flex items-center justify-center mx-auto mb-3">
                    <IconChartBar className="h-6 w-6 text-neutral-300" />
                  </div>
                  <p className="text-[14px] text-neutral-500 mb-4">Aucun post créé</p>
                  <Link to="/studio/create">
                    <button className="inline-flex items-center gap-2 bg-neutral-900 hover:bg-neutral-800 text-white px-4 py-2 rounded-lg text-[13px] font-medium">
                      <IconPlus className="h-4 w-4" />
                      Créer votre premier post
                    </button>
                  </Link>
                </div>
              ) : (
                <div className="divide-y divide-neutral-50">
                  {recentPosts.map((post, i) => (
                    <motion.div
                      key={post.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.4 + i * 0.05 }}
                      className="flex items-center gap-4 px-4 py-3 hover:bg-neutral-50/50 transition-colors cursor-pointer"
                    >
                      <Badge variant={getPostStatusConfig(post.status).variant as any}>
                        {getPostStatusConfig(post.status).label}
                      </Badge>
                      <p className="text-[13px] text-neutral-700 flex-1 truncate">
                        {post.selected_hook_data?.text || post.target_topic || 'Post en cours de création...'}
                      </p>
                      <span className="text-[12px] text-neutral-400 tabular-nums">
                        {new Date(post.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}
                      </span>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>

          {/* Stats breakdown - Subtle info */}
          {!loading && stats.totalPosts > 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="mt-6 flex items-center gap-6 text-[12px] text-neutral-400"
            >
              <span className="flex items-center gap-1.5">
                <IconCheck className="h-3.5 w-3.5 text-emerald-500" />
                {stats.publishedPosts} publiés
              </span>
              <span className="flex items-center gap-1.5">
                <IconCalendar className="h-3.5 w-3.5 text-orange-500" />
                {stats.scheduledPosts} planifiés
              </span>
              <span className="flex items-center gap-1.5">
                <IconClock className="h-3.5 w-3.5 text-neutral-400" />
                {stats.draftPosts} brouillons
              </span>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  )
}
