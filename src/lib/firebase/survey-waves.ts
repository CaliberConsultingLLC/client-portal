import { loadDwsEEDataMap } from "@/lib/employee-experience/dws-dashboard";

const EE_SOURCE_CLIENT_IDS = new Set(["csg", "dws", "dws-field"]);

export interface SurveyWaveSource {
  sourceClientId: string;
  waves: string[];
}

export async function listSurveyWavesForSourceClient(sourceClientId: string): Promise<string[]> {
  const safeId = sourceClientId.trim();
  if (!safeId || !EE_SOURCE_CLIENT_IDS.has(safeId)) {
    return [];
  }

  try {
    const dataMap = await loadDwsEEDataMap(safeId);
    return dataMap.meta.campaigns;
  } catch (error) {
    console.error(`Failed to load survey waves for ${safeId}`, error);
    return [];
  }
}

export async function listSurveyWavesForSourceClients(
  sourceClientIds: string[]
): Promise<SurveyWaveSource[]> {
  const uniqueIds = [...new Set(sourceClientIds.map((id) => id.trim()).filter(Boolean))];

  return Promise.all(
    uniqueIds.map(async (sourceClientId) => ({
      sourceClientId,
      waves: await listSurveyWavesForSourceClient(sourceClientId),
    }))
  );
}

export function flattenSurveyWaves(sources: SurveyWaveSource[]): string[] {
  const merged = new Map<string, true>();

  for (const source of sources) {
    for (const wave of source.waves) {
      merged.set(wave, true);
    }
  }

  return Array.from(merged.keys());
}
