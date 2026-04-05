// /api/blob-debug.js
import * as blob from "@vercel/blob";

export default async function handler(req, res) {
  return res.status(200).json({
    keys: Object.keys(blob).sort()
  });
}
