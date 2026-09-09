/**
 * IDE Guide Capability Interfaces & Types
 */

export interface GuideSlide {
  kicker: string;
  title: string;
  body: string[];
  sample?: {
    label: string;
    code: string;
  };
}

export interface RefSection {
  id: string;
  title: string;
  body: string[];
  sample?: string;
}

export interface IdeGuideService {
  getGuideSlides(): GuideSlide[];
  getSlide(index: number): GuideSlide | null;
  getTotalSlides(): number;
  getSyntaxReference(): RefSection[];
  getSection(id: string): RefSection | null;
  searchReference(query: string): RefSection[];
}
