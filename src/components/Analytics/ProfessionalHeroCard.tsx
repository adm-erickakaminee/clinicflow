import { Trophy } from 'lucide-react'

type Professional = {
  id: string
  name: string
  specialty?: string
  avatar?: string
}

type Props = {
  professional: Professional
  appointmentCount: number
}

export function ProfessionalHeroCard({ professional, appointmentCount }: Props) {
  const avatarUrl = professional.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(professional.name)}&background=random&size=400`

  return (
    /* Container Principal - Relativo para segurar os absolutos */
    <div className="relative w-full h-96 rounded-3xl overflow-hidden shadow-xl bg-[#FFF9F5] group border border-white/20">
      {/* CAMADA 1: Imagem de Fundo */}
      <img
        src={avatarUrl}
        alt={professional.name}
        className="absolute inset-0 w-full h-full object-cover object-center z-0 transition-transform duration-700 group-hover:scale-105"
        onError={(e) => {
          const target = e.target as HTMLImageElement
          target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(professional.name)}&background=6366f1&color=fff&size=400`
        }}
      />

      {/* CAMADA 2: Efeito Liquid - Fade Escuro na Parte Inferior */}
      {/* Gradiente escuro para criar contraste com texto branco */}
      <div className="absolute inset-0 bg-gradient-to-t from-gray-900/80 via-gray-900/40 to-transparent z-10 pointer-events-none" />
      {/* Overlay adicional para efeito liquid mais forte */}
      <div className="absolute bottom-0 left-0 right-0 h-2/5 bg-gradient-to-t from-gray-900/90 via-gray-800/60 to-transparent backdrop-blur-xl z-10 pointer-events-none" />
      {/* Fade nas bordas laterais - mais suave */}
      <div className="absolute inset-0 bg-gradient-to-r from-black/10 via-transparent to-black/10 z-10 pointer-events-none" />
      {/* Fade na borda superior - mais suave */}
      <div className="absolute top-0 left-0 right-0 h-1/4 bg-gradient-to-b from-black/5 to-transparent z-10 pointer-events-none" />

      {/* CAMADA 3: Badge "Vendo Agora" - Topo */}
      <div className="absolute top-6 left-6 z-20">
        <span className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-xl text-white px-4 py-2 rounded-full text-sm font-bold shadow-lg border border-white/30">
          <Trophy className="w-4 h-4" />
          vendo agora
        </span>
      </div>

      {/* CAMADA 4: Conteúdo Sobreposto - Parte Inferior */}
      <div className="absolute bottom-0 left-0 right-0 p-8 z-20 flex items-end justify-between">
        {/* Nome e Cargo - Esquerda (Texto Branco) */}
        <div className="flex flex-col">
          <h2 className="text-3xl font-bold text-white tracking-tight mb-1 drop-shadow-lg">
            {professional.name}
          </h2>
          {professional.specialty && (
            <p className="text-lg text-white/90 font-medium drop-shadow-md">
              {professional.specialty}
            </p>
          )}
        </div>

        {/* Badge de Agendamentos - Direita (Estilo Similar à Imagem) */}
        <div className="bg-[#8B7355]/95 backdrop-blur-md px-6 py-3.5 rounded-2xl border border-[#8B7355]/60 text-white font-bold shadow-2xl">
          <span className="text-2xl">{appointmentCount}</span>
        </div>
      </div>
    </div>
  )
}

