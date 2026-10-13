import {
    DeleteObjectCommand,
    GetObjectCommand,
    PutObjectCommand,
    S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const keyId = process.env.B2_KEY_ID;
const applicationKey = process.env.B2_APPLICATION_KEY;
const bucket = process.env.B2_BUCKET;
const endpoint = process.env.B2_ENDPOINT;

if (!keyId || !applicationKey || !bucket || !endpoint) {
    throw new Error("Konfigurasi B2 Storage belum lengkap di file .env");
}

//Wilayah dari region B2 Storage, misalnya "us-east-005"
const region =  new URL(endpoint).hostname.split('.')[1]; // Mengambil bagian kedua dari hostname sebagai region

const s3 = new S3Client({
    endpoint,
    region,
    credentials: {
        accessKeyId: keyId,
        secretAccessKey: applicationKey,
    },
    requestChecksumCalculation: "WHEN_REQUIRED",
    responseChecksumValidation: "WHEN_REQUIRED",
});

export async function uploadImage(
  key: string,
  body: Buffer,
  contentType: string,
) {
  await s3.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: body,
      ContentType: contentType,
    }),
  );
}

//Tautan sementara untuk mengakses gambar yang diunggah
export async function getSignedImageUrl(key: string, expiresIn = 300) {
  return getSignedUrl(s3, new GetObjectCommand({ Bucket: bucket, Key: key }), {
    expiresIn,
  });
}


export async function deleteImage(key: string) {
    await s3.send(
        new DeleteObjectCommand({
            Bucket: bucket,
            Key: key,
        }),
    );
}