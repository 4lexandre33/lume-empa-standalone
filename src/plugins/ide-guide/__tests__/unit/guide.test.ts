import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { createCore, Core } from '../../../../core/index.ts';
import { IDE_GUIDE_MANIFEST, createIdeGuidePlugin } from '../../index.ts';
import type { IdeGuideService } from '../../types.ts';
import { GUIDE_SLIDES } from '../../lib/guide.ts';
import { SYNTAX_REF } from '../../lib/syntax-ref.ts';

describe('IDE Guide Plugin', () => {
  let core: Core;
  let guideService: IdeGuideService;

  beforeEach(async () => {
    core = createCore();
    core.registerPlugin(IDE_GUIDE_MANIFEST, createIdeGuidePlugin);
    await core.activatePlugin('lume-ide-guide');
    guideService = core.getService<IdeGuideService>('IdeGuide');
  });

  it('declares valid manifest', () => {
    assert.equal(IDE_GUIDE_MANIFEST.name, 'lume-ide-guide');
    assert.equal(IDE_GUIDE_MANIFEST.version, '1.0.0');
    assert.ok(IDE_GUIDE_MANIFEST.capabilities?.provides?.some((c) => c.name === 'IdeGuide'));
  });

  it('maintains 100% parity on tutorial slides and syntax reference', () => {
    const slides = guideService.getGuideSlides();
    assert.equal(slides.length, GUIDE_SLIDES.length);
    assert.deepEqual(slides[0], GUIDE_SLIDES[0]);
    assert.equal(guideService.getTotalSlides(), GUIDE_SLIDES.length);
    assert.deepEqual(guideService.getSlide(1), GUIDE_SLIDES[1]);

    const syntaxRef = guideService.getSyntaxReference();
    assert.equal(syntaxRef.length, SYNTAX_REF.length);
    assert.deepEqual(syntaxRef, SYNTAX_REF);

    const section = guideService.getSection('bloco');
    assert.ok(section);
    assert.equal(section.title, 'Bloco de entidade');

    const searchRes = guideService.searchReference('taxonomia');
    assert.ok(searchRes.length > 0);
    assert.ok(searchRes.some((s) => s.id === 'taxonomia'));
  });
});
