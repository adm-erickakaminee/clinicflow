import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Calendar as CalendarIcon, Plus, CalendarRange, Lock, Sun } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { useScheduler } from '../context/SchedulerContext'
import type { SchedulerAppointment } from '../context/SchedulerContext'
import { ClientSelector } from '../components/Scheduler/ClientSelector'
import { useToast } from '../components/ui/Toast'
import { RequestQueueCard } from '../components/Reception/RequestQueueCard'

type Professional = {
  id: string
  name: string
  avatar: string
}

type Appointment = SchedulerAppointment

const slots = Array.from({ length: 69 }, (_, i) => 6 * 60 + i * 15) // minutes from 06:00 every 15m until 23:00

// Helper para formatar data para input type="date" (YYYY-MM-DD)
function formatDateForInput(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function SchedulerView() {
  const { 
    appointments: ctxAppointments, 
    blocks: ctxBlocks, 
    timeOffs: ctxTimeOffs, 
    addTimeOff,
    professionals: ctxProfessionals,
    checkAvailability
  } = useScheduler()
  const toast = useToast()
  
  // Converter profissionais do contexto para o formato esperado
  // Filtrar "Visão Geral" (id === 'all')
  // MEMOIZAR para evitar recriação a cada renderização
  const professionals: Professional[] = useMemo(() => {
    const mapped = ctxProfessionals
      .filter((p) => p.id !== 'all')
      .map((p) => ({
        id: p.id,
        name: p.name,
        avatar: p.avatarUrl || p.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=80&q=60',
      }))
    
    // Log para debug
    console.log('👥 SchedulerView - Profissionais mapeados:', {
      total: ctxProfessionals.length,
      filtrados: mapped.length,
      ids: mapped.map(p => p.id),
      nomes: mapped.map(p => p.name)
    })
    
    return mapped
  }, [ctxProfessionals])
  
  const [selectedDate, setSelectedDate] = useState(new Date())
  
  // Usar useMemo para criar uma string estável dos IDs dos profissionais
  const professionalIdsString = useMemo(() => {
    return professionals.map((p) => p.id).sort().join(',')
  }, [professionals])
  
  // Inicializar filtros com todos os profissionais marcados
  // IMPORTANTE: Sempre incluir 'all' para mostrar agendamentos sem profissional específico
  const [filters, setFilters] = useState<Record<string, boolean>>(() => {
    const initialFilters: Record<string, boolean> = { 'all': true }
    // Não usar professionals aqui porque pode não estar disponível na inicialização
    return initialFilters
  })
  
  // Atualizar filtros quando profissionais mudarem (adicionar novos profissionais como marcados)
  // CORRIGIDO: Usar useRef para rastrear o último professionalIdsString e evitar loops infinitos
  const lastProfessionalIdsRef = useRef<string>('')
  
  useEffect(() => {
    // Só atualizar se professionalIdsString realmente mudou
    if (professionalIdsString === lastProfessionalIdsRef.current) {
      return // Não fazer nada se não mudou - evita loop infinito
    }
    
    // Atualizar a referência ANTES de chamar setFilters para evitar múltiplas execuções
    lastProfessionalIdsRef.current = professionalIdsString
    
    // Usar functional update para evitar dependência de filters
    setFilters((prevFilters) => {
      const currentFilterIds = Object.keys(prevFilters)
        .filter(id => id !== 'all') // Excluir 'all' da comparação
        .sort()
        .join(',')
      
      // Só atualizar se a lista de IDs mudou
      if (professionalIdsString !== currentFilterIds) {
        const newFilters: Record<string, boolean> = { 'all': true } // Sempre incluir 'all'
        professionals.forEach((p) => {
          // Preservar estado atual do filtro se o profissional já existia, senão marcar como true
          newFilters[p.id] = prevFilters[p.id] !== undefined ? prevFilters[p.id] : true
        })
        return newFilters
      }
      return prevFilters // Retornar o mesmo objeto se não houver mudanças
    })
  }, [professionalIdsString, professionals]) // Incluir professionals apenas para uso dentro do useEffect
  const [cellAction, setCellAction] = useState<{ profId: string; time: string; x: number; y: number } | null>(null)
  const [modalData, setModalData] = useState<{
    mode: 'create' | 'edit'
    profId: string
    time: string
    date: Date
    event?: Appointment
  } | null>(null)
  const [blockModalData, setBlockModalData] = useState<{
    mode: 'create' | 'edit'
    profId: string
    time: string
    date: Date
    block?: { id: string; start: string; end: string; reason: string }
  } | null>(null)
  const [timeOffModalData, setTimeOffModalData] = useState<{ profId: string; date: Date } | null>(null)
  const appointments = ctxAppointments
  const blocks = ctxBlocks
  const timeOffs = ctxTimeOffs
  const { removeAppointment, removeBlock, updateAppointment } = useScheduler()

  // Criar uma string estável dos filtros para usar como dependência
  // IMPORTANTE: Declarar ANTES de usar em outros useMemo para evitar erro de "used before declaration"
  // Isso evita que o useMemo seja recalculado quando apenas a referência do objeto muda
  const filtersString = useMemo(() => {
    return Object.entries(filters)
      .filter(([_, value]) => value === true)
      .map(([key]) => key)
      .sort()
      .join(',')
  }, [filters])

  // Memoizar visibleProfessionals com dependências estáveis
  // Usar filtersString em vez de filters para evitar re-renderizações desnecessárias
  const visibleProfessionals = useMemo(
    () => {
      const filtered = professionals.filter((p) => filters[p.id])
      console.log('🔍 SchedulerView - visibleProfessionals:', {
        total: professionals.length,
        filtrados: filtered.length,
        ids: filtered.map(p => p.id),
        todosOsIds: professionals.map(p => p.id)
      })
      return filtered
    },
    [professionals, filtersString] // Usar filtersString para estabilidade
  )

  // Memoizar filteredAppointments com dependências estáveis
  // IMPORTANTE: Ainda precisamos usar `filters` dentro do useMemo para acessar os valores
  // mas usamos `filtersString` como dependência para evitar recálculos desnecessários
  const filteredAppointments = useMemo(
    () => {
      // Log para debug
      console.log('🔍 SchedulerView - Filtrando agendamentos:', {
        total: appointments.length,
        selectedDate: selectedDate.toISOString().split('T')[0],
        professionalIdsNosAgendamentos: appointments.map(a => ({ id: a.id, professionalId: a.professionalId })),
        professionalIdsNosFiltros: Object.keys(filters),
        visibleProfessionalsIds: professionals.map(p => p.id)
      })
      
      // Filtrar agendamentos por data selecionada e pelos filtros de profissional
      const selectedDateStart = new Date(selectedDate)
      selectedDateStart.setHours(0, 0, 0, 0)
      const selectedDateEnd = new Date(selectedDate)
      selectedDateEnd.setHours(23, 59, 59, 999)
      
      const filtered = appointments.filter((a) => {
        // Filtrar por data: verificar se o agendamento está no dia selecionado
        const appointmentDate = new Date(a.start)
        const appointmentDateOnly = new Date(appointmentDate.getFullYear(), appointmentDate.getMonth(), appointmentDate.getDate())
        const selectedDateOnly = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate())
        
        if (appointmentDateOnly.getTime() !== selectedDateOnly.getTime()) {
          return false // Não está no dia selecionado
        }
        
        // Filtrar por profissional: Se o professionalId for 'all', sempre mostrar
        if (a.professionalId === 'all') return true
        // Se o filtro existir e estiver ativo, mostrar
        if (filters[a.professionalId] === true) return true
        // Se o filtro não existir (profissional foi removido), ainda mostrar
        if (filters[a.professionalId] === undefined) return true
        // Caso contrário, não mostrar
        return false
      })
      
      console.log('🔍 SchedulerView - Agendamentos após filtro:', {
        filtrados: filtered.length,
        selectedDate: selectedDate.toISOString().split('T')[0],
        professionalIdsFiltrados: filtered.map(a => a.professionalId)
      })
      
      return filtered
    },
    [appointments, filtersString, filters, professionals, selectedDate] // Adicionar selectedDate como dependência
  )

  // Usar useCallback para estabilizar funções e evitar re-renderizações
  const openNewAppointmentModal = useCallback((profId: string, time: string) => {
    setModalData({ mode: 'create', profId, time, date: selectedDate })
  }, [selectedDate])

  const openEditAppointmentModal = useCallback((ev: Appointment) => {
    const start = new Date(ev.start)
    const hh = String(start.getHours()).padStart(2, '0')
    const mm = String(start.getMinutes()).padStart(2, '0')
    const time = `${hh}:${mm}`
    setModalData({ mode: 'edit', profId: ev.professionalId, time, date: selectedDate, event: ev })
  }, [selectedDate])

  // Handler para drag and drop de agendamentos - usar useCallback
  const handleAppointmentDrop = useCallback(async (appointment: Appointment, newProfId: string, newTime: string) => {
    try {
      // Calcular novos horários
      const [newHour, newMin] = newTime.split(':').map(Number)
      const newStartDate = new Date(selectedDate)
      newStartDate.setHours(newHour, newMin, 0, 0)
      
      const newEndDate = new Date(newStartDate)
      newEndDate.setMinutes(newEndDate.getMinutes() + (appointment.durationMinutes || 30))
      
      // 1. Validar disponibilidade básica (excluindo o próprio agendamento)
      const isAvailable = checkAvailability(
        newStartDate.toISOString(),
        newEndDate.toISOString(),
        newProfId,
        appointment.id // Excluir o próprio agendamento da verificação
      )
      
      if (!isAvailable) {
        toast.error('Horário indisponível ou fora do turno do profissional')
        return
      }
      
      // 2. Validar se não está em um bloqueio (block)
      const hasBlock = blocks.some((b) => {
        if (b.professionalId !== newProfId) return false
        const blockStart = new Date(b.start)
        const blockEnd = new Date(b.end)
        return (
          (newStartDate >= blockStart && newStartDate < blockEnd) ||
          (newEndDate > blockStart && newEndDate <= blockEnd) ||
          (newStartDate <= blockStart && newEndDate >= blockEnd)
        )
      })
      
      if (hasBlock) {
        toast.error('Não é possível agendar em um horário bloqueado')
        return
      }
      
      // 3. Validar se não está em um time_off
      const hasTimeOff = timeOffs.some((t) => {
        if (t.professionalId !== newProfId) return false
        const timeOffStart = new Date(t.startDate)
        timeOffStart.setHours(0, 0, 0, 0)
        const timeOffEnd = new Date(t.endDate)
        timeOffEnd.setHours(23, 59, 59, 999)
        const appointmentDate = new Date(selectedDate)
        return appointmentDate >= timeOffStart && appointmentDate <= timeOffEnd
      })
      
      if (hasTimeOff) {
        toast.error('Profissional está em folga neste período')
        return
      }
      
      // 4. Validar qualificação do profissional para o serviço (se houver serviceId)
      // Nota: serviceId pode não estar disponível diretamente em SchedulerAppointment
      // Uma validação mais completa seria feita no backend através do validateAppointmentMove
      
      // Atualizar agendamento
      const res = await updateAppointment(appointment.id, {
        professionalId: newProfId,
        start: newStartDate.toISOString(),
        end: newEndDate.toISOString(),
      })
      
      if (!res.ok) {
        toast.error(res.error || 'Erro ao mover agendamento')
        return
      }
      
      toast.success('Agendamento movido com sucesso!')
    } catch (err) {
      console.error('Erro ao mover agendamento:', err)
      toast.error('Erro ao mover agendamento')
    }
  }, [selectedDate, checkAvailability, updateAppointment, toast, blocks, timeOffs, ctxProfessionals])

  const openNewBlock = (profId: string, time: string) => {
    setBlockModalData({ mode: 'create', profId, time, date: selectedDate })
    setCellAction(null)
  }

  const openEditBlock = (block: { id: string; profId: string; start: string; end: string; reason: string }) => {
    setBlockModalData({
      mode: 'edit',
      profId: block.profId,
      time: block.start,
      date: selectedDate,
      block,
    })
    setCellAction(null)
  }

  const openTimeOff = (profId: string) => {
    setTimeOffModalData({ profId, date: selectedDate })
    setCellAction(null)
  }

  // Ref para o container scrollável
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const hasScrolledRef = useRef(false) // Flag para garantir que o scroll inicial só aconteça uma vez
  
  // Calcular horário atual e posição - usar useMemo para recalcular quando necessário
  const { now, nowMinutes, currentTimePosition, isToday } = useMemo(() => {
    const nowDate = new Date()
    const minutes = nowDate.getHours() * 60 + nowDate.getMinutes()
    
    // Verificar se a data selecionada é hoje
    const today = new Date()
    const isTodayDate = (
      selectedDate.getDate() === today.getDate() &&
      selectedDate.getMonth() === today.getMonth() &&
      selectedDate.getFullYear() === today.getFullYear()
    )
    
    // Calcular posição em pixels da linha vermelha (baseado no grid de slots)
    // O grid usa slots de 40px de altura, cada um representando 15 minutos
    let position: number | null = null
    if (minutes >= 360 && minutes <= 1380) {
      // Cada slot tem 40px de altura, começando em 06:00 (360 minutos)
      // O horário atual está em algum ponto dentro de um slot de 15 minutos
      // Exemplo: 12:19 = 739 minutos = (739 - 360) / 15 = 25.27 slots = 25.27 * 40 = 1010.8px
      const slotIndex = (minutes - 360) / 15
      position = slotIndex * 40 // Posição em pixels (pode ser decimal para posicionamento preciso)
    }
    
    return {
      now: nowDate,
      nowMinutes: minutes,
      currentTimePosition: position,
      isToday: isTodayDate
    }
  }, [selectedDate]) // Recalcular quando selectedDate mudar (para atualizar isToday)

  // Fazer scroll automático para a linha do horário atual
  // CORRIGIDO: Executar na montagem e quando a data mudar para hoje
  useEffect(() => {
    // Só fazer scroll automático se a data selecionada for hoje
    if (!isToday) {
      hasScrolledRef.current = false // Reset flag quando não for hoje
      return
    }
    
    // Se já fez scroll inicial e não mudou a data, não fazer novamente
    if (hasScrolledRef.current && currentTimePosition === null) return
    
    if (scrollContainerRef.current && currentTimePosition !== null) {
      // Aguardar um pouco mais para garantir que o DOM está completamente renderizado
      const timeoutId = setTimeout(() => {
        const container = scrollContainerRef.current
        if (!container) return
        
        // Scroll para a posição da linha vermelha, centralizando-a no viewport
        const containerHeight = container.clientHeight
        const scrollPosition = currentTimePosition - containerHeight / 2
        
        // Scroll suave até a posição (com margem para não ficar muito no topo)
        container.scrollTo({
          top: Math.max(0, scrollPosition - 20), // -20px de margem superior
          behavior: 'smooth',
        })
        
        console.log('📍 SchedulerView - Scroll automático executado:', {
          currentTimePosition,
          scrollPosition: Math.max(0, scrollPosition - 20),
          containerHeight,
          isToday
        })
        
        hasScrolledRef.current = true // Marcar que já fez scroll
      }, 500) // Aumentar delay para garantir renderização completa do grid
      
      return () => clearTimeout(timeoutId)
    }
  }, [currentTimePosition, isToday]) // Re-scroll quando o horário atual mudar ou quando a data selecionada for hoje
  
  // Forçar scroll inicial quando o componente montar (se for hoje)
  useEffect(() => {
    if (isToday && !hasScrolledRef.current) {
      // Aguardar um pouco mais para garantir que tudo está renderizado
      const timeoutId = setTimeout(() => {
        if (scrollContainerRef.current && currentTimePosition !== null) {
          const container = scrollContainerRef.current
          const containerHeight = container.clientHeight
          const scrollPosition = currentTimePosition - containerHeight / 2
          
          container.scrollTo({
            top: Math.max(0, scrollPosition - 20),
            behavior: 'smooth',
          })
          
          console.log('📍 SchedulerView - Scroll inicial executado na montagem')
          hasScrolledRef.current = true
        }
      }, 800) // Delay maior para garantir que o grid está completamente renderizado
      
      return () => clearTimeout(timeoutId)
    }
  }, []) // Executar apenas na montagem

  // Calcular dias do calendário
  const calendarDays = useMemo(() => {
    const year = selectedDate.getFullYear()
    const month = selectedDate.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const daysInMonth = lastDay.getDate()
    const startDayOfWeek = firstDay.getDay() // 0 = Domingo, 6 = Sábado
    
    const days: (number | null)[] = []
    
    // Adicionar dias vazios no início (do mês anterior)
    for (let i = 0; i < startDayOfWeek; i++) {
      days.push(null)
    }
    
    // Adicionar dias do mês atual
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(day)
    }
    
    // Preencher até completar 6 linhas (42 células)
    while (days.length < 42) {
      days.push(null)
    }
    
    return days
  }, [selectedDate])

  return (
    <div className="relative text-gray-900">
      <div className="relative grid grid-cols-1 lg:grid-cols-[320px,1fr] gap-6">
        {/* Sidebar */}
        <aside className="bg-white/60 backdrop-blur-xl border border-white/40 shadow-xl rounded-3xl p-4 flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <CalendarIcon className="h-5 w-5 text-gray-700" />
            <div>
              <p className="text-sm font-semibold">Calendário</p>
              <p className="text-xs text-gray-500">Escolha o dia</p>
            </div>
          </div>
          {/* mini calendário */}
          <div className="grid grid-cols-7 gap-2 text-center text-xs bg-white/60 rounded-2xl border border-white/40 p-3 shadow-sm">
            {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((d, index) => (
              <span key={`day-${index}`} className="text-gray-500">
                {d}
              </span>
            ))}
            {calendarDays.map((day, i) => {
              if (day === null) {
                return <div key={`empty-${i}`} className="h-8 w-8" />
              }
              const year = selectedDate.getFullYear()
              const month = selectedDate.getMonth()
              const active = selectedDate.getDate() === day && selectedDate.getMonth() === month
              return (
                <button
                  key={day}
                  onClick={() => setSelectedDate(new Date(year, month, day))}
                  className={`h-8 w-8 flex items-center justify-center rounded-xl ${
                    active ? 'bg-gray-900 text-white shadow' : 'bg-white/70 text-gray-800 hover:bg-white'
                  }`}
                >
                  {day}
                </button>
              )
            })}
          </div>

          <div className="space-y-2">
            <p className="text-sm font-semibold text-gray-800">Filtros rápidos</p>
            {professionals.length === 0 ? (
              <div className="bg-white/60 rounded-xl px-3 py-2 border border-white/50 shadow-sm text-sm text-gray-600 text-center">
                Nenhum profissional cadastrado
              </div>
            ) : (
              professionals.map((p) => (
                <label
                  key={p.id}
                  className="flex items-center gap-2 bg-white/60 rounded-xl px-3 py-2 border border-white/50 shadow-sm text-sm"
                >
                  <input
                    type="checkbox"
                    checked={filters[p.id] || false}
                    onChange={(e) => setFilters((f) => ({ ...f, [p.id]: e.target.checked }))}
                    className="h-4 w-4"
                  />
                  <span className="text-gray-800">{p.name}</span>
                </label>
              ))
            )}
          </div>

          {/* Solicitações de Agendamento - abaixo do calendário */}
          <RequestQueueCard />
        </aside>

        {/* Grid principal */}
        <div className="bg-white/60 backdrop-blur-xl border border-white/40 shadow-xl rounded-3xl p-0 overflow-hidden">
          {visibleProfessionals.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-gray-600 text-sm">Nenhum profissional cadastrado. Cadastre profissionais na aba "Cadastros".</p>
            </div>
          ) : (
            <>
              {/* Header sticky */}
              <div className="sticky top-0 z-10 bg-white/70 backdrop-blur-xl border-b border-white/50">
                <div className="grid" style={{ gridTemplateColumns: `80px repeat(${visibleProfessionals.length}, 1fr)` }}>
                  <div className="h-16 px-4 flex items-center text-xs font-semibold text-gray-500">Hora</div>
                  {visibleProfessionals.map((p) => (
                <div key={p.id} className="h-16 px-4 flex items-center gap-3 border-l border-gray-200/50">
                  {p.avatar ? (
                    <img src={p.avatar} alt={p.name} className="h-10 w-10 rounded-full object-cover border border-white/60 shadow" />
                  ) : (
                    <div className="h-10 w-10 rounded-full bg-gray-200 border border-white/60 shadow flex items-center justify-center text-gray-600 text-xs font-semibold">
                      {p.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{p.name}</p>
                    <p className="text-xs text-gray-500">Profissional</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Corpo scrollável */}
          <div 
            ref={scrollContainerRef}
            className="relative max-h-[70vh] overflow-y-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            {/* linha de tempo atual */}
            {nowMinutes >= 360 && nowMinutes <= 1380 && currentTimePosition !== null && (
              <div
                className="absolute left-20 right-0 h-0.5 bg-red-500 z-20"
                style={{ top: `${currentTimePosition}px` }}
              >
                <span className="absolute -left-16 -top-2 text-[10px] text-red-600">{`${now.getHours()}:${String(
                  now.getMinutes()
                ).padStart(2, '0')}`}</span>
              </div>
            )}

            <div
              className="grid"
              style={{
                gridTemplateColumns: `80px repeat(${visibleProfessionals.length}, 1fr)`,
                gridTemplateRows: `repeat(${slots.length}, 40px)`,
              }}
            >
              {/* horas coluna esquerda */}
              {slots.map((minute, idx) => {
                const h = Math.floor(minute / 60)
                const m = minute % 60
                return (
                  <div
                    key={`hour-${idx}`}
                    className="border-b border-gray-200/60 px-3 flex items-start text-xs text-gray-500"
                    style={{ gridRow: idx + 1, gridColumn: 1 }}
                  >
                    {m === 0 ? `${String(h).padStart(2, '0')}:00` : ''}
                  </div>
                )
              })}

              {/* células */}
              {slots.map((_, rowIdx) =>
                visibleProfessionals.map((p, colIdx) => {
                  const gridRow = rowIdx + 1
                  const gridColumn = colIdx + 2
                  const cellTime = minutesToTime(360 + rowIdx * 15)
                  
                  // Verificar se o slot está disponível baseado no workSchedule do profissional
                  const professional = ctxProfessionals.find((prof) => prof.id === p.id)
                  const workSchedule = professional?.workSchedule
                  let isAvailable = true
                  
                  if (workSchedule) {
                    const slotDate = new Date(selectedDate)
                    const [cellHour, cellMin] = cellTime.split(':').map(Number)
                    slotDate.setHours(cellHour, cellMin, 0, 0)
                    
                    const dayOfWeek = slotDate.getDay() // 0 = Domingo, 6 = Sábado
                    
                    // Verificar se o dia está no turno
                    if (!workSchedule.days.includes(dayOfWeek)) {
                      isAvailable = false
                    } else {
                      // Verificar se o horário está dentro do intervalo de trabalho
                      const [workStartHour, workStartMin] = workSchedule.start.split(':').map(Number)
                      const [workEndHour, workEndMin] = workSchedule.end.split(':').map(Number)
                      
                      const slotMinutes = cellHour * 60 + cellMin
                      const workStartMinutes = workStartHour * 60 + workStartMin
                      const workEndMinutes = workEndHour * 60 + workEndMin
                      
                      if (slotMinutes < workStartMinutes || slotMinutes >= workEndMinutes) {
                        isAvailable = false
                      } else if (workSchedule.breakStart && workSchedule.breakEnd) {
                        // Verificar se está no intervalo de almoço
                        const [breakStartHour, breakStartMin] = workSchedule.breakStart.split(':').map(Number)
                        const [breakEndHour, breakEndMin] = workSchedule.breakEnd.split(':').map(Number)
                        
                        const breakStartMinutes = breakStartHour * 60 + breakStartMin
                        const breakEndMinutes = breakEndHour * 60 + breakEndMin
                        
                        if (slotMinutes >= breakStartMinutes && slotMinutes < breakEndMinutes) {
                          isAvailable = false
                        }
                      }
                    }
                  }
                  
                  return (
                    <div
                      key={`cell-${rowIdx}-${p.id}`}
                      className={`border-b border-l transition relative ${
                        isAvailable 
                          ? 'border-gray-200/60 hover:bg-white/60' 
                          : 'border-gray-100/40 bg-gray-50/30'
                      }`}
                      style={{ gridRow, gridColumn }}
                      onDrop={async (e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        if (!isAvailable) {
                          toast.error('Horário fora do turno do profissional')
                          return
                        }
                        try {
                          const appointmentDataStr = e.dataTransfer.getData('application/json')
                          if (!appointmentDataStr) return
                          
                          const appointmentData = JSON.parse(appointmentDataStr)
                          const appointment = filteredAppointments.find((apt) => apt.id === appointmentData.id)
                          
                          if (appointment) {
                            await handleAppointmentDrop(appointment, p.id, cellTime)
                          }
                        } catch (err) {
                          console.error('Erro ao processar drop:', err)
                          toast.error('Erro ao mover agendamento')
                        }
                      }}
                      onDragOver={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        if (isAvailable) {
                          e.dataTransfer.dropEffect = 'move'
                        } else {
                          e.dataTransfer.dropEffect = 'none'
                        }
                      }}
                    >
                      <button
                        onClick={(e) => {
                          if (!isAvailable) {
                            toast.error('Horário fora do turno do profissional')
                            return
                          }
                          const popW = 240
                          const popH = 200
                          const padding = 12
                          const rawX = e.clientX
                          const rawY = e.clientY
                          const left = Math.min(
                            Math.max(rawX - popW / 2, padding),
                            window.innerWidth - popW - padding
                          )
                          const top = Math.min(
                            Math.max(rawY - popH / 2, padding),
                            window.innerHeight - popH - padding
                          )
                          setCellAction({
                            profId: p.id,
                            time: cellTime,
                            x: left,
                            y: top,
                          })
                        }}
                        className="w-full h-full"
                        disabled={!isAvailable}
                        title={!isAvailable ? 'Horário fora do turno do profissional' : 'Adicionar agendamento'}
                      >
                        <span className="sr-only">Adicionar</span>
                        {isAvailable && (
                          <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition">
                            <div className="h-7 w-7 rounded-full bg-white/80 border border-white/60 shadow flex items-center justify-center text-gray-700">
                              <Plus className="h-4 w-4" />
                            </div>
                          </div>
                        )}
                      </button>
                    </div>
                  )
                })
              )}

              {/* eventos */}
              {filteredAppointments.map((ev) => {
                const startStr = new Date(ev.start).toTimeString().slice(0, 5)
                const startMin = timeToMinutes(startStr)
                const rowStart = Math.floor((startMin - 360) / 15) + 1
                const rowSpan = Math.max(1, Math.ceil((ev.durationMinutes ?? 30) / 15))
                
                // Detectar conflitos (agendamentos sobrepostos no mesmo profissional)
                const evStart = new Date(ev.start)
                const evEnd = new Date(ev.end || new Date(evStart.getTime() + (ev.durationMinutes || 30) * 60000))
                const hasConflict = filteredAppointments.some((other) => {
                  if (other.id === ev.id || other.professionalId !== ev.professionalId) return false
                  const otherStart = new Date(other.start)
                  const otherEnd = new Date(other.end || new Date(otherStart.getTime() + (other.durationMinutes || 30) * 60000))
                  return (
                    (evStart < otherEnd && evEnd > otherStart) ||
                    (otherStart < evEnd && otherEnd > evStart)
                  )
                })
                
                // CORRIGIDO: Se professionalId for 'all', null ou undefined, renderizar na primeira coluna (índice 0)
                // ou encontrar o primeiro profissional visível
                let colIndex = -1
                if (ev.professionalId === 'all' || !ev.professionalId || ev.professionalId === null || ev.professionalId === undefined) {
                  // Para agendamentos 'all', renderizar na primeira coluna visível
                  colIndex = visibleProfessionals.length > 0 ? 0 : -1
                  console.log('📍 SchedulerView - Agendamento "all" renderizado na coluna 0:', {
                    appointmentId: ev.id,
                    patient: ev.patient,
                    start: ev.start,
                    visibleProfessionalsCount: visibleProfessionals.length
                  })
                } else {
                  // Primeiro, tentar encontrar nos profissionais visíveis
                  colIndex = visibleProfessionals.findIndex((p) => p.id === ev.professionalId)
                  
                  // Se não encontrou nos visíveis, tentar encontrar em todos os profissionais
                  if (colIndex === -1) {
                    const allProfIndex = professionals.findIndex((p) => p.id === ev.professionalId)
                    if (allProfIndex !== -1) {
                      // Profissional existe mas não está visível - verificar se está nos filtros
                      const prof = professionals[allProfIndex]
                      if (filters[prof.id] === false) {
                        // Profissional está desmarcado nos filtros - não renderizar
                        console.warn('⚠️ SchedulerView - Profissional está desmarcado nos filtros:', {
                          appointmentId: ev.id,
                          professionalId: ev.professionalId,
                          professionalName: prof.name
                        })
                        return null
                      } else {
                        // Profissional existe mas não está visível por outro motivo - renderizar na primeira coluna
                        colIndex = visibleProfessionals.length > 0 ? 0 : -1
                        console.warn('⚠️ SchedulerView - Profissional não está visível, renderizando na primeira coluna:', {
                          appointmentId: ev.id,
                          professionalId: ev.professionalId,
                          professionalName: prof.name,
                          visibleProfessionalsCount: visibleProfessionals.length
                        })
                      }
                    } else {
                      // Profissional não existe - pode ser um profile_id que não foi mapeado corretamente
                      // NÃO renderizar na primeira coluna - isso causa empilhamento
                      // Em vez disso, não renderizar ou tentar encontrar por outros meios
                      console.error('❌ SchedulerView - professionalId não encontrado em nenhum profissional, NÃO renderizando:', {
                        appointmentId: ev.id,
                        professionalId: ev.professionalId,
                        visibleProfessionalsCount: visibleProfessionals.length,
                        allProfessionalsIds: professionals.map(p => p.id),
                        visibleProfessionalsIds: visibleProfessionals.map(p => p.id),
                        patient: ev.patient,
                        start: ev.start
                      })
                      return null // Não renderizar se não encontrar o profissional
                    }
                  }
                }
                
                // Se ainda não encontrou coluna (nenhum profissional visível), não renderizar
                if (colIndex === -1) {
                  console.error('❌ SchedulerView - Agendamento não renderizado (nenhum profissional visível):', {
                    appointmentId: ev.id,
                    professionalId: ev.professionalId,
                    visibleProfessionalsCount: visibleProfessionals.length,
                    visibleProfessionalsIds: visibleProfessionals.map(p => p.id),
                    allProfessionalsIds: professionals.map(p => p.id),
                    patient: ev.patient,
                    start: ev.start,
                    rowStart,
                    rowSpan
                  })
                  return null
                }
                
                // Log de sucesso para debug (apenas para alguns agendamentos para não poluir o console)
                if (Math.random() < 0.1) { // Log apenas 10% dos agendamentos
                  console.log('✅ SchedulerView - Renderizando agendamento:', {
                    appointmentId: ev.id,
                    patient: ev.patient,
                    professionalId: ev.professionalId,
                    colIndex,
                    rowStart,
                    rowSpan,
                    start: ev.start
                  })
                }
                
                return (
                  <EventCard
                    key={ev.id}
                    type="appointment"
                    patient={ev.patient ?? 'Paciente'}
                    procedure={ev.procedure ?? ev.title ?? 'Procedimento'}
                    status={mapStatusToPortuguese(ev.status)}
                    color={ev.color ?? 'bg-yellow-200'}
                    start={startStr}
                    duration={ev.durationMinutes ?? 30}
                    onClick={() => openEditAppointmentModal(ev)}
                    onDrop={(newProfId, newTime) => handleAppointmentDrop(ev, newProfId, newTime)}
                    hasConflict={hasConflict}
                    style={{
                      gridColumn: colIndex + 2,
                      gridRow: `${rowStart} / span ${rowSpan}`,
                      margin: '4px',
                      appointmentId: ev.id,
                      professionalId: ev.professionalId,
                    } as any}
                  />
                )
              })}

              {/* bloqueios intra-dia */}
              {blocks
                .filter((b) => {
                  const d = new Date(b.start).toDateString()
                  return d === selectedDate.toDateString()
                })
                .map((b) => {
                  const startMin = timeToMinutes(new Date(b.start).toTimeString().slice(0, 5))
                  const endMin = timeToMinutes(new Date(b.end).toTimeString().slice(0, 5))
                  const rowStart = Math.floor((startMin - 360) / 15) + 1
                  const rowSpan = Math.max(1, Math.ceil((endMin - startMin) / 15))
                  const colIndex = visibleProfessionals.findIndex((p) => p.id === b.professionalId)
                  if (colIndex === -1) return null
                  return (
                    <EventCard
                      key={b.id}
                      type="block"
                      reason={b.reason}
                      start={new Date(b.start).toTimeString().slice(0, 5)}
                      end={new Date(b.end).toTimeString().slice(0, 5)}
                      onClick={() =>
                        openEditBlock({
                          id: b.id,
                          profId: b.professionalId,
                          start: new Date(b.start).toTimeString().slice(0, 5),
                          end: new Date(b.end).toTimeString().slice(0, 5),
                          reason: b.reason || '',
                        })
                      }
                      style={{
                        gridColumn: colIndex + 2,
                        gridRow: `${rowStart} / span ${rowSpan}`,
                        margin: '4px',
                      }}
                    />
                  )
                })}
            </div>

            {/* folgas coluna inteira */}
            {timeOffs
              .filter((t) => isDateInRange(selectedDate, t.startDate, t.endDate))
              .map((t) => {
                const colIndex = visibleProfessionals.findIndex((p) => p.id === t.professionalId)
                if (colIndex === -1) return null
                return (
                  <div
                    key={t.id}
                    className="absolute inset-y-0 bg-white/70 backdrop-blur-xl border border-white/60 shadow-inner rounded-2xl mx-1 px-3 py-2 text-sm flex flex-col justify-center items-center text-gray-800 text-center"
                    style={{
                      left: `calc(80px + ${(colIndex * 100) / visibleProfessionals.length}%)`,
                      width: `calc(${100 / visibleProfessionals.length}% - 8px)`,
                      backgroundImage:
                        "repeating-linear-gradient(45deg, rgba(148,163,184,0.2), rgba(148,163,184,0.2) 10px, rgba(255,255,255,0.4) 10px, rgba(255,255,255,0.4) 20px)",
                    }}
                  >
                    <p className="font-semibold text-xs">AUSENTE {t.notes ? `- ${t.notes}` : ''}</p>
                  </div>
                )
              })}
          </div>
            </>
          )}
        </div>
      </div>

      {/* Popover de ações */}
      {cellAction && (
        <div
          className="fixed z-50 bg-white/95 backdrop-blur-xl border border-white/60 shadow-2xl rounded-2xl px-4 py-3 w-56"
          style={{
            top: cellAction.y,
            left: cellAction.x,
          }}
        >
          <p className="text-xs font-semibold text-gray-900 mb-2">Escolha uma ação</p>
          <div className="divide-y divide-gray-200/80">
            <button
              className="w-full text-left text-sm text-gray-900 py-2 hover:text-gray-700 flex items-center gap-2"
              onClick={() => {
                openNewAppointmentModal(cellAction.profId, cellAction.time)
                setCellAction(null)
              }}
            >
              <CalendarRange className="h-4 w-4 text-gray-700" />
              Agendar Procedimento
            </button>
            <button
              className="w-full text-left text-sm text-gray-900 py-2 hover:text-gray-700 flex items-center gap-2"
              onClick={() => {
                openNewBlock(cellAction.profId, cellAction.time)
                setCellAction(null)
              }}
            >
              <Lock className="h-4 w-4 text-gray-700" />
              Bloquear Horário
            </button>
            <button
              className="w-full text-left text-sm text-gray-900 py-2 hover:text-gray-700 flex items-center gap-2"
              onClick={() => {
                openTimeOff(cellAction.profId)
                setCellAction(null)
              }}
            >
              <Sun className="h-4 w-4 text-gray-700" />
              Adicionar Folga
            </button>
          </div>
        </div>
      )}

      <AppointmentModal
        open={!!modalData}
        onClose={() => setModalData(null)}
        professionals={professionals}
        initialData={modalData}
        onSave={() => {}}
        onDelete={() => {
          if (modalData?.event?.id) removeAppointment(modalData.event.id)
        }}
      />

      <BlockModal
        open={!!blockModalData}
        onClose={() => setBlockModalData(null)}
        professionals={professionals}
        initialData={blockModalData}
        onSave={() => {}}
        onDelete={() => {
          if (blockModalData?.block?.id) removeBlock(blockModalData.block.id)
        }}
      />

      <TimeOffModal
        open={!!timeOffModalData}
        onClose={() => setTimeOffModalData(null)}
        professionals={professionals}
        initialData={timeOffModalData}
        onSave={(t) => {
          addTimeOff({ ...t, clinicId: 1, type: 'time_off', id: '' } as any)
        }}
      />
    </div>
  )
}

// Export auxiliar para reuso do modal na aba de Agendamentos
export { AppointmentModal }

function timeToMinutes(t: string) {
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
}

function minutesToTime(total: number) {
  const h = Math.floor(total / 60)
  const m = total % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

function isDateInRange(current: Date, start: string, end: string) {
  const c = current.setHours(0, 0, 0, 0)
  const s = new Date(start).setHours(0, 0, 0, 0)
  const e = new Date(end).setHours(0, 0, 0, 0)
  return c >= s && c <= e
}

type AppointmentForm = {
  clientQuery: string
  clientId: string
  patient: string
  procedure: string
  durationMinutes: number
  status?: 'confirmado' | 'pendente' | 'cancelado'
  professionalId: string
  serviceId: string
  date: string
  startTime: string
  endTime: string
  totalValue: number
  notes: string
  requestedPro: boolean
  isRecurring?: boolean
  recurringFrequency?: 'weekly' | 'biweekly' | 'monthly'
  recurringCount?: number
  newClient?: {
    firstName: string
    lastName: string
    phone: string
    email: string
  }
}

function calculateEndTime(start: string, durationMinutes: number) {
  const startMin = timeToMinutes(start)
  return minutesToTime(startMin + durationMinutes)
}

// Função auxiliar para mapear status do backend (inglês) para frontend (português)
function mapStatusToPortuguese(status?: string): 'agendado' | 'confirmado' | 'atendimento' | 'concluído' | 'cancelado' | 'falta' {
  if (!status) return 'agendado'
  
  const statusMap: Record<string, 'agendado' | 'confirmado' | 'atendimento' | 'concluído' | 'cancelado' | 'falta'> = {
    'pending': 'agendado',
    'confirmed': 'confirmado',
    'in_progress': 'atendimento',
    'waiting': 'atendimento',
    'medical_done': 'concluído',
    'completed': 'concluído',
    'cancelled': 'cancelado',
    'agendado': 'agendado',
    'confirmado': 'confirmado',
    'atendimento': 'atendimento',
    'concluído': 'concluído',
    'concluido': 'concluído',
    'cancelado': 'cancelado',
    'falta': 'falta',
  }
  
  return statusMap[status.toLowerCase()] || 'agendado'
}

function AppointmentModal({
  open,
  onClose,
  professionals,
  initialData,
  onSave,
  onDelete,
}: {
  open: boolean
  onClose: () => void
  professionals: Professional[]
  initialData: { mode: 'create' | 'edit'; profId: string; time: string; date: Date; event?: Appointment } | null
  onSave: (data: AppointmentForm) => void
  onDelete?: () => void
}) {
  const { addAppointment, updateAppointment, canUser, services: ctxServices, checkAvailability } = useScheduler()
  const toast = useToast()
  
  // Converter serviços do contexto para o formato esperado pelo modal
  const services = ctxServices.map((s) => ({
    id: s.id,
    name: s.name,
    price: s.price,
    duration: s.duration, // duration já está em minutos
  }))
  
  // Serviço padrão (primeiro da lista ou vazio)
  const defaultService = services.length > 0 ? services[0] : { id: '', name: 'Nenhum serviço', price: 0, duration: 30 }
  const [isLoading, setIsLoading] = useState(false)
  const {
    register,
    watch,
    setValue,
    handleSubmit,
    reset,
  } = useForm<AppointmentForm>({
    defaultValues: {
      clientQuery: '',
      clientId: '',
      patient: '',
      procedure: '',
      durationMinutes: defaultService.duration,
      status: 'agendado',
      professionalId: initialData?.profId ?? professionals[0]?.id,
      serviceId: defaultService.id,
      date: initialData?.date ? formatDateForInput(initialData.date) : formatDateForInput(new Date()),
      startTime: initialData?.time ?? '09:00',
      endTime: calculateEndTime(initialData?.time ?? '09:00', defaultService.duration),
      totalValue: defaultService.price,
      notes: '',
      requestedPro: false,
      isRecurring: false,
      recurringFrequency: 'weekly',
      recurringCount: 4,
      newClient: { firstName: '', lastName: '', phone: '', email: '' },
    },
  } as any)

  // client selection handled by ClientSelector
  const serviceId = watch('serviceId')
  const startTime = watch('startTime')
  const modalRef = useRef<HTMLDivElement | null>(null)

  // Atualizar horário de fim quando serviço ou horário de início mudar
  useEffect(() => {
    if (!serviceId || !startTime) return
    
    const service = services.find((s) => s.id === serviceId)
    if (service) {
      const newEndTime = calculateEndTime(startTime, service.duration)
      const newTotalValue = service.price
      const newDuration = service.duration
      
      // Só atualizar se os valores realmente mudaram
      setValue('endTime', newEndTime, { shouldValidate: false })
      setValue('totalValue', newTotalValue, { shouldValidate: false })
      setValue('durationMinutes', newDuration, { shouldValidate: false })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serviceId, startTime])

  // Usar useRef para rastrear se já inicializamos os dados
  const initializedRef = useRef<string | null>(null)
  
  useEffect(() => {
    if (!initialData) {
      initializedRef.current = null
      return
    }
    
    // Criar uma chave única para este initialData
    const dataKey = `${initialData.mode}-${initialData.profId}-${initialData.time}-${initialData.event?.id || 'new'}`
    
    // Só inicializar se ainda não foi inicializado para este initialData
    if (initializedRef.current === dataKey) return
    
    initializedRef.current = dataKey
    
    setValue('professionalId', initialData.profId)
    setValue('date', formatDateForInput(initialData.date))
    setValue('startTime', initialData.time)
    
    // Usar serviceId do watch apenas uma vez, sem incluí-lo nas dependências
    const currentServiceId = watch('serviceId')
    const service = services.find((s) => s.id === currentServiceId)
    const duration = service?.duration ?? 30
    setValue('endTime', calculateEndTime(initialData.time, duration))
    
    if (initialData.event) {
      // Se estiver editando, usar a data e horário do evento
      const eventDate = initialData.event.start ? new Date(initialData.event.start) : initialData.date
      setValue('date', formatDateForInput(eventDate))
      
      // Extrair horário do evento se disponível
      if (initialData.event.start) {
        const eventStartDate = new Date(initialData.event.start)
        const hours = String(eventStartDate.getHours()).padStart(2, '0')
        const minutes = String(eventStartDate.getMinutes()).padStart(2, '0')
        setValue('startTime', `${hours}:${minutes}`)
      }
      
      setValue('patient', initialData.event.patient ?? '')
      setValue('procedure', initialData.event.procedure ?? '')
      setValue('durationMinutes', initialData.event.durationMinutes ?? 30)
      const mappedStatus = mapStatusToPortuguese(initialData.event.status)
      setValue('status', mappedStatus as any)
      setValue('clientQuery', initialData.event.patient ?? '')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialData?.mode, initialData?.profId, initialData?.time, initialData?.event?.id])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
        onClose()
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open, onClose])

  const onSubmit = async (data: AppointmentForm) => {
    setIsLoading(true)
    try {
      if (!initialData) return

      // Usar a data do formulário (que pode ter sido alterada)
      const selectedDate = new Date(data.date + 'T00:00:00')
      const [sh, sm] = data.startTime.split(':').map(Number)
      const endIso = new Date(selectedDate)
      endIso.setHours(sh, sm + (data.durationMinutes || 30), 0, 0)
      const startIso = new Date(selectedDate)
      startIso.setHours(sh, sm, 0, 0)
      
      // Usar checkAvailability do contexto (já disponível via useScheduler)

      // Validação: garantir que clientId está presente
      if (!data.clientId) {
        toast.error('Por favor, selecione um cliente')
        setIsLoading(false)
        return
      }

      // Se for edição, usar updateAppointment
      if (initialData.mode === 'edit' && initialData.event?.id) {
        // permission
        if (!canUser('update', 'appointment', data.professionalId)) {
          toast.error('Acesso negado')
          setIsLoading(false)
          return
        }

        // Mapear status do frontend para backend
        const statusMap: Record<string, string> = {
          'agendado': 'pending',
          'confirmado': 'confirmed',
          'atendimento': 'in_progress',
          'concluído': 'completed',
          'concluido': 'completed',
          'cancelado': 'cancelled',
          'falta': 'cancelled', // Falta também é cancelado no backend
        }
        const backendStatus = statusMap[data.status || 'agendado'] || 'pending'

        const res = await updateAppointment(initialData.event.id, {
          professionalId: data.professionalId,
          clientId: data.clientId,
          start: startIso.toISOString(),
          end: endIso.toISOString(),
          status: backendStatus as any,
          title: data.procedure || 'Procedimento',
          patient: data.patient || data.clientQuery || 'Paciente',
          procedure: data.procedure || data.clientQuery || 'Procedimento',
          durationMinutes: data.durationMinutes || 30,
          serviceId: data.serviceId || null,
          notes: data.notes || null,
        } as any)

        if (!res.ok) {
          toast.error(res.error)
          setIsLoading(false)
          return
        }
        toast.success('Agendamento atualizado com sucesso!')
        onSave(data)
        onClose()
        reset()
        return
      }

      // Se for criação, usar addAppointment
      // permission
      if (!canUser('create', 'appointment', data.professionalId)) {
        toast.error('Acesso negado')
        setIsLoading(false)
        return
      }

      // Mapear status do frontend para backend
      const statusMap: Record<string, string> = {
        'agendado': 'pending',
        'confirmado': 'confirmed',
        'atendimento': 'in_progress',
        'concluído': 'completed',
        'concluido': 'completed',
        'cancelado': 'cancelled',
        'falta': 'cancelled',
      }
      const backendStatus = statusMap[data.status || 'agendado'] || 'pending'
      
      // Agendamento recorrente
      if (data.isRecurring && data.recurringCount && data.recurringCount > 1) {
        const appointmentsToCreate: Array<{ start: Date; end: Date }> = []
        let currentDate = new Date(startIso)
        const count = Math.min(data.recurringCount || 4, 12) // Limitar a 12 repetições
        
        for (let i = 0; i < count; i++) {
          const appointmentStart = new Date(currentDate)
          const appointmentEnd = new Date(appointmentStart)
          appointmentEnd.setMinutes(appointmentEnd.getMinutes() + (data.durationMinutes || 30))
          
          appointmentsToCreate.push({ start: appointmentStart, end: appointmentEnd })
          
          // Calcular próxima data baseado na frequência
          if (i < count - 1) {
            if (data.recurringFrequency === 'weekly') {
              currentDate.setDate(currentDate.getDate() + 7)
            } else if (data.recurringFrequency === 'biweekly') {
              currentDate.setDate(currentDate.getDate() + 14)
            } else if (data.recurringFrequency === 'monthly') {
              currentDate.setMonth(currentDate.getMonth() + 1)
            }
          }
        }
        
        // Criar todos os agendamentos
        let successCount = 0
        let errorCount = 0
        
        for (const apt of appointmentsToCreate) {
          // Verificar disponibilidade antes de criar
          const isAvailable = checkAvailability(
            apt.start.toISOString(),
            apt.end.toISOString(),
            data.professionalId
          )
          
          if (!isAvailable) {
            errorCount++
            continue
          }
          
          const res = await addAppointment({
            professionalId: data.professionalId,
            clientId: data.clientId,
            clinicId: 1,
            start: apt.start.toISOString(),
            end: apt.end.toISOString(),
            status: backendStatus as any,
            title: data.procedure || 'Procedimento',
            patient: data.patient || data.clientQuery || 'Paciente',
            procedure: data.procedure || data.clientQuery || 'Procedimento',
            durationMinutes: data.durationMinutes || 30,
            color: 'bg-purple-200',
            serviceId: data.serviceId || null,
            notes: data.notes || null,
          } as any)
          
          if (res.ok) {
            successCount++
          } else {
            errorCount++
          }
        }
        
        if (successCount > 0) {
          toast.success(`${successCount} agendamento(s) recorrente(s) criado(s) com sucesso!${errorCount > 0 ? ` (${errorCount} falharam)` : ''}`)
        } else {
          toast.error('Nenhum agendamento recorrente pôde ser criado')
        }
      } else {
        // Agendamento único
        const res = await addAppointment({
          professionalId: data.professionalId,
          clientId: data.clientId,
          clinicId: 1,
          start: startIso.toISOString(),
          end: endIso.toISOString(),
          status: backendStatus as any,
          title: data.procedure || 'Procedimento',
          patient: data.patient || data.clientQuery || 'Paciente',
          procedure: data.procedure || data.clientQuery || 'Procedimento',
          durationMinutes: data.durationMinutes || 30,
          color: 'bg-purple-200',
          serviceId: data.serviceId || null,
          notes: data.notes || null,
        } as any)

        if (!res.ok) {
          toast.error(res.error)
          setIsLoading(false)
          return
        }
        toast.success('Agendado com sucesso!')
      }
      
      onSave(data)
      onClose()
      reset()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao agendar')
    } finally {
      setIsLoading(false)
    }
  }

  if (!open || !initialData) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/20 backdrop-blur" onClick={onClose} aria-hidden />
      <div
        ref={modalRef}
        className="relative bg-white/90 backdrop-blur-xl border border-white/60 shadow-2xl rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto p-6 space-y-4"
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-lg font-semibold text-gray-900">Agendar procedimento</p>
            <p className="text-xs text-gray-600">
              {initialData.date.toLocaleDateString()} • {initialData.time}
            </p>
          </div>
          <button
            className="text-sm text-gray-500 hover:text-gray-700"
            onClick={() => {
              reset()
              onClose()
            }}
          >
            Fechar
          </button>
        </div>

        <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
          {/* Cliente */}
          <div className="bg-white/50 rounded-xl border border-white/60 shadow-sm p-4 space-y-3 relative">
            <ClientSelector
              value={watch('clientId')}
              onSelect={(id, name) => {
                setValue('clientId', id)
                setValue('patient', name)
                setValue('clientQuery', name)
              }}
            />
          </div>

          {/* Dados do agendamento */}
          <div className="bg-white/50 rounded-xl border border-white/60 shadow-sm p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-900">Data</label>
              <input
                type="date"
                {...register('date')}
                className="w-full rounded-lg bg-white/70 border border-white/60 px-3 py-2 text-sm text-gray-900 focus:ring-2 focus:ring-gray-900/20"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-900">Profissional</label>
              <select
                {...register('professionalId')}
                className="w-full rounded-lg bg-white/70 border border-white/60 px-3 py-2 text-sm text-gray-900 focus:ring-2 focus:ring-gray-900/20"
              >
                {professionals.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-900">Serviço</label>
              <select
                {...register('serviceId')}
                className="w-full rounded-lg bg-white/70 border border-white/60 px-3 py-2 text-sm text-gray-900 focus:ring-2 focus:ring-gray-900/20"
                disabled={services.length === 0}
              >
                {services.length === 0 ? (
                  <option value="">Nenhum serviço cadastrado</option>
                ) : (
                  services.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} — R$ {s.price} — {s.duration}min
                    </option>
                  ))
                )}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-900">Início</label>
              <input
                type="time"
                {...register('startTime')}
                className="w-full rounded-lg bg-white/70 border border-white/60 px-3 py-2 text-sm text-gray-900 focus:ring-2 focus:ring-gray-900/20"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-900">Fim (auto)</label>
              <input
                type="time"
                {...register('endTime')}
                readOnly
                className="w-full rounded-lg bg-white/70 border border-white/60 px-3 py-2 text-sm text-gray-900 focus:ring-2 focus:ring-gray-900/20"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-900">Procedimento</label>
              <input
                type="text"
                {...register('procedure')}
                className="w-full rounded-lg bg-white/70 border border-white/60 px-3 py-2 text-sm text-gray-900 focus:ring-2 focus:ring-gray-900/20"
                placeholder="Ex: Limpeza, Canal..."
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-900">Paciente</label>
              <input
                type="text"
                {...register('patient')}
                className="w-full rounded-lg bg-white/70 border border-white/60 px-3 py-2 text-sm text-gray-900 focus:ring-2 focus:ring-gray-900/20"
                placeholder="Nome do paciente"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-900">Status do Agendamento</label>
              <select
                {...register('status')}
                className="w-full rounded-lg bg-white/70 border border-white/60 px-3 py-2 text-sm text-gray-900 focus:ring-2 focus:ring-gray-900/20"
              >
                <option value="agendado">Agendado</option>
                <option value="confirmado">Confirmado</option>
                <option value="atendimento">Em Atendimento</option>
                <option value="concluído">Concluído</option>
                <option value="cancelado">Cancelado</option>
                <option value="falta">Falta</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-900">Valor total</label>
              <input
                type="number"
                {...register('totalValue', { valueAsNumber: true })}
                className="w-full rounded-lg bg-white/70 border border-white/60 px-3 py-2 text-sm text-gray-900 focus:ring-2 focus:ring-gray-900/20"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-900">Paciente solicitou este profissional?</label>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-1 text-sm text-gray-800">
                  <input type="checkbox" {...register('requestedPro')} className="h-4 w-4" /> Sim
                </label>
              </div>
            </div>
            <div className="md:col-span-2 space-y-2">
              <label className="text-sm font-semibold text-gray-900">Observações</label>
              <textarea
                {...register('notes')}
                rows={3}
                className="w-full rounded-lg bg-white/70 border border-white/60 px-3 py-2 text-sm text-gray-900 focus:ring-2 focus:ring-gray-900/20"
                placeholder="Informações adicionais"
              />
            </div>
            {initialData?.mode === 'create' && (
              <>
                <div className="md:col-span-2 space-y-2">
                  <label className="flex items-center gap-2 text-sm font-semibold text-gray-900">
                    <input
                      type="checkbox"
                      {...register('isRecurring')}
                      className="h-4 w-4"
                    />
                    Agendamento Recorrente
                  </label>
                </div>
                {watch('isRecurring') && (
                  <>
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-gray-900">Frequência</label>
                      <select
                        {...register('recurringFrequency')}
                        className="w-full rounded-lg bg-white/70 border border-white/60 px-3 py-2 text-sm text-gray-900 focus:ring-2 focus:ring-gray-900/20"
                      >
                        <option value="weekly">Semanal</option>
                        <option value="biweekly">Quinzenal</option>
                        <option value="monthly">Mensal</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-gray-900">Número de Repetições</label>
                      <input
                        type="number"
                        {...register('recurringCount', { valueAsNumber: true, min: 2, max: 12 })}
                        className="w-full rounded-lg bg-white/70 border border-white/60 px-3 py-2 text-sm text-gray-900 focus:ring-2 focus:ring-gray-900/20"
                        placeholder="Ex: 4 (para 4 semanas)"
                        min={2}
                        max={12}
                      />
                      <p className="text-xs text-gray-600">Máximo de 12 repetições</p>
                    </div>
                  </>
                )}
              </>
            )}
          </div>

          {/* Rodapé */}
          <div className="flex items-center justify-end gap-3">
            <button
              type="button"
              className="text-sm font-semibold text-gray-600 hover:text-gray-800"
              onClick={() => {
                reset()
                onClose()
              }}
            >
              Cancelar
            </button>
            {initialData.mode === 'edit' && onDelete && (
              <button
                type="button"
                className="h-11 px-4 rounded-xl bg-red-500 text-white text-sm font-semibold shadow-lg shadow-red-500/20 hover:opacity-90"
                onClick={() => {
                  onDelete()
                  onClose()
                }}
              >
                Excluir
              </button>
            )}
            <button
              type="submit"
              className="h-11 px-5 rounded-xl bg-gray-900 text-white text-sm font-semibold shadow-lg shadow-black/10 hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed"
              disabled={isLoading}
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 border-2 border-white/60 border-t-transparent rounded-full animate-spin" />
                  Salvando...
                </span>
              ) : (
                'Confirmar Agendamento'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

type BlockForm = {
  professionalId: string
  date: string
  start: string
  end: string
  reason: string
}

function BlockModal({
  open,
  onClose,
  professionals,
  initialData,
  onSave,
  onDelete,
}: {
  open: boolean
  onClose: () => void
  professionals: Professional[]
  initialData: { mode: 'create' | 'edit'; profId: string; time: string; date: Date; block?: { id: string; start: string; end: string; reason: string } } | null
  onSave: (data: { professionalId: string; date: Date; start: string; end: string; reason: string }) => void
  onDelete?: () => void
}) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<BlockForm>({
    defaultValues: {
      professionalId: initialData?.profId ?? professionals[0]?.id,
      date: initialData?.date.toISOString().split('T')[0] ?? new Date().toISOString().split('T')[0],
      start: initialData?.time ?? '12:00',
      end: '13:00',
      reason: '',
    },
  })

  useEffect(() => {
    if (initialData) {
      reset({
        professionalId: initialData.profId,
        date: initialData.date.toISOString().split('T')[0],
        start: initialData.time,
        end: '13:00',
        reason: '',
      })
    }
  }, [initialData, reset])

  const onSubmit = (data: BlockForm) => {
    if (timeToMinutes(data.end) <= timeToMinutes(data.start)) return
    onSave({
      professionalId: data.professionalId,
      date: new Date(data.date),
      start: data.start,
      end: data.end,
      reason: data.reason || 'Bloqueio',
    })
    reset()
    onClose()
  }

  if (!open || !initialData) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/30 backdrop-blur" onClick={onClose} aria-hidden />
      <div className="relative bg-white/90 backdrop-blur-xl border border-white/60 shadow-2xl rounded-2xl w-full max-w-xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-lg font-semibold text-gray-900">Bloquear horário</p>
          <button className="text-sm text-gray-500 hover:text-gray-700" onClick={onClose}>
            Fechar
          </button>
        </div>

        <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-900">Profissional</label>
              <select
                {...register('professionalId')}
                className="w-full rounded-lg bg-white/70 border border-white/60 px-3 py-2 text-sm text-gray-900 focus:ring-2 focus:ring-gray-900/20"
              >
                {professionals.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-900">Data</label>
              <input
                type="date"
                {...register('date')}
                className="w-full rounded-lg bg-white/70 border border-white/60 px-3 py-2 text-sm text-gray-900 focus:ring-2 focus:ring-gray-900/20"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-900">Início</label>
              <input
                type="time"
                {...register('start')}
                className="w-full rounded-lg bg-white/70 border border-white/60 px-3 py-2 text-sm text-gray-900 focus:ring-2 focus:ring-gray-900/20"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-900">Fim</label>
              <input
                type="time"
                {...register('end')}
                className="w-full rounded-lg bg-white/70 border border-white/60 px-3 py-2 text-sm text-gray-900 focus:ring-2 focus:ring-gray-900/20"
              />
              {errors.end && <p className="text-xs text-red-600">Fim deve ser maior que início</p>}
            </div>
            <div className="md:col-span-2 space-y-2">
              <label className="text-sm font-semibold text-gray-900">Motivo</label>
              <textarea
                {...register('reason')}
                rows={2}
                className="w-full rounded-lg bg-white/70 border border-white/60 px-3 py-2 text-sm text-gray-900 focus:ring-2 focus:ring-gray-900/20"
                placeholder="Almoço, reunião, manutenção..."
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3">
            <button
              type="button"
              className="text-sm font-semibold text-gray-600 hover:text-gray-800"
              onClick={() => {
                reset()
                onClose()
              }}
            >
              Cancelar
            </button>
        {initialData?.mode === 'edit' && onDelete && (
          <button
            type="button"
            className="h-11 px-4 rounded-xl bg-red-500 text-white text-sm font-semibold shadow-lg shadow-red-500/20 hover:opacity-90"
            onClick={() => {
              onDelete()
              onClose()
            }}
          >
            Excluir
          </button>
        )}
            <button
              type="submit"
              className="h-11 px-5 rounded-xl bg-red-500 text-white text-sm font-semibold shadow-lg shadow-red-500/20 hover:opacity-90"
            >
              Salvar Bloqueio
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

type TimeOffForm = {
  professionalId: string
  startDate: string
  endDate: string
  notes: string
}

function TimeOffModal({
  open,
  onClose,
  professionals,
  initialData,
  onSave,
}: {
  open: boolean
  onClose: () => void
  professionals: Professional[]
  initialData: { profId: string; date: Date } | null
  onSave: (data: { professionalId: string; startDate: string; endDate: string; notes?: string }) => void
}) {
  const {
    register,
    handleSubmit,
    reset,
  } = useForm<TimeOffForm>({
    defaultValues: {
      professionalId: initialData?.profId ?? professionals[0]?.id,
      startDate: initialData?.date.toISOString().split('T')[0] ?? new Date().toISOString().split('T')[0],
      endDate: initialData?.date.toISOString().split('T')[0] ?? new Date().toISOString().split('T')[0],
      notes: '',
    },
  })

  useEffect(() => {
    if (initialData) {
      reset({
        professionalId: initialData.profId,
        startDate: initialData.date.toISOString().split('T')[0],
        endDate: initialData.date.toISOString().split('T')[0],
        notes: '',
      })
    }
  }, [initialData, reset])

  const onSubmit = (data: TimeOffForm) => {
    onSave({
      professionalId: data.professionalId,
      startDate: data.startDate,
      endDate: data.endDate,
      notes: data.notes,
    })
    reset()
    onClose()
  }

  if (!open || !initialData) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/30 backdrop-blur" onClick={onClose} aria-hidden />
      <div className="relative bg-white/90 backdrop-blur-xl border border-white/60 shadow-2xl rounded-2xl w-full max-w-xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-lg font-semibold text-gray-900">Adicionar folga</p>
          <button className="text-sm text-gray-500 hover:text-gray-700" onClick={onClose}>
            Fechar
          </button>
        </div>

        <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-900">Profissional</label>
              <select
                {...register('professionalId')}
                className="w-full rounded-lg bg-white/70 border border-white/60 px-3 py-2 text-sm text-gray-900 focus:ring-2 focus:ring-gray-900/20"
              >
                {professionals.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-900">Data início</label>
              <input
                type="date"
                {...register('startDate')}
                className="w-full rounded-lg bg-white/70 border border-white/60 px-3 py-2 text-sm text-gray-900 focus:ring-2 focus:ring-gray-900/20"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-900">Data fim</label>
              <input
                type="date"
                {...register('endDate')}
                className="w-full rounded-lg bg-white/70 border border-white/60 px-3 py-2 text-sm text-gray-900 focus:ring-2 focus:ring-gray-900/20"
              />
            </div>
            <div className="md:col-span-2 space-y-2">
              <label className="text-sm font-semibold text-gray-900">Observação (opcional)</label>
              <textarea
                {...register('notes')}
                rows={2}
                className="w-full rounded-lg bg-white/70 border border-white/60 px-3 py-2 text-sm text-gray-900 focus:ring-2 focus:ring-gray-900/20"
                placeholder="Férias, curso, atestado..."
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3">
            <button
              type="button"
              className="text-sm font-semibold text-gray-600 hover:text-gray-800"
              onClick={() => {
                reset()
                onClose()
              }}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="h-11 px-5 rounded-xl bg-gray-900 text-white text-sm font-semibold shadow-lg shadow-black/10 hover:opacity-90"
            >
              Salvar Folga
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function EventCard({
  type,
  patient,
  procedure,
  status,
  color,
  start,
  duration,
  reason,
  end,
  style,
  onClick,
  onDrop,
  hasConflict,
}: {
  type: 'appointment' | 'block'
  patient?: string
  procedure?: string
  status?: 'agendado' | 'confirmado' | 'atendimento' | 'concluído' | 'cancelado' | 'falta' | 'pendente'
  color?: string
  start: string
  duration?: number
  end?: string
  reason?: string
  style?: React.CSSProperties
  onClick?: () => void
  onDrop?: (newProfId: string, newTime: string) => void
  hasConflict?: boolean
}) {
  if (type === 'block') {
    return (
      <div
        className="relative z-10 rounded-xl px-3 py-2 text-sm border border-white/60 shadow-inner overflow-hidden hover:scale-[1.02] transition"
        style={{
          ...style,
          backgroundImage:
            "repeating-linear-gradient(45deg, rgba(148,163,184,0.35), rgba(148,163,184,0.35) 8px, rgba(255,255,255,0.45) 8px, rgba(255,255,255,0.45) 16px)",
        }}
        onClick={onClick}
      >
        <div className="flex items-center gap-2 text-gray-700 italic">
          <Lock className="h-4 w-4" />
          <div>
            <p className="font-semibold text-gray-800">Bloqueado</p>
            <p className="text-[11px] text-gray-700">
              {start} {end ? `— ${end}` : ''} {reason ? `• ${reason}` : ''}
            </p>
          </div>
        </div>
      </div>
    )
  }

  // appointment
  // Determinar cor baseada no status se não houver cor customizada
  const getStatusColor = () => {
    if (color) return color
    switch (status) {
      case 'confirmado':
        return 'bg-emerald-100 border-emerald-300'
      case 'agendado':
      case 'pendente':
        return 'bg-blue-100 border-blue-300'
      case 'atendimento':
        return 'bg-purple-100 border-purple-300'
      case 'concluído':
        return 'bg-green-100 border-green-300'
      case 'cancelado':
      case 'falta':
        return 'bg-red-100 border-red-300 opacity-60'
      default:
        return 'bg-yellow-100 border-yellow-300'
    }
  }
  
  const colorClass = getStatusColor()
  const [isDragging, setIsDragging] = useState(false)
  
  return (
    <div
      className={`relative z-10 ${colorClass} border-2 ${hasConflict ? 'border-red-500 ring-2 ring-red-500 ring-opacity-50' : 'border-white/60'} shadow-lg rounded-xl px-3 py-2 text-sm hover:scale-[1.02] transition cursor-move ${
        isDragging ? 'opacity-50' : ''
      }`}
      style={style}
      onClick={onClick}
      title={hasConflict ? '⚠️ Conflito: Agendamento sobreposto detectado' : undefined}
      draggable={!!onDrop && type === 'appointment'}
      onDragStart={(e) => {
        if (!onDrop || type !== 'appointment') return
        setIsDragging(true)
        // Armazenar dados do agendamento para recuperar no drop
        const appointmentId = (e.currentTarget as HTMLElement).dataset.appointmentId
        const appointmentData = {
          id: appointmentId || '',
          professionalId: (e.currentTarget as HTMLElement).dataset.professionalId || '',
          start: (e.currentTarget as HTMLElement).dataset.start || start,
          duration: (e.currentTarget as HTMLElement).dataset.duration || String(duration || 30),
        }
        if (appointmentId) {
          e.dataTransfer.setData('application/json', JSON.stringify(appointmentData))
          e.dataTransfer.effectAllowed = 'move'
        }
      }}
      onDragEnd={() => {
        setIsDragging(false)
      }}
      data-appointment-id={type === 'appointment' ? (style as any)?.appointmentId || '' : undefined}
      data-professional-id={type === 'appointment' ? (style as any)?.professionalId || '' : undefined}
      data-start={type === 'appointment' ? start : undefined}
      data-duration={type === 'appointment' ? String(duration || 30) : undefined}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="space-y-1">
          <p className="font-semibold text-gray-900">{patient}</p>
          <p className="text-xs text-gray-800">{procedure}</p>
          <p className="text-[11px] text-gray-700">
            {start} {duration ? `• ${duration} min` : ''}
          </p>
        </div>
        {status === 'confirmado' && (
          <span className="h-4 w-4 rounded-full border-2 border-emerald-600 bg-emerald-100" aria-label="Confirmado" />
        )}
        {status === 'agendado' && (
          <span className="h-4 w-4 rounded-full border-2 border-blue-500 bg-blue-50" aria-label="Agendado" />
        )}
        {status === 'atendimento' && (
          <span className="h-4 w-4 rounded-full border-2 border-purple-500 bg-purple-50" aria-label="Em Atendimento" />
        )}
        {status === 'concluído' && (
          <span className="h-4 w-4 rounded-full border-2 border-green-600 bg-green-100" aria-label="Concluído" />
        )}
        {status === 'cancelado' && (
          <span className="h-4 w-4 rounded-full border-2 border-red-500 bg-red-50" aria-label="Cancelado" />
        )}
        {status === 'falta' && (
          <span className="h-4 w-4 rounded-full border-2 border-orange-500 bg-orange-50" aria-label="Falta" />
        )}
      </div>
      <div className="absolute inset-y-0 left-0 w-1 rounded-l-xl bg-gray-900/20" />
    </div>
  )
}

