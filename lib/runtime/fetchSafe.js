// /lib/runtime/fetchSafe.js

const FETCH_TIMEOUT = 8000;
const MAX_RETRIES = 2;
const MAX_SCHEMA_BYTES = 200_000;

export async function fetchSafe(url, isSchema = false) {

  // 🔴 validar URL básica
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error("fetch_error:invalid_url");
  }

  if (parsed.protocol !== "https:") {
    throw new Error("fetch_error:invalid_protocol");
  }

  for (let i = 0; i <= MAX_RETRIES; i++) {

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT);

    try {
      const response = await fetch(url, { signal: controller.signal });

      // 🔴 errores cliente (no retry)
      if (response.status >= 400 && response.status < 500) {
        throw new Error(`fetch_error:client_${response.status}`);
      }

      // 🔴 errores servidor (retryable)
      if (!response.ok) {
        throw new Error(`fetch_error:server_${response.status}`);
      }

      const text = await response.text();

      // 🔴 control tamaño schema
      if (isSchema) {
        const size = new TextEncoder().encode(text).length;
        if (size > MAX_SCHEMA_BYTES) {
          throw new Error("fetch_error:schema_too_large");
        }
      }

      // 🔴 parse seguro
      let parsedJSON;
      try {
        parsedJSON = JSON.parse(text);
      } catch {
        throw new Error("fetch_error:invalid_json");
      }

      return parsedJSON;

    } catch (e) {

      const retryable =
        e.name === "AbortError" ||
        e.message.startsWith("fetch_error:server");

      if (!retryable || i === MAX_RETRIES) {
        throw e;
      }

      // retry silencioso

    } finally {
      clearTimeout(timeout);
    }
  }
}
