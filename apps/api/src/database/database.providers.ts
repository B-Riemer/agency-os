import { createDb } from "@agency-os/db";
import { DRIZZLE } from "./drizzle.constants.js";

// Ein einziger Drizzle-Pool für die App; liest DATABASE_URL aus der Umgebung.
export const databaseProviders = [
  {
    provide: DRIZZLE,
    useFactory: () => createDb(),
  },
];
