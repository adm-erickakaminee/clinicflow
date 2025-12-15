import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'

export type FilterType = 'professional' | 'clinic' | 'none'

type PanelContextType = {
  activeTab: string
  setActiveTab: (tab: string) => void
  selectedFilter: string // Pode ser professional, clinic, etc.
  setSelectedFilter: (id: string) => void
  filterType: FilterType // Define o tipo de filtro
}

const PanelContext = createContext<PanelContextType | null>(null)

export function usePanelContext() {
  const ctx = useContext(PanelContext)
  if (!ctx) throw new Error('usePanelContext must be used within PanelProvider')
  return ctx
}

type PanelProviderProps = {
  children: ReactNode
  filterType?: FilterType
  defaultTab?: string
  defaultFilter?: string
}

export function PanelProvider({ 
  children, 
  filterType = 'professional',
  defaultTab = 'Agendamentos',
  defaultFilter = 'all'
}: PanelProviderProps) {
  const [activeTab, setActiveTab] = useState(defaultTab)
  const [selectedFilter, setSelectedFilter] = useState(defaultFilter)

  const value = useMemo(
    () => ({ 
      activeTab, 
      setActiveTab, 
      selectedFilter, 
      setSelectedFilter,
      filterType
    }),
    [activeTab, selectedFilter, filterType]
  )

  return <PanelContext.Provider value={value}>{children}</PanelContext.Provider>
}

