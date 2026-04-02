// /api/compute.js

export default async function handler(req, res) {
  try {
    const DATA_URL = "https://e7wkccr8ur62hidd.private.blob.vercel-storage.com/data.json";
    const SCHEMA_URL = "https://e7wkccr8ur62hidd.private.blob.vercel-storage.com/schema_final.json";

    const [dataRes, schemaRes] = await Promise.all([
      fetch(DATA_URL),
      fetch(SCHEMA_URL),
    ]);

    if (!dataRes.ok || !schemaRes.ok) {
      throw new Error("Error fetching data");
    }

    const data = await dataRes.json();
    const schema = await schemaRes.json();

    // 🔴 VALIDACIÓN SCHEMA
    if (!schema?.methodology?.variables || !schema?.study?.options) {
      throw new Error("Schema inválido");
    }

    const variables = schema.methodology.variables;
    const options = schema.study.options;

    const claridad_cfg = variables.claridad;
    const atractivo_cfg = variables.atractivo;

    const claridad_codes = claridad_cfg.codigos_fuente;
    const atractivo_codes = atractivo_cfg.codigos_fuente;

    const claridad_missing = claridad_cfg.codigos_missing;
    const atractivo_missing = atractivo_cfg.codigos_missing;

    const claridad_map = claridad_cfg.transformacion.mapping;
    const atractivo_map = atractivo_cfg.transformacion.mapping;

    // 🔧 NORMALIZACIÓN
    function normalize(val) {
      if (val === null || val === "" || val === ".") return null;
      const num = Number(val);
      if (Number.isNaN(num)) return "invalid";
      return num;
    }

    function getActiveCode(row, varNames, expectedCodes, missingCodes) {
      const active = [];
      const missingSet = new Set(missingCodes.map(Number));

      for (let i = 0; i < varNames.length; i++) {
        const varName = varNames[i];
        const code = expectedCodes[i];

        if (!(varName in row)) {
          throw new Error(`Variable inexistente: ${varName}`);
        }

        const raw = row[varName];
        const val = normalize(raw);

        if (val === null) continue;
        if (val === "invalid") return "invalid";

        if (missingSet.has(val)) continue;

        if (val === 1) {
          active.push(code);
        } else if (val === 0) {
          continue;
        } else {
          return "invalid";
        }
      }

      if (active.length === 0) return null;
      if (active.length > 1) return "invalid";

      return active[0];
    }

    function transform(code, mapping) {
      if (code === null) return null;

      const mapped = mapping[String(code)];

      // 🔴 VALIDACIÓN MAPPING
      if (mapped === undefined) {
        throw new Error(`Mapping inexistente para código: ${code}`);
      }

      const num = Number(mapped);

      if (Number.isNaN(num)) {
        throw new Error(`Mapping inválido (NaN) para código: ${code}`);
      }

      return num;
    }

    function mean(arr) {
      if (!arr.length) return null;
      return arr.reduce((a, b) => a + b, 0) / arr.length;
    }

    function compute(dataset) {
      const result = {};

      for (const optId in options) {
        const opt = options[optId];

        const clarity = [];
        const atractivo = [];
        const score = [];

        const claridad_vars = opt.metrics.claridad;
        const atractivo_vars = opt.metrics.atractivo;

        // 🔴 VALIDACIÓN LARGO
        if (claridad_vars.length !== claridad_codes.length) {
          throw new Error(`claridad inconsistente en opción ${optId}`);
        }

        if (atractivo_vars.length !== atractivo_codes.length) {
          throw new Error(`atractivo inconsistente en opción ${optId}`);
        }

        for (const row of dataset) {
          const c_code = getActiveCode(
            row,
            claridad_vars,
            claridad_codes,
            claridad_missing
          );

          const a_code = getActiveCode(
            row,
            atractivo_vars,
            atractivo_codes,
            atractivo_missing
          );

          if (c_code === "invalid" || a_code === "invalid") continue;

          const c = transform(c_code, claridad_map);
          const a = transform(a_code, atractivo_map);

          if (c === null || a === null) continue;

          const s = (c + a) / 2;

          clarity.push(c);
          atractivo.push(a);
          score.push(s);
        }

        result[`opcion_${optId}`] = {
          n_valido: score.length,
          denominador: score.length,
          claridad: clarity.length ? Number(mean(clarity).toFixed(4)) : null,
          atractivo: atractivo.length ? Number(mean(atractivo).toFixed(4)) : null,
          score_compuesto: score.length ? Number(mean(score).toFixed(4)) : null,
        };
      }

      return result;
    }

    const result = compute(data);

    return res.status(200).json({
      status: "ok",
      result,
    });

  } catch (err) {
    return res.status(500).json({
      error: err.message,
    });
  }
}
