import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useScheduler } from '../context/SchedulerContext'

/**
 * Componente que redireciona automaticamente usuários logados
 * para o painel correto baseado no seu role
 */
export function AutoRedirect() {
  const navigate = useNavigate()
  const { currentUser, sessionLoading } = useScheduler()

  useEffect(() => {
    if (sessionLoading) {
      return // Aguardar carregamento
    }

    if (!currentUser) {
      navigate('/login', { replace: true })
      return
    }

    // Função helper para determinar a rota baseada no role
    const getRouteByRole = (role: string | undefined): string => {
      switch (role) {
        case 'super_admin':
          return '/sa/dashboard'
        case 'admin':
        case 'clinic_owner':
          return '/admin/dashboard'
        case 'receptionist':
        case 'recepcionista':
          return '/reception/dashboard'
        case 'professional':
          return '/app/schedule'
        case 'client':
          return '/client/dashboard'
        default:
          return '/unauthorized'
      }
    }

    const route = (getRouteByRole(currentUser.role) || '/unauthorized').trim().replace(/\s+/g, '')
    console.log('🔄 AutoRedirect - Redirecionando para:', { role: currentUser.role, route, routeLength: route.length })
    navigate(route, { replace: true })
  }, [currentUser, sessionLoading, navigate])

  // Mostrar loading enquanto redireciona
  return (
    <div className="min-h-screen flex items-center justify-center bg-white text-gray-600">
      <div className="flex items-center gap-3">
        <span className="h-3 w-3 rounded-full bg-gray-400 animate-pulse" />
        Redirecionando...
      </div>
    </div>
  )
}
