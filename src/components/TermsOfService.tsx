import { createPortal } from "react-dom";
import { X } from "lucide-react";

interface TermsOfServiceProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TermsOfService({ open, onOpenChange }: TermsOfServiceProps) {
  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-white/95">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Termo de Adesão e Condições de Uso</h2>
            <p className="text-sm text-gray-600 mt-1">
              CLINIC FLOW - Sistema de Gestão de Clínicas
            </p>
          </div>
          <button
            onClick={() => onOpenChange(false)}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-6 text-sm text-gray-700">
            <div>
              <h3 className="font-bold text-base mb-2">1. Objeto</h3>
              <p>
                Este Termo de Adesão tem por objeto a licença de uso temporário e não exclusiva do
                software de gestão de clínicas (doravante denominado "Sistema"), fornecido por{" "}
                <strong>Erick Henrique Akamine Leite</strong>, CNPJ:{" "}
                <strong>32.937.677/0001-47</strong>, para o(a) CLIENTE (Clínica/Profissional)
                aderente.
              </p>
            </div>

            <div>
              <h3 className="font-bold text-base mb-2">2. Prazo e Adesão</h3>
              <p className="mb-2">
                <strong>2.1.</strong> O presente Termo vigorará por prazo indeterminado, com início
                na data de aceite eletrônico e criação do cadastro no Sistema.
              </p>
              <p>
                <strong>2.2.</strong> A adesão ao Sistema é feita mediante o aceite eletrônico deste
                Termo e a confirmação do pagamento da primeira mensalidade ou a expiração do período
                de testes gratuitos (se aplicável).
              </p>
            </div>

            <div>
              <h3 className="font-bold text-base mb-2">3. Propriedade Intelectual</h3>
              <p className="mb-2">
                <strong>3.1.</strong> O CLIENTE reconhece que o Sistema, bem como todo o código,
                layout, marcas, logotipos e toda propriedade intelectual a ele relacionada, são de
                propriedade exclusiva de <strong>Erick Henrique Akamine Leite</strong>, CNPJ:{" "}
                <strong>32.937.677/0001-47</strong>.
              </p>
              <p>
                <strong>3.2.</strong> A licença de uso é concedida de forma pessoal e
                intransferível, não podendo o CLIENTE ceder, sublicenciar ou comercializar o acesso
                a terceiros.
              </p>
            </div>

            <div>
              <h3 className="font-bold text-base mb-2">4. Condições de Pagamento e Reajuste</h3>
              <p className="mb-2">
                <strong>4.1. Mensalidade:</strong> Pela licença de uso do Sistema, o CLIENTE pagará
                o valor mensal estipulado no ato da contratação, a ser cobrado automaticamente via
                cartão de crédito ou outra forma de pagamento cadastrada.
              </p>
              <p className="mb-2">
                <strong>4.2. Atraso:</strong> O não pagamento da mensalidade na data de vencimento
                poderá acarretar a suspensão imediata do acesso ao Sistema após 5 (cinco) dias de
                atraso e o cancelamento do Termo após 30 (trinta) dias.
              </p>
              <div className="mb-2">
                <p className="mb-2">
                  <strong>4.3. Reajuste e Alteração de Taxas (Cláusula Fundamental):</strong>
                </p>
                <p className="mb-2 ml-4">
                  <strong>4.3.1.</strong> A <strong>Erick Henrique Akamine Leite</strong>, CNPJ:{" "}
                  <strong>32.937.677/0001-47</strong>, reserva-se o direito de, a qualquer tempo e a
                  seu exclusivo critério, reajustar ou alterar os valores das mensalidades e/ou
                  taxas de serviço cobradas pelo uso do Sistema, incluindo, mas não se limitando, a
                  alterações de custos operacionais, impostos ou inflação.
                </p>
                <p className="mb-2 ml-4">
                  <strong>4.3.2.</strong> O reajuste ou a alteração de taxas será comunicado ao
                  CLIENTE com antecedência mínima de 30 (trinta) dias, através de notificação por
                  e-mail, pop-up no próprio Sistema ou outro meio eficaz de comunicação.
                </p>
                <p className="ml-4">
                  <strong>4.3.3.</strong> Caso o CLIENTE discorde do novo valor ou taxa, poderá
                  rescindir o presente Termo, sem ônus, desde que o faça antes que o novo valor
                  entre em vigor.
                </p>
              </div>
            </div>

            <div>
              <h3 className="font-bold text-base mb-2">5. Rescisão</h3>
              <p className="mb-2">
                <strong>5.1.</strong> O CLIENTE poderá rescindir o presente Termo a qualquer
                momento, mediante aviso prévio por escrito de 7 (sete) dias, sem a devolução de
                quaisquer valores já pagos.
              </p>
              <p>
                <strong>5.2.</strong> A <strong>Erick Henrique Akamine Leite</strong>, CNPJ:{" "}
                <strong>32.937.677/0001-47</strong>, poderá rescindir este Termo imediatamente em
                caso de violação das regras de uso do Sistema, inadimplemento das obrigações de
                pagamento ou prática de atividades ilícitas.
              </p>
            </div>

            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <h3 className="font-bold text-base mb-2">📥 Aceite do Termo</h3>
              <p>
                Ao clicar no botão "Aceito os Termos de Uso" ou ao prosseguir com o cadastro e
                pagamento da mensalidade, o CLIENTE manifesta sua plena e incondicional concordância
                com os termos e condições dispostos neste Termo de Adesão.
              </p>
            </div>
          </div>
        </div>
        <div className="p-6 border-t border-gray-200">
          <button
            onClick={() => onOpenChange(false)}
            className="w-full px-6 py-3 bg-gray-900 text-white rounded-xl font-semibold hover:bg-gray-800 transition"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
