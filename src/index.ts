/**
 * Lume — Extensible Microkernel Platform Architecture (EMPA)
 * Main entrypoint and public SDK
 */

export * from './core/index.ts';
export * from './bootstrap.ts';

// Plugin exports
export * as NarrativeEnginePlugin from './plugins/narrative-engine/index.ts';
export * as ProjectCloudPlugin from './plugins/project-cloud/index.ts';
export * as IdeStatePlugin from './plugins/ide-state/index.ts';
export * as IdeUiPlugin from './plugins/ide-ui/index.ts';
export * as IdeGuidePlugin from './plugins/ide-guide/index.ts';
export * as IdeSettingsPlugin from './plugins/ide-settings/index.ts';
export * as EntityExtrasPlugin from './plugins/entity-extras/index.ts';
export * as MultiplayerPlugin from './plugins/multiplayer/index.ts';
