// /api/query.js

import { loadInputs, compute } from "../lib/engine";

export default async function handler(req, res) {
  try {
    const DATA_URL = "PEGA_URL_DATA_JSON";
    const SCHEMA_URL = "PEGA_URL_SCHEMA_JSON";

    const { data, schema } = await loadInputs(DATA_URL, SCHEMA_URL);
    const result = compute(data, schema);

    // 🔴 validar config obligatoria
    const queryCfg = schema?.query;

    if (
      !queryCfg ||
      typeof queryCfg.min_n !== "number" ||
      typeof queryCfg.tie_threshold !== "number" ||
      typeof queryCfg.clear_threshold !== "number"
    ) {
      return res.status(400).json({
        error: "Configuración de query inválida"
      });
    }

    const { min_n: MIN_N, tie_threshold, clear_threshold } = queryCfg;

    // 🔴 validar reglas
    if (!Number.isInteger(MIN_N) || MIN_N <= 0) {
      return res.status(400).json({
        error: "min_n inválido"
      });
    }

    if (!(tie_threshold >= 0 && clear_threshold > tie_threshold)) {
      return res.status(400).json({
        error: "Thresholds inválidos"
      });
    }

    // 🔴 filtrar opciones válidas
    const entries = Object.entries(result).filter(
      ([_, v]) =>
        v.score_compuesto !== null &&
        typeof v.n_valido === "number" &&
        v.n_valido >= MIN_N
    );

    if (entries.length < 2) {
      return res.status(200).json({
        status: "ok",
        decision: null,
        message: "No hay información disponible."
      });
    }

    // 🔴 sort estable
    entries.sort((a, b) => {
      if (b[1].score_compuesto !== a[1].score_compuesto) {
        return b[1].score_compuesto - a[1].score_compuesto;
      }
      if (b[1].n_valido !== a[1].n_valido) {
        return b[1].n_valido - a[1].n_valido;
      }
      return a[0].localeCompare(b[0]);
    });

    const [wKey, w] = entries[0];
    const [sKey, s] = entries[1];

    const diffScore = w.score_compuesto - s.score_compuesto;
    const absDiff = Math.abs(diffScore);

    // 🔴 driver explícito
    const diffClaridad = w.claridad - s.claridad;
    const diffAtractivo = w.atractivo - s.atractivo;

    let driver = null;

    if (!(diffClaridad === 0 && diffAtractivo === 0)) {
      if (Math.abs(diffAtractivo) === Math.abs(diffClaridad)) {
        driver = null;
      } else {
        driver =
          Math.abs(diffAtractivo) > Math.abs(diffClaridad)
            ? "atractivo"
            : "claridad";
      }
    }

    // 🔴 reglas de decisión
    let tipo_resultado = "diferencia_clara";
    let confianza = "alta";

    if (absDiff < tie_threshold) {
      tipo_resultado = "empate";
      confianza = "baja";
    } else if (absDiff < clear_threshold) {
      tipo_resultado = "diferencia_no_concluyente";
      confianza = "media";
    }

    return res.status(200).json({
      status: "ok",
      decision: {
        ganador: tipo_resultado === "empate" ? null : wKey,
        tipo_resultado,
        confianza,
        driver,
        diferencia_score: Number(diffScore.toFixed(4)),
        diferencia_claridad: Number(diffClaridad.toFixed(4)),
        diferencia_atractivo: Number(diffAtractivo.toFixed(4)),
        opciones_comparadas: [wKey, sKey],
        n_primera: w.n_valido,
        n_segunda: s.n_valido
      }
    });

  } catch (err) {
    return res.status(500).json({
      error: err.message,
    });
  }
}
