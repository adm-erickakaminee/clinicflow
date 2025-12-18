import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { LogOut, Upload } from 'lucide-react'
import { useScheduler } from '../context/SchedulerContext'
import { supabase } from '../lib/supabase'
import { useToast } from './ui/Toast'

type Props = {
  isOpen: boolean
  onClose: () => void
  user: { name: string; email: string; role: string; avatarUrl?: string }
  onSave: (name: string, avatarUrl?: string) => Promise<void> | void
  onLogout: () => Promise<void> | void
}

export default function UserProfileModal({ isOpen, onClose, user, onSave, onLogout }: Props) {
  const { currentUser } = useScheduler()
  const toast = useToast()
  const [name, setName] = useState(user.name)
  const [avatar, setAvatar] = useState(user.avatarUrl || '')
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Atualizar estado quando user mudar (quando modal abrir)
  useEffect(() => {
    if (isOpen) {
      setName(user.name)
      setAvatar(user.avatarUrl || '')
    }
  }, [isOpen, user.name, user.avatarUrl])

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Validar tipo de arquivo
    if (!file.type.startsWith('image/')) {
      toast.error('Por favor, selecione uma imagem válida')
      return
    }

    // Validar tamanho (máximo 2MB para base64, 5MB para storage)
    const maxSize = 2 * 1024 * 1024 // 2MB
    if (file.size > maxSize) {
      toast.error('A imagem deve ter no máximo 2MB')
      return
    }

    if (!currentUser?.id) {
      toast.error('Usuário não encontrado')
      return
    }

    setUploading(true)
    try {
      let imageUrl = ''

      // Tentar fazer upload para Supabase Storage primeiro
      try {
        const fileExt = file.name.split('.').pop()
        const fileName = `avatar-${Date.now()}.${fileExt}`
        const filePath = `${currentUser.id}/${fileName}`

        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(filePath, file, {
            cacheControl: '3600',
            upsert: true,
          })

        if (!uploadError) {
          // Upload bem-sucedido, obter URL pública
          const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(filePath)
          imageUrl = publicUrl
        } else {
          // Se o bucket não existir ou houver erro, usar base64 como fallback
          throw uploadError
        }
      } catch (storageError: any) {
        // Se falhar (bucket não existe, etc), usar base64
        console.warn('Storage não disponível, usando base64:', storageError)
        
        const reader = new FileReader()
        imageUrl = await new Promise<string>((resolve, reject) => {
          reader.onload = () => {
            const result = reader.result as string
            resolve(result)
          }
          reader.onerror = reject
          reader.readAsDataURL(file)
        })
      }

      // Salvar a URL (storage ou base64) no perfil
      setAvatar(imageUrl)
      toast.success('Imagem carregada com sucesso!')
    } catch (error) {
      console.error('Erro ao processar imagem:', error)
      const errorMessage = error instanceof Error ? error.message : 'Erro ao processar a imagem'
      toast.error(errorMessage)
    } finally {
      setUploading(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const handleUploadClick = () => {
    fileInputRef.current?.click()
  }

  if (!isOpen) return null

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/95 px-4">
      <div className="relative w-full max-w-xl rounded-3xl bg-white/80 backdrop-blur-xl border border-white/60 shadow-2xl p-6 space-y-5">
        <div className="flex items-center justify-between">
          <p className="text-lg font-semibold text-gray-900">Meu Perfil</p>
          <button className="text-sm text-gray-500 hover:text-gray-700" onClick={onClose}>
            Fechar
          </button>
        </div>

        <div className="flex items-center gap-4">
          <div className="relative">
          <div className="h-16 w-16 rounded-full overflow-hidden bg-gray-200 border border-white/70 shadow-inner flex items-center justify-center text-lg font-semibold text-gray-700">
              {avatar ? (
                <img src={avatar} alt={name} className="h-full w-full object-cover" />
              ) : (
                initials(name)
              )}
            </div>
            {uploading && (
              <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center">
                <div className="h-6 w-6 border-2 border-white/60 border-t-transparent rounded-full animate-spin" />
              </div>
            )}
          </div>
          <div className="flex-1 space-y-2">
            <label className="text-xs font-semibold text-gray-700">Foto de Perfil</label>
            <div className="flex gap-2">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleImageUpload}
                accept="image/*"
                className="hidden"
              />
              <button
                onClick={handleUploadClick}
                disabled={uploading}
                className="px-3 py-2 rounded-xl bg-white/70 border border-white/60 shadow text-gray-700 text-sm font-semibold flex items-center gap-2 hover:bg-white/90 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {uploading ? (
                  <>
                    <div className="h-4 w-4 border-2 border-gray-700/60 border-t-transparent rounded-full animate-spin" />
                    Enviando...
                  </>
                ) : (
                  <>
                <Upload className="h-4 w-4" />
                    Fazer Upload
                  </>
                )}
              </button>
              {avatar && (
                <button
                  onClick={() => setAvatar('')}
                  className="px-3 py-2 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm font-semibold hover:bg-red-100 transition"
                >
                  Remover
                </button>
              )}
            </div>
            <p className="text-xs text-gray-500">Formatos aceitos: JPG, PNG, GIF (máx. 2MB)</p>
          </div>
        </div>

        <div className="space-y-3">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-gray-700">Nome</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-xl bg-white/70 border border-white/60 px-3 py-2 text-sm text-gray-900 focus:ring-2 focus:ring-gray-900/15"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-700">E-mail</label>
              <input
                value={user.email}
                disabled
                className="w-full rounded-xl bg-gray-100/80 border border-white/60 px-3 py-2 text-sm text-gray-500"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-700">Cargo</label>
              <input
                value={user.role}
                disabled
                className="w-full rounded-xl bg-gray-100/80 border border-white/60 px-3 py-2 text-sm text-gray-500"
              />
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row justify-between gap-3">
          <div className="text-xs text-gray-500">
            Último login: {currentUser?.email ? currentUser.email : 'N/D'}
          </div>
          <div className="flex items-center gap-2">
            <button
              className="px-4 py-2 rounded-xl bg-gray-200 text-gray-700 text-sm font-semibold"
              onClick={onClose}
            >
              Cancelar
            </button>
            <button
              className="px-4 py-2 rounded-xl bg-gray-900 text-white text-sm font-semibold shadow-lg shadow-black/10 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={saving}
              onClick={async () => {
                setSaving(true)
                try {
                await onSave(name, avatar)
                  toast.success('Perfil atualizado com sucesso!')
                  // Aguardar um pouco antes de fechar para garantir que o estado foi atualizado
                  await new Promise(resolve => setTimeout(resolve, 300))
                } catch (error) {
                  toast.error(error instanceof Error ? error.message : 'Erro ao salvar perfil')
                  setSaving(false)
                }
              }}
            >
              {saving ? (
                <span className="flex items-center gap-2">
                  <div className="h-4 w-4 border-2 border-white/60 border-t-transparent rounded-full animate-spin" />
                  Salvando...
                </span>
              ) : (
                'Salvar Alterações'
              )}
            </button>
            <button
              className="px-4 py-2 rounded-xl bg-red-500 text-white text-sm font-semibold shadow-lg shadow-red-500/30 flex items-center gap-2"
              onClick={async () => {
                await onLogout()
              }}
            >
              <LogOut className="h-4 w-4" />
              Sair da Conta
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}

function initials(name: string) {
  const parts = name.trim().split(' ').filter(Boolean)
  if (!parts.length) return 'U'
  return parts
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

