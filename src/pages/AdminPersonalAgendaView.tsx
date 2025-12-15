import { useState, useEffect } from 'react'
import { startOfDay, endOfDay, format } from 'date-fns'
import { supabase } from '../lib/supabase'
import { useScheduler } from '../context/SchedulerContext'
import { useToast } from '../components/ui/Toast'
import type { AppointmentWithRelations } from '../lib/types'
import { ServiceFlow } from '../components/Professional/ServiceFlow'
import { Loader2, Calendar } from 'lucide-react'

export function AdminPersonalAgendaView() {
  const { currentUser } = useScheduler()
  const toast = useToast()
  const [loading, setLoading] = useState(true)
  const [agenda, setAgenda] = useState<AppointmentWithRelations[]>([])
  const [selected, setSelected] = useState<AppointmentWithRelations | null>(null)
  const [soloMode, setSoloMode] = useState(false)
  const [gabyConfig, setGabyConfig] = useState<any>(null)

  const userId = currentUser?.id
  const clinicId = currentUser?.clinicId

  useEffect(() => {
    if (!userId || !clinicId) {
      setLoading(false)
      return
    }

    // Carregar configurações da clínica
    const loadSettings = async () => {
      try {
        const { data: settings } = await supabase
          .from('organization_settings')
          .select('solo_mode, gaby_config')
          .eq('clinic_id', clinicId)
          .maybeSingle()

        setSoloMode(Boolean(settings?.solo_mode))
        setGabyConfig(settings?.gaby_config || null)
      } catch (err) {
        console.error('Erro ao carregar configurações:', err)
      }
    }

    loadSettings()
  }, [clinicId])

  useEffect(() => {
    if (!userId) return

    const loadAgenda = async () => {
      setLoading(true)
      try {
        const start = startOfDay(new Date()).toISOString()
        const end = endOfDay(new Date()).toISOString()

        // Buscar agenda do Admin (filtrada por seu professional_id ou user_id)
        const { data, error } = await supabase
          .from('appointments')
          .select(`
            *,
            client:clients (*),
            service:services (*),
            professional:profiles (*)
          `)
          .eq('professional_id', userId) // Admin como profissional
          .gte('start_time', start)
          .lte('end_time', end)
          .order('start_time', { ascending: true })

        if (error) throw error
        setAgenda((data || []) as AppointmentWithRelations[])
      } catch (err) {
        console.error('Erro ao carregar agenda:', err)
        toast.error('Falha ao carregar agenda pessoal')
      } finally {
        setLoading(false)
      }
    }

    loadAgenda()
  }, [userId, toast])

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-gray-600 mx-auto" />
          <p className="mt-2 text-sm text-gray-600">Carregando agenda...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-gray-900">Minha Agenda e Atendimento</h2>
        <p className="text-sm text-gray-600">Agenda pessoal e funções de atendimento</p>
      </div>

      {selected ? (
        <div className="space-y-4">
          <button
            onClick={() => setSelected(null)}
            className="px-4 py-2 bg-gray-200 text-gray-800 rounded-xl font-semibold text-sm hover:bg-gray-300"
          >
            ← Voltar para Agenda
          </button>
          <ServiceFlow
            appointment={selected}
            organizationId={clinicId || ''}
            soloMode={soloMode}
            gabyConfig={gabyConfig}
          />
        </div>
      ) : (
        <div className="space-y-4">
          {agenda.length === 0 ? (
            <div className="rounded-3xl bg-white/60 border border-white/40 shadow-xl p-8 text-center">
              <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-lg font-semibold text-gray-900">Nenhum agendamento hoje</p>
              <p className="text-sm text-gray-600">Sua agenda está livre para o dia</p>
            </div>
          ) : (
            <div className="space-y-3">
              {agenda.map((apt) => (
                <div
                  key={apt.id}
                  className="rounded-2xl bg-white/70 border border-white/60 shadow-lg p-6 cursor-pointer hover:shadow-xl transition"
                  onClick={() => setSelected(apt)}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-lg font-semibold text-gray-900">
                        {apt.client?.full_name || 'Cliente'}
                      </p>
                      <p className="text-sm text-gray-600">
                        {apt.service?.name || 'Serviço'} •{' '}
                        {format(new Date(apt.start_time), 'HH:mm')} -{' '}
                        {format(new Date(apt.end_time), 'HH:mm')}
                      </p>
                    </div>
                    <div>
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          apt.status === 'confirmed'
                            ? 'bg-green-100 text-green-800'
                            : apt.status === 'completed'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {apt.status}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

