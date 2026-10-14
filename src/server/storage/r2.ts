import "server-only";
import { createHash } from "node:crypto";
import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
  S3ServiceException,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { attachmentHeader, DOWNLOAD_URL_SECONDS, UPLOAD_URL_SECONDS, type StorageDriver } from "@/server/storage";

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not set (Cloudflare R2 storage).`);
  return value;
}

/** Cloudflare R2 through the S3 API. R2_ENDPOINT can point at another S3-compatible store. */
export function r2StorageDriver(): StorageDriver {
  const bucket = required("R2_BUCKET");
  const client = new S3Client({
    region: "auto",
    endpoint: process.env.R2_ENDPOINT ?? `https://${required("R2_ACCOUNT_ID")}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId: required("R2_ACCESS_KEY_ID"), secretAccessKey: required("R2_SECRET_ACCESS_KEY") },
  });

  return {
    name: "r2",

    async presignUpload(key) {
      const url = await getSignedUrl(client, new PutObjectCommand({ Bucket: bucket, Key: key }), {
        expiresIn: UPLOAD_URL_SECONDS,
      });
      return { url, headers: {} };
    },

    async size(key) {
      try {
        const head = await client.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
        return head.ContentLength ?? 0;
      } catch (error) {
        if (error instanceof S3ServiceException && error.$metadata.httpStatusCode === 404) return null;
        throw error;
      }
    },

    async readStart(key, bytes) {
      const object = await client.send(new GetObjectCommand({ Bucket: bucket, Key: key, Range: `bytes=0-${bytes - 1}` }));
      return (await object.Body?.transformToByteArray()) ?? new Uint8Array();
    },

    async sha256(key) {
      const object = await client.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
      const hash = createHash("sha256");
      for await (const chunk of object.Body as AsyncIterable<Uint8Array>) hash.update(chunk);
      return hash.digest("hex");
    },

    async presignDownload(key, fileName, contentType) {
      return getSignedUrl(
        client,
        new GetObjectCommand({
          Bucket: bucket,
          Key: key,
          ResponseContentDisposition: attachmentHeader(fileName),
          ResponseContentType: contentType,
        }),
        { expiresIn: DOWNLOAD_URL_SECONDS },
      );
    },

    async remove(key) {
      await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
    },
  };
}
