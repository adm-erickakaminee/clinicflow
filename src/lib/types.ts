// Tipos do banco de dados Supabase

export interface Organization {
  id: string;
  name: string;
  slug: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  cnpj: string | null;
  created_at: string;
  updated_at: string;
}

export interface Profile {
  id: string;
  clinic_id: string; // ✅ Mudado de organization_id para clinic_id (único identificador)
  full_name: string | null;
  role: "owner" | "professional" | "receptionist" | "admin" | "super_admin";
  phone: string | null;
  avatar_url: string | null;
  professional_id: string | null; // FK para professionals.id
  created_at: string;
  updated_at: string;
}

export interface Client {
  id: string;
  clinic_id: string; // ✅ Mudado de organization_id para clinic_id (único identificador)
  full_name: string;
  email: string | null;
  phone: string | null;
  cpf: string | null;
  birth_date: string | null;
  address: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Service {
  id: string;
  clinic_id: string; // ✅ Mudado de organization_id para clinic_id (único identificador)
  name: string;
  description: string | null;
  duration_minutes: number;
  price: number | null;
  tax_rate_percent?: number | null; // Taxa de imposto em porcentagem (0-100)
  color: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProfessionalService {
  id: string;
  professional_id: string;
  service_id: string;
  created_at: string;
}

export interface Appointment {
  id: string;
  clinic_id: string; // ✅ Mudado de organization_id para clinic_id (único identificador)
  professional_id: string | null;
  client_id: string; // ✅ Agora é NOT NULL (obrigatório)
  service_id: string | null;
  start_time: string;
  end_time: string;
  status:
    | "requested"
    | "pending"
    | "confirmed"
    | "waiting"
    | "in_progress"
    | "medical_done"
    | "completed"
    | "cancelled";
  notes: string | null;
  booking_fee_cents?: number | null; // Taxa de reserva em centavos
  checkInTime?: string | null; // ISO timestamp
  startTime?: string | null; // ISO timestamp (quando médico iniciou)
  endTime?: string | null; // ISO timestamp (quando médico finalizou)
  medicalNotes?: string | null; // Observações finais do médico
  created_at: string;
  updated_at: string;
}

// Tipos expandidos com relacionamentos
export interface AppointmentWithRelations extends Appointment {
  professional?: Profile | null;
  client?: Client | null;
  service?: Service | null;
}

export interface ProfessionalWithServices extends Profile {
  professional_services?: { service: Service }[];
}

// Tipos para o calendário
export interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  resourceId: string; // professional_id
  status: Appointment["status"];
  color: string;
  appointment: AppointmentWithRelations;
}

export interface CalendarResource {
  id: string;
  title: string;
  avatar?: string | null;
  services: string[]; // IDs dos serviços que pode realizar
}

// Tipo para validação de drag & drop
export interface DragDropPayload {
  appointmentId: string;
  newProfessionalId: string;
  newStartTime: Date;
  newEndTime: Date;
  serviceId: string | null;
}

// Novas tabelas criadas na blindagem do schema

export interface Product {
  id: string;
  clinic_id: string;
  name: string;
  description: string | null;
  price_cents: number;
  cost_cents: number | null;
  sku: string | null;
  barcode: string | null;
  category: string | null;
  stock_quantity: number;
  is_active: boolean;
  image_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface ClientWallet {
  id: string;
  clinic_id: string;
  client_id: string;
  balance_cents: number;
  total_earned_cents: number;
  total_spent_cents: number;
  created_at: string;
  updated_at: string;
}

export interface AppointmentEvolution {
  id: string;
  clinic_id: string;
  appointment_id: string;
  professional_id: string;
  evolution_text: string;
  evolution_type: "initial" | "progress" | "final" | "observation" | null;
  is_required: boolean;
  created_at: string;
  updated_at: string;
}
