export type PlaceResult = {
  googlePlaceId: string;
  name: string;
  address: string | null;
  phone: string | null;
  website: string | null;
  rating: number | null;
  reviewCount: number;
  category: string | null;
  latitude: number | null;
  longitude: number | null;
};

type GooglePlace = {
  id?: string;
  displayName?: { text?: string };
  formattedAddress?: string;
  nationalPhoneNumber?: string;
  websiteUri?: string;
  rating?: number;
  userRatingCount?: number;
  types?: string[];
  location?: { latitude?: number; longitude?: number };
};

type SearchTextResponse = {
  places?: GooglePlace[];
  nextPageToken?: string;
};

const GOOGLE_PLACES_URL = "https://places.googleapis.com/v1/places:searchText";

function getGooglePlacesApiKey() {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) throw new Error("Missing GOOGLE_PLACES_API_KEY");
  return apiKey;
}

function toPlaceResult(place: GooglePlace): PlaceResult | null {
  if (!place.id || !place.displayName?.text) return null;

  return {
    googlePlaceId: place.id,
    name: place.displayName.text,
    address: place.formattedAddress ?? null,
    phone: place.nationalPhoneNumber ?? null,
    website: place.websiteUri ?? null,
    rating: typeof place.rating === "number" ? place.rating : null,
    reviewCount: place.userRatingCount ?? 0,
    category: place.types?.[0] ?? null,
    latitude: place.location?.latitude ?? null,
    longitude: place.location?.longitude ?? null,
  };
}

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function searchPlaces(query: string, maxResults = 60): Promise<PlaceResult[]> {
  const apiKey = getGooglePlacesApiKey();
  const places: PlaceResult[] = [];
  let pageToken: string | undefined;

  for (let page = 0; page < 3 && places.length < maxResults; page += 1) {
    if (pageToken) await wait(200);

    const response = await fetch(GOOGLE_PLACES_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask":
          "places.id,places.displayName,places.formattedAddress,places.nationalPhoneNumber,places.websiteUri,places.rating,places.userRatingCount,places.types,places.location,nextPageToken",
      },
      body: JSON.stringify({
        textQuery: query,
        maxResultCount: Math.min(20, maxResults - places.length),
        languageCode: "es",
        pageToken,
        locationBias: {
          circle: {
            center: { latitude: 40.4168, longitude: -3.7038 },
            radius: 50000,
          },
        },
      }),
    });

    if (!response.ok) {
      const message = await response.text();
      throw new Error(`Google Places error: ${response.status} ${message}`);
    }

    const data = (await response.json()) as SearchTextResponse;
    for (const place of data.places ?? []) {
      const result = toPlaceResult(place);
      if (result && !places.some((item) => item.googlePlaceId === result.googlePlaceId)) {
        places.push(result);
      }
    }

    pageToken = data.nextPageToken;
    if (!pageToken) break;
  }

  return places.slice(0, maxResults);
}
