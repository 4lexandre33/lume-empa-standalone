/**
 * TypedEvent base class
 * Todos os eventos herdam daqui.
 * Type-safe: cada evento tem um type único e data schema.
 */

export abstract class TypedEvent<T = any> {
  /**
   * Event type string (namespaced).
   * Exemplo: 'lume:entity-interact', 'lume:project-saved'
   */
  abstract readonly type: string;

  /**
   * Schema version (para evolução sem quebra de compatibilidade)
   */
  abstract readonly version: number;

  /**
   * Event payload (validado contra JSON schema)
   */
  readonly data: T;

  /**
   * Timestamp de emissão (auto-preenchido)
   */
  readonly timestamp: number = Date.now();

  /**
   * Plugin que emitiu (preenchido pelo EventBus)
   */
  sourcePlugin?: string;

  constructor(data: T) {
    this.data = data;
  }
}

export type TypedEventConstructor<E extends TypedEvent<any> = TypedEvent<any>> = new (...args: any[]) => E;

/**
 * JSON Schema para validação de eventos
 */
export interface JsonSchema {
  $id?: string;
  type?: string;
  properties?: Record<string, any>;
  required?: string[];
  items?: JsonSchema;
  oneOf?: JsonSchema[];
  nullable?: boolean;
  enum?: any[];
  [key: string]: any;
}

/**
 * Mapa de event types para schemas
 * Preenchido durante boot do Core
 */
export const EVENT_SCHEMAS: Map<string, JsonSchema> = new Map();

export function registerEventSchema(eventType: string, schema: JsonSchema): void {
  EVENT_SCHEMAS.set(eventType, schema);
}

/**
 * Tipos base para Narrative Engine (exemplo)
 */

export interface Entity {
  id: string;
  tags: string[];
  stats: Record<string, number>;
  extra?: Record<string, string>;
}

export interface WorldModel {
  entities: Map<string, Entity>;
}

export interface Rule {
  id: string;
  trigger: string;
  conditions: string;
  changes: Record<string, any>;
  narrative: string;
}

export interface GameState {
  projectId: string;
  worldModel: WorldModel;
  history: GameBeat[];
  turn: number;
}

export interface GameBeat {
  turn: number;
  triggeredBy: string;
  narrative: string;
  changes: Record<string, any>;
  timestamp: number;
}

export interface Project {
  id: string;
  name: string;
  entitiesSource: string;
  rulesSource: string;
  taxonomySource: string;
  extras: Record<string, Record<string, string>>;
  settings: Record<string, any>;
}

export interface Issue {
  line: number;
  column: number;
  severity: 'error' | 'warning';
  message: string;
}

export interface CompileProjectResult {
  ok: boolean;
  worldModel?: WorldModel;
  rules?: Rule[];
  issues: Issue[];
  durationMs: number;
}

export class ProjectCompiledEvent extends TypedEvent<{
  projectId: string;
  result: CompileProjectResult;
  durationMs: number;
}> {
  readonly type = 'lume:project-compiled';
  readonly version = 1;
  constructor(data: ProjectCompiledEvent['data']) {
    super(data);
  }
}

export class GameCreatedEvent extends TypedEvent<{
  projectId: string;
  gameState: GameState;
}> {
  readonly type = 'lume:game-created';
  readonly version = 1;
  constructor(data: GameCreatedEvent['data']) {
    super(data);
  }
}

export class GameBeatGeneratedEvent extends TypedEvent<{
  projectId: string;
  turn: number;
  beat: GameBeat;
  gameState: GameState;
}> {
  readonly type = 'lume:game-beat';
  readonly version = 1;
  constructor(data: GameBeatGeneratedEvent['data']) {
    super(data);
  }
}

export class EntityInteractEvent extends TypedEvent<{
  projectId: string;
  entityId: string;
  triggeredBy?: string;
}> {
  readonly type = 'lume:entity-interact';
  readonly version = 1;
  constructor(data: EntityInteractEvent['data']) {
    super(data);
  }
}

export class ProjectSavedEvent extends TypedEvent<{
  projectId: string;
  version: number;
  timestamp: number;
}> {
  readonly type = 'lume:project-saved';
  readonly version = 1;
  constructor(data: ProjectSavedEvent['data']) {
    super(data);
  }
}

export class ProjectLoadedEvent extends TypedEvent<{
  projectId: string;
  project: Project;
}> {
  readonly type = 'lume:project-loaded';
  readonly version = 1;
  constructor(data: ProjectLoadedEvent['data']) {
    super(data);
  }
}

export class ProjectDeletedEvent extends TypedEvent<{
  projectId: string;
  timestamp: number;
}> {
  readonly type = 'lume:project-deleted';
  readonly version = 1;
  constructor(data: ProjectDeletedEvent['data']) {
    super(data);
  }
}

export class PlaytestSavedEvent extends TypedEvent<{
  projectId: string;
  timestamp: number;
}> {
  readonly type = 'lume:playtest-saved';
  readonly version = 1;
  constructor(data: PlaytestSavedEvent['data']) {
    super(data);
  }
}

export class PlaytestLoadedEvent extends TypedEvent<{
  projectId: string;
  snapshot: any;
}> {
  readonly type = 'lume:playtest-loaded';
  readonly version = 1;
  constructor(data: PlaytestLoadedEvent['data']) {
    super(data);
  }
}

export class UserEditedSourceEvent extends TypedEvent<{
  projectId: string;
  sourceType: 'entities' | 'rules' | 'taxonomy';
  newSource: string;
}> {
  readonly type = 'lume:user-edited-source';
  readonly version = 1;
  constructor(data: UserEditedSourceEvent['data']) {
    super(data);
  }
}

export class UserClickedPlayEvent extends TypedEvent<{
  projectId: string;
  compiled: CompileProjectResult;
}> {
  readonly type = 'lume:user-clicked-play';
  readonly version = 1;
  constructor(data: UserClickedPlayEvent['data']) {
    super(data);
  }
}

export class UserClickedRewindEvent extends TypedEvent<{
  projectId: string;
  turnIndex: number;
}> {
  readonly type = 'lume:user-clicked-rewind';
  readonly version = 1;
  constructor(data: UserClickedRewindEvent['data']) {
    super(data);
  }
}

export class GameErrorEvent extends TypedEvent<{
  projectId: string;
  error: string;
  context?: Record<string, any>;
}> {
  readonly type = 'lume:game-error';
  readonly version = 1;
  constructor(data: GameErrorEvent['data']) {
    super(data);
  }
}
