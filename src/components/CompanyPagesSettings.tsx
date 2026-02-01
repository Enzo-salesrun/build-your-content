import { useState, useEffect } from 'react'
import {
  IconBuilding,
  IconPlus,
  IconTrash,
  IconCheck,
  IconRefresh,
  IconLink,
  IconLoader2,
  IconUser,
  IconSend,
} from '@tabler/icons-react'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  Label,
  Switch,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Input,
  Badge,
} from '@/components/ui'
import { supabase } from '@/lib/supabase'

interface CompanyPage {
  id: string
  organization_urn: string
  name: string
  is_active: boolean
  admin_unipile_account_id: string
  admin_account_name?: string
  created_at: string
}

interface AutoPostRule {
  id: string
  source_profile_id: string
  target_company_page_id: string
  is_active: boolean
  post_delay_minutes: number
  add_prefix: string | null
  add_suffix: string | null
  profile_name?: string
  company_name?: string
}

interface UnipileAccount {
  id: string
  profile_id: string
  account_name: string
  username: string
  status: string
  organizations: Array<{
    name: string
    organization_urn: string
    messaging_enabled: boolean
  }>
}

interface Profile {
  id: string
  full_name: string
}

export function CompanyPagesSettings() {
  const [companyPages, setCompanyPages] = useState<CompanyPage[]>([])
  const [autoPostRules, setAutoPostRules] = useState<AutoPostRule[]>([])
  const [unipileAccounts, setUnipileAccounts] = useState<UnipileAccount[]>([])
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)

  // Modal states
  const [isAddRuleOpen, setIsAddRuleOpen] = useState(false)
  const [newRule, setNewRule] = useState({
    source_profile_id: '',
    target_company_page_id: '',
    post_delay_minutes: 0,
    add_prefix: '',
    add_suffix: '',
  })
  const [saving, setSaving] = useState(false)
  const [testingPageId, setTestingPageId] = useState<string | null>(null)

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    setLoading(true)
    try {
      // Fetch company pages
      const { data: pages } = await supabase
        .from('company_pages')
        .select(`
          *,
          unipile_accounts!admin_unipile_account_id (
            account_name
          )
        `)
        .order('name')

      // Fetch auto-post rules
      const { data: rules } = await supabase
        .from('company_auto_post_rules')
        .select(`
          *,
          profiles!source_profile_id (
            full_name
          ),
          company_pages!target_company_page_id (
            name
          )
        `)
        .order('created_at', { ascending: false })

      // Fetch Unipile accounts with organizations
      const { data: accounts } = await supabase
        .from('unipile_accounts')
        .select('id, profile_id, account_name, username, status, organizations')
        .eq('provider', 'LINKEDIN')
        .eq('status', 'OK')
        .eq('is_active', true)

      // Fetch all profiles
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, full_name')
        .order('full_name')

      setCompanyPages((pages?.map(p => ({
        ...p,
        admin_account_name: p.unipile_accounts?.account_name,
      })) || []) as unknown as CompanyPage[])

      setAutoPostRules((rules?.map(r => ({
        ...r,
        profile_name: r.profiles?.full_name,
        company_name: r.company_pages?.name,
      })) || []) as unknown as AutoPostRule[])

      setUnipileAccounts((accounts || []) as unknown as UnipileAccount[])
      setProfiles(profilesData || [])
    } catch (error) {
      console.error('Error fetching company pages data:', error)
    } finally {
      setLoading(false)
    }
  }

  async function syncCompanyPages() {
    setSyncing(true)
    try {
      // Get all Unipile accounts with organizations
      const accountsWithOrgs = unipileAccounts.filter(
        a => a.organizations && a.organizations.length > 0
      )

      for (const account of accountsWithOrgs) {
        for (const org of account.organizations) {
          // Upsert company page
          await supabase
            .from('company_pages')
            .upsert({
              organization_urn: org.organization_urn,
              name: org.name,
              admin_unipile_account_id: account.id,
            }, {
              onConflict: 'organization_urn',
            })
        }
      }

      await fetchData()
    } catch (error) {
      console.error('Error syncing company pages:', error)
      alert('Erreur lors de la synchronisation')
    } finally {
      setSyncing(false)
    }
  }

  async function togglePageActive(pageId: string, isActive: boolean) {
    try {
      await supabase
        .from('company_pages')
        .update({ is_active: isActive })
        .eq('id', pageId)

      setCompanyPages(prev =>
        prev.map(p => (p.id === pageId ? { ...p, is_active: isActive } : p))
      )
    } catch (error) {
      console.error('Error toggling page:', error)
    }
  }

  async function toggleRuleActive(ruleId: string, isActive: boolean) {
    try {
      await supabase
        .from('company_auto_post_rules')
        .update({ is_active: isActive })
        .eq('id', ruleId)

      setAutoPostRules(prev =>
        prev.map(r => (r.id === ruleId ? { ...r, is_active: isActive } : r))
      )
    } catch (error) {
      console.error('Error toggling rule:', error)
    }
  }

  async function deleteRule(ruleId: string) {
    if (!confirm('Supprimer cette règle de publication automatique ?')) return

    try {
      await supabase
        .from('company_auto_post_rules')
        .delete()
        .eq('id', ruleId)

      setAutoPostRules(prev => prev.filter(r => r.id !== ruleId))
    } catch (error) {
      console.error('Error deleting rule:', error)
    }
  }

  async function createAutoPostRule() {
    if (!newRule.source_profile_id || !newRule.target_company_page_id) {
      alert('Veuillez sélectionner un profil et une page entreprise')
      return
    }

    setSaving(true)
    try {
      const { error } = await supabase
        .from('company_auto_post_rules')
        .insert({
          source_profile_id: newRule.source_profile_id,
          target_company_page_id: newRule.target_company_page_id,
          post_delay_minutes: newRule.post_delay_minutes,
          add_prefix: newRule.add_prefix || null,
          add_suffix: newRule.add_suffix || null,
          is_active: true,
        })

      if (error) throw error

      setIsAddRuleOpen(false)
      setNewRule({
        source_profile_id: '',
        target_company_page_id: '',
        post_delay_minutes: 0,
        add_prefix: '',
        add_suffix: '',
      })
      await fetchData()
    } catch (error) {
      console.error('Error creating rule:', error)
      alert('Erreur lors de la création de la règle')
    } finally {
      setSaving(false)
    }
  }

  async function handleTestCompanyPost(page: CompanyPage) {
    // Get the admin Unipile account for this page
    const adminAccount = unipileAccounts.find(a => a.id === page.admin_unipile_account_id)
    
    if (!adminAccount) {
      alert('Compte administrateur non trouvé pour cette page')
      return
    }

    const testContent = `🏢 Test de publication automatique sur la page entreprise "${page.name}"

━━━━━━━━━━━━━━━━━━━━

Ce post est un test de notre système de publication automatique LinkedIn.

✅ La page entreprise est correctement configurée
✅ L'intégration Unipile fonctionne
✅ Les permissions administrateur sont valides

━━━━━━━━━━━━━━━━━━━━

🧪 [TEST AUTOMATIQUE - ${new Date().toLocaleString('fr-FR')}]`

    if (!confirm(`Publier ce test sur la page entreprise "${page.name}" ?\n\nContenu:\n${testContent.substring(0, 200)}...`)) return

    setTestingPageId(page.id)
    try {
      const { data, error } = await supabase.functions.invoke('publish-post', {
        body: {
          content: testContent,
          account_ids: [adminAccount.id],
          as_organization: page.organization_urn,
        },
      })

      if (error) {
        console.error('Test company post error:', error)
        alert(`❌ Erreur: ${error.message}`)
        return
      }

      console.log('Test company post result:', data)
      if (data?.success) {
        alert(`✅ Post publié avec succès sur la page "${page.name}" !`)
      } else {
        alert(`❌ Échec: ${data?.results?.[0]?.error || 'Erreur inconnue'}`)
      }
    } catch (error) {
      console.error('Test company post error:', error)
      alert(`❌ Erreur: ${(error as Error).message}`)
    } finally {
      setTestingPageId(null)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <IconLoader2 className="w-6 h-6 animate-spin text-neutral-400" />
      </div>
    )
  }

  // Get available organizations from connected accounts
  const availableOrgs = unipileAccounts.flatMap(account =>
    (account.organizations || []).map(org => ({
      ...org,
      adminAccountId: account.id,
      adminAccountName: account.account_name,
    }))
  )

  return (
    <div className="space-y-6">
      {/* Company Pages Section */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <IconBuilding className="w-5 h-5" />
              Pages Entreprise LinkedIn
            </CardTitle>
            <CardDescription>
              Pages entreprise disponibles pour la publication automatique
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={syncCompanyPages}
            disabled={syncing}
          >
            {syncing ? (
              <IconLoader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <IconRefresh className="w-4 h-4 mr-2" />
            )}
            Synchroniser
          </Button>
        </CardHeader>
        <CardContent>
          {companyPages.length === 0 ? (
            <div className="text-center py-8 text-neutral-500">
              <IconBuilding className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>Aucune page entreprise trouvée</p>
              <p className="text-sm mt-1">
                Connectez un compte LinkedIn avec accès administrateur à une page entreprise
              </p>
              {availableOrgs.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-4"
                  onClick={syncCompanyPages}
                >
                  <IconPlus className="w-4 h-4 mr-2" />
                  Importer {availableOrgs.length} page(s) détectée(s)
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {companyPages.map(page => (
                <div
                  key={page.id}
                  className="flex items-center justify-between p-4 bg-neutral-50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                      <IconBuilding className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-medium">{page.name}</p>
                      <p className="text-xs text-neutral-500">
                        Admin: {page.admin_account_name || 'N/A'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-blue-600 border-blue-200 hover:bg-blue-50"
                      onClick={() => handleTestCompanyPost(page)}
                      disabled={testingPageId === page.id || !page.is_active}
                    >
                      {testingPageId === page.id ? (
                        <IconLoader2 className="w-4 h-4 mr-1 animate-spin" />
                      ) : (
                        <IconSend className="w-4 h-4 mr-1" />
                      )}
                      {testingPageId === page.id ? 'Envoi...' : 'Test'}
                    </Button>
                    <Badge variant={page.is_active ? 'default' : 'secondary'}>
                      {page.is_active ? 'Actif' : 'Inactif'}
                    </Badge>
                    <Switch
                      checked={page.is_active}
                      onCheckedChange={(checked) => togglePageActive(page.id, checked)}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Auto-Post Rules Section */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <IconLink className="w-5 h-5" />
              Règles de Publication Automatique
            </CardTitle>
            <CardDescription>
              Configurez la republication automatique des posts personnels vers les pages entreprise
            </CardDescription>
          </div>
          <Button
            size="sm"
            onClick={() => setIsAddRuleOpen(true)}
            disabled={companyPages.length === 0}
          >
            <IconPlus className="w-4 h-4 mr-2" />
            Nouvelle règle
          </Button>
        </CardHeader>
        <CardContent>
          {autoPostRules.length === 0 ? (
            <div className="text-center py-8 text-neutral-500">
              <IconLink className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>Aucune règle configurée</p>
              <p className="text-sm mt-1">
                Créez une règle pour republier automatiquement les posts d'un profil sur une page entreprise
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {autoPostRules.map(rule => (
                <div
                  key={rule.id}
                  className="flex items-center justify-between p-4 bg-neutral-50 rounded-lg"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <IconUser className="w-4 h-4 text-neutral-500" />
                      <span className="font-medium">{rule.profile_name}</span>
                    </div>
                    <span className="text-neutral-400">→</span>
                    <div className="flex items-center gap-2">
                      <IconBuilding className="w-4 h-4 text-blue-500" />
                      <span className="font-medium">{rule.company_name}</span>
                    </div>
                    {rule.post_delay_minutes > 0 && (
                      <Badge variant="outline">
                        Délai: {rule.post_delay_minutes} min
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <Switch
                      checked={rule.is_active}
                      onCheckedChange={(checked) => toggleRuleActive(rule.id, checked)}
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteRule(rule.id)}
                    >
                      <IconTrash className="w-4 h-4 text-red-500" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Rule Dialog */}
      <Dialog open={isAddRuleOpen} onOpenChange={setIsAddRuleOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nouvelle règle de publication automatique</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Profil source (auteur)</Label>
              <Select
                value={newRule.source_profile_id}
                onValueChange={(value) =>
                  setNewRule(prev => ({ ...prev, source_profile_id: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner un profil" />
                </SelectTrigger>
                <SelectContent>
                  {profiles.map(profile => (
                    <SelectItem key={profile.id} value={profile.id}>
                      {profile.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Page entreprise cible</Label>
              <Select
                value={newRule.target_company_page_id}
                onValueChange={(value) =>
                  setNewRule(prev => ({ ...prev, target_company_page_id: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner une page" />
                </SelectTrigger>
                <SelectContent>
                  {companyPages.filter(p => p.is_active).map(page => (
                    <SelectItem key={page.id} value={page.id}>
                      {page.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Délai avant publication (minutes)</Label>
              <Input
                type="number"
                min="0"
                value={newRule.post_delay_minutes}
                onChange={(e) =>
                  setNewRule(prev => ({
                    ...prev,
                    post_delay_minutes: parseInt(e.target.value) || 0,
                  }))
                }
                placeholder="0 = immédiat"
              />
              <p className="text-xs text-neutral-500">
                0 = publication immédiate après le post personnel
              </p>
            </div>

            <div className="space-y-2">
              <Label>Préfixe (optionnel)</Label>
              <Input
                value={newRule.add_prefix}
                onChange={(e) =>
                  setNewRule(prev => ({ ...prev, add_prefix: e.target.value }))
                }
                placeholder="Ex: 📢 Actualité de notre équipe:"
              />
            </div>

            <div className="space-y-2">
              <Label>Suffixe (optionnel)</Label>
              <Input
                value={newRule.add_suffix}
                onChange={(e) =>
                  setNewRule(prev => ({ ...prev, add_suffix: e.target.value }))
                }
                placeholder="Ex: #NomEntreprise #Team"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddRuleOpen(false)}>
              Annuler
            </Button>
            <Button onClick={createAutoPostRule} disabled={saving}>
              {saving ? (
                <IconLoader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <IconCheck className="w-4 h-4 mr-2" />
              )}
              Créer la règle
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
