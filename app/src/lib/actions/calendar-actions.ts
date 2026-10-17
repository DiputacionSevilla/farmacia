"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSession, hasRole } from "@/lib/auth";
import {
  discoverQuarterlySources,
  regenerateDutyCalendar,
  publishCandidate,
  restoreCalendarVersion,
  type QuarterCandidate,
} from "@/lib/admin-service";

async function requireContentAdmin() {
  const session = await getSession();
  if (!hasRole(session, ["content_admin", "tech_admin"])) {
    throw new Error("No autorizado.");
  }
  return session!;
}

export interface ActionResult {
  error: string | null;
  message: string | null;
}

export interface DiscoverResult {
  error: string | null;
  candidates: QuarterCandidate[];
}

/** Anexo §7 paso 1-3 — "Buscar y regenerar desde la fuente oficial". */
export async function discoverQuarterlySourcesAction(): Promise<DiscoverResult> {
  await requireContentAdmin();
  try {
    const candidates = await discoverQuarterlySources();
    return { error: null, candidates };
  } catch (e) {
    return {
      error: e instanceof Error ? e.message : "Error desconocido.",
      candidates: [],
    };
  }
}

export async function regenerateDutyCalendarAction(
  sourceUrl?: string
): Promise<ActionResult> {
  const session = await requireContentAdmin();
  try {
    const result = await regenerateDutyCalendar(session.sub, sourceUrl);
    revalidatePath("/admin/calendar");
    revalidatePath("/admin");
    if (result.status === "candidate_created" && result.candidateId) {
      redirect(`/admin/calendar/${result.candidateId}`);
    }
    return { error: null, message: result.message };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Error desconocido.", message: null };
  }
}

export async function publishCandidateAction(
  candidateId: string,
  comment: string
): Promise<ActionResult> {
  const session = await requireContentAdmin();
  try {
    await publishCandidate(candidateId, session.sub, comment || undefined);
    revalidatePath("/admin/calendar");
    revalidatePath("/");
    return { error: null, message: "Calendario publicado correctamente." };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Error desconocido.", message: null };
  }
}

export async function restoreVersionAction(versionId: string): Promise<ActionResult> {
  const session = await requireContentAdmin();
  try {
    await restoreCalendarVersion(versionId, session.sub);
    revalidatePath("/admin/calendar");
    revalidatePath("/");
    return { error: null, message: "Versión restaurada y publicada." };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Error desconocido.", message: null };
  }
}
