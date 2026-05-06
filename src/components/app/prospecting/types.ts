export type ProspectSearch = {
  id: string;
  user_id: string;
  sector: string;
  zone: string;
  zone_type: string;
  keywords: string;
  status: string;
  total_results: number | null;
  enriched_count: number | null;
  imported_count: number | null;
  apify_run_id: string | null;
  created_at: string;
  updated_at: string;
};

export type ProspectResult = {
  id: string;
  search_id: string;
  google_place_id: string;
  name: string;
  address: string | null;
  district: string | null;
  neighborhood: string | null;
  phone: string | null;
  website: string | null;
  google_rating: number | string | null;
  google_review_count: number | null;
  category: string | null;
  logo_url: string | null;
  email: string | null;
  instagram: string | null;
  contact_name: string | null;
  contact_title: string | null;
  tripadvisor_rating: number | string | null;
  enrichment_status: string;
  review_status: string;
  imported_at: string | null;
  imported_contact_id: string | null;
  imported_company_id: string | null;
  created_at: string;
  updated_at: string;
};

export type SearchResultsPayload = {
  search: ProspectSearch;
  results: ProspectResult[];
};
