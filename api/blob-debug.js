// /api/blob-debug.js
import { list, getDownloadUrl } from "@vercel/blob";

export default async function handler(req, res) {
  try {
    const token = process.env.BLOB_READ_WRITE_TOKEN;

    const listed = await list({
      prefix: "Schema_operativo.json",
      token
    });

    const blobs = Array.isArray(listed?.blobs) ? listed.blobs : [];
    const match = blobs.find((b) => b?.pathname === "Schema_operativo.json") || null;

    let signedUrl = null;
    let signedUrlError = null;

    if (match?.url) {
      try {
        signedUrl = await getDownloadUrl(match.url, { token });
      } catch (e) {
        signedUrlError = e?.message || "getDownloadUrl_failed";
      }
    }

    return res.status(200).json({
      hasToken: Boolean(token),
      blobCount: blobs.length,
      firstBlob: blobs[0] || null,
      match,
      signedUrl,
      signedUrlError
    });
  } catch (e) {
    return res.status(500).json({
      error: e?.message || "unknown_error"
    });
  }
}
