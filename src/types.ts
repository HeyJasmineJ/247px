export type Slide = {
  type: "image" | "video" | "vimeo";
  src: string;
  poster?: string | null;
  width: number | null;
  height: number | null;
  aspect: number;
  alt: string;
};

export type Gallery = {
  id: string;
  label: string;
  slides: Slide[];
};

export type SiteLink = {
  label: string;
  href: string;
};

export type SiteData = {
  site: {
    title: string;
    description: string;
    name: string;
    tagline: string;
    hint: string;
    email: string;
    links: SiteLink[];
  };
  galleries: Gallery[];
};
