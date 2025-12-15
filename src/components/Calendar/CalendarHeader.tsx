import { format, addDays, subDays } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { ChevronLeft, ChevronRight, Calendar, RefreshCw } from 'lucide-react'
import { Button } from '../ui/Button'

interface CalendarHeaderProps {
  selectedDate: Date
  onDateChange: (date: Date) => void
  onRefresh: () => void
  isLoading?: boolean
}

export function CalendarHeader({
  selectedDate,
  onDateChange,
  onRefresh,
  isLoading,
}: CalendarHeaderProps) {
  const goToPreviousDay = () => onDateChange(subDays(selectedDate, 1))
  const goToNextDay = () => onDateChange(addDays(selectedDate, 1))
  const goToToday = () => onDateChange(new Date())

  return (
    <div className="flex items-center justify-between px-6 py-4 bg-slate-800/50 border-b border-slate-700">
      {/* Navegação de data */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1">
          <button
            onClick={goToPreviousDay}
            className="p-2 rounded-lg hover:bg-slate-700 transition-colors text-slate-400 hover:text-white"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={goToNextDay}
            className="p-2 rounded-lg hover:bg-slate-700 transition-colors text-slate-400 hover:text-white"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        <div className="flex items-center gap-3">
          <Calendar className="w-5 h-5 text-blue-400" />
          <div>
            <h2 className="text-lg font-semibold text-white capitalize">
              {format(selectedDate, "EEEE, d 'de' MMMM", { locale: ptBR })}
            </h2>
            <p className="text-xs text-slate-500">
              {format(selectedDate, 'yyyy', { locale: ptBR })}
            </p>
          </div>
        </div>

        <Button variant="ghost" size="sm" onClick={goToToday}>
          Hoje
        </Button>
      </div>

      {/* Ações */}
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={onRefresh}
          isLoading={isLoading}
          className="gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          Atualizar
        </Button>

        {/* Indicador de realtime */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-xs text-emerald-400 font-medium">Realtime</span>
        </div>
      </div>
    </div>
  )
}

