export type Product = {
  id: string;
  slug: string;
  name: string;
  name_zh: string;
  short_description: string;
  short_description_zh: string;
  category_slug: string;
  price_cents: number;
  enabled: boolean;
  store_id: string;
};

export const sampleProducts: Product[] = [
  {
    id: "p-001",
    slug: "ginseng-root-extract",
    name: "Ginseng Root Extract",
    name_zh: "人参提取物",
    short_description: "Daily vitality support with standardized ginsenosides.",
    short_description_zh: "标准化人参皂苷配方，支持日常活力。",
    category_slug: "energy",
    price_cents: 3900,
    enabled: true,
    store_id: "default-store",
  },
  {
    id: "p-002",
    slug: "immune-balance-formula",
    name: "Immune Balance Formula",
    name_zh: "免疫平衡方",
    short_description: "A modern TCM blend for seasonal support.",
    short_description_zh: "现代中草本组合，帮助季节性调理。",
    category_slug: "immune",
    price_cents: 4500,
    enabled: true,
    store_id: "default-store",
  },
];

export const sampleCategories = [
  { id: "c-001", slug: "energy", name: "Energy", name_zh: "元气调理" },
  { id: "c-002", slug: "immune", name: "Immune", name_zh: "免疫调理" },
];
