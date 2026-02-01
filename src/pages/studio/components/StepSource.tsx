import { useState, useEffect } from 'react'
import { FileText, Library, Lightbulb, Sparkles, RefreshCw, PenLine, FileCheck } from 'lucide-react'
import { Textarea, Tabs, TabsContent, TabsList, TabsTrigger, MultimodalInput } from '@/components/ui'
import { PostBankEmbed } from '@/components/PostBankEmbed'
import type { PostCreationState } from '../CreatePost'

interface StepSourceProps {
  state: PostCreationState
  updateState: (updates: Partial<PostCreationState>) => void
}

export function StepSource({ state, updateState }: StepSourceProps) {
  const [activeTab, setActiveTab] = useState<'write' | 'inspire' | 'recycle'>(state.defaultSourceTab || 'write')
  const [showPostSelector, setShowPostSelector] = useState(true)

  // Sync tab when defaultSourceTab changes
  useEffect(() => {
    if (state.defaultSourceTab) {
      setActiveTab(state.defaultSourceTab)
    }
  }, [state.defaultSourceTab])

  const charCount = state.sourceText.length
  const isReady = charCount >= 20

  return (
    <div className="space-y-6">
      {/* Header with tips */}
      <div className="flex items-start gap-4 p-4 bg-gradient-to-r from-violet-50 to-purple-50 rounded-xl border border-violet-100">
        <div className="p-2 bg-violet-100 rounded-lg">
          <Lightbulb className="h-5 w-5 text-violet-600" />
        </div>
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-neutral-800 mb-1">Votre idée sera transformée en posts LinkedIn</h3>
          <p className="text-xs text-neutral-600">
            Décrivez une idée brute, collez un article, ou recyclez un post viral. L'IA s'occupe du reste.
          </p>
        </div>
        {isReady && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-100 text-emerald-700 rounded-full text-xs font-medium">
            <Sparkles className="h-3.5 w-3.5" />
            Prêt à générer
          </div>
        )}
      </div>

      {/* Source Content */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'write' | 'inspire' | 'recycle')} className="w-full">
        <div className="bg-white rounded-2xl border border-neutral-200 overflow-hidden shadow-sm">
          <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-100 bg-neutral-50/50">
            <TabsList className="grid grid-cols-3 w-[400px] h-10">
              <TabsTrigger value="write" className="text-sm data-[state=active]:bg-white data-[state=active]:shadow-sm">
                <FileText className="h-4 w-4 mr-2" />
                Écrire
              </TabsTrigger>
              <TabsTrigger value="inspire" className="text-sm data-[state=active]:bg-white data-[state=active]:shadow-sm">
                <Library className="h-4 w-4 mr-2" />
                S'inspirer
              </TabsTrigger>
              <TabsTrigger value="recycle" className="text-sm data-[state=active]:bg-white data-[state=active]:shadow-sm">
                <RefreshCw className="h-4 w-4 mr-2" />
                Recycler
              </TabsTrigger>
            </TabsList>
            <div className="flex items-center gap-3">
              <div className="h-1.5 w-24 bg-neutral-200 rounded-full overflow-hidden">
                <div 
                  className={`h-full transition-all duration-300 rounded-full ${isReady ? 'bg-emerald-500' : 'bg-amber-400'}`}
                  style={{ width: `${Math.min(100, (charCount / 20) * 100)}%` }}
                />
              </div>
              <span className="text-xs text-neutral-500 tabular-nums min-w-[60px]">
                {charCount} chars
              </span>
            </div>
          </div>

          <TabsContent value="write" className="mt-0">
            <div className="p-6">
              {/* Source Type Selection */}
              <div className="flex gap-2 mb-4">
                <button
                  onClick={() => updateState({ sourceType: 'idea' })}
                  className={`flex-1 flex items-center gap-2 p-3 rounded-lg border-2 transition-all ${
                    state.sourceType === 'idea'
                      ? 'border-violet-400 bg-violet-50 text-violet-700'
                      : 'border-neutral-200 hover:border-neutral-300 text-neutral-600'
                  }`}
                >
                  <PenLine className="h-4 w-4" />
                  <div className="text-left">
                    <p className="text-sm font-medium">Idée brute</p>
                    <p className="text-xs opacity-70">Transcription, notes, idée...</p>
                  </div>
                </button>
                <button
                  onClick={() => updateState({ sourceType: 'written_post' })}
                  className={`flex-1 flex items-center gap-2 p-3 rounded-lg border-2 transition-all ${
                    state.sourceType === 'written_post'
                      ? 'border-emerald-400 bg-emerald-50 text-emerald-700'
                      : 'border-neutral-200 hover:border-neutral-300 text-neutral-600'
                  }`}
                >
                  <FileCheck className="h-4 w-4" />
                  <div className="text-left">
                    <p className="text-sm font-medium">Post déjà écrit</p>
                    <p className="text-xs opacity-70">Juste améliorer structure & hook</p>
                  </div>
                </button>
              </div>

              <MultimodalInput
                value={state.sourceText}
                onChange={(value) => updateState({ sourceText: value })}
                onSubmit={() => {}}
                placeholder={state.sourceType === 'written_post' 
                  ? "Collez votre post LinkedIn déjà rédigé..."
                  : "Quelle est votre idée de post ? (dictée vocale disponible 🎤)"
                }
                variant="compact"
                showVoice={true}
                showImageUpload={false}
                showScreenshot={false}
                inputClassName="min-h-[200px] border-0 shadow-none focus-visible:ring-0 p-0 placeholder:text-neutral-300 text-base"
              />
              {!state.sourceText && state.sourceType === 'idea' && (
                <div className="mt-4 grid grid-cols-2 gap-2">
                  {[
                    { icon: '💡', text: 'Une réflexion sur votre métier' },
                    { icon: '📊', text: 'Une statistique à commenter' },
                    { icon: '📝', text: 'Un article de blog à résumer' },
                    { icon: '🔄', text: 'Un thread Twitter à adapter' },
                  ].map((item, i) => (
                    <button
                      key={i}
                      onClick={() => updateState({ sourceText: item.text + '...' })}
                      className="flex items-center gap-2 p-3 text-left text-xs text-neutral-500 bg-neutral-50 hover:bg-neutral-100 rounded-lg transition-colors"
                    >
                      <span>{item.icon}</span>
                      <span>{item.text}</span>
                    </button>
                  ))}
                </div>
              )}
              {state.sourceType === 'written_post' && (
                <p className="mt-3 text-xs text-emerald-600 bg-emerald-50 p-2 rounded-lg">
                  💡 L'IA va conserver votre texte et seulement améliorer la structure, l'orthographe et le hook.
                </p>
              )}
            </div>
          </TabsContent>

          <TabsContent value="inspire" className="flex-1 mt-0 overflow-auto">
            {showPostSelector ? (
              <div className="p-2">
                <div className="flex items-center justify-between mb-2 px-1">
                  <p className="text-xs text-neutral-500">
                    Sélectionnez jusqu'à 3 posts viraux pour vous en inspirer.
                  </p>
                  {state.sourceText && (
                    <button
                      onClick={() => setShowPostSelector(false)}
                      className="text-xs text-violet-600 hover:underline"
                    >
                      Voir le contenu sélectionné
                    </button>
                  )}
                </div>
                <PostBankEmbed
                  onSelectPosts={(contents) => updateState({ sourceText: contents.join('\n\n---\n\n') })}
                  maxSelection={3}
                  gridCols={3}
                />
              </div>
            ) : (
              <div className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-neutral-500">
                    Contenu inspiré • Vous pouvez le modifier ci-dessous
                  </p>
                  <button
                    onClick={() => setShowPostSelector(true)}
                    className="text-xs text-violet-600 hover:underline"
                  >
                    Changer la sélection
                  </button>
                </div>
                <Textarea
                  value={state.sourceText}
                  onChange={(e) => updateState({ sourceText: e.target.value })}
                  placeholder="Contenu des posts sélectionnés..."
                  className="min-h-[280px] resize-none text-base"
                />
              </div>
            )}
          </TabsContent>

          <TabsContent value="recycle" className="flex-1 mt-0 overflow-auto">
            <div className="p-2">
              {/* If content already loaded from dashboard recycle action, show it */}
              {state.sourceText && state.defaultSourceTab === 'recycle' ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between px-1">
                    <div className="flex items-center gap-2">
                      <FileCheck className="h-4 w-4 text-emerald-500" />
                      <p className="text-xs text-emerald-600 font-medium">
                        Post chargé depuis le dashboard
                      </p>
                    </div>
                    <button
                      onClick={() => updateState({ sourceText: '', defaultSourceTab: undefined })}
                      className="text-xs text-neutral-500 hover:text-neutral-700 underline"
                    >
                      Choisir un autre post
                    </button>
                  </div>
                  <div className="bg-neutral-50 border border-neutral-200 rounded-xl p-4 max-h-[400px] overflow-auto">
                    <p className="text-sm text-neutral-700 whitespace-pre-wrap">{state.sourceText}</p>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between mb-2 px-1">
                    <p className="text-xs text-neutral-500">
                      Sélectionnez un de vos posts existants pour le recycler.
                    </p>
                  </div>
                  <PostBankEmbed
                    onSelectPosts={(contents) => updateState({ sourceText: contents.join('\n\n---\n\n') })}
                    maxSelection={1}
                    gridCols={3}
                    source="production"
                  />
                </>
              )}
            </div>
          </TabsContent>
        </div>
      </Tabs>
    </div>
  )
}
