import { useState } from "react";
import { createPortal } from "react-dom";
import { Star, X, CheckCircle2 } from "lucide-react";
import { supabase } from "../../lib/supabase";

interface PaymentConfirmationModalProps {
  open: boolean;
  onClose: () => void;
  appointmentId?: string;
  clientId?: string;
  totalPaid: number;
  cashbackEarned?: number;
  onRatingSubmitted?: () => void;
}

export function PaymentConfirmationModal({
  open,
  onClose,
  appointmentId,
  clientId,
  totalPaid,
  cashbackEarned = 0,
  onRatingSubmitted,
}: PaymentConfirmationModalProps) {
  const [rating, setRating] = useState<number>(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmitRating = async () => {
    if (rating === 0) return;

    setSubmitting(true);
    try {
      // Salvar avaliação no banco (se a tabela existir)
      if (appointmentId && clientId) {
        try {
          await supabase.from("appointment_ratings").insert({
            appointment_id: appointmentId,
            client_id: clientId,
            rating,
            comment: comment.trim() || null,
          });
        } catch (err) {
          // Se a tabela não existir, apenas logar (não é crítico)
          console.warn("Tabela appointment_ratings não disponível:", err);
        }
      }

      setSubmitted(true);
      setTimeout(() => {
        onRatingSubmitted?.();
        onClose();
        // Resetar estado
        setRating(0);
        setComment("");
        setSubmitted(false);
      }, 2000);
    } catch (err) {
      console.error("Erro ao processar avaliação:", err);
      // Mesmo com erro, fechar o modal
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  const handleSkip = () => {
    onClose();
    setRating(0);
    setComment("");
    setSubmitted(false);
  };

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <>
      <div
        className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50"
        onClick={submitted ? undefined : handleSkip}
        role="presentation"
      />
      <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
        <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-gray-200 overflow-hidden">
          {!submitted ? (
            <>
              {/* Header */}
              <div className="bg-gradient-to-r from-green-500 to-emerald-600 p-6 text-white">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <CheckCircle2 className="h-12 w-12 mb-2" />
                    <h2 className="text-2xl font-bold">Pagamento Confirmado!</h2>
                  </div>
                  <button
                    onClick={handleSkip}
                    className="text-white/80 hover:text-white transition"
                    aria-label="Fechar"
                  >
                    <X className="h-6 w-6" />
                  </button>
                </div>
                <div className="space-y-1">
                  <p className="text-lg font-semibold">
                    Total pago: R$ {(totalPaid / 100).toFixed(2)}
                  </p>
                  {cashbackEarned > 0 && (
                    <p className="text-sm text-white/90">
                      🎉 Você ganhou R$ {(cashbackEarned / 100).toFixed(2)} de cashback!
                    </p>
                  )}
                </div>
              </div>

              {/* Rating Section */}
              <div className="p-6 space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    Como foi seu atendimento?
                  </h3>
                  <p className="text-sm text-gray-500 mb-4">
                    Sua opinião é muito importante para nós!
                  </p>

                  {/* Stars */}
                  <div className="flex items-center gap-2 justify-center">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        onClick={() => setRating(star)}
                        className="transition-transform hover:scale-110 active:scale-95"
                        type="button"
                      >
                        <Star
                          className={`h-10 w-10 ${
                            star <= rating ? "fill-yellow-400 text-yellow-400" : "text-gray-300"
                          } transition-colors`}
                        />
                      </button>
                    ))}
                  </div>
                  {rating > 0 && (
                    <p className="text-center text-sm text-gray-600 mt-2">
                      {rating === 5
                        ? "Excelente! ⭐"
                        : rating === 4
                          ? "Muito bom! 👍"
                          : rating === 3
                            ? "Bom! 😊"
                            : rating === 2
                              ? "Regular 😕"
                              : "Ruim 😞"}
                    </p>
                  )}
                </div>

                {/* Comment */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Comentário (opcional)
                  </label>
                  <textarea
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="Conte-nos sobre sua experiência..."
                    className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm text-gray-900 focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none resize-none"
                    rows={4}
                  />
                </div>

                {/* Actions */}
                <div className="flex gap-3">
                  <button
                    onClick={handleSkip}
                    className="flex-1 px-4 py-3 rounded-xl border border-gray-300 text-gray-700 font-semibold hover:bg-gray-50 transition"
                    disabled={submitting}
                  >
                    Pular
                  </button>
                  <button
                    onClick={handleSubmitRating}
                    disabled={rating === 0 || submitting}
                    className="flex-1 px-4 py-3 rounded-xl bg-green-600 text-white font-semibold hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {submitting ? "Enviando..." : "Enviar Avaliação"}
                  </button>
                </div>
              </div>
            </>
          ) : (
            /* Success State */
            <div className="p-8 text-center">
              <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-gray-900 mb-2">Obrigado pela sua avaliação!</h3>
              <p className="text-gray-600">Sua opinião nos ajuda a melhorar sempre.</p>
            </div>
          )}
        </div>
      </div>
    </>,
    document.body
  );
}
