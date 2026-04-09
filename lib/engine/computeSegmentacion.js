// /lib/engine/computeSegmentacion.js

import { computeEstabilidad } from "./computeEstabilidad.js";

function resolveTop2(options) {
  const valid = Array.isArray(options)
    ? options.filter(
        (o) =>
          o &&
          typeof o === "object" &&
          typeof o.label === "string" &&
          o.label.trim() !== "" &&
          Number.isInteger(o.n) &&
          o.n > 0
      )
    : [];

  if (valid.length === 0) {
    return {
      winner: null,
      second: null
    };
  }

  const ranked = valid
    .map((o) => ({
      label: o.label.trim(),
      n: o.n
    }))
    .sort((a, b) => {
      if (b.n !== a.n) return b.n - a.n;
      return a.label.localeCompare(b.label);
    });

  return {
    winner: ranked[0]?.label || null,
    second: ranked[1]?.label || null
  };
}

export function computeSegmentacion(prepared) {
  if (!prepared || typeof prepared !== "object") {
    throw new Error("invalid_prepared");
  }

  const segments = Array.isArray(prepared.segments) ? prepared.segments : [];

  if (segments.length === 0) {
    throw new Error("invalid_segmentation:no_segments");
  }

  const results = [];

  for (const seg of segments) {
    const segmentName = seg?.segment;
    const options = seg?.options;

    if (
      typeof segmentName !== "string" ||
      segmentName.trim() === "" ||
      !Array.isArray(options)
    ) {
      results.push({
        segment: typeof segmentName === "string" ? segmentName : null,
        winner: null,
        second: null,
        n: { winner: null, second: null },
        p_value: null,
        significant: false,
        diagnosis: "dependiente"
      });
      continue;
    }

    const top = resolveTop2(options);

    try {
      const res = computeEstabilidad({ options });

      results.push({
        segment: segmentName,
        winner: top.winner,
        second: top.second,
        n: res.n,
        p_value: res.p_value,
        significant: res.significant,
        diagnosis: res.diagnosis
      });
    } catch {
      results.push({
        segment: segmentName,
        winner: top.winner,
        second: top.second,
        n: { winner: null, second: null },
        p_value: null,
        significant: false,
        diagnosis: "sin_base"
      });
    }
  }

  results.sort((a, b) => {
    const na = (a?.n?.winner || 0) + (a?.n?.second || 0);
    const nb = (b?.n?.winner || 0) + (b?.n?.second || 0);
    return nb - na;
  });

  return {
    segments: results
  };
}
