import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import * as legacyEngine from '../../lib/index.ts';
import { createCore, Core } from '../../../../core/index.ts';
import { NARRATIVE_ENGINE_MANIFEST, createNarrativeEnginePlugin } from '../../index.ts';
import type { LanguageToolsService } from '../../types.ts';

describe('Language Tools Parity (Legacy vs Plugin)', () => {
  let core: Core;
  let pluginLangTools: LanguageToolsService;

  beforeEach(async () => {
    core = createCore();
    core.registerPlugin(NARRATIVE_ENGINE_MANIFEST, createNarrativeEnginePlugin);
    await core.activatePlugin('lume-narrative-engine');
    pluginLangTools = core.getService<LanguageToolsService>('LanguageTools');
  });

  it('maintains 100% parity on syntax highlighting and autocomplete', () => {
    const entitySrc = 'MAGE.{\n  tags: agent;\n  stats: mp=100;\n}';
    const legacyTokens = legacyEngine.highlightSource(entitySrc, 'entities');
    const pluginTokens = pluginLangTools.highlightSource(entitySrc, 'entities');

    assert.deepEqual(pluginTokens, legacyTokens);

    const ruleSrc = 'ON: MAGE\nIF: MAGE.mp>=10\nDO: MAGE.mp-10';
    const legacyRuleTokens = legacyEngine.highlightSource(ruleSrc, 'rules');
    const pluginRuleTokens = pluginLangTools.highlightSource(ruleSrc, 'rules');

    assert.deepEqual(pluginRuleTokens, legacyRuleTokens);

    // Autocomplete parity
    const vocab = legacyEngine.collectVocabulary({});
    const completionsLegacy = legacyEngine.completeAt('MAGE.{\n  tags: ', 'entities', 16, vocab);
    const completionsPlugin = pluginLangTools.completeAt('MAGE.{\n  tags: ', 'entities', 16, vocab);

    assert.deepEqual(completionsPlugin, completionsLegacy);
  });
});
