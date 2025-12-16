import { TermsOfService } from './TermsOfService'
import { useState } from 'react'

export function Footer() {
  const [termsOpen, setTermsOpen] = useState(false)

  return (
    <>
      <footer className="bg-gray-50 border-t border-gray-200 py-6 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="text-sm text-gray-600">
              <p className="font-semibold text-gray-900">CLINIC FLOW</p>
              <p>© {new Date().getFullYear()} Erick Henrique Akamine Leite</p>
              <p className="text-xs text-gray-500">CNPJ: 32.937.677/0001-47</p>
            </div>
            <div className="flex items-center gap-4 text-sm">
              <button
                onClick={() => setTermsOpen(true)}
                className="text-indigo-600 hover:text-indigo-700 font-medium underline"
              >
                Termo de Adesão e Condições de Uso
              </button>
            </div>
          </div>
        </div>
      </footer>
      <TermsOfService open={termsOpen} onOpenChange={setTermsOpen} />
    </>
  )
}

