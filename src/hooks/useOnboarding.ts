import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export function useOnboarding() {
  const [hasSeenOnboarding, setHasSeenOnboarding] = useState<boolean | null>(null)
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)

  useEffect(() => {
    const checkOnboarding = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          setHasSeenOnboarding(true) // Se não está logado, não mostrar onboarding
          setLoading(false)
          return
        }

        setUserId(user.id)

        // Buscar flag do perfil
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('has_seen_gaby_onboarding')
          .eq('id', user.id)
          .single()

        if (error) {
          console.error('Erro ao buscar onboarding:', error)
          // Se houver erro, assumir que já viu (não mostrar onboarding)
          setHasSeenOnboarding(true)
        } else {
          // Se a flag não existir ou for null, considerar como false (mostrar onboarding)
          setHasSeenOnboarding(profile?.has_seen_gaby_onboarding ?? false)
        }
      } catch (error) {
        console.error('Erro ao verificar onboarding:', error)
        setHasSeenOnboarding(true)
      } finally {
        setLoading(false)
      }
    }

    checkOnboarding()
  }, [])

  const markOnboardingAsSeen = async () => {
    if (!userId) return false

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ has_seen_gaby_onboarding: true })
        .eq('id', userId)

      if (error) {
        console.error('Erro ao atualizar onboarding:', error)
        return false
      }

      setHasSeenOnboarding(true)
      return true
    } catch (error) {
      console.error('Erro ao marcar onboarding como visto:', error)
      return false
    }
  }

  return {
    hasSeenOnboarding,
    loading,
    markOnboardingAsSeen,
    shouldShowOnboarding: hasSeenOnboarding === false,
  }
}

