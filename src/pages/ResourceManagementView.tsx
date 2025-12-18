import { useState } from "react";
import { ProfessionalsManager } from "../components/Reception/ProfessionalsManager";
import { ServicesManager } from "../components/Reception/ServicesManager";

type TabKey = "professionals" | "services";

export function ResourceManagementView() {
  const [tab, setTab] = useState<TabKey>("professionals");

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="bg-white/60 backdrop-blur-xl border border-white/40 shadow-xl rounded-2xl px-3 py-2 flex items-center gap-2 flex-wrap">
        <button
          onClick={() => setTab("professionals")}
          className={`px-4 py-2 rounded-xl text-sm font-semibold transition border ${
            tab === "professionals"
              ? "bg-gray-900 text-white border-gray-900 shadow-lg shadow-black/10"
              : "bg-white/60 text-gray-800 border-white/60 hover:bg-white/80"
          }`}
        >
          Profissionais
        </button>
        <button
          onClick={() => setTab("services")}
          className={`px-4 py-2 rounded-xl text-sm font-semibold transition border ${
            tab === "services"
              ? "bg-gray-900 text-white border-gray-900 shadow-lg shadow-black/10"
              : "bg-white/60 text-gray-800 border-white/60 hover:bg-white/80"
          }`}
        >
          Serviços
        </button>
      </div>

      {/* Content */}
      {tab === "professionals" && <ProfessionalsManager />}
      {tab === "services" && <ServicesManager />}
    </div>
  );
}
