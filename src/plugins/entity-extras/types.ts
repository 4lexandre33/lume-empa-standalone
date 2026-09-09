/**
 * Entity Extras Capability Interfaces & Types
 */

import type { Project, WorldModel } from '../narrative-engine/types.ts';

export interface EntityExtrasService {
  getEntityExtras(project: Project, entityId: string): Record<string, string>;
  setEntityExtra(project: Project, entityId: string, key: string, value: string): Project;
  removeEntityExtra(project: Project, entityId: string, key: string): Project;
  getDisplayName(world: WorldModel, entityId: string): string;
  getDescription(world: WorldModel, entityId: string): string;
  attachExtras(world: WorldModel, extras: Record<string, Record<string, string>>): WorldModel;
}
