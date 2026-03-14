export type ProductCardDto = {
  id: string;
  slug: string;
  name: string;
  short_description: string;
  price: number;
  sale_price: number | null;
  primary_image: { url: string; alt: string };
  category: { slug: string; name: string };
  rating_avg: number;
  rating_count: number;
  stock_status: "in_stock" | "low_stock" | "out_of_stock";
  badges: string[];
  tcm_elements: string[];
  store_price?: number;
  practitioner_recommended?: boolean;
  practitioner_note?: string;
};

export type ProductListResponseDto = {
  products: ProductCardDto[];
  pagination: {
    page: number;
    per_page: number;
    total: number;
    total_pages: number;
  };
  filters: {
    categories: { slug: string; name: string; count: number }[];
    price_range: { min: number; max: number };
    tcm_natures: { value: string; count: number }[];
    tcm_elements: { value: string; count: number }[];
  };
};
