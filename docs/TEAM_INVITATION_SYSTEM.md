# Système d'Invitation des Team Members

## ✅ IMPLÉMENTÉ

Ce document décrit le système d'invitation implémenté pour les team members.

---

## Flux Simplifié (Implémenté)

1. **Admin crée un membre** depuis la page Team (nom, email, rôle, LinkedIn ID)
2. **Email d'invitation** envoyé automatiquement via Resend
3. **Membre clique le lien** → Page Team avec son profil surligné + instructions
4. **Membre connecte son LinkedIn** → Système opérationnel

---

## Fichiers Créés/Modifiés

- `supabase/migrations/20260127_team_invitations.sql` - Champs invitation sur profiles
- `supabase/functions/send-invitation/index.ts` - Edge function envoi email
- `src/pages/Team.tsx` - UI avec highlight + instructions + envoi auto

---

## Configuration Requise

1. **Secret Resend**: Ajouter `RESEND_API_KEY` dans les secrets Supabase
2. **APP_URL**: Configurer l'URL de l'app dans les secrets

```bash
supabase secrets set RESEND_API_KEY=re_xxxxx
supabase secrets set APP_URL=https://content-factory.buildyoursales.tech
```

---

## Ancien Plan (Référence)

---

## Architecture Actuelle vs Cible

### État Actuel
- Les team members sont créés directement dans `profiles` avec `type: 'internal'`
- Pas de lien avec `auth.users` (pas de compte utilisateur)
- Le LinkedIn ID est renseigné manuellement par l'admin

### État Cible
- L'admin crée une **invitation** (pas un profile complet)
- Le team member reçoit un **email avec Magic Link**
- Il crée son compte, complète son profil et connecte son LinkedIn lui-même
- Lien automatique entre `auth.users` et `profiles`

---

## Recommandation Service Email

### ✅ Supabase Auth (Recommandé)

| Avantage | Détail |
|----------|--------|
| **Intégré** | `inviteUserByEmail()` natif, pas de config externe |
| **Sécurisé** | Tokens d'invitation gérés automatiquement |
| **Personnalisable** | Templates d'email modifiables dans le dashboard |
| **Gratuit** | 4 emails/heure inclus, extensible avec SMTP custom |

### ❌ Cloudflare Email Routing

| Inconvénient | Détail |
|--------------|--------|
| **Complexe** | Nécessite Workers + configuration DNS |
| **Limité** | Conçu pour le routing, pas l'envoi transactionnel |
| **Redondant** | Supabase a déjà tout ce qu'il faut |

**Verdict**: Utiliser **Supabase Auth** avec possibilité d'ajouter un SMTP custom (Resend, SendGrid) plus tard si le volume augmente.

---

## Flux d'Invitation Complet

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              FLUX D'INVITATION                               │
└─────────────────────────────────────────────────────────────────────────────┘

  ADMIN                           SYSTÈME                         TEAM MEMBER
    │                                │                                  │
    │ 1. Clique "Inviter membre"     │                                  │
    │ ─────────────────────────────► │                                  │
    │                                │                                  │
    │ 2. Saisit email + rôle         │                                  │
    │ ─────────────────────────────► │                                  │
    │                                │                                  │
    │                                │ 3. Crée invitation en DB         │
    │                                │ ◄────────────────────────        │
    │                                │                                  │
    │                                │ 4. Appelle inviteUserByEmail()   │
    │                                │ ◄────────────────────────        │
    │                                │                                  │
    │                                │ 5. Envoie email avec Magic Link  │
    │                                │ ─────────────────────────────────►
    │                                │                                  │
    │ ◄─ 6. UI: "Invitation envoyée" │                                  │
    │                                │                                  │
    │                                │        7. Clique sur le lien     │
    │                                │ ◄─────────────────────────────── │
    │                                │                                  │
    │                                │ 8. Redirigé vers /accept-invite  │
    │                                │ ─────────────────────────────────►
    │                                │                                  │
    │                                │       9. Complète son profil     │
    │                                │          (nom, prénom)           │
    │                                │ ◄─────────────────────────────── │
    │                                │                                  │
    │                                │ 10. Crée entry dans profiles     │
    │                                │     liée à auth.users            │
    │                                │ ◄────────────────────────        │
    │                                │                                  │
    │                                │ 11. Redirigé vers onboarding     │
    │                                │     LinkedIn connection          │
    │                                │ ─────────────────────────────────►
    │                                │                                  │
    │                                │      12. Connecte son LinkedIn   │
    │                                │ ◄─────────────────────────────── │
    │                                │                                  │
    │                                │ 13. Profile complet, actif       │
    │                                │ ◄────────────────────────        │
```

---

## Plan de Déploiement

### Phase 1: Migration DB (1 jour)

#### 1.1 Nouvelle table `team_invitations`

```sql
CREATE TABLE team_invitations (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  email text NOT NULL,
  role text,
  invited_by uuid REFERENCES auth.users(id),
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired', 'cancelled')),
  token text UNIQUE,  -- Pour tracking (généré par Supabase Auth)
  accepted_at timestamptz,
  expires_at timestamptz DEFAULT (now() + interval '7 days'),
  created_at timestamptz DEFAULT now(),
  
  UNIQUE(email, status) -- Un seul pending par email
);

-- RLS
ALTER TABLE team_invitations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage invitations" ON team_invitations
  FOR ALL USING (true); -- À affiner selon vos besoins de rôles
```

#### 1.2 Ajouter `user_id` à `profiles`

```sql
-- Ajouter colonne user_id pour lier aux comptes auth
ALTER TABLE profiles 
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) UNIQUE;

-- Index pour les lookups
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON profiles(user_id);
```

#### 1.3 Trigger auto-création profile sur signup

```sql
-- Fonction appelée après création utilisateur via invitation
CREATE OR REPLACE FUNCTION handle_new_team_member()
RETURNS TRIGGER AS $$
DECLARE
  v_invitation record;
BEGIN
  -- Chercher une invitation pending pour cet email
  SELECT * INTO v_invitation
  FROM team_invitations
  WHERE email = NEW.email
    AND status = 'pending'
  LIMIT 1;
  
  IF v_invitation IS NOT NULL THEN
    -- Créer le profile lié
    INSERT INTO profiles (user_id, email, type, role, full_name)
    VALUES (
      NEW.id,
      NEW.email,
      'internal',
      v_invitation.role,
      COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1))
    );
    
    -- Marquer l'invitation comme acceptée
    UPDATE team_invitations
    SET status = 'accepted', accepted_at = now()
    WHERE id = v_invitation.id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger sur auth.users
CREATE TRIGGER on_auth_user_created_team_member
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_team_member();
```

---

### Phase 2: Edge Function `invite-team-member` (1 jour)

```typescript
// supabase/functions/invite-team-member/index.ts
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

Deno.serve(async (req) => {
  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  const { email, role, invited_by } = await req.json()

  // 1. Vérifier que l'email n'est pas déjà utilisé
  const { data: existingUser } = await supabaseAdmin
    .from('profiles')
    .select('id')
    .eq('email', email)
    .single()

  if (existingUser) {
    return new Response(
      JSON.stringify({ error: 'Cet email est déjà utilisé' }),
      { status: 400 }
    )
  }

  // 2. Créer l'invitation en DB
  const { data: invitation, error: invErr } = await supabaseAdmin
    .from('team_invitations')
    .insert({ email, role, invited_by })
    .select()
    .single()

  if (invErr) {
    return new Response(JSON.stringify({ error: invErr.message }), { status: 500 })
  }

  // 3. Envoyer l'email via Supabase Auth
  const { data, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
    data: {
      invitation_id: invitation.id,
      role: role,
    },
    redirectTo: `${Deno.env.get('APP_URL')}/accept-invite`,
  })

  if (error) {
    // Rollback: supprimer l'invitation
    await supabaseAdmin.from('team_invitations').delete().eq('id', invitation.id)
    return new Response(JSON.stringify({ error: error.message }), { status: 500 })
  }

  return new Response(JSON.stringify({ 
    success: true, 
    invitation_id: invitation.id,
    message: `Invitation envoyée à ${email}`
  }))
})
```

---

### Phase 3: Page Accept Invite (1 jour)

Créer une page `/accept-invite` qui:
1. Vérifie le token d'invitation (via URL params de Supabase Auth)
2. Permet à l'utilisateur de compléter son profil (prénom, nom)
3. Le redirige vers l'onboarding LinkedIn

```tsx
// src/pages/AcceptInvite.tsx
export function AcceptInvite() {
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
  })
  
  // Supabase Auth gère la session automatiquement après le Magic Link
  // L'utilisateur arrive ici avec une session valide
  
  async function handleComplete() {
    const { data: { user } } = await supabase.auth.getUser()
    
    // Mettre à jour le profile créé par le trigger
    await supabase
      .from('profiles')
      .update({
        first_name: formData.first_name,
        last_name: formData.last_name,
        full_name: `${formData.first_name} ${formData.last_name}`,
      })
      .eq('user_id', user.id)
    
    // Rediriger vers onboarding LinkedIn
    navigate('/onboarding/linkedin')
  }
  
  return (
    <div className="...">
      <h1>Bienvenue dans l'équipe !</h1>
      <p>Complétez votre profil pour commencer</p>
      {/* Formulaire prénom/nom */}
      <Button onClick={handleComplete}>Continuer</Button>
    </div>
  )
}
```

---

### Phase 4: Onboarding LinkedIn (1 jour)

Créer `/onboarding/linkedin` pour la connexion Unipile:

```tsx
// src/pages/OnboardingLinkedIn.tsx
export function OnboardingLinkedIn() {
  const { user } = useAuth()
  const [connecting, setConnecting] = useState(false)
  
  async function connectLinkedIn() {
    setConnecting(true)
    
    // Récupérer le profile de l'utilisateur
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', user.id)
      .single()
    
    // Lancer le flux Unipile existant
    const { data } = await supabase.functions.invoke('unipile-auth', {
      body: { profile_id: profile.id }
    })
    
    // Ouvrir la popup Unipile
    window.open(data.auth_url, '_blank', 'width=600,height=700')
  }
  
  return (
    <div className="...">
      <h1>Connectez votre LinkedIn</h1>
      <p>Pour publier et analyser vos posts, connectez votre compte LinkedIn</p>
      <Button onClick={connectLinkedIn} loading={connecting}>
        <IconBrandLinkedin /> Connecter LinkedIn
      </Button>
      <Button variant="ghost" onClick={() => navigate('/dashboard')}>
        Faire plus tard
      </Button>
    </div>
  )
}
```

---

### Phase 5: UI Admin Mise à Jour (0.5 jour)

Modifier `Team.tsx` pour:
1. Remplacer le formulaire de création directe par "Inviter par email"
2. Afficher la liste des invitations pending
3. Permettre de renvoyer/annuler des invitations

```tsx
// Dans Team.tsx - Nouveau modal d'invitation
function InviteModal() {
  const [email, setEmail] = useState('')
  const [role, setRole] = useState('')
  
  async function sendInvite() {
    const { data, error } = await supabase.functions.invoke('invite-team-member', {
      body: { email, role }
    })
    
    if (error) {
      toast.error(error.message)
    } else {
      toast.success(`Invitation envoyée à ${email}`)
      closeModal()
    }
  }
  
  return (
    <Dialog>
      <DialogHeader>
        <DialogTitle>Inviter un membre</DialogTitle>
      </DialogHeader>
      <DialogContent>
        <Input 
          label="Email professionnel" 
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <Input 
          label="Rôle" 
          value={role}
          onChange={(e) => setRole(e.target.value)}
        />
      </DialogContent>
      <DialogFooter>
        <Button onClick={sendInvite}>Envoyer l'invitation</Button>
      </DialogFooter>
    </Dialog>
  )
}
```

---

### Phase 6: Template Email (0.5 jour)

Personnaliser le template d'invitation dans Supabase Dashboard:

**Dashboard > Authentication > Email Templates > Invite User**

```html
<h2>Vous êtes invité à rejoindre Content Factory</h2>

<p>Bonjour,</p>

<p>Vous avez été invité à rejoindre l'équipe sur Content Factory, 
notre plateforme de création de contenu LinkedIn.</p>

<p><strong>Votre rôle:</strong> {{ .Data.role }}</p>

<p>Cliquez sur le bouton ci-dessous pour créer votre compte et 
connecter votre profil LinkedIn:</p>

<p>
  <a href="{{ .SiteURL }}/accept-invite?token_hash={{ .TokenHash }}&type=invite" 
     style="background: #0077B5; color: white; padding: 12px 24px; 
            text-decoration: none; border-radius: 6px; display: inline-block;">
    Accepter l'invitation
  </a>
</p>

<p>Ce lien expire dans 24 heures.</p>

<p>À bientôt,<br>L'équipe Content Factory</p>
```

---

## Checklist de Déploiement

### Pré-requis
- [ ] Configurer `APP_URL` dans les secrets Supabase
- [ ] S'assurer que le Site URL est configuré dans Auth Settings

### Phase 1: DB
- [ ] Exécuter migration `team_invitations`
- [ ] Exécuter migration ajout `user_id` sur `profiles`
- [ ] Créer trigger `handle_new_team_member`

### Phase 2: Backend
- [ ] Déployer edge function `invite-team-member`
- [ ] Tester l'envoi d'invitation

### Phase 3-4: Frontend
- [ ] Créer page `/accept-invite`
- [ ] Créer page `/onboarding/linkedin`
- [ ] Ajouter routes dans le router

### Phase 5: Admin UI
- [ ] Modifier `Team.tsx` avec nouveau modal invitation
- [ ] Afficher liste des invitations pending
- [ ] Actions: renvoyer / annuler

### Phase 6: Email
- [ ] Personnaliser template email invitation
- [ ] Tester le flux complet

### Post-déploiement
- [ ] Migrer les profiles existants (ajouter user_id si déjà authentifiés)
- [ ] Documentation utilisateur

---

## Estimation Totale

| Phase | Durée |
|-------|-------|
| Phase 1: Migration DB | 1 jour |
| Phase 2: Edge Function | 1 jour |
| Phase 3: Accept Invite | 1 jour |
| Phase 4: Onboarding LinkedIn | 1 jour |
| Phase 5: UI Admin | 0.5 jour |
| Phase 6: Template Email | 0.5 jour |
| **Total** | **5 jours** |

---

## Bonus: Configuration SMTP Custom (Optionnel)

Si le volume d'emails dépasse les limites Supabase (4/heure), configurer Resend:

1. Créer compte sur [resend.com](https://resend.com)
2. Ajouter le domaine et configurer les DNS
3. Dans Supabase Dashboard > Project Settings > Auth > SMTP Settings:
   - Host: `smtp.resend.com`
   - Port: `465`
   - User: `resend`
   - Pass: `re_xxxxx` (API key)
   - Sender: `noreply@votredomaine.com`
