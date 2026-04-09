export interface AddressSuggestion {
    id: string;
    label: string;
    type: string;
    score: number;
}

export interface BagData {
    bouwjaar: number | null;
    oppervlakte: number | null;
    gebruiksdoel: string[];
    status: string | null;
    pandId: string | null;
}

export interface EnergyData {
    label: string | null;
    energy_index: number | null;
    registration_date: string | null;
    valid_until: string | null;
    is_definitive: boolean;
}

export interface SoilInvestigation {
    type: string;
    status: string | null;
    description: string | null;
}

export interface SoilData {
    has_data: boolean;
    status: string;
    message?: string;
    features_count?: number;
    investigations: SoilInvestigation[];
}

export interface ClimateRiskDetail {
    available: boolean;
    risk_level: RiskLevel;
    value: number | null;
}

export type RiskLevel = 'laag' | 'gemiddeld' | 'hoog' | 'zeer_hoog' | 'onbekend';

export interface ClimateData {
    flood_risk: ClimateRiskDetail | null;
    heat_stress: ClimateRiskDetail | null;
    subsidence: ClimateRiskDetail | null;
    overall_risk: RiskLevel;
    viewer_url?: string;
    message?: string;
}

export interface NeighborhoodData {
    neighborhood_name: string | null;
    municipality: string | null;
    population: number | null;
    households: number | null;
    avg_household_size: number | null;
    population_density: number | null;
    pct_0_14: number | null;
    pct_15_24: number | null;
    pct_25_44: number | null;
    pct_45_64: number | null;
    pct_65_plus: number | null;
    avg_income: number | null;
    avg_property_value: number | null;
    distance_supermarket: number | null;
    distance_school: number | null;
    distance_gp: number | null;
    pct_koopwoningen: number | null;
    pct_huurwoningen: number | null;
    cars_per_household: number | null;
    message?: string;
}

export interface NearbyItem {
    name: string | null;
    distance_m: number;
    distance_km: number;
}

export interface NearbyCategory {
    nearest_name: string | null;
    nearest_distance_m: number | null;
    nearest_distance_km: number | null;
    count: number;
    items: NearbyItem[];
}

export interface NearbyData {
    supermarket: NearbyCategory;
    school: NearbyCategory;
    doctor: NearbyCategory;
    park: NearbyCategory;
    station: NearbyCategory;
    pharmacy: NearbyCategory;
    restaurant: NearbyCategory;
    childcare: NearbyCategory;
}

export interface AddressReport {
    address: string;
    postcode: string;
    city: string;
    coordinates: {
        lat: number | null;
        lng: number | null;
    };
    building: BagData | null;
    energy: EnergyData | null;
    soil: SoilData | null;
    climate: ClimateData | null;
    neighborhood: NeighborhoodData | null;
    nearby: NearbyData | null;
    fetched_at: string | null;
    age_days: number | null;
}