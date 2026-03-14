import { createHmac, timingSafeEqual } from "crypto";

const EASYPOST_BASE_URL = "https://api.easypost.com/v2";

type Address = {
  name: string;
  street1: string;
  street2?: string;
  city: string;
  state: string;
  zip: string;
  country: string;
  phone?: string;
};

type Parcel = {
  weight: number;
  length?: number;
  width?: number;
  height?: number;
};

type EasyPostRate = {
  id: string;
  carrier: string;
  service: string;
  rate: string;
  delivery_days: number | null;
  delivery_date: string | null;
};

type EasyPostShipment = {
  id: string;
  rates: EasyPostRate[];
  postage_label?: { label_url?: string | null };
  tracking_code?: string | null;
  tracker?: { public_url?: string | null };
  selected_rate?: {
    id: string;
    carrier: string;
    service: string;
    delivery_date: string | null;
  } | null;
};

function getEasyPostKey() {
  const key = process.env.EASYPOST_API_KEY;
  return key && !key.includes("...") ? key : null;
}

function getAuthHeader(key: string) {
  return `Basic ${Buffer.from(`${key}:`).toString("base64")}`;
}

async function easypostFetch<T>(path: string, payload: Record<string, unknown>): Promise<T> {
  const key = getEasyPostKey();
  if (!key) throw new Error("Missing EASYPOST_API_KEY");

  const response = await fetch(`${EASYPOST_BASE_URL}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: getAuthHeader(key),
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`EasyPost request failed (${response.status}): ${body}`);
  }

  return (await response.json()) as T;
}

export function hasEasyPostKey() {
  return Boolean(getEasyPostKey());
}

export function getWarehouseAddress(): Address {
  return {
    name: process.env.WAREHOUSE_ADDRESS_NAME || "pureHerbHealth Fulfillment",
    street1: process.env.WAREHOUSE_ADDRESS_STREET1 || "123 Herb Way",
    street2: process.env.WAREHOUSE_ADDRESS_STREET2 || undefined,
    city: process.env.WAREHOUSE_ADDRESS_CITY || "Los Angeles",
    state: process.env.WAREHOUSE_ADDRESS_STATE || "CA",
    zip: process.env.WAREHOUSE_ADDRESS_ZIP || "90001",
    country: process.env.WAREHOUSE_ADDRESS_COUNTRY || "US",
    phone: process.env.WAREHOUSE_ADDRESS_PHONE || "310-555-0100",
  };
}

export async function createShipment(input: { toAddress: Address; parcel: Parcel }) {
  return easypostFetch<EasyPostShipment>("/shipments", {
    shipment: {
      from_address: getWarehouseAddress(),
      to_address: input.toAddress,
      parcel: input.parcel,
    },
  });
}

export async function createReturnShipment(input: {
  fromAddress: Address;
  parcel: Parcel;
  isReturn?: boolean;
}) {
  return easypostFetch<EasyPostShipment>("/shipments", {
    shipment: {
      from_address: input.fromAddress,
      to_address: getWarehouseAddress(),
      parcel: input.parcel,
      is_return: input.isReturn ?? true,
    },
  });
}

export async function buyShipment(shipmentId: string, rateId: string) {
  return easypostFetch<EasyPostShipment>(`/shipments/${shipmentId}/buy`, { rate: { id: rateId } });
}

export function verifyEasyPostSignature(rawBody: string, signatureHeader: string | null) {
  const secret = process.env.EASYPOST_WEBHOOK_SECRET;
  if (!secret || !signatureHeader) return false;
  const computed = createHmac("sha256", secret).update(rawBody, "utf8").digest("hex");
  const provided = signatureHeader.replace(/^hmac-sha256-hex=/, "");
  if (computed.length !== provided.length) return false;
  return timingSafeEqual(Buffer.from(computed), Buffer.from(provided));
}
