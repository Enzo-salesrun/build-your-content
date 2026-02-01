import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '@/lib/supabase'
import {
  IconSparkles,
  IconUsers,
  IconUserCircle,
  IconPencil,
  IconRocket,
  IconCheck,
  IconArrowRight,
  IconArrowLeft,
  IconBrandLinkedin,
  IconTemplate,
  IconHash,
  IconTargetArrow,
  IconBrain,
  IconChartBar,
  IconPlayerPlay,
  IconBook,
  IconClick,
  IconCalendar,
  IconMessageChatbot,
  IconRefresh,
  IconFolder,
  IconWand,
  IconLayoutDashboard,
} from '@tabler/icons-react'
import { Button } from '@/components/ui'
import { useOnboarding, ONBOARDING_STEPS } from '@/hooks/useOnboarding'
import { cn } from '@/lib/utils'

// Build Your Content Logo URL
const BYC_LOGO = 'https://imagedelivery.net/0BeFhrpWiV47eVOg1oVieg/3f314661-efa3-4775-2599-a646625c0600/public'
const BYC_TEXTURE = 'https://imagedelivery.net/0BeFhrpWiV47eVOg1oVieg/b4706e66-edd5-43f4-0e50-9ec1ffde6700/public'

// Step 1: Welcome
function StepWelcome({ onNext }: { onNext: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="text-center max-w-2xl mx-auto"
    >
      {/* Logo Build Your Content animé */}
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
        className="w-24 h-24 mx-auto mb-8"
      >
        <img 
          src={BYC_LOGO} 
          alt="Build Your Content" 
          className="w-full h-full rounded-2xl object-contain"
        />
      </motion.div>

      <motion.h1
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="text-3xl font-bold text-neutral-900 mb-4"
      >
        Bienvenue dans <span className="text-violet-600">Build Your Content</span>
      </motion.h1>

      <motion.p
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="text-lg text-neutral-500 mb-6 leading-relaxed"
      >
        L'outil pour créer du contenu LinkedIn viral.
        <br />
        En quelques minutes, découvrez tout ce que vous pouvez faire.
      </motion.p>

      {/* Ce que vous allez apprendre */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="bg-neutral-50 rounded-2xl p-6 mb-8 text-left"
      >
        <h3 className="font-semibold text-neutral-900 mb-4 text-center">Ce que vous allez découvrir :</h3>
        <div className="grid grid-cols-2 gap-4">
          {[
            { icon: IconUsers, label: 'Gérer votre équipe', desc: 'Ajoutez vos collaborateurs et connectez leurs comptes LinkedIn' },
            { icon: IconUserCircle, label: 'Analyser les créateurs', desc: 'Inspirez-vous des meilleurs créateurs pour du contenu viral' },
            { icon: IconPencil, label: 'Créer avec l\'IA', desc: 'Un workflow simple pour générer des posts engageants' },
            { icon: IconLayoutDashboard, label: 'Configurer vos réglages', desc: 'Topics, audiences, templates et plus encore' },
          ].map((item, i) => (
            <motion.div
              key={item.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 + i * 0.1 }}
              className="flex items-start gap-3 p-3 bg-white rounded-xl border border-neutral-100"
            >
              <div className="w-9 h-9 rounded-lg bg-violet-100 flex items-center justify-center flex-shrink-0">
                <item.icon className="h-5 w-5 text-violet-600" strokeWidth={1.75} />
              </div>
              <div>
                <p className="font-medium text-neutral-900 text-sm">{item.label}</p>
                <p className="text-xs text-neutral-500">{item.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1 }}
        className="flex flex-col items-center gap-3"
      >
        <Button
          onClick={onNext}
          className="bg-neutral-900 hover:bg-neutral-800 text-white px-8 py-3 text-base"
        >
          Découvrir Build Your Content
          <IconArrowRight className="ml-2 h-5 w-5" />
        </Button>
        <p className="text-xs text-neutral-400">Durée estimée : 2 minutes</p>
      </motion.div>
    </motion.div>
  )
}

// Step 2: Team
function StepTeam({ onNext, onBack }: { onNext: () => void; onBack: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -50 }}
      className="max-w-3xl mx-auto"
    >
      <div className="text-center mb-8">
        <motion.div
          initial={{ scale: 0.8 }}
          animate={{ scale: 1 }}
          className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-emerald-500 flex items-center justify-center"
        >
          <IconUsers className="h-8 w-8 text-white" strokeWidth={1.5} />
        </motion.div>
        <h2 className="text-2xl font-bold text-neutral-900 mb-3">
          Votre équipe interne
        </h2>
        <p className="text-neutral-500 max-w-lg mx-auto">
          Ajoutez les membres de votre équipe qui vont créer du contenu. Chaque membre peut avoir son propre style et son compte LinkedIn connecté.
        </p>
      </div>

      {/* Comment ça marche */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="grid grid-cols-3 gap-4 mb-8"
      >
        {[
          { step: '1', icon: IconUsers, title: 'Ajouter un membre', desc: 'Entrez son prénom, nom et profil LinkedIn' },
          { step: '2', icon: IconBrandLinkedin, title: 'Connecter LinkedIn', desc: 'Liez son compte pour publier automatiquement' },
          { step: '3', icon: IconBrain, title: 'Analyser le style', desc: 'L\'IA analyse ses posts pour apprendre son ton' },
        ].map((item, i) => (
          <motion.div
            key={item.step}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 + i * 0.1 }}
            className="bg-white rounded-xl border border-neutral-200 p-4 text-center"
          >
            <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 font-bold text-sm flex items-center justify-center mx-auto mb-3">
              {item.step}
            </div>
            <div className="w-10 h-10 rounded-lg bg-neutral-100 flex items-center justify-center mx-auto mb-3">
              <item.icon className="h-5 w-5 text-neutral-600" strokeWidth={1.75} />
            </div>
            <p className="font-medium text-neutral-900 text-sm mb-1">{item.title}</p>
            <p className="text-xs text-neutral-500">{item.desc}</p>
          </motion.div>
        ))}
      </motion.div>

      {/* Exemple visuel */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="bg-neutral-50 rounded-2xl p-5 mb-8"
      >
        <p className="text-xs font-medium text-neutral-400 uppercase tracking-wider mb-4">Exemple de fiche membre</p>
        <div className="bg-white rounded-xl border border-neutral-200 p-4">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 rounded-full bg-violet-500 flex items-center justify-center text-white font-semibold">
              JD
            </div>
            <div className="flex-1">
              <p className="font-medium text-neutral-900">Jean Dupont</p>
              <p className="text-sm text-neutral-500">CEO & Content Creator</p>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 bg-green-100 rounded-full">
              <IconCheck className="h-4 w-4 text-green-600" />
              <span className="text-sm text-green-700 font-medium">LinkedIn connecté</span>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3 pt-4 border-t border-neutral-100">
            {[
              { label: 'Posts publiés', value: '24' },
              { label: 'Style analysé', value: '✓' },
              { label: 'Engagement', value: '3.2%' },
            ].map((stat) => (
              <div key={stat.label} className="text-center bg-neutral-50 rounded-lg py-2">
                <p className="text-lg font-semibold text-neutral-900">{stat.value}</p>
                <p className="text-xs text-neutral-500">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </motion.div>

      {/* Ce que vous pouvez faire */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="grid grid-cols-2 gap-3 mb-8"
      >
        {[
          { icon: IconCalendar, text: 'Planifier des publications pour chaque membre' },
          { icon: IconWand, text: 'Générer du contenu adapté à leur style personnel' },
          { icon: IconChartBar, text: 'Suivre les performances de chacun' },
          { icon: IconRefresh, text: 'Synchroniser automatiquement leurs posts LinkedIn' },
        ].map((item, i) => (
          <div key={i} className="flex items-center gap-3 text-neutral-600 bg-white rounded-lg border border-neutral-100 p-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center flex-shrink-0">
              <item.icon className="h-4 w-4 text-emerald-600" />
            </div>
            <span className="text-sm">{item.text}</span>
          </div>
        ))}
      </motion.div>

      <div className="flex justify-between">
        <Button variant="ghost" onClick={onBack}>
          <IconArrowLeft className="mr-2 h-4 w-4" />
          Retour
        </Button>
        <Button onClick={onNext} className="bg-neutral-900 hover:bg-neutral-800">
          Continuer
          <IconArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </motion.div>
  )
}

// Step 3: Creators
function StepCreators({ onNext, onBack }: { onNext: () => void; onBack: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -50 }}
      className="max-w-3xl mx-auto"
    >
      <div className="text-center mb-8">
        <motion.div
          initial={{ scale: 0.8 }}
          animate={{ scale: 1 }}
          className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-violet-500 flex items-center justify-center"
        >
          <IconUserCircle className="h-8 w-8 text-white" strokeWidth={1.5} />
        </motion.div>
        <h2 className="text-2xl font-bold text-neutral-900 mb-3">
          Bibliothèque de créateurs viraux
        </h2>
        <p className="text-neutral-500 max-w-lg mx-auto">
          Analysez les meilleurs créateurs LinkedIn pour comprendre ce qui fonctionne et vous en inspirer.
        </p>
      </div>

      {/* Pourquoi c'est utile */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-violet-50 rounded-2xl p-5 mb-8"
      >
        <h4 className="font-semibold text-violet-900 mb-3">Pourquoi analyser les créateurs ?</h4>
        <p className="text-sm text-violet-700 mb-4">
          Les meilleurs créateurs LinkedIn utilisent des techniques spécifiques : des hooks percutants, 
          un storytelling efficace, et des structures de posts éprouvées. En les analysant, vous pouvez 
          reproduire ce qui fonctionne.
        </p>
      </motion.div>

      {/* Comment ça marche */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="grid grid-cols-3 gap-4 mb-8"
      >
        {[
          { step: '1', icon: IconBrandLinkedin, title: 'Ajouter un créateur', desc: 'Collez simplement l\'URL de son profil LinkedIn' },
          { step: '2', icon: IconRefresh, title: 'Scraping automatique', desc: 'On récupère ses derniers posts viraux' },
          { step: '3', icon: IconBrain, title: 'Analyse IA', desc: 'Style d\'écriture, hooks et structures analysés' },
        ].map((item, i) => (
          <motion.div
            key={item.step}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 + i * 0.1 }}
            className="bg-white rounded-xl border border-neutral-200 p-4 text-center"
          >
            <div className="w-8 h-8 rounded-full bg-violet-100 text-violet-600 font-bold text-sm flex items-center justify-center mx-auto mb-3">
              {item.step}
            </div>
            <div className="w-10 h-10 rounded-lg bg-neutral-100 flex items-center justify-center mx-auto mb-3">
              <item.icon className="h-5 w-5 text-neutral-600" strokeWidth={1.75} />
            </div>
            <p className="font-medium text-neutral-900 text-sm mb-1">{item.title}</p>
            <p className="text-xs text-neutral-500">{item.desc}</p>
          </motion.div>
        ))}
      </motion.div>

      {/* Ce que vous obtenez */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="bg-neutral-50 rounded-2xl p-5 mb-8"
      >
        <p className="text-xs font-medium text-neutral-400 uppercase tracking-wider mb-4">Ce que vous obtenez pour chaque créateur</p>
        <div className="grid grid-cols-2 gap-3">
          {[
            { icon: IconBook, title: 'Banque de posts', desc: 'Tous leurs posts viraux classés et consultables' },
            { icon: IconSparkles, title: 'Hooks analysés', desc: 'Classification automatique des types d\'accroches' },
            { icon: IconWand, title: 'Style d\'écriture', desc: 'Prompt IA pour reproduire leur ton unique' },
            { icon: IconChartBar, title: 'Métriques', desc: 'Engagement moyen et posts les plus performants' },
          ].map((item, i) => (
            <div key={i} className="flex items-start gap-3 bg-white rounded-xl border border-neutral-100 p-3">
              <div className="w-9 h-9 rounded-lg bg-violet-100 flex items-center justify-center flex-shrink-0">
                <item.icon className="h-5 w-5 text-violet-600" strokeWidth={1.75} />
              </div>
              <div>
                <p className="font-medium text-neutral-900 text-sm">{item.title}</p>
                <p className="text-xs text-neutral-500">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Exemple de créateurs */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7 }}
        className="flex items-center justify-center gap-3 mb-8"
      >
        <p className="text-sm text-neutral-500">Exemples de créateurs à suivre :</p>
        <div className="flex -space-x-2">
          {['JW', 'LA', 'SM', 'TB'].map((initials, i) => (
            <div key={i} className="w-8 h-8 rounded-full bg-neutral-200 border-2 border-white flex items-center justify-center text-xs font-medium text-neutral-600">
              {initials}
            </div>
          ))}
        </div>
      </motion.div>

      <div className="flex justify-between">
        <Button variant="ghost" onClick={onBack}>
          <IconArrowLeft className="mr-2 h-4 w-4" />
          Retour
        </Button>
        <Button onClick={onNext} className="bg-neutral-900 hover:bg-neutral-800">
          Continuer
          <IconArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </motion.div>
  )
}

// Step 4: Studio
function StepStudio({ onNext, onBack }: { onNext: () => void; onBack: () => void }) {
  const [activeWorkflowStep, setActiveWorkflowStep] = useState(1)

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveWorkflowStep((prev) => (prev % 4) + 1)
    }, 2500)
    return () => clearInterval(interval)
  }, [])

  const workflowSteps = [
    { id: 1, icon: IconPencil, label: 'Source', desc: 'Écrivez votre idée, collez un article, ou recyclez un ancien post' },
    { id: 2, icon: IconUsers, label: 'Auteurs', desc: 'Choisissez qui publie, avec quel topic et quelle audience' },
    { id: 3, icon: IconSparkles, label: 'Hooks', desc: 'L\'IA génère 5 accroches percutantes, vous choisissez la meilleure' },
    { id: 4, icon: IconTemplate, label: 'Éditeur', desc: 'Peaufinez le post, ajoutez un CTA, et publiez ou planifiez' },
  ]

  return (
    <motion.div
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -50 }}
      className="max-w-3xl mx-auto"
    >
      <div className="text-center mb-8">
        <motion.div
          initial={{ scale: 0.8 }}
          animate={{ scale: 1 }}
          className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-rose-500 flex items-center justify-center"
        >
          <IconPencil className="h-8 w-8 text-white" strokeWidth={1.5} />
        </motion.div>
        <h2 className="text-2xl font-bold text-neutral-900 mb-3">
          Le Studio de création
        </h2>
        <p className="text-neutral-500 max-w-lg mx-auto">
          Un workflow guidé en 4 étapes pour créer des posts LinkedIn engageants avec l'aide de l'IA.
        </p>
      </div>

      {/* Workflow détaillé */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-white rounded-2xl border border-neutral-200 p-6 mb-8"
      >
        <p className="text-xs font-medium text-neutral-400 uppercase tracking-wider mb-5 text-center">Le workflow en 4 étapes</p>
        
        {/* Workflow Steps */}
        <div className="space-y-4">
          {workflowSteps.map((step) => (
            <motion.div
              key={step.id}
              animate={{
                backgroundColor: activeWorkflowStep === step.id ? '#faf5ff' : '#ffffff',
                borderColor: activeWorkflowStep === step.id ? '#c4b5fd' : '#e5e5e5',
              }}
              className="flex items-start gap-4 p-4 rounded-xl border transition-colors"
            >
              <motion.div
                animate={{
                  backgroundColor: activeWorkflowStep >= step.id ? '#7c3aed' : '#f5f5f5',
                }}
                className={cn(
                  'w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors',
                  activeWorkflowStep >= step.id ? 'text-white' : 'text-neutral-400'
                )}
              >
                <step.icon className="h-5 w-5" strokeWidth={1.75} />
              </motion.div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-medium text-violet-600 bg-violet-100 px-2 py-0.5 rounded">Étape {step.id}</span>
                  <p className="font-semibold text-neutral-900">{step.label}</p>
                </div>
                <p className="text-sm text-neutral-500">{step.desc}</p>
              </div>
              {activeWorkflowStep > step.id && (
                <IconCheck className="h-5 w-5 text-green-500 flex-shrink-0" />
              )}
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Réglages disponibles */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="bg-neutral-50 rounded-2xl p-5 mb-8"
      >
        <p className="text-xs font-medium text-neutral-400 uppercase tracking-wider mb-4">Les réglages que vous pouvez configurer</p>
        <div className="grid grid-cols-2 gap-3">
          {[
            { icon: IconHash, title: 'Thématiques', desc: 'Définissez vos sujets récurrents (ex: Leadership, Productivité...)' },
            { icon: IconTargetArrow, title: 'Audiences', desc: 'Créez des personas avec leurs pain points et objectifs' },
            { icon: IconTemplate, title: 'Templates', desc: 'Structures de posts éprouvées (liste, storytelling, contraste...)' },
            { icon: IconClick, title: 'CTAs', desc: 'Appels à l\'action prédéfinis pour engager votre audience' },
            { icon: IconFolder, title: 'Ressources', desc: 'Pièces jointes et médias pour vos publications' },
            { icon: IconBook, title: 'Base de connaissances', desc: 'Contexte et informations pour guider l\'IA' },
          ].map((item, i) => (
            <div key={i} className="flex items-start gap-3 bg-white rounded-xl border border-neutral-100 p-3">
              <div className="w-9 h-9 rounded-lg bg-rose-50 flex items-center justify-center flex-shrink-0">
                <item.icon className="h-5 w-5 text-rose-600" strokeWidth={1.75} />
              </div>
              <div>
                <p className="font-medium text-neutral-900 text-sm">{item.title}</p>
                <p className="text-xs text-neutral-500">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Bonus: Assistant IA */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="flex items-center gap-4 bg-blue-50 rounded-xl p-4 mb-8"
      >
        <div className="w-10 h-10 rounded-lg bg-blue-500 flex items-center justify-center flex-shrink-0">
          <IconMessageChatbot className="h-5 w-5 text-white" strokeWidth={1.75} />
        </div>
        <div>
          <p className="font-medium text-blue-900">Assistant IA conversationnel</p>
          <p className="text-sm text-blue-700">Posez vos questions et demandez de l'aide pour créer ou améliorer vos posts.</p>
        </div>
      </motion.div>

      <div className="flex justify-between">
        <Button variant="ghost" onClick={onBack}>
          <IconArrowLeft className="mr-2 h-4 w-4" />
          Retour
        </Button>
        <Button onClick={onNext} className="bg-neutral-900 hover:bg-neutral-800">
          Continuer
          <IconArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </motion.div>
  )
}

// Step 5: Ready
function StepReady({ onComplete, userProfileId }: { onComplete: () => void; userProfileId?: string | null }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0 }}
      className="text-center max-w-2xl mx-auto"
    >
      {/* Logo Build Your Content avec check */}
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.1, type: 'spring', stiffness: 200 }}
        className="relative w-24 h-24 mx-auto mb-8"
      >
        <img 
          src={BYC_LOGO} 
          alt="Build Your Content" 
          className="w-full h-full rounded-2xl object-contain"
        />
        <div className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center border-4 border-white">
          <IconCheck className="h-4 w-4 text-white" strokeWidth={3} />
        </div>
      </motion.div>

      <motion.h2
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="text-3xl font-bold text-neutral-900 mb-4"
      >
        Bienvenue dans <span className="text-violet-600">Build Your Content</span> !
      </motion.h2>

      <motion.p
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="text-lg text-neutral-500 mb-8"
      >
        Vous avez découvert les bases de <span className="font-medium text-neutral-700">Build Your Content</span>.<br />
        {userProfileId ? (
          <span>Connectez votre LinkedIn pour commencer à publier !</span>
        ) : (
          <span>Il est temps de créer du contenu viral !</span>
        )}
      </motion.p>

      {/* Récapitulatif */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="bg-neutral-50 rounded-2xl p-5 mb-8 text-left"
      >
        <p className="text-xs font-medium text-neutral-400 uppercase tracking-wider mb-4 text-center">Vos prochaines actions</p>
        <div className="grid grid-cols-2 gap-3">
          {[
            { icon: IconUsers, title: 'Ajouter votre équipe', desc: 'Commencez par vous ajouter, puis vos collaborateurs', path: '/team' },
            { icon: IconUserCircle, title: 'Importer des créateurs', desc: 'Analysez vos créateurs LinkedIn préférés', path: '/creators' },
            { icon: IconPencil, title: 'Créer votre premier post', desc: 'Lancez le Studio et testez le workflow IA', path: '/studio/create' },
            { icon: IconHash, title: 'Configurer vos topics', desc: 'Définissez vos thématiques de contenu', path: '/studio/topics' },
          ].map((item, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 + i * 0.1 }}
              className="bg-white rounded-xl border border-neutral-200 p-4 hover:border-violet-300 transition-colors cursor-pointer"
            >
              <div className="w-10 h-10 rounded-lg bg-violet-100 flex items-center justify-center mb-3">
                <item.icon className="h-5 w-5 text-violet-600" strokeWidth={1.75} />
              </div>
              <p className="font-medium text-neutral-900 text-sm">{item.title}</p>
              <p className="text-xs text-neutral-500">{item.desc}</p>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Conseil pour bien démarrer */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8 }}
        className="flex items-center gap-3 bg-violet-50 rounded-xl p-4 mb-8 text-left"
      >
        <div className="w-10 h-10 rounded-lg bg-violet-500 flex items-center justify-center flex-shrink-0">
          <IconRocket className="h-5 w-5 text-white" strokeWidth={1.75} />
        </div>
        <div>
          <p className="font-medium text-violet-900 text-sm">Conseil pour bien démarrer</p>
          <p className="text-xs text-violet-700">Ajoutez 2-3 créateurs viraux pour constituer une banque de posts inspirants, puis créez votre premier post avec l'IA !</p>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.9 }}
      >
        <Button
          onClick={onComplete}
          className="bg-neutral-900 hover:bg-neutral-800 text-white px-10 py-3 text-base"
        >
          {userProfileId ? (
            <>
              <IconBrandLinkedin className="mr-2 h-5 w-5" />
              Connecter mon LinkedIn
            </>
          ) : (
            <>
              <IconPlayerPlay className="mr-2 h-5 w-5" />
              Entrer dans Build Your Content
            </>
          )}
        </Button>
      </motion.div>
    </motion.div>
  )
}

// Main Onboarding Component
export function Onboarding() {
  const navigate = useNavigate()
  const {
    currentStep,
    loading,
    completeStep,
    completeOnboarding,
    skipOnboarding,
  } = useOnboarding()

  const handleNext = () => {
    completeStep(currentStep)
  }

  const handleBack = () => {
    // Go to previous step (direct state update since we're not persisting back navigation)
    if (currentStep > 1) {
      completeStep(currentStep - 2) // This moves to currentStep - 1
    }
  }

  const [userProfileId, setUserProfileId] = useState<string | null>(null)

  // Fetch user's profile ID on mount
  useEffect(() => {
    async function fetchUserProfile() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      
      // Check if user has a profile in team (internal)
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', user.email)
        .eq('type', 'internal')
        .single()
      
      if (profile) {
        setUserProfileId(profile.id)
      }
    }
    fetchUserProfile()
  }, [])

  const handleComplete = async () => {
    await completeOnboarding()
    // Redirect to user's profile page to connect LinkedIn
    if (userProfileId) {
      navigate(`/team/${userProfileId}?connect=${userProfileId}`)
    } else {
      navigate('/team') // Go to team page to create profile first
    }
  }

  const handleSkip = async () => {
    await skipOnboarding()
    navigate('/')
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50">
        <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div 
      className="min-h-screen flex flex-col relative"
      style={{
        backgroundImage: `url(${BYC_TEXTURE})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed',
      }}
    >
      {/* Overlay pour lisibilité */}
      <div className="absolute inset-0 bg-white/95 backdrop-blur-sm" />
      
      {/* Contenu relatif au-dessus de l'overlay */}
      <div className="relative z-10 flex flex-col min-h-screen">
        {/* Header with progress */}
        <header className="px-8 py-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img
              src={BYC_LOGO}
              alt="Build Your Content"
              className="w-8 h-8 rounded-lg"
            />
            <span className="font-semibold text-neutral-900">Build Your Content</span>
          </div>

          <div className="flex items-center gap-6">
            {/* Progress dots */}
            <div className="flex items-center gap-2">
              {ONBOARDING_STEPS.map((step) => (
                <motion.div
                  key={step.id}
                  animate={{
                    width: step.id === currentStep ? 24 : 8,
                    backgroundColor: step.id <= currentStep ? '#7c3aed' : '#e5e5e5',
                  }}
                  className="h-2 rounded-full"
                />
              ))}
            </div>

            <button
              onClick={handleSkip}
              className="text-sm text-neutral-400 hover:text-neutral-600 transition-colors"
            >
              Passer l'intro
            </button>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 flex items-center justify-center px-8 py-12">
          <AnimatePresence mode="wait">
            {currentStep === 1 && (
              <StepWelcome key="welcome" onNext={handleNext} />
            )}
            {currentStep === 2 && (
              <StepTeam key="team" onNext={handleNext} onBack={handleBack} />
            )}
            {currentStep === 3 && (
              <StepCreators key="creators" onNext={handleNext} onBack={handleBack} />
            )}
            {currentStep === 4 && (
              <StepStudio key="studio" onNext={handleNext} onBack={handleBack} />
            )}
            {currentStep === 5 && (
              <StepReady key="ready" onComplete={handleComplete} userProfileId={userProfileId} />
            )}
          </AnimatePresence>
        </main>

        {/* Footer */}
        <footer className="px-8 py-4 text-center">
          <p className="text-xs text-neutral-400">
            Build Your Content — Étape {currentStep} sur {ONBOARDING_STEPS.length}
          </p>
        </footer>
      </div>
    </div>
  )
}
