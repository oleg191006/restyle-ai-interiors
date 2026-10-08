import "server-only";
import { GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { env } from "./env";

// S3 API: Cloudflare R2 in production, S3Mock locally (ADR 0005).
let client: S3Client | undefined;
function s3() {
  client ??= new S3Client({
    endpoint: env("S3_ENDPOINT"),
    region: process.env.S3_REGION ?? "auto",
    forcePathStyle: true,
    credentials: { accessKeyId: env("S3_ACCESS_KEY_ID"), secretAccessKey: env("S3_SECRET_ACCESS_KEY") },
    // AWS SDK ≥ 3.729 adds a CRC32 of the body to every request by default. For a presigned
    // URL that checksum is computed before the browser has the file (it signs an empty body),
    // so the real upload is rejected. R2 has the same incompatibility. Only add checksums
    // where the S3 API requires them.
    requestChecksumCalculation: "WHEN_REQUIRED",
    responseChecksumValidation: "WHEN_REQUIRED",
  });
  return client;
}
const bucket = () => env("S3_BUCKET");

/** A URL the browser can PUT exactly one object to, for 5 minutes, with this content type. */
export function presignUpload(key: string, contentType: string) {
  return getSignedUrl(s3(), new PutObjectCommand({ Bucket: bucket(), Key: key, ContentType: contentType }), {
    expiresIn: 300,
  });
}

/** A short-lived URL to show a private object (input or result) in the browser. */
export function presignDownload(key: string) {
  return getSignedUrl(s3(), new GetObjectCommand({ Bucket: bucket(), Key: key }), { expiresIn: 3600 });
}

export async function readObject(key: string) {
  const res = await s3().send(new GetObjectCommand({ Bucket: bucket(), Key: key }));
  if (!res.Body) throw new Error(`Empty object ${key}`);
  return Buffer.from(await res.Body.transformToByteArray());
}

export async function writeObject(key: string, body: Buffer, contentType: string) {
  await s3().send(new PutObjectCommand({ Bucket: bucket(), Key: key, Body: body, ContentType: contentType }));
}
