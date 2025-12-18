import { useMemo } from "react";
import type { ProfessionalWithServices } from "../lib/types";
import type { ProfessionalQualification } from "../schemas/appointment.schema";

export function useProfessionalQualifications(
  professionals: ProfessionalWithServices[]
): ProfessionalQualification[] {
  return useMemo(() => {
    return professionals.map((prof) => ({
      professionalId: prof.id,
      serviceIds: prof.professional_services?.map((ps) => ps.service.id) || [],
    }));
  }, [professionals]);
}
