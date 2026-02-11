import { IconAlertTriangle, IconShieldOff } from '@tabler/icons-react'

// =============================================================================
// AUTO-ENGAGEMENT FEATURE — DEPRECATED (9 février 2026)
// Raison : Risque avéré de shadowban LinkedIn.
// Les données historiques restent en base (engagement_logs, engagement_settings).
// La edge function auto-engage-post est désactivée (CONFIG.ENABLED = false).
// =============================================================================

export function EngagementLogs() {
  return (
    <div className="p-6 flex items-center justify-center min-h-[60vh]">
      <div className="max-w-lg w-full text-center space-y-6">
        <div className="mx-auto w-16 h-16 rounded-full bg-red-100 flex items-center justify-center">
          <IconShieldOff className="h-8 w-8 text-red-500" />
        </div>

        <div>
          <h1 className="text-2xl font-bold text-neutral-900">
            Fonctionnalité désactivée
          </h1>
          <p className="text-neutral-500 text-sm mt-2">
            Engagement Automatique
          </p>
        </div>

        <div className="bg-red-50 border border-red-200 rounded-xl p-5 text-left space-y-3">
          <div className="flex items-start gap-3">
            <IconAlertTriangle className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-semibold text-red-800">
                Deprecated — Risque de shadowban LinkedIn
              </p>
              <p className="text-sm text-red-700 mt-1">
                Cette fonctionnalité a été <strong>définitivement désactivée le 9 février 2026</strong>.
              </p>
            </div>
          </div>

          <div className="text-sm text-red-700 space-y-2 pl-8">
            <p>
              Les likes et commentaires automatiques via des comptes tiers déclenchent
              les systèmes anti-spam de LinkedIn, entraînant une <strong>réduction de la portée
              des publications (shadowban)</strong> pour l'ensemble des comptes impliqués.
            </p>
            <p>
              Pour protéger la visibilité de vos publications et de celles de votre équipe,
              l'engagement automatique ne sera plus effectué.
            </p>
          </div>
        </div>

        <div className="bg-neutral-50 border border-neutral-200 rounded-xl p-4 text-sm text-neutral-600">
          <p className="font-medium text-neutral-700 mb-1">Que faire maintenant ?</p>
          <p>
            Encouragez votre équipe à interagir manuellement et de manière authentique
            avec les publications. L'engagement organique est bien mieux valorisé par
            l'algorithme LinkedIn.
          </p>
        </div>
      </div>
    </div>
  )
}
