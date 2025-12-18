import { z } from "zod";

export const evolutionSchema = z.object({
  evolution: z.string().trim().min(1, "Evolução é obrigatória para finalizar"),
});

export type EvolutionInput = z.infer<typeof evolutionSchema>;
