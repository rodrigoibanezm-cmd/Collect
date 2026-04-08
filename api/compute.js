// /api/compute.js

import { handleCompute } from "../lib/compute/handleCompute.js";

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({
        status: "method_not_allowed"
      });
    }

    if (!req.body || typeof req.body !== "object" || Array.isArray(req.body)) {
      return res.status(400).json({
        status: "invalid_input"
      });
    }

    const result = await handleCompute(req.body);

    return res.status(200).json(result);
  } catch (err) {
    return res.status(500).json({
      status: "internal_error",
      error: err?.message || "unknown_error"
    });
  }
}
