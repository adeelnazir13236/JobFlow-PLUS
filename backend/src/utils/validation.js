import ApiError from "./ApiError.js";

export function parseId(value, label = "ID") {
  const id = Number(value);

  if (!Number.isInteger(id) || id <= 0) {
    throw new ApiError(400, `${label} must be a positive integer`);
  }

  return id;
}

export function validateEnum(value, allowedValues, label) {
  if (value !== undefined && !allowedValues.includes(value)) {
    throw new ApiError(400, `${label} must be one of: ${allowedValues.join(", ")}`);
  }
}

export function validateEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}
