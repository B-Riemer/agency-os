import { Injectable } from "@nestjs/common";
import {
  httpAdapter,
  processAdapter,
  openAiAdapter,
  type AgentAdapter,
} from "@agency-os/adapter-contract";

// Registry der verfügbaren Adapter-Typen. Plugin-erweiterbar (register()).
// Bring-your-own-Agent: HTTP (/wake), Process/CLI (lokale Skripte), OpenAI-kompatibel.
@Injectable()
export class AdapterRegistry {
  private readonly map = new Map<string, AgentAdapter<any>>([
    [httpAdapter.type, httpAdapter],
    [processAdapter.type, processAdapter],
    [openAiAdapter.type, openAiAdapter],
  ]);

  get(type: string): AgentAdapter<any> | undefined {
    return this.map.get(type);
  }

  register(adapter: AgentAdapter<any>): void {
    this.map.set(adapter.type, adapter);
  }

  types(): string[] {
    return [...this.map.keys()];
  }
}
