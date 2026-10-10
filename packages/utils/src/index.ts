export { generateSecureCode } from "./secure-code";
export { boundedBody, boundedForm, rasterImageType, UploadError } from "./upload-security";

export function toSlug(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
}
