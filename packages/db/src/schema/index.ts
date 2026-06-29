// Gesamtes Datenmodell von Agency OS — pro Säule eine Datei.
// Hinweis: relative Importe bewusst OHNE Dateiendung (drizzle-kit/tsx/vite lösen TS direkt auf).
export * from "./org"; // Säule 1: Firmenstruktur
export * from "./agents"; // Säule 2: Personalwirtschaft (Agenten-Akte)
export * from "./skills"; // Säule 4: Skills
export * from "./access"; // Säule 3: Toggles + RBAC
export * from "./governance"; // Säule 7: Kosten, Audit, Approvals
export * from "./secrets"; // Säule 7 / DSGVO: Secrets
export * from "./rag"; // Säule 4/5: Wissensordner (RAG) + Permission-Mirroring
export * from "./orchestration"; // Säule 6: Tasks + Routinen
