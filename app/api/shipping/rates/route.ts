import { createHash } from "crypto";
import { z } from "zod";
import { createShipment, hasEasyPostKey } from "@/lib/easypost/client";
import { handleApiError, ok } from "@/lib/utils/api";
import { resolveStoreSlug } from "@/lib/store/slug";

const schema = z.object({
  to_address: z.object({
    name: z.string().min(1),
    street1: z.string().min(1),
    street2: z.string().optional(),
    city: z.string().min(1),
    state: z.string().min(1),
    zip: z.string().min(1),
    country: z.string().min(2),
    phone: z.string().optional(),
  }),
  parcel: z.object({
    weight_oz: z.number().positive(),
    length: z.number().positive(),
    width: z.number().positive(),
    height: z.number().positive(),
  }),
  store_slug: z.string().optional(),
  subtotal: z.number().nonnegative().optional(),
  free_shipping_threshold: z.number().positive().optional(),
  free_shipping_carrier_preference: z.enum(["cheapest", "usps", "ups", "fedex"]).optional(),
});

type ShippingRate = {
  id: string;
  carrier: string;
  service: string;
  carrier_display: string;
  rate: number;
  estimated_days: number;
  delivery_date?: string;
  rate_id: string;
  is_free?: boolean;
};

type CachedRates = {
  rates: ShippingRate[];
  cheapest: ShippingRate;
  fastest: ShippingRate;
  best_value: ShippingRate;
  shipment_id: string;
  expires_at: string;
};

const rateCache = new Map<string, CachedRates>();
const CACHE_TTL_MS = 30 * 60 * 1000;

function hashAddressAndParcel(input: z.infer<typeof schema>) {
  const payload = JSON.stringify({
    to_address: {
      street1: input.to_address.street1,
      city: input.to_address.city,
      state: input.to_address.state,
      zip: input.to_address.zip,
      country: input.to_address.country,
    },
    parcel: input.parcel,
    store_slug: input.store_slug,
  });
  return createHash("sha256").update(payload).digest("hex");
}

function applyFreeShipping(input: z.infer<typeof schema>, rates: ShippingRate[]) {
  const threshold = input.free_shipping_threshold;
  if (!threshold || !input.subtotal || input.subtotal < threshold || rates.length === 0) return rates;

  let freeRate = rates[0];
  const preference = input.free_shipping_carrier_preference;
  if (preference && preference !== "cheapest") {
    const preferred = rates.find((rate) => rate.carrier.toLowerCase() === preference);
    if (preferred) freeRate = preferred;
  }

  return rates.map((rate) =>
    rate.id === freeRate.id
      ? {
          ...rate,
          rate: 0,
          is_free: true,
        }
      : rate,
  );
}

function getBestValue(rates: ShippingRate[]) {
  return [...rates].sort((a, b) => a.rate * 0.6 + a.estimated_days * 0.4 - (b.rate * 0.6 + b.estimated_days * 0.4))[0];
}

function getStubRates() {
  return [
    { id: "stub-usps-ground", rate_id: "stub-usps-ground", carrier: "USPS", service: "Ground Advantage", carrier_display: "USPS Ground Advantage", rate: 6.95, estimated_days: 5 },
    { id: "stub-usps-priority", rate_id: "stub-usps-priority", carrier: "USPS", service: "Priority Mail", carrier_display: "USPS Priority Mail", rate: 8.95, estimated_days: 3 },
    { id: "stub-ups-ground", rate_id: "stub-ups-ground", carrier: "UPS", service: "Ground", carrier_display: "UPS Ground", rate: 9.45, estimated_days: 4 },
    { id: "stub-fedex-express", rate_id: "stub-fedex-express", carrier: "FedEx", service: "Express Saver", carrier_display: "FedEx Express Saver", rate: 12.95, estimated_days: 2 },
  ] as ShippingRate[];
}

export async function POST(request: Request) {
  try {
    const parsed = schema.parse(await request.json());
    const body = { ...parsed, store_slug: resolveStoreSlug(parsed.store_slug) };
    const cacheKey = hashAddressAndParcel(body);
    const cached = rateCache.get(cacheKey);
    const now = Date.now();
    if (cached && new Date(cached.expires_at).getTime() > now) {
      return ok({ ...cached, cached: true });
    }

    let rates: ShippingRate[];
    let shipmentId: string;

    if (hasEasyPostKey()) {
      const shipment = await createShipment({
        toAddress: body.to_address,
        parcel: {
          weight: body.parcel.weight_oz,
          length: body.parcel.length,
          width: body.parcel.width,
          height: body.parcel.height,
        },
      });

      shipmentId = shipment.id;
      rates = (shipment.rates || [])
        .map((rate) => ({
          id: rate.id,
          carrier: rate.carrier,
          service: rate.service,
          carrier_display: `${rate.carrier} ${rate.service}`,
          rate: Number(rate.rate),
          estimated_days: rate.delivery_days ?? 5,
          delivery_date: rate.delivery_date || undefined,
          rate_id: rate.id,
        }))
        .sort((a, b) => a.rate - b.rate);
    } else {
      shipmentId = `stub-shipment-${Date.now()}`;
      rates = getStubRates();
    }

    if (rates.length === 0) {
      return ok({ error: "No shipping rates available for this address." }, { status: 422 });
    }

    rates = applyFreeShipping(body, rates);
    const cheapest = rates[0];
    const fastest = [...rates].sort((a, b) => a.estimated_days - b.estimated_days)[0];
    const bestValue = getBestValue(rates);
    const expiresAt = new Date(now + CACHE_TTL_MS).toISOString();

    const result: CachedRates = {
      rates,
      cheapest,
      fastest,
      best_value: bestValue,
      shipment_id: shipmentId,
      expires_at: expiresAt,
    };
    rateCache.set(cacheKey, result);

    return ok({ ...result, cached: false });
  } catch (error) {
    return handleApiError(error);
  }
}
