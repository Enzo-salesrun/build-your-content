import { useState } from 'react'
import { IconSend } from '@tabler/icons-react'
import { Button } from '@/components/ui'
import { supabase } from '@/lib/supabase'

interface TestPostButtonProps {
  profileId: string
  fullName: string
  disabled?: boolean
}

export function TestPostButton({ profileId, fullName, disabled }: TestPostButtonProps) {
  const [isTesting, setIsTesting] = useState(false)

  async function handleTestPost() {
    // Get the unipile account ID from database
    const { data: account } = await supabase
      .from('unipile_accounts')
      .select('id')
      .eq('profile_id', profileId)
      .eq('status', 'OK')
      .single()

    if (!account) {
      alert('Aucun compte LinkedIn connecté trouvé')
      return
    }

    // Test content with complex LinkedIn formatting
    const testContent = `🚀 J'ai testé l'automatisation de posts LinkedIn pendant 3 mois.

Voici ce que j'ai appris :

━━━━━━━━━━━━━━━━━━━━

𝗟𝗲𝘀 𝟯 𝗲𝗿𝗿𝗲𝘂𝗿𝘀 𝗾𝘂𝗲 𝘁𝗼𝘂𝘁 𝗹𝗲 𝗺𝗼𝗻𝗱𝗲 𝗳𝗮𝗶𝘁 :

1️⃣ Poster sans stratégie claire
   → Résultat : 0 engagement, 0 leads

2️⃣ Ignorer le formatage
   → Un mur de texte = personne ne lit

3️⃣ Ne pas tester son contenu
   → Vous ratez des opportunités d'optimisation

━━━━━━━━━━━━━━━━━━━━

𝗖𝗲 𝗾𝘂𝗶 𝗳𝗼𝗻𝗰𝘁𝗶𝗼𝗻𝗻𝗲 𝘃𝗿𝗮𝗶𝗺𝗲𝗻𝘁 :

✅ Une accroche qui arrête le scroll
✅ Des espaces pour aérer le texte
✅ Des émojis (avec modération)
✅ Un CTA clair à la fin

Le résultat ?

📈 +340% de vues
💬 +180% de commentaires
🤝 12 nouveaux clients

━━━━━━━━━━━━━━━━━━━━

👉 Et vous, quelle est votre plus grosse erreur sur LinkedIn ?

Commentez ci-dessous ⬇️

#LinkedIn #ContentMarketing #B2B #Test

🧪 [TEST AUTOMATIQUE - ${new Date().toLocaleString('fr-FR')}]`

    // Test image URL (public domain image)
    const testImageUrl = 'https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=800&q=80'

    if (!confirm(`Publier ce test COMPLET (texte long + image) sur le LinkedIn de ${fullName} ?\n\nContenu: ${testContent.substring(0, 200)}...\n\n📷 Avec image attachée`)) return

    setIsTesting(true)
    try {
      const { data, error } = await supabase.functions.invoke('publish-post', {
        body: {
          content: testContent,
          account_ids: [account.id],
          attachments: [{ url: testImageUrl, type: 'image' }],
        },
      })

      if (error) {
        console.error('Test post error:', error)
        alert(`❌ Erreur: ${error.message}`)
        return
      }

      console.log('Test post result:', data)
      if (data?.success) {
        alert(`✅ Post publié avec succès sur LinkedIn !`)
      } else {
        alert(`❌ Échec: ${data?.results?.[0]?.error || 'Unknown error'}`)
      }
    } catch (error) {
      console.error('Test post error:', error)
      alert(`❌ Erreur: ${(error as Error).message}`)
    } finally {
      setIsTesting(false)
    }
  }

  return (
    <Button
      variant="outline"
      size="sm"
      className="text-blue-600 border-blue-200 hover:bg-blue-50"
      onClick={handleTestPost}
      disabled={disabled || isTesting}
    >
      <IconSend className="h-4 w-4 mr-1" />
      {isTesting ? 'Envoi...' : 'Test Post'}
    </Button>
  )
}
