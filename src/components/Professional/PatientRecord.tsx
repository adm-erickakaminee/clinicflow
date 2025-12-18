import type { FC } from "react";

interface PatientRecordProps {
  alerts: string[];
  history: string[];
  photos?: { url: string; thumb?: string }[];
}

export const PatientRecord: FC<PatientRecordProps> = ({ alerts, history, photos = [] }) => {
  return (
    <div className="space-y-3">
      <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-3">
        <h3 className="text-sm font-semibold text-slate-200 mb-2">Alertas Gaby</h3>
        {alerts.length === 0 ? (
          <p className="text-xs text-slate-500">Sem alertas para este cliente.</p>
        ) : (
          <ul className="space-y-2">
            {alerts.map((alert, idx) => (
              <li
                key={idx}
                className="text-xs text-amber-300 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2"
              >
                {alert}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-3">
        <h3 className="text-sm font-semibold text-slate-200 mb-2">Histórico</h3>
        {history.length === 0 ? (
          <p className="text-xs text-slate-500">Sem histórico disponível.</p>
        ) : (
          <ul className="space-y-2">
            {history.map((entry, idx) => (
              <li
                key={idx}
                className="text-xs text-slate-300 bg-slate-800/60 border border-slate-800 rounded-lg px-3 py-2"
              >
                {entry}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-3">
        <h3 className="text-sm font-semibold text-slate-200 mb-2">Fotos</h3>
        {photos.length === 0 ? (
          <p className="text-xs text-slate-500">Nenhuma foto enviada.</p>
        ) : (
          <div className="grid grid-cols-3 gap-2">
            {photos.map((photo, idx) => (
              <img
                key={idx}
                src={photo.thumb || photo.url}
                alt={`Foto ${idx + 1}`}
                className="w-full h-20 object-cover rounded-lg border border-slate-800 bg-slate-800/80"
                loading="lazy"
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
};
