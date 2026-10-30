/**
 * Carga tus clientes desde una hoja de cálculo (Excel o Google Sheets
 * descargada como CSV) a data/clientes.json.
 *
 *   node scripts/importar-clientes.mjs "ruta/a/mis-clientes.csv"
 *
 * La primera fila debe tener estos títulos (mayúscula o minúscula da igual;
 * solo NOMBRE es obligatorio). Mira el ejemplo en data/clientes-ejemplo.csv:
 *
 *   NOMBRE, RAZON SOCIAL, DIRECCION, TELEFONO, TAMAÑO, HORARIO ENTREGA,
 *   DOMICILIO, VALOR UNITARIO, PAGO, RETEIVA (SI/NO), SABORES ESPECIALES
 *
 * Ojo: reemplaza data/clientes.json (se conservan los clientes internos).
 */
import fs from "node:fs";

const CSV = process.argv[2];
if (!CSV) {
  console.error('Falta el archivo. Ejemplo: node scripts/importar-clientes.mjs "data/clientes-ejemplo.csv"');
  process.exit(1);
}

function parseCsv(text) {
  const rows = [];
  let row = [], field = "", inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') inQuotes = false;
      else field += c;
    } else if (c === '"') inQuotes = true;
    else if (c === ",") { row.push(field); field = ""; }
    else if (c === "\n") { row.push(field); rows.push(row); row = []; field = ""; }
    else if (c !== "\r") field += c;
  }
  if (field || row.length) { row.push(field); rows.push(row); }
  return rows;
}

const slug = (s) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "")
   .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

const rows = parseCsv(fs.readFileSync(CSV, "utf8"));
const [head, ...body] = rows;
const idx = Object.fromEntries(head.map((h, i) => [h.trim().toUpperCase(), i]));
if (idx["NOMBRE"] === undefined) {
  console.error("La primera fila del archivo debe tener una columna NOMBRE.");
  process.exit(1);
}

const clientes = [];
const ids = new Set();
for (const r of body) {
  const nombre = (r[idx["NOMBRE"]] ?? "").trim();
  if (!nombre) continue;
  let id = slug(nombre);
  while (ids.has(id)) id += "-2";
  ids.add(id);
  const gramajeRaw = (r[idx["TAMAÑO"]] ?? "").trim().toLowerCase().replace(/\s+/g, "");
  const especiales = (r[idx["SABORES ESPECIALES"]] ?? "")
    .split(/[\n;]/).map((s) => s.trim()).filter(Boolean);
  clientes.push({
    id,
    nombre,
    razonSocial: (r[idx["RAZON SOCIAL"]] ?? "").trim(),
    direccion: (r[idx["DIRECCION"]] ?? "").trim(),
    telefono: (r[idx["TELEFONO"]] ?? "").trim(),
    // Sin tamaño, el más grande de config/negocio.ts (ajústalo después en Clientes).
    gramaje: gramajeRaw || "90g",
    horarioEntrega: (r[idx["HORARIO ENTREGA"]] ?? "").trim().replace(/^-$/, ""),
    domicilio: (r[idx["DOMICILIO"]] ?? "").trim(),
    valorUnitario: (r[idx["VALOR UNITARIO"]] ?? "").trim(),
    tipoPago: (r[idx["PAGO"]] ?? "").trim().toUpperCase(),
    reteIva: (r[idx["RETEIVA"]] ?? "").trim().toUpperCase() === "SI",
    desarrollos: especiales,
    activo: true,
  });
}

// Los clientes de la casa (tu punto de venta) no vienen en el CSV: se conservan.
const internos = JSON.parse(fs.readFileSync("data/clientes.json", "utf8")).filter((c) => c.interno);
clientes.unshift(...internos);

fs.writeFileSync("data/clientes.json", JSON.stringify(clientes, null, 2) + "\n");
console.log(`${clientes.length} clientes importados`);
console.log("gramajes:", [...new Set(clientes.map((c) => c.gramaje))].join(" | "));
console.log("desarrollos:", clientes.filter((c) => c.desarrollos.length).map((c) => `${c.nombre}: ${c.desarrollos.join(", ")}`).join(" | "));
console.log("sin direccion:", clientes.filter((c) => !c.direccion || c.direccion === "-").map((c) => c.nombre).join(", "));
