// /lib/runtime/fetchSafe.js

export async function fetchSafe(url, errorCode = "fetch_error") {
  if (typeof url !== "string" || url.trim() === "") {
    throw new Error(errorCode);
  }

  let response;
  try {
    response = await fetch(url);
  } catch {
    throw new Error(errorCode);
  }

  if (!response || !response.ok) {
    throw new Error(errorCode);
  }

  try {
    return await response.json();
  } catch {
    throw new Error(errorCode);
  }
}
