import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { z } from "zod";
import { Mail, Lock, Phone, Eye, EyeOff } from "lucide-react";
import { supabase } from "../lib/supabase";
import { ToastContainer, useToast } from "../components/ui/Toast";
import { Card, CardContent } from "../components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Input } from "../components/ui/input";
import { Button } from "../components/ui/Button";
import { cn } from "../lib/utils";

type TabKey = "pro" | "client";

const emailSchema = z.string().email("Email inválido");
const passwordSchema = z.string().min(6, "Senha deve ter pelo menos 6 caracteres");
const phoneSchema = z
  .string()
  .min(10, "Telefone inválido")
  .regex(/^\(?\d{2}\)?\s?\d{4,5}-?\d{4}$/, "Telefone inválido");

function maskPhone(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  const part1 = digits.slice(0, 2);
  const part2 = digits.slice(2, 7);
  const part3 = digits.slice(7, 11);
  if (digits.length <= 2) return `(${part1}`;
  if (digits.length <= 7) return `(${part1}) ${part2}`;
  return `(${part1}) ${part2}-${part3}`;
}

export function Login() {
  const toast = useToast();
  const [tab, setTab] = useState<TabKey>("pro");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [phone, setPhone] = useState("");
  const [clientCodeSent, setClientCodeSent] = useState(false);
  const [clientCode, setClientCode] = useState("");
  const [loading, setLoading] = useState(false);

  const validatePro = () => {
    const e = emailSchema.safeParse(email);
    const p = passwordSchema.safeParse(password);
    if (!e.success) return (toast.error(e.error.issues[0].message), false);
    if (!p.success) return (toast.error(p.error.issues[0].message), false);
    return true;
  };

  const validateClient = () => {
    const ph = phoneSchema.safeParse(phone);
    if (!ph.success) return (toast.error(ph.error.issues[0].message), false);
    return true;
  };

  const handleLoginPro = async () => {
    if (!validatePro()) return;
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      toast.success("Login realizado");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao entrar");
    } finally {
      setLoading(false);
    }
  };

  // Mock para cliente: envia código fictício e valida com 123456, logando com usuário de teste
  const handleSendClientCode = () => {
    if (!validateClient()) return;
    toast.success("Código enviado! Use 123456 para testar.");
    setClientCodeSent(true);
  };

  const handleConfirmClientCode = async () => {
    if (clientCode !== "123456") {
      toast.error("Código inválido. Use 123456 para testes.");
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: "cliente@teste.com",
        password: "clienteteste",
      });
      if (error) throw error;
      toast.success("Login do cliente realizado (mock)");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao entrar como cliente");
    } finally {
      setLoading(false);
    }
  };

  const tabButton = (key: TabKey, label: string) => (
    <TabsTrigger
      value={key}
      className={cn(
        "px-4 py-2 text-sm font-semibold rounded-full transition-all",
        tab === key ? "bg-white text-purple-700 shadow-sm" : "text-gray-500 hover:text-gray-700"
      )}
    >
      {label}
    </TabsTrigger>
  );

  const inputWrap =
    "flex items-center gap-3 rounded-2xl bg-gray-50 px-4 border border-transparent focus-within:bg-white focus-within:ring-2 focus-within:ring-purple-100 transition";
  const inputBase =
    "w-full h-12 bg-transparent text-sm outline-none border-0 focus-visible:ring-0 text-gray-900 placeholder:text-slate-400";

  return (
    <div className="relative min-h-screen w-full bg-gradient-to-br from-[#e3e5e6] via-[#e7e9ea] to-[#f4e9b9]/65 text-gray-900 overflow-hidden flex items-center justify-center px-4 py-12">
      <div className="absolute -left-24 -top-20 h-72 w-72 rounded-full bg-[#e3e5e6] opacity-60 blur-3xl" />
      <div className="absolute right-[-8%] top-12 h-80 w-80 rounded-full bg-[#e6e8e9] opacity-70 blur-3xl" />
      <div className="absolute right-0 bottom-[-12%] h-96 w-96 rounded-full bg-[#f4e9b9] opacity-55 blur-3xl" />

      <Card className="relative w-full max-w-md border border-gray-100 bg-white rounded-[24px] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.08)]">
        <CardContent className="space-y-8 px-8 pt-10 pb-10">
          <div className="space-y-3 text-center">
            <h1 className="text-3xl font-bold tracking-tight text-gray-900">Crie sua conta</h1>
            <p className="text-sm text-gray-600">
              Acesse para gerenciar sua clínica com segurança.
            </p>
          </div>

          <Tabs value={tab} onValueChange={(v) => setTab(v as TabKey)} className="w-full space-y-6">
            <TabsList className="bg-gray-100 rounded-full p-1 h-12 flex items-center border border-gray-100">
              {tabButton("pro", "Sou Profissional")}
              {tabButton("client", "Sou Cliente")}
            </TabsList>

            <AnimatePresence mode="wait">
              {tab === "pro" ? (
                <TabsContent value="pro" forceMount>
                  <motion.div
                    key="pro"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.2 }}
                    className="space-y-6 pt-4"
                  >
                    <div className="space-y-1 text-center">
                      <p className="text-sm text-gray-600">Acesso da Equipe</p>
                      <h2 className="text-[28px] font-semibold text-gray-900 leading-tight">
                        Entre com email e senha
                      </h2>
                    </div>
                    <div className="space-y-4">
                      <div className="space-y-1">
                        <label className="text-sm font-medium text-gray-700">Email</label>
                        <div className={inputWrap}>
                          <Mail className="h-4 w-4 text-gray-400" />
                          <Input
                            type="email"
                            className={inputBase}
                            placeholder="voce@clinica.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                          />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-sm font-medium text-gray-700">Senha</label>
                        <div className={inputWrap}>
                          <Lock className="h-4 w-4 text-gray-400" />
                          <Input
                            type={showPass ? "text" : "password"}
                            className={inputBase}
                            placeholder="••••••••"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                          />
                          <button
                            type="button"
                            className="text-xs text-purple-600 font-semibold"
                            onClick={() => setShowPass((p) => !p)}
                          >
                            {showPass ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </button>
                        </div>
                      </div>

                      <div className="flex justify-end">
                        <button
                          type="button"
                          className="text-sm font-semibold text-purple-600 hover:text-purple-700"
                        >
                          Esqueci minha senha
                        </button>
                      </div>

                      <Button
                        className={cn(
                          "w-full h-12 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-medium shadow-lg shadow-purple-600/20 hover:opacity-90 hover:scale-[1.02] transition-transform",
                          loading && "opacity-70 cursor-not-allowed"
                        )}
                        onClick={handleLoginPro}
                        disabled={loading}
                      >
                        {loading ? (
                          <span className="flex items-center gap-2 justify-center">
                            <span className="h-4 w-4 border-2 border-white/60 border-t-transparent rounded-full animate-spin" />
                            Entrando...
                          </span>
                        ) : (
                          "Acessar Painel"
                        )}
                      </Button>
                    </div>
                  </motion.div>
                </TabsContent>
              ) : (
                <TabsContent value="client" forceMount>
                  <motion.div
                    key="client"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.2 }}
                    className="space-y-6 pt-4"
                  >
                    <div className="space-y-1 text-center">
                      <p className="text-sm text-gray-500">Acesso do Cliente</p>
                      <h2 className="text-[28px] font-semibold text-gray-900 leading-tight">
                        Receba um código via WhatsApp (mock)
                      </h2>
                    </div>
                    <div className="space-y-4">
                      <div className="space-y-1">
                        <label className="text-sm font-medium text-gray-700">Telefone</label>
                        <div className={inputWrap}>
                          <Phone className="h-4 w-4 text-gray-400" />
                          <Input
                            type="tel"
                            className={inputBase}
                            placeholder="(11) 98888-7777"
                            value={phone}
                            onChange={(e) => setPhone(maskPhone(e.target.value))}
                          />
                        </div>
                      </div>

                      {!clientCodeSent ? (
                        <Button
                          className={cn(
                            "w-full h-12 rounded-2xl bg-gradient-to-r from-emerald-600 to-green-600 text-white font-semibold shadow-lg shadow-emerald-200 hover:shadow-xl transition",
                            loading && "opacity-70 cursor-not-allowed"
                          )}
                          onClick={handleSendClientCode}
                          disabled={loading}
                        >
                          {loading ? (
                            <span className="flex items-center gap-2 justify-center">
                              <span className="h-4 w-4 border-2 border-white/60 border-t-transparent rounded-full animate-spin" />
                              Enviando...
                            </span>
                          ) : (
                            "Receber Código no WhatsApp"
                          )}
                        </Button>
                      ) : (
                        <div className="space-y-3">
                          <div className="space-y-1">
                            <label className="text-sm font-medium text-gray-700">
                              Digite o código
                            </label>
                            <div className={inputWrap}>
                              <Input
                                type="text"
                                className={inputBase}
                                placeholder="123456"
                                value={clientCode}
                                onChange={(e) => setClientCode(e.target.value)}
                              />
                            </div>
                          </div>
                          <Button
                            className={cn(
                              "w-full h-12 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-semibold shadow-lg shadow-purple-200 hover:shadow-xl transition",
                              loading && "opacity-70 cursor-not-allowed"
                            )}
                            onClick={handleConfirmClientCode}
                            disabled={loading}
                          >
                            {loading ? (
                              <span className="flex items-center gap-2 justify-center">
                                <span className="h-4 w-4 border-2 border-white/60 border-t-transparent rounded-full animate-spin" />
                                Validando...
                              </span>
                            ) : (
                              "Confirmar Código"
                            )}
                          </Button>
                        </div>
                      )}
                      <p className="text-xs text-gray-500">
                        Para clientes finais. Código fictício para testes: 123456.
                      </p>
                    </div>
                  </motion.div>
                </TabsContent>
              )}
            </AnimatePresence>
          </Tabs>
        </CardContent>
      </Card>

      <ToastContainer toasts={toast.toasts} onClose={toast.removeToast} />
    </div>
  );
}
