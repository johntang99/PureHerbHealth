import { NextResponse } from "next/server";
import { ZodError } from "zod";

export function ok<T>(data: T, init?: ResponseInit) {
  return NextResponse.json(data, init);
}

export function badRequest(message: string, details?: unknown) {
  return NextResponse.json({ error: message, details }, { status: 400 });
}

export function unauthorized(message = "Unauthorized") {
  return NextResponse.json({ error: message }, { status: 401 });
}

export function internalError(error: unknown) {
  let message = "Unexpected server error";
  if (error instanceof Error) {
    message = error.message;
  } else if (typeof error === "object" && error !== null && "message" in error) {
    message = String((error as { message: unknown }).message);
  }
  console.error("[api] Internal error:", JSON.stringify(error));
  return NextResponse.json({ error: message }, { status: 500 });
}

export function handleApiError(error: unknown) {
  if (error instanceof ZodError) {
    return badRequest("Validation failed", error.flatten());
  }
  return internalError(error);
}
