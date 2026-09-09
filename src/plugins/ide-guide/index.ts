/**
 * Lume IDE Guide & Onboarding Plugin
 * Extensible Microkernel Platform Architecture (EMPA) Plugin
 */

import type { IPlugin, IPluginManifest } from '../../core/contracts/plugin-manifest.ts';
import type { PluginContext } from '../../core/contracts/plugin-context.ts';
import { IDE_GUIDE_MANIFEST } from './manifest.ts';
import type { IdeGuideService, GuideSlide, RefSection } from './types.ts';
import { GUIDE_SLIDES } from './lib/guide.ts';
import { SYNTAX_REF } from './lib/syntax-ref.ts';

export * from './manifest.ts';
export * from './types.ts';

export class IdeGuidePlugin implements IPlugin {
  manifest: IPluginManifest = IDE_GUIDE_MANIFEST;
  context: PluginContext;

  private guideService: IdeGuideService;

  constructor(context: PluginContext) {
    this.context = context;

    this.guideService = {
      getGuideSlides: (): GuideSlide[] => {
        return [...GUIDE_SLIDES];
      },

      getSlide: (index: number): GuideSlide | null => {
        return GUIDE_SLIDES[index] ?? null;
      },

      getTotalSlides: (): number => {
        return GUIDE_SLIDES.length;
      },

      getSyntaxReference: (): RefSection[] => {
        return [...SYNTAX_REF];
      },

      getSection: (id: string): RefSection | null => {
        return SYNTAX_REF.find((s) => s.id === id) ?? null;
      },

      searchReference: (query: string): RefSection[] => {
        const q = query.toLowerCase().trim();
        if (!q) return [...SYNTAX_REF];
        return SYNTAX_REF.filter(
          (s) =>
            s.title.toLowerCase().includes(q) ||
            s.body.some((b) => b.toLowerCase().includes(q)) ||
            (s.sample && s.sample.toLowerCase().includes(q))
        );
      }
    };
  }

  async activate(): Promise<void> {
    this.context.logger.info('Activating Lume IDE Guide Plugin...');

    this.context.registerCapability({
      name: 'IdeGuide',
      version: '1.0.0',
      provider: this.manifest.name,
      api: this.guideService as any
    });

    this.context.logger.info('Lume IDE Guide Plugin activated successfully.');
  }

  async deactivate(): Promise<void> {
    this.context.logger.info('Lume IDE Guide Plugin deactivated.');
  }

  getGuideService(): IdeGuideService {
    return this.guideService;
  }
}

export function createIdeGuidePlugin(context: PluginContext): IPlugin {
  return new IdeGuidePlugin(context);
}
