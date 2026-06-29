import type { AppData } from "./types";
import { seedData } from "./seed";

const key = "freelance-scope-guard:v1";

export function loadData(): AppData {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return seedData;
    const parsed = JSON.parse(raw) as AppData;
    if (!parsed.projects?.length) return seedData;
    return parsed;
  } catch {
    return seedData;
  }
}

export function saveData(data: AppData) {
  localStorage.setItem(key, JSON.stringify(data));
}

export function resetData() {
  localStorage.removeItem(key);
}
