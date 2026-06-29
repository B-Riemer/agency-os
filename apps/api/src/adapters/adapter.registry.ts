import { Injectable } from "@nestjs/common";
import { httpAdapter, type AgentAdapter } from "@agency-os/adapter-contract";

// Registry der verfügbaren Adapter-Typen. Plugin-erweiterbar (register()).
// M1: HTTP-Adapter (Bring-your-own-Agent, z. B. Aigency-Engine /wake).
@Injectable()
export class AdapterRegistry {
  private readonly map = new Map<string, AgentAdapter<any>>([
    [httpAdapter.type, httpAdapter],
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
