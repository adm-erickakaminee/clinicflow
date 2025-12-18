import { z } from "zod";

// Schema base para appointment
export const appointmentSchema = z.object({
  id: z.string().uuid(),
  clinic_id: z.string().uuid(), // ✅ Mudado de organization_id para clinic_id
  professional_id: z.string().uuid().nullable(),
  client_id: z.string().uuid().nullable(),
  service_id: z.string().uuid().nullable(),
  start_time: z.string().datetime(),
  end_time: z.string().datetime(),
  status: z.enum([
    "requested",
    "pending",
    "confirmed",
    "waiting",
    "in_progress",
    "medical_done",
    "completed",
    "cancelled",
  ]),
  notes: z.string().nullable().optional(),
});

// Schema para criação de appointment
export const createAppointmentSchema = appointmentSchema.omit({ id: true }).extend({
  clinic_id: z.string().uuid(), // ✅ Mudado de organization_id para clinic_id
});

// Schema para atualização via Drag & Drop
export const updateAppointmentSchema = z.object({
  appointmentId: z.string().uuid("ID do agendamento inválido"),
  newProfessionalId: z.string().uuid("ID do profissional inválido"),
  newStartTime: z.date({
    message: "Horário de início inválido",
  }),
  newEndTime: z.date({
    message: "Horário de término inválido",
  }),
  serviceId: z.string().uuid().nullable(),
});

// Tipo para qualificação de profissional
export interface ProfessionalQualification {
  professionalId: string;
  serviceIds: string[];
}

// Função de validação com regra de negócio crítica
export function validateAppointmentMove(
  data: z.infer<typeof updateAppointmentSchema>,
  professionalQualifications: Record<string, string[]> | ProfessionalQualification[]
):
  | { success: true; data: z.infer<typeof updateAppointmentSchema> }
  | { success: false; error: string } {
  // 1. Validar schema básico
  const parseResult = updateAppointmentSchema.safeParse(data);

  if (!parseResult.success) {
    return {
      success: false,
      error: parseResult.error.issues[0]?.message || "Dados inválidos",
    };
  }

  // 2. Validar horários
  if (data.newEndTime <= data.newStartTime) {
    return {
      success: false,
      error: "O horário de término deve ser posterior ao horário de início",
    };
  }

  // 3. REGRA CRÍTICA: Verificar qualificação do profissional
  if (data.serviceId) {
    let serviceIds: string[] | undefined;

    if (Array.isArray(professionalQualifications)) {
      const professional = professionalQualifications.find(
        (p) => p.professionalId === data.newProfessionalId
      );
      serviceIds = professional?.serviceIds;
    } else {
      serviceIds = professionalQualifications[data.newProfessionalId];
    }

    if (!serviceIds) {
      return {
        success: false,
        error: "Profissional não encontrado",
      };
    }

    const isQualified = serviceIds.includes(data.serviceId);

    if (!isQualified) {
      return {
        success: false,
        error:
          "⚠️ Este profissional não está habilitado para realizar este serviço. Mova para outro profissional qualificado.",
      };
    }
  }

  return { success: true, data: parseResult.data };
}

export type CreateAppointmentInput = z.infer<typeof createAppointmentSchema>;
export type UpdateAppointmentInput = z.infer<typeof updateAppointmentSchema>;
