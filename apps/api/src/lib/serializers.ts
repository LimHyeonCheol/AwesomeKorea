export const toNumber = (value: unknown, fallback = 0) => {
  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : fallback;
};

export const toStringValue = (value: unknown, fallback = "") => {
  if (typeof value === "string") {
    return value;
  }

  return fallback;
};

export const toNullableString = (value: unknown) => {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();

  return trimmed.length > 0 ? trimmed : null;
};

export const toBoolean = (value: unknown) =>
  value === true || value === 1 || value === "1";

export const parseJsonArray = (value: unknown) => {
  if (typeof value !== "string" || value.trim().length === 0) {
    return [];
  }

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed)
      ? parsed.filter((entry): entry is string => typeof entry === "string")
      : [];
  } catch {
    return [];
  }
};
