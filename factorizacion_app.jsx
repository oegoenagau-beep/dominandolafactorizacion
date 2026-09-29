import { useState, useEffect, useRef } from "react";

const LOGO = "https://upload.wikimedia.org/wikipedia/commons/thumb/2/27/Escudo_de_la_Universidad_del_Magdalena.png/120px-Escudo_de_la_Universidad_del_Magdalena.png";

// ── API CLAUDE (patrón correcto para artifacts) ───────────────────────
async function apiClaude(prompt, maxTokens = 1200) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "anthropic-dangerous-direct-browser-access": "true"
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: maxTokens,
      messages: [{ role: "user", content: prompt }]
    })
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => res.status);
    throw new Error("HTTP " + res.status + ": " + txt);
  }
  const data = await res.json();
  const raw = data.content
    .filter(b => b.type === "text")
    .map(b => b.text)
    .join("");
  // Extracción robusta: saca el bloque JSON sin importar texto alrededor
  const firstBrace   = raw.indexOf("{");
  const firstBracket = raw.indexOf("[");
  let first = -1;
  if (firstBrace  !== -1 && (firstBracket === -1 || firstBrace  < firstBracket)) first = firstBrace;
  if (firstBracket !== -1 && (firstBrace  === -1 || firstBracket < firstBrace))  first = firstBracket;
  if (first === -1) throw new Error("Sin JSON en la respuesta");
  const last = Math.max(raw.lastIndexOf("}"), raw.lastIndexOf("]"));
  if (last === -1) throw new Error("JSON incompleto");
  return JSON.parse(raw.slice(first, last + 1));
}

// ── DATOS: CASOS ──────────────────────────────────────────────────────
const CASOS = [
  {
    id: "fc", nombre: "Factor Común", icono: "FC", color: "#0EA5E9", bg: "#E0F2FE", nivel: 1,
    formula: "ax + ay = a(x + y)",
    descripcion: "Extrae el máximo factor común de todos los términos del polinomio.",
    pasos: [
      "Halla el MCD de todos los coeficientes.",
      "Identifica las variables comunes con el menor exponente.",
      "Escribe el MCD fuera del paréntesis.",
      "Divide cada término entre el MCD para obtener el factor entre paréntesis."
    ],
    ejemplos: [
      { p: "6x² + 9x + 3",       s: "3(2x² + 3x + 1)",   e: "MCD(6,9,3) = 3 → dividimos cada término entre 3." },
      { p: "4a²b + 8ab² − 12ab", s: "4ab(a + 2b − 3)",    e: "MCD coef. = 4, variables comunes = a¹b¹." }
    ],
    ejercicios: [
      { prob: "8x² + 12x",              resp: "4x(2x + 3)",            dif: 1, pista: "El MCD de 8 y 12 es 4" },
      { prob: "15a³ + 10a² − 5a",       resp: "5a(3a² + 2a − 1)",      dif: 1, pista: "MCD de 15, 10, 5 es 5" },
      { prob: "6x²y + 9xy² − 3xy",      resp: "3xy(2x + 3y − 1)",      dif: 2, pista: "Busca el MCD de coeficientes y variables" },
      { prob: "14m³n² − 21m²n + 7mn",   resp: "7mn(2m²n − 3m + 1)",    dif: 2, pista: "MCD de 14, 21, 7 es 7" },
      { prob: "12a²bc + 18ab²c − 6abc", resp: "6abc(2a + 3b − 1)",     dif: 3, pista: "Identifica todas las variables comunes" },
      { prob: "20x⁴ − 15x³ + 25x²",    resp: "5x²(4x² − 3x + 5)",     dif: 3, pista: "MCD de coeficientes y la variable con menor exp." }
    ]
  },
  {
    id: "dc", nombre: "Diferencia de Cuadrados", icono: "a²−b²", color: "#8B5CF6", bg: "#EDE9FE", nivel: 2,
    formula: "a² − b² = (a + b)(a − b)",
    descripcion: "Diferencia de dos cuadrados perfectos como producto de suma por diferencia.",
    pasos: [
      "Verifica que ambos términos sean cuadrados perfectos.",
      "El signo entre ellos debe ser negativo (−).",
      "Calcula la raíz cuadrada de cada término.",
      "Escribe: (√primero + √segundo)(√primero − √segundo)."
    ],
    ejemplos: [
      { p: "x² − 25",      s: "(x + 5)(x − 5)",       e: "√x² = x, √25 = 5 → (x+5)(x−5)." },
      { p: "16a² − 49b²",  s: "(4a + 7b)(4a − 7b)",   e: "√16a² = 4a, √49b² = 7b." }
    ],
    ejercicios: [
      { prob: "x² − 16",         resp: "(x + 4)(x − 4)",         dif: 1, pista: "√16 = 4" },
      { prob: "9m² − 1",         resp: "(3m + 1)(3m − 1)",       dif: 1, pista: "√9m² = 3m y √1 = 1" },
      { prob: "4a² − 25b²",      resp: "(2a + 5b)(2a − 5b)",     dif: 2, pista: "√4a² = 2a, √25b² = 5b" },
      { prob: "36x² − 49y²",     resp: "(6x + 7y)(6x − 7y)",     dif: 2, pista: "√36x² = 6x, √49y² = 7y" },
      { prob: "81a⁴ − 16b²",     resp: "(9a² + 4b)(9a² − 4b)",   dif: 3, pista: "√81a⁴ = 9a², √16b² = 4b" },
      { prob: "x⁴ − y⁴",         resp: "(x² + y²)(x + y)(x − y)", dif: 3, pista: "Aplica la diferencia de cuadrados dos veces" }
    ]
  },
  {
    id: "tcp", nombre: "Trinomio Cuadrado Perfecto", icono: "(a±b)²", color: "#EC4899", bg: "#FCE7F3", nivel: 2,
    formula: "a² ± 2ab + b² = (a ± b)²",
    descripcion: "Trinomio que resulta del cuadrado de un binomio.",
    pasos: [
      "El 1° y 3° término deben ser cuadrados perfectos.",
      "El término del medio = 2 × raíz(1°) × raíz(3°).",
      "Si el término medio es positivo → (a + b)².",
      "Si el término medio es negativo → (a − b)²."
    ],
    ejemplos: [
      { p: "x² + 6x + 9",    s: "(x + 3)²",    e: "√x²=x, √9=3. Verificamos: 2·x·3 = 6x ✓" },
      { p: "4a² − 20a + 25", s: "(2a − 5)²",   e: "√4a²=2a, √25=5. Verificamos: 2·2a·5 = 20a ✓" }
    ],
    ejercicios: [
      { prob: "x² + 8x + 16",         resp: "(x + 4)²",       dif: 1, pista: "√16 = 4, verifica: 2·x·4 = 8x" },
      { prob: "m² − 10m + 25",        resp: "(m − 5)²",       dif: 1, pista: "√25 = 5, término medio negativo" },
      { prob: "9a² + 12a + 4",        resp: "(3a + 2)²",      dif: 2, pista: "√9a² = 3a, √4 = 2" },
      { prob: "16x² − 24x + 9",       resp: "(4x − 3)²",      dif: 2, pista: "√16x² = 4x, √9 = 3" },
      { prob: "25a² + 20ab + 4b²",    resp: "(5a + 2b)²",     dif: 3, pista: "√25a² = 5a, √4b² = 2b" },
      { prob: "49m² − 42mn + 9n²",    resp: "(7m − 3n)²",     dif: 3, pista: "√49m² = 7m, √9n² = 3n" }
    ]
  },
  {
    id: "cub", nombre: "Suma y Diferencia de Cubos", icono: "a³±b³", color: "#F59E0B", bg: "#FEF3C7", nivel: 3,
    formula: "a³ ± b³ = (a ± b)(a² ∓ ab + b²)",
    descripcion: "Factorización de suma o diferencia de cubos perfectos.",
    pasos: [
      "Verifica que ambos términos sean cubos perfectos.",
      "Calcula la raíz cúbica de cada término.",
      "Para suma: (a + b)(a² − ab + b²).",
      "Para diferencia: (a − b)(a² + ab + b²)."
    ],
    ejemplos: [
      { p: "x³ + 27",    s: "(x + 3)(x² − 3x + 9)",         e: "∛x³ = x, ∛27 = 3. Suma de cubos." },
      { p: "8a³ − 125",  s: "(2a − 5)(4a² + 10a + 25)",      e: "∛8a³ = 2a, ∛125 = 5. Diferencia de cubos." }
    ],
    ejercicios: [
      { prob: "x³ + 8",       resp: "(x + 2)(x² − 2x + 4)",        dif: 1, pista: "∛8 = 2" },
      { prob: "m³ − 27",      resp: "(m − 3)(m² + 3m + 9)",        dif: 1, pista: "∛27 = 3, diferencia de cubos" },
      { prob: "8x³ + 1",      resp: "(2x + 1)(4x² − 2x + 1)",      dif: 2, pista: "∛8x³ = 2x, ∛1 = 1" },
      { prob: "27a³ − 64",    resp: "(3a − 4)(9a² + 12a + 16)",    dif: 2, pista: "∛27a³ = 3a, ∛64 = 4" },
      { prob: "125x³ + 8y³",  resp: "(5x + 2y)(25x² − 10xy + 4y²)", dif: 3, pista: "∛125x³ = 5x, ∛8y³ = 2y" },
      { prob: "64a³ − 27b³",  resp: "(4a − 3b)(16a² + 12ab + 9b²)", dif: 3, pista: "∛64a³ = 4a, ∛27b³ = 3b" }
    ]
  },
  {
    id: "ts", nombre: "Trinomio x² + bx + c", icono: "x²+bx+c", color: "#10B981", bg: "#D1FAE5", nivel: 2,
    formula: "x² + bx + c = (x + p)(x + q)  donde  p·q = c  y  p + q = b",
    descripcion: "Trinomio cuadrático con coeficiente 1 en el término cuadrático.",
    pasos: [
      "Identifica los valores de b y c en el trinomio.",
      "Busca dos números p y q tales que p · q = c.",
      "Verifica que p + q = b.",
      "Escribe la factorización: (x + p)(x + q)."
    ],
    ejemplos: [
      { p: "x² + 5x + 6",   s: "(x + 2)(x + 3)",  e: "2 × 3 = 6 ✓ y 2 + 3 = 5 ✓" },
      { p: "x² − 7x + 12",  s: "(x − 3)(x − 4)",  e: "(−3)(−4) = 12 ✓ y −3 + (−4) = −7 ✓" }
    ],
    ejercicios: [
      { prob: "x² + 7x + 12",   resp: "(x + 3)(x + 4)",   dif: 1, pista: "Busca dos números que sumen 7 y multipliquen 12" },
      { prob: "x² − 5x + 6",    resp: "(x − 2)(x − 3)",   dif: 1, pista: "Dos negativos que sumen −5 y multipliquen 6" },
      { prob: "x² + 2x − 15",   resp: "(x + 5)(x − 3)",   dif: 2, pista: "Un número positivo y uno negativo, producto −15" },
      { prob: "x² − x − 20",    resp: "(x − 5)(x + 4)",   dif: 2, pista: "Producto −20 y suma −1" },
      { prob: "x² + 3x − 28",   resp: "(x + 7)(x − 4)",   dif: 3, pista: "7 × (−4) = −28 y 7 + (−4) = 3" },
      { prob: "x² − 11x + 30",  resp: "(x − 5)(x − 6)",   dif: 3, pista: "(−5)(−6) = 30 y −5 + (−6) = −11" }
    ]
  },
  {
    id: "tg", nombre: "Trinomio ax² + bx + c", icono: "ax²+bx+c", color: "#EF4444", bg: "#FEE2E2", nivel: 3,
    formula: "ax² + bx + c  →  método aspa / descomposición",
    descripcion: "Trinomio cuadrático con coeficiente a ≠ 1 en el término cuadrático.",
    pasos: [
      "Multiplica a × c para obtener el producto clave.",
      "Busca p y q con p·q = a·c y p + q = b.",
      "Reescribe el término medio usando p y q.",
      "Agrupa en pares y factoriza por factor común."
    ],
    ejemplos: [
      { p: "2x² + 7x + 3",  s: "(2x + 1)(x + 3)",   e: "a·c=6. p=1, q=6 → 2x²+x+6x+3 = x(2x+1)+3(2x+1)." },
      { p: "3x² − 5x − 2",  s: "(3x + 1)(x − 2)",   e: "a·c=−6. p=1, q=−6 → 3x²+x−6x−2." }
    ],
    ejercicios: [
      { prob: "2x² + 5x + 3",   resp: "(2x + 3)(x + 1)",   dif: 1, pista: "a·c = 6, busca p+q=5 y p·q=6" },
      { prob: "3x² + 7x + 2",   resp: "(3x + 1)(x + 2)",   dif: 1, pista: "a·c = 6, p=1 y q=6" },
      { prob: "2x² − x − 6",    resp: "(2x + 3)(x − 2)",   dif: 2, pista: "a·c = −12, busca p+q=−1" },
      { prob: "4x² + 4x − 3",   resp: "(2x + 3)(2x − 1)",  dif: 2, pista: "a·c = −12, p=6 y q=−2" },
      { prob: "6x² − 7x − 3",   resp: "(3x + 1)(2x − 3)",  dif: 3, pista: "a·c = −18, busca p+q=−7" },
      { prob: "8x² + 10x − 3",  resp: "(4x − 1)(2x + 3)",  dif: 3, pista: "a·c = −24, p=12 y q=−2" }
    ]
  },
  {
    id: "ag", nombre: "Factorización por Agrupación", icono: "[]+[]", color: "#06B6D4", bg: "#CFFAFE", nivel: 3,
    formula: "ax + ay + bx + by = (a + b)(x + y)",
    descripcion: "Agrupa los términos en pares y extrae el factor común de cada grupo.",
    pasos: [
      "Agrupa los términos en pares con factores comunes.",
      "Extrae el factor común de cada grupo.",
      "Identifica el binomio común resultante.",
      "Factoriza el binomio común."
    ],
    ejemplos: [
      { p: "x³ + x² + x + 1",      s: "(x + 1)(x² + 1)",   e: "x²(x+1) + 1(x+1) = (x+1)(x²+1)." },
      { p: "2ax + 3bx + 2ay + 3by", s: "(2a + 3b)(x + y)",  e: "x(2a+3b) + y(2a+3b) = (2a+3b)(x+y)." }
    ],
    ejercicios: [
      { prob: "x³ + 2x² + x + 2",    resp: "(x + 2)(x² + 1)",   dif: 1, pista: "Agrupa los dos primeros y los dos últimos" },
      { prob: "ab + ac + b² + bc",    resp: "(a + b)(b + c)",     dif: 1, pista: "a(b+c) + b(b+c)" },
      { prob: "x³ − x² + 3x − 3",    resp: "(x − 1)(x² + 3)",   dif: 2, pista: "x²(x−1) + 3(x−1)" },
      { prob: "2x³ + x² − 6x − 3",   resp: "(x² − 3)(2x + 1)",  dif: 2, pista: "x²(2x+1) − 3(2x+1)" },
      { prob: "ac + ad + bc + bd",    resp: "(a + b)(c + d)",     dif: 3, pista: "a(c+d) + b(c+d)" },
      { prob: "6mx − 3my + 2nx − ny", resp: "(3m + n)(2x − y)",  dif: 3, pista: "3m(2x−y) + n(2x−y)" }
    ]
  },
  {
    id: "mix", nombre: "Factorización Mixta", icono: "MIX", color: "#6366F1", bg: "#EEF2FF", nivel: 4,
    formula: "Factor Común → luego D.C. / T.C.P. / etc.",
    descripcion: "Combina varios casos de factorización aplicados en secuencia.",
    pasos: [
      "Extrae siempre el factor común primero.",
      "Identifica qué caso aplica al polinomio resultante.",
      "Aplica el caso correspondiente.",
      "Verifica si algún factor puede seguir factorizándose."
    ],
    ejemplos: [
      { p: "2x³ − 8x",      s: "2x(x + 2)(x − 2)",  e: "FC: 2x(x²−4). Luego D.C.: 2x(x+2)(x−2)." },
      { p: "3x² + 6x + 3",  s: "3(x + 1)²",          e: "FC: 3(x²+2x+1). Luego TCP: 3(x+1)²." }
    ],
    ejercicios: [
      { prob: "3x² − 12",          resp: "3(x + 2)(x − 2)",        dif: 1, pista: "Saca factor 3, luego diferencia de cuadrados" },
      { prob: "5x² + 10x + 5",     resp: "5(x + 1)²",              dif: 1, pista: "Saca factor 5, luego TCP" },
      { prob: "4x³ − 16x",         resp: "4x(x + 2)(x − 2)",       dif: 2, pista: "FC: 4x, luego diferencia de cuadrados" },
      { prob: "2x² + 8x + 8",      resp: "2(x + 2)²",              dif: 2, pista: "FC: 2, luego trinomio cuadrado perfecto" },
      { prob: "2x⁴ − 2",           resp: "2(x² + 1)(x + 1)(x − 1)", dif: 3, pista: "FC: 2, luego D.C. dos veces" },
      { prob: "3x³ + 6x² − 3x − 6", resp: "3(x + 2)(x + 1)(x − 1)", dif: 3, pista: "FC: 3, luego agrupación y D.C." }
    ]
  }
];

// ── QUIZ ──────────────────────────────────────────────────────────────
const QUIZ_QS = [
  { q:"Factoriza: x² − 16",              ops:["(x+4)(x−4)","(x+8)(x−2)","(x+2)(x+8)","(x−4)²"],   ok:0, caso:"Diferencia de Cuadrados" },
  { q:"Factor común de: 6x² + 9x",       ops:["3x(2x+3)","2x(3x+9)","3(2x²+9x)","x(6x+9)"],       ok:0, caso:"Factor Común" },
  { q:"x² + 10x + 25 equivale a:",       ops:["(x+5)²","(x+5)(x−5)","(x+10)(x+2)","(x+25)²"],     ok:0, caso:"Trinomio Cuadrado Perfecto" },
  { q:"Factoriza: x² + 7x + 12",         ops:["(x+3)(x+4)","(x+6)(x+2)","(x+12)(x+1)","(x+7)(x+1)"], ok:0, caso:"Trinomio Simple" },
  { q:"Factoriza: 8x³ − 27",             ops:["(2x−3)(4x²+6x+9)","(2x+3)(4x²−6x+9)","(8x−3)(x²+9)","(2x−3)³"], ok:0, caso:"Diferencia de Cubos" },
  { q:"Factoriza: 2x² + 5x + 3",         ops:["(2x+3)(x+1)","(2x+1)(x+3)","(x+3)(x+2)","(2x−1)(x+3)"], ok:0, caso:"Trinomio ax²+bx+c" },
  { q:"x³+x²−x−1 factorizado es:",       ops:["(x+1)²(x−1)","(x−1)²(x+1)","(x+1)(x²−1)","(x²+1)(x−1)"], ok:0, caso:"Agrupación" },
  { q:"Factorización completa de 3x³−12x:", ops:["3x(x+2)(x−2)","3x(x²−4)","3(x³−4x)","x(3x+6)(x−2)"], ok:0, caso:"Mixta" }
];

// ── GLOSARIO ──────────────────────────────────────────────────────────
const GLOSARIO = [
  { t:"Factor",           d:"Cada elemento que se multiplica para formar un producto.", e:"En 3·x·(x+2), los factores son 3, x y (x+2)." },
  { t:"Factorización",    d:"Expresar un polinomio como producto de factores más simples.", e:"x²−9 = (x+3)(x−3)" },
  { t:"MCD",              d:"Máximo Común Divisor: el mayor número que divide exactamente a todos los coeficientes.", e:"MCD(12, 8, 4) = 4" },
  { t:"Polinomio",        d:"Expresión algebraica con una o más variables con exponentes enteros no negativos.", e:"3x² + 5x − 2" },
  { t:"Binomio",          d:"Polinomio con exactamente dos términos.", e:"(x + 3), (2a − b)" },
  { t:"Trinomio",         d:"Polinomio con exactamente tres términos.", e:"x² + 5x + 6" },
  { t:"Cuadrado perfecto",d:"Número o expresión que resulta de elevar algo al cuadrado.", e:"25 = 5², 4x² = (2x)²" },
  { t:"Cubo perfecto",    d:"Número o expresión que resulta de elevar algo al cubo.", e:"27 = 3³, 8x³ = (2x)³" },
  { t:"Raíz cuadrada",    d:"Número que multiplicado por sí mismo da el valor original.", e:"√49 = 7" },
  { t:"Raíz cúbica",      d:"Número que multiplicado tres veces por sí mismo da el valor original.", e:"∛27 = 3" },
  { t:"Coeficiente",      d:"El factor numérico de un término algebraico.", e:"En 5x², el coeficiente es 5." },
  { t:"Término independiente", d:"Término sin parte variable en un polinomio.", e:"En x²+3x+7, el término independiente es 7." }
];

// ── FONDOS ────────────────────────────────────────────────────────────
const FONDOS = [
  { id:"cosmos",   nombre:"Cosmos",    emoji:"🌌", main:"linear-gradient(160deg,#020817 0%,#0f172a 40%,#1e1b4b 100%)", hdr:"linear-gradient(135deg,#020817,#0f172a)", body:"#0f172a" },
  { id:"oceano",   nombre:"Océano",    emoji:"🌊", main:"linear-gradient(160deg,#0c4a6e 0%,#0369a1 50%,#0284c7 100%)", hdr:"linear-gradient(135deg,#0c4a6e,#0369a1)", body:"#082f49" },
  { id:"bosque",   nombre:"Bosque",    emoji:"🌿", main:"linear-gradient(160deg,#052e16 0%,#14532d 50%,#166534 100%)", hdr:"linear-gradient(135deg,#052e16,#14532d)", body:"#052e16" },
  { id:"aurora",   nombre:"Aurora",    emoji:"✨", main:"linear-gradient(160deg,#2e1065 0%,#4c1d95 40%,#be185d 100%)", hdr:"linear-gradient(135deg,#2e1065,#4c1d95)", body:"#1a0533" },
  { id:"atardecer",nombre:"Atardecer", emoji:"🌅", main:"linear-gradient(160deg,#7c2d12 0%,#c2410c 50%,#ea580c 100%)", hdr:"linear-gradient(135deg,#7c2d12,#c2410c)", body:"#431407" },
  { id:"nieve",    nombre:"Nieve",     emoji:"❄️", main:"linear-gradient(160deg,#1e3a5f 0%,#1d4ed8 50%,#3b82f6 100%)", hdr:"linear-gradient(135deg,#1e3a5f,#1d4ed8)", body:"#0f2342" },
  { id:"volcan",   nombre:"Volcán",    emoji:"🌋", main:"linear-gradient(160deg,#1c1917 0%,#44403c 40%,#dc2626 100%)", hdr:"linear-gradient(135deg,#1c1917,#44403c)", body:"#0c0a09" },
  { id:"tropico",  nombre:"Trópico",   emoji:"🌴", main:"linear-gradient(160deg,#064e3b 0%,#065f46 40%,#059669 100%)", hdr:"linear-gradient(135deg,#064e3b,#065f46)", body:"#022c22" },
];

// ── INSIGNIAS ─────────────────────────────────────────────────────────
const INSIGNIAS = [
  { id:"p1",  ico:"🌟", nombre:"Primera Factorización", desc:"Resuelve tu primer ejercicio con IA",         cond: p => p.iaTotal >= 1 },
  { id:"p2",  ico:"🥉", nombre:"Explorador",            desc:"Completa 10 ejercicios propuestos",           cond: p => p.ejercsPropuestos >= 10 },
  { id:"p3",  ico:"🥈", nombre:"Escalador",             desc:"Verifica 5 respuestas correctas",             cond: p => p.correctasPropuestas >= 5 },
  { id:"p4",  ico:"🏅", nombre:"Estudiante Dedicado",   desc:"Obtén 6/8 en el Quiz",                        cond: p => p.quizMax >= 6 },
  { id:"p5",  ico:"🥇", nombre:"Quiz Perfecto",         desc:"Obtén 8/8 en el Quiz",                        cond: p => p.quizMax >= 8 },
  { id:"p6",  ico:"🤖", nombre:"Amigo de la IA",        desc:"3 respuestas correctas evaluadas por IA",     cond: p => p.iaCorrectos >= 3 },
  { id:"p7",  ico:"💎", nombre:"Maestro Algebraico",    desc:"10 respuestas correctas evaluadas por IA",    cond: p => p.iaCorrectos >= 10 },
  { id:"p8",  ico:"🔥", nombre:"Racha de Fuego",        desc:"Estudia 3 días seguidos",                     cond: p => p.streak >= 3 },
  { id:"p9",  ico:"📝", nombre:"Apuntes Perfectos",     desc:"Guarda notas en 3 casos distintos",           cond: p => p.casoConNotas >= 3 },
  { id:"p10", ico:"🏆", nombre:"Campeón Total",         desc:"Desbloquea todos los niveles",                cond: p => p.nivelDesbloqueado >= 4 },
  { id:"p11", ico:"📚", nombre:"Bibliófilo",            desc:"Completa los 8 casos de factorización",       cond: p => p.casosVisitados >= 8 },
  { id:"p12", ico:"⚡", nombre:"Relámpago",             desc:"Completa el Quiz en menos de 3 minutos",      cond: p => p.quizRapido }
];

const DESAFIOS = [
  { id:"d1", titulo:"Primer Paso",       desc:"Verifica 3 ejercicios propuestos correctamente", meta:3,  campo:"correctasPropuestas", recompensa:"Desbloquea Nivel Intermedio", ico:"🥈" },
  { id:"d2", titulo:"Escalando",         desc:"Verifica 8 ejercicios propuestos correctamente", meta:8,  campo:"correctasPropuestas", recompensa:"Desbloquea Nivel Avanzado",   ico:"🥇" },
  { id:"d3", titulo:"Maestro del Quiz",  desc:"Obtén 6/8 en el Quiz de opción múltiple",        meta:6,  campo:"quizMax",              recompensa:"Desbloquea Nivel Experto",   ico:"💎" },
  { id:"d4", titulo:"Campeón IA",        desc:"10 respuestas correctas evaluadas por IA",       meta:10, campo:"iaCorrectos",          recompensa:"Acceso total + Insignia",    ico:"🏆" }
];

const LEADERBOARD_BASE = [
  { nombre:"María G.",  xp:580, ins:7, nivel:"Avanzado" },
  { nombre:"Carlos R.", xp:430, ins:5, nivel:"Intermedio" },
  { nombre:"Ana M.",    xp:390, ins:4, nivel:"Intermedio" },
  { nombre:"Luis P.",   xp:220, ins:3, nivel:"Básico" },
  { nombre:"Sofia T.",  xp:180, ins:2, nivel:"Básico" }
];

const NV_LABELS = ["","Básico 🟢","Intermedio 🟡","Avanzado 🔴","Experto ⭐"];
const NV_COLORS = ["","#10B981","#F59E0B","#EF4444","#6366F1"];
const NV_BGS   = ["","#D1FAE5","#FEF3C7","#FEE2E2","#EEF2FF"];
const DIF_INFO = { 1:{label:"Básico",    bg:"#D1FAE5", color:"#065F46"}, 2:{label:"Intermedio",bg:"#FEF3C7", color:"#92400E"}, 3:{label:"Avanzado",  bg:"#FEE2E2", color:"#991B1B"} };

// ── SONIDOS ───────────────────────────────────────────────────────────
function useSonidos(on, vol = 60) {
  const ctx = useRef(null);
  const getCtx = () => {
    if (!ctx.current) ctx.current = new (window.AudioContext || window.webkitAudioContext)();
    return ctx.current;
  };
  const play = (fn) => { if (!on) return; try { fn(getCtx()); } catch {} };
  const beep = (freq, dur, type = "sine", gain = 0.18) => play(ac => {
    const o = ac.createOscillator(), g = ac.createGain();
    o.connect(g); g.connect(ac.destination);
    o.type = type; o.frequency.value = freq;
    g.gain.value = gain * (vol / 100);
    o.start(); g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + dur);
    o.stop(ac.currentTime + dur);
  });
  return {
    correcto:   () => { beep(523,0.12); setTimeout(() => beep(659,0.12), 110); setTimeout(() => beep(784,0.2), 220); },
    incorrecto: () => { beep(300,0.12,"sawtooth"); setTimeout(() => beep(250,0.18,"sawtooth"), 130); },
    click:      () => beep(880, 0.07, "sine", 0.08),
    desbloqueo: () => { [523,659,784,1047].forEach((f,i) => setTimeout(() => beep(f,0.15,"sine",0.2), i*120)); },
    navegar:    () => beep(660, 0.08, "sine", 0.08),
  };
}

// ── CSS ───────────────────────────────────────────────────────────────
function makeCSS(dark) {
  const B = dark
    ? { bg0:"#0F172A", bg1:"#1E293B", bg2:"#0F172A", border:"#334155", txt:"#F1F5F9", txt2:"#94A3B8" }
    : { bg0:"#F1F5F9", bg1:"#FFFFFF", bg2:"#F8FAFC",  border:"#E2E8F0", txt:"#1E293B", txt2:"#64748B" };
  return `
@import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&family=JetBrains+Mono:wght@400;600&display=swap');
*{box-sizing:border-box;margin:0;padding:0;}
body{font-family:'Nunito',sans-serif;}
/* ── INTRO ── */
.intro{min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:32px 20px 28px;position:relative;overflow:hidden;}
.star{position:absolute;border-radius:50%;background:white;animation:twk var(--d) ease-in-out infinite var(--dl);}
@keyframes twk{0%,100%{opacity:.07;}50%{opacity:.75;}}
.logo-hero-wrap{position:relative;display:flex;align-items:center;justify-content:center;margin-bottom:18px;}
.logo-hero-glow{position:absolute;width:160px;height:160px;border-radius:50%;background:radial-gradient(circle,rgba(59,130,246,.28) 0%,transparent 70%);animation:gpulse 3s ease-in-out infinite;}
@keyframes gpulse{0%,100%{transform:scale(1);}50%{transform:scale(1.15);}}
.logo-hero-r1{position:absolute;width:144px;height:144px;border-radius:50%;border:1.5px solid rgba(59,130,246,.22);animation:rspin 18s linear infinite;}
.logo-hero-r2{position:absolute;width:120px;height:120px;border-radius:50%;border:1.5px dashed rgba(251,191,36,.2);animation:rspin 12s linear infinite reverse;}
@keyframes rspin{to{transform:rotate(360deg);}}
.logo-hero-bg{width:106px;height:106px;border-radius:50%;background:white;display:flex;align-items:center;justify-content:center;box-shadow:0 0 40px rgba(59,130,246,.28),0 6px 28px rgba(0,0,0,.4);position:relative;z-index:1;}
.logo-hero-bg img{width:86px;height:86px;object-fit:contain;display:block;}
.logo-dot{position:absolute;width:10px;height:10px;border-radius:50%;background:#fbbf24;box-shadow:0 0 8px #fbbf24;z-index:2;top:6px;right:6px;}
.inst-banner{background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.13);border-radius:28px;padding:6px 16px;display:flex;align-items:center;gap:8px;margin-bottom:14px;backdrop-filter:blur(6px);}
.inst-sep{width:1px;height:14px;background:rgba(255,255,255,.2);}
.inst-name{font-size:12px;font-weight:800;color:white;letter-spacing:.4px;}
.inst-dept{font-size:11px;color:#93c5fd;font-weight:600;}
.ititle{font-size:28px;font-weight:900;color:white;text-align:center;line-height:1.15;margin-bottom:8px;}
.ititle span{background:linear-gradient(90deg,#fbbf24,#f59e0b);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;}
.isub{font-size:13px;color:#94a3b8;text-align:center;max-width:300px;line-height:1.65;margin-bottom:20px;}
.chips{display:flex;flex-wrap:wrap;gap:6px;justify-content:center;margin-bottom:20px;max-width:330px;}
.chip{background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.1);border-radius:20px;padding:4px 10px;font-family:'JetBrains Mono',monospace;font-size:10px;color:#cbd5e1;}
.ibtns{display:flex;flex-direction:column;gap:8px;width:100%;max-width:280px;}
.ib1{background:linear-gradient(135deg,#1d4ed8,#3b82f6);color:white;border:none;border-radius:12px;padding:14px;font-family:'Nunito',sans-serif;font-size:15px;font-weight:800;cursor:pointer;box-shadow:0 6px 20px rgba(59,130,246,.4);transition:all .2s;}
.ib1:hover{transform:translateY(-2px);}
.ib2,.ib3,.ib4,.ib5{border-radius:12px;padding:11px;font-family:'Nunito',sans-serif;font-size:13px;font-weight:700;cursor:pointer;transition:all .2s;}
.ib2{background:rgba(251,191,36,.1);border:2px solid #fbbf24;color:#fbbf24;}
.ib3{background:rgba(99,102,241,.1);border:2px solid #818cf8;color:#a5b4fc;}
.ib4{background:rgba(16,185,129,.1);border:2px solid #34d399;color:#6ee7b7;}
.ib5{background:rgba(255,255,255,.06);border:1.5px solid rgba(255,255,255,.18);color:rgba(255,255,255,.75);}
.ib2:hover{background:rgba(251,191,36,.18);}
.ib3:hover{background:rgba(99,102,241,.18);}
.ib4:hover{background:rgba(16,185,129,.18);}
.ib5:hover{background:rgba(255,255,255,.14);}
.istat{display:flex;gap:22px;margin-top:22px;padding-top:18px;border-top:1px solid rgba(255,255,255,.07);}
.istat-n{font-size:22px;font-weight:900;color:#fbbf24;text-align:center;}
.istat-l{font-size:10px;color:#64748b;text-transform:uppercase;letter-spacing:.5px;text-align:center;font-weight:700;}
/* ── HEADER ── */
.hdr{background:linear-gradient(135deg,#0f172a,#1e3a8a);position:relative;}
.hdr::after{content:'';position:absolute;bottom:0;left:0;right:0;height:1px;background:linear-gradient(90deg,transparent,rgba(59,130,246,.3),transparent);}
.hdr-in{max-width:820px;margin:0 auto;padding:10px 14px;display:flex;align-items:center;gap:10px;}
.hdr-logo{width:38px;height:38px;border-radius:9px;background:white;display:flex;align-items:center;justify-content:center;padding:2px;box-shadow:0 2px 8px rgba(0,0,0,.3);flex-shrink:0;}
.hdr-logo img{width:32px;height:32px;object-fit:contain;}
.hdr-info{flex:1;min-width:0;}
.hdr-u{font-size:9px;font-weight:700;letter-spacing:1.2px;color:#93c5fd;text-transform:uppercase;}
.hdr-t{font-size:13px;font-weight:800;color:white;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.hdr-nav{display:flex;gap:4px;flex-wrap:wrap;}
.hn{background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.12);color:rgba(255,255,255,.8);border-radius:7px;padding:5px 8px;font-family:'Nunito',sans-serif;font-size:11px;font-weight:700;cursor:pointer;transition:all .15s;white-space:nowrap;}
.hn:hover{background:rgba(255,255,255,.15);}
.hn.on{background:#1d4ed8;border-color:#3b82f6;color:white;}
.xpbar{max-width:820px;margin:0 auto;padding:4px 14px 8px;display:flex;align-items:center;gap:8px;}
.xplbl{font-size:11px;color:#fbbf24;font-weight:800;white-space:nowrap;}
.xpbg{flex:1;background:rgba(255,255,255,.1);border-radius:20px;height:5px;overflow:hidden;}
.xpfill{height:100%;border-radius:20px;background:linear-gradient(90deg,#fbbf24,#f59e0b);transition:width .4s;}
.nvlbl{font-size:10px;color:rgba(255,255,255,.45);font-weight:700;white-space:nowrap;}
/* ── MAIN ── */
.main{background:${B.bg0};min-height:calc(100vh - 76px);}
.page{max-width:820px;margin:0 auto;padding:16px;}
.stitle{font-size:17px;font-weight:900;color:${B.txt};margin-bottom:4px;}
.ssub{font-size:13px;color:${B.txt2};margin-bottom:14px;}
/* ── GRID CASOS ── */
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(162px,1fr));gap:10px;margin-bottom:12px;}
.cc{background:${B.bg1};border-radius:13px;border:2px solid ${B.border};padding:13px;cursor:pointer;text-align:left;transition:all .2s;position:relative;overflow:hidden;}
.cc::before{content:'';position:absolute;top:0;left:0;right:0;height:4px;background:var(--c);border-radius:13px 13px 0 0;}
.cc:hover{border-color:var(--c);transform:translateY(-2px);box-shadow:0 8px 20px rgba(0,0,0,.1);}
.cc-badge{font-family:'JetBrains Mono',monospace;font-size:10px;font-weight:600;padding:3px 7px;border-radius:6px;display:inline-block;margin-bottom:7px;}
.cc-name{font-size:13px;font-weight:800;color:${B.txt};margin-bottom:3px;line-height:1.3;}
.cc-f{font-family:'JetBrains Mono',monospace;font-size:9px;color:${B.txt2};margin-bottom:7px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
.ndots{display:flex;gap:3px;}
.nd{width:7px;height:7px;border-radius:50%;background:${B.border};}
.nd.on{background:var(--c);}
/* ── PROMO ── */
.promo{border-radius:14px;padding:13px 15px;cursor:pointer;display:flex;align-items:center;gap:11px;margin-bottom:9px;transition:all .2s;}
.promo:hover{opacity:.92;transform:translateY(-1px);}
.promo-ic{width:44px;height:44px;border-radius:11px;background:rgba(251,191,36,.18);display:flex;align-items:center;justify-content:center;font-size:21px;flex-shrink:0;}
.promo-t{font-size:13px;font-weight:900;color:white;margin-bottom:2px;}
.promo-s{font-size:11px;color:rgba(255,255,255,.65);}
.promo-arr{margin-left:auto;color:#fbbf24;font-size:17px;font-weight:900;}
/* ── CASO PANEL ── */
.cbk{background:none;border:none;cursor:pointer;font-family:'Nunito',sans-serif;font-size:13px;font-weight:700;color:rgba(255,255,255,.7);display:flex;align-items:center;gap:5px;padding:12px 14px 0;max-width:820px;margin:0 auto;width:100%;}
.cbk:hover{color:white;}
.chero-w{max-width:820px;margin:0 auto;padding:8px 14px 0;}
.chero{background:rgba(255,255,255,.05);border-radius:12px;border:1px solid rgba(255,255,255,.1);padding:14px;}
.ch-row{display:flex;align-items:center;gap:9px;margin-bottom:6px;}
.ch-ic{font-family:'JetBrains Mono',monospace;font-size:10px;font-weight:600;padding:5px 9px;border-radius:7px;white-space:nowrap;}
.ch-name{font-size:17px;font-weight:900;color:white;}
.ch-desc{font-size:13px;color:rgba(255,255,255,.6);margin-bottom:8px;line-height:1.5;}
.fbox{font-family:'JetBrains Mono',monospace;font-size:12px;font-weight:600;padding:8px 11px;border-radius:8px;border-left:3px solid;}
.tabs-row{display:flex;gap:5px;max-width:820px;margin:0 auto;padding:10px 14px 0;overflow-x:auto;}
.tb{background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.12);border-radius:8px;padding:7px 11px;font-family:'Nunito',sans-serif;font-size:12px;font-weight:700;cursor:pointer;color:rgba(255,255,255,.7);white-space:nowrap;transition:all .15s;}
.tb.on{color:white;border-color:transparent;}
.cont{max-width:820px;margin:0 auto;padding:13px 14px 28px;}
/* ── TARJETAS CONTENIDO ── */
.prow{display:flex;gap:10px;align-items:flex-start;background:${B.bg1};border-radius:11px;border:2px solid ${B.border};padding:11px;margin-bottom:8px;}
.pnum{width:27px;height:27px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:800;flex-shrink:0;}
.ptxt{font-size:14px;color:${B.txt};line-height:1.55;padding-top:4px;}
.ecard{background:${B.bg1};border-radius:11px;border:2px solid ${B.border};padding:13px;margin-bottom:9px;}
.etag{font-size:10px;font-weight:800;color:${B.txt2};letter-spacing:1px;text-transform:uppercase;margin-bottom:6px;}
.eprob{font-family:'JetBrains Mono',monospace;font-size:16px;font-weight:600;color:${B.txt};margin-bottom:3px;}
.esol{font-family:'JetBrains Mono',monospace;font-size:16px;font-weight:700;margin-bottom:8px;}
.eexp{font-size:12px;color:${B.txt2};background:${B.bg2};border-radius:7px;padding:7px 9px;line-height:1.55;}
/* ── EJERCICIOS PROPUESTOS ── */
.xcard{background:${B.bg1};border-radius:12px;border:2px solid ${B.border};padding:13px;margin-bottom:9px;transition:border-color .2s;}
.xcard.correcto{border-color:#10b981;}
.xcard.incorrecto{border-color:#ef4444;}
.xcard.parcial{border-color:#f59e0b;}
.xrow{display:flex;justify-content:space-between;align-items:center;margin-bottom:7px;}
.xlabel{font-size:10px;font-weight:800;color:${B.txt2};letter-spacing:1px;text-transform:uppercase;}
.xbadge{font-size:11px;font-weight:700;padding:3px 9px;border-radius:20px;}
.xprob{font-family:'JetBrains Mono',monospace;font-size:17px;font-weight:600;color:${B.txt};margin-bottom:9px;}
.xpista{font-size:12px;color:${B.txt2};background:${B.bg2};border-radius:7px;padding:6px 9px;margin-bottom:9px;display:flex;align-items:center;gap:5px;}
.xinput{width:100%;padding:9px 11px;border-radius:9px;border:2px solid ${B.border};font-family:'JetBrains Mono',monospace;font-size:14px;color:${B.txt};background:${B.bg2};outline:none;transition:border-color .15s;margin-bottom:8px;}
.xinput:focus{border-color:#6366f1;}
.xinput:disabled{opacity:.6;}
.xbtns{display:flex;gap:7px;flex-wrap:wrap;}
.xbtn-ver{font-family:'Nunito',sans-serif;font-size:12px;font-weight:700;padding:6px 12px;border-radius:8px;cursor:pointer;border:2px solid var(--c);color:var(--c);background:none;transition:all .15s;}
.xbtn-ver:hover{background:var(--c);color:white;}
.xbtn-check{font-family:'Nunito',sans-serif;font-size:12px;font-weight:700;padding:6px 14px;border-radius:8px;cursor:pointer;background:linear-gradient(135deg,#4f46e5,#7c3aed);color:white;border:none;transition:all .2s;}
.xbtn-check:disabled{opacity:.55;cursor:not-allowed;}
.xbtn-reset{font-family:'Nunito',sans-serif;font-size:12px;font-weight:700;padding:6px 12px;border-radius:8px;cursor:pointer;background:none;border:2px solid ${B.border};color:${B.txt2};}
.xfeedback{border-radius:9px;padding:9px 12px;font-size:13px;font-weight:700;line-height:1.55;border:2px solid;margin-top:8px;}
.xfb-ok{background:#d1fae5;border-color:#10b981;color:#065f46;}
.xfb-no{background:#fee2e2;border-color:#ef4444;color:#991b1b;}
.xfb-par{background:#fef3c7;border-color:#f59e0b;color:#92400e;}
.xlock{font-size:13px;color:${B.txt2};font-weight:600;display:flex;align-items:center;gap:5px;}
/* ── IA GENERADOR ── */
.ia-box{background:${B.bg1};border-radius:13px;border:2px solid ${B.border};overflow:hidden;}
.ia-hdr{background:linear-gradient(135deg,#1e3a8a,#1d4ed8);padding:13px 15px;display:flex;align-items:center;gap:9px;}
.ia-hic{width:34px;height:34px;border-radius:8px;background:rgba(251,191,36,.2);display:flex;align-items:center;justify-content:center;font-size:18px;}
.ia-ht{font-size:13px;font-weight:800;color:white;}
.ia-hs{font-size:11px;color:rgba(255,255,255,.6);}
.ia-body{padding:15px;}
.nrow{display:flex;gap:6px;margin-bottom:11px;flex-wrap:wrap;}
.nbtn{font-family:'Nunito',sans-serif;font-size:12px;font-weight:700;padding:5px 12px;border-radius:20px;cursor:pointer;transition:all .15s;border:2px solid ${B.border};color:${B.txt2};background:none;}
.nbtn.on{border-color:var(--c);color:var(--c);background:var(--bg);}
.gbtn{width:100%;padding:12px;border-radius:10px;cursor:pointer;background:linear-gradient(135deg,#1e3a8a,#1d4ed8);color:white;border:none;font-family:'Nunito',sans-serif;font-size:14px;font-weight:800;transition:all .2s;margin-bottom:12px;}
.gbtn:hover:not(:disabled){opacity:.9;transform:translateY(-1px);}
.gbtn:disabled{opacity:.55;cursor:not-allowed;}
.ia-res{background:${B.bg2};border-radius:10px;border:2px solid ${B.border};padding:13px;}
.iachip{display:inline-flex;align-items:center;gap:3px;font-size:10px;font-weight:800;padding:3px 9px;border-radius:20px;margin-bottom:8px;letter-spacing:.4px;}
.iaprob{font-family:'JetBrains Mono',monospace;font-size:18px;font-weight:600;color:${B.txt};margin-bottom:10px;}
.iatip{font-size:12px;color:${B.txt2};background:${B.bg1};border-radius:7px;padding:7px 10px;margin-bottom:10px;line-height:1.5;border:1px solid ${B.border};}
.iainput{width:100%;padding:9px 11px;border-radius:9px;border:2px solid ${B.border};font-family:'JetBrains Mono',monospace;font-size:14px;color:${B.txt};outline:none;transition:border-color .15s;background:${B.bg1};margin-bottom:8px;}
.iainput:focus{border-color:#1d4ed8;}
.evalbtn{width:100%;padding:10px;border-radius:9px;cursor:pointer;background:linear-gradient(135deg,#065f46,#10b981);color:white;border:none;font-family:'Nunito',sans-serif;font-size:13px;font-weight:800;margin-bottom:9px;transition:opacity .2s;}
.evalbtn:disabled{opacity:.55;cursor:not-allowed;}
.evalres{border-radius:8px;padding:10px 12px;font-size:13px;font-weight:700;border:2px solid;margin-bottom:8px;}
.evalres.ok{background:#d1fae5;border-color:#10b981;color:#065f46;}
.evalres.no{background:#fee2e2;border-color:#ef4444;color:#991b1b;}
.evalres.par{background:#fef3c7;border-color:#f59e0b;color:#92400e;}
.stoggle{background:none;border:2px solid ${B.border};border-radius:8px;width:100%;padding:8px;cursor:pointer;font-family:'Nunito',sans-serif;font-size:12px;font-weight:700;color:${B.txt2};transition:all .15s;}
.stoggle:hover{border-color:var(--c);color:var(--c);}
.sbody{margin-top:10px;}
.srow{display:flex;gap:8px;align-items:flex-start;margin-bottom:7px;}
.snum{width:22px;height:22px;border-radius:50%;flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:800;}
.stxt{font-size:13px;color:${B.txt};line-height:1.5;padding-top:3px;}
.sfinal{font-family:'JetBrains Mono',monospace;font-size:16px;font-weight:700;padding-top:10px;margin-top:10px;border-top:2px dashed ${B.border};}
/* ── NOTAS ── */
.nota-box{background:${B.bg1};border-radius:12px;border:2px solid ${B.border};overflow:hidden;}
.nota-hdr{background:${B.bg2};padding:10px 13px;border-bottom:2px solid ${B.border};display:flex;align-items:center;justify-content:space-between;}
.nota-title{font-size:13px;font-weight:800;color:${B.txt};}
.nota-ta{width:100%;padding:12px 13px;border:none;background:${B.bg1};font-family:'Nunito',sans-serif;font-size:14px;color:${B.txt};resize:vertical;min-height:100px;outline:none;line-height:1.6;}
.nota-footer{padding:8px 13px;border-top:2px solid ${B.border};display:flex;justify-content:flex-end;gap:7px;}
.nota-save{padding:6px 13px;border-radius:7px;cursor:pointer;background:linear-gradient(135deg,#1e3a8a,#1d4ed8);color:white;border:none;font-family:'Nunito',sans-serif;font-size:12px;font-weight:700;}
.nota-clear{padding:6px 13px;border-radius:7px;cursor:pointer;background:none;border:2px solid ${B.border};color:${B.txt2};font-family:'Nunito',sans-serif;font-size:12px;font-weight:700;}
/* ── QUIZ ── */
.qwrap{max-width:540px;margin:0 auto;padding:16px;}
.qtitle{font-size:19px;font-weight:900;color:${B.txt};margin-bottom:4px;text-align:center;}
.qsub{font-size:13px;color:${B.txt2};text-align:center;margin-bottom:14px;}
.qpbg{background:${B.border};border-radius:20px;height:8px;overflow:hidden;margin-bottom:5px;}
.qpfill{height:100%;border-radius:20px;background:linear-gradient(90deg,#1d4ed8,#3b82f6);transition:width .4s;}
.qlbl{font-size:12px;color:${B.txt2};font-weight:700;text-align:right;margin-bottom:14px;}
.qcard{background:${B.bg1};border-radius:15px;border:2px solid ${B.border};overflow:hidden;margin-bottom:12px;}
.qhdr{background:linear-gradient(135deg,#1e3a8a,#1d4ed8);padding:13px 15px;}
.qnum{font-size:10px;font-weight:800;color:#93c5fd;letter-spacing:1px;text-transform:uppercase;margin-bottom:3px;}
.qcaso{font-size:11px;color:rgba(255,255,255,.5);margin-bottom:6px;}
.qtext{font-family:'JetBrains Mono',monospace;font-size:14px;font-weight:600;color:white;line-height:1.4;}
.qopts{padding:11px 13px;display:flex;flex-direction:column;gap:6px;}
.qopt{background:${B.bg2};border:2px solid ${B.border};border-radius:9px;padding:10px 12px;cursor:pointer;text-align:left;font-family:'JetBrains Mono',monospace;font-size:13px;font-weight:600;color:${B.txt};transition:all .15s;display:flex;align-items:center;gap:8px;}
.qopt:hover:not(:disabled){border-color:#1d4ed8;color:#1d4ed8;background:#eef2ff;}
.qopt.ok{background:#d1fae5;border-color:#10b981;color:#065f46;}
.qopt.no{background:#fee2e2;border-color:#ef4444;color:#991b1b;}
.qletter{width:23px;height:23px;border-radius:6px;background:${B.border};display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:800;flex-shrink:0;}
.qfb{margin:0 13px 11px;padding:9px 12px;border-radius:9px;font-size:13px;font-weight:700;line-height:1.5;}
.qfb.ok{background:#d1fae5;color:#065f46;}
.qfb.no{background:#fee2e2;color:#991b1b;}
.qnext{display:block;width:calc(100% - 26px);margin:0 13px 13px;padding:10px;border-radius:9px;cursor:pointer;background:linear-gradient(135deg,#1e3a8a,#1d4ed8);color:white;border:none;font-family:'Nunito',sans-serif;font-size:13px;font-weight:800;}
.qres{background:${B.bg1};border-radius:18px;border:2px solid ${B.border};padding:26px 18px;text-align:center;}
.qstars{font-size:34px;margin-bottom:9px;letter-spacing:4px;}
.qscore{font-size:44px;font-weight:900;color:#1d4ed8;margin-bottom:4px;}
.qmsg{font-size:14px;font-weight:700;color:${B.txt};margin-bottom:4px;}
.qmsub{font-size:13px;color:${B.txt2};margin-bottom:18px;}
.qacts{display:flex;gap:8px;justify-content:center;flex-wrap:wrap;}
.qa1{padding:10px 18px;border-radius:9px;cursor:pointer;background:linear-gradient(135deg,#1e3a8a,#1d4ed8);color:white;border:none;font-family:'Nunito',sans-serif;font-size:13px;font-weight:800;}
.qa2{padding:10px 18px;border-radius:9px;cursor:pointer;background:none;border:2px solid #1d4ed8;color:#1d4ed8;font-family:'Nunito',sans-serif;font-size:13px;font-weight:800;}
/* ── STATS / BADGES / LEADERBOARD / GLOSARIO ── */
.stat-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(130px,1fr));gap:9px;margin-bottom:14px;}
.stat-card{background:${B.bg1};border-radius:11px;border:2px solid ${B.border};padding:13px;text-align:center;}
.stat-n{font-size:26px;font-weight:900;margin-bottom:3px;}
.stat-l{font-size:11px;font-weight:700;color:${B.txt2};}
.bar-row{display:flex;align-items:center;gap:9px;margin-bottom:7px;}
.bar-lbl{font-size:12px;font-weight:700;color:${B.txt2};width:88px;text-align:right;flex-shrink:0;}
.bar-bg{flex:1;background:${B.border};border-radius:20px;height:9px;overflow:hidden;}
.bar-fill{height:100%;border-radius:20px;transition:width .6s;}
.bar-val{font-size:12px;font-weight:800;color:${B.txt};width:28px;}
.badge-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(132px,1fr));gap:9px;}
.badge-card{background:${B.bg1};border-radius:11px;border:2px solid ${B.border};padding:13px;text-align:center;transition:all .2s;}
.badge-card.on{border-color:#fbbf24;background:${dark?"#1C1A0A":"#FFFBEB"};}
.badge-ico{font-size:28px;margin-bottom:6px;}
.badge-name{font-size:12px;font-weight:800;color:${B.txt};margin-bottom:3px;}
.badge-desc{font-size:10px;color:${B.txt2};line-height:1.4;}
.lb-row{background:${B.bg1};border-radius:11px;border:2px solid ${B.border};padding:12px 14px;margin-bottom:7px;display:flex;align-items:center;gap:11px;}
.lb-row.yo{border-color:#fbbf24;background:${dark?"#1C1A0A":"#FFFBEB"};}
.lb-pos{font-size:17px;font-weight:900;width:30px;text-align:center;flex-shrink:0;}
.lb-name{font-size:13px;font-weight:800;color:${B.txt};}
.lb-sub{font-size:11px;color:${B.txt2};}
.lb-xp{font-size:14px;font-weight:900;color:#fbbf24;}
.glos-search{width:100%;padding:10px 13px;border-radius:10px;border:2px solid ${B.border};font-family:'Nunito',sans-serif;font-size:14px;color:${B.txt};background:${B.bg1};outline:none;margin-bottom:12px;transition:border-color .15s;}
.glos-search:focus{border-color:#1d4ed8;}
.glos-card{background:${B.bg1};border-radius:11px;border:2px solid ${B.border};padding:13px;margin-bottom:8px;}
.glos-term{font-size:14px;font-weight:800;color:${B.txt};margin-bottom:3px;}
.glos-def{font-size:13px;color:${B.txt2};line-height:1.55;margin-bottom:5px;}
.glos-ej{font-family:'JetBrains Mono',monospace;font-size:11px;padding:5px 9px;border-radius:6px;background:${B.bg2};color:#6366f1;border-left:3px solid #6366f1;}
/* ── DOCENTE ── */
.doc-panel{background:${B.bg1};border-radius:13px;border:2px solid ${B.border};overflow:hidden;margin-bottom:12px;}
.doc-hdr{padding:13px 15px;display:flex;align-items:center;gap:9px;}
.doc-ht{font-size:13px;font-weight:800;color:white;}
.doc-hs{font-size:11px;color:rgba(255,255,255,.6);}
.doc-body{padding:15px;}
.doc-input{width:100%;padding:9px 11px;border-radius:8px;border:2px solid ${B.border};font-family:'Nunito',sans-serif;font-size:13px;color:${B.txt};background:${B.bg2};outline:none;margin-bottom:8px;transition:border-color .15s;}
.doc-input:focus{border-color:#6366f1;}
.doc-btn{padding:10px 16px;border-radius:8px;cursor:pointer;background:linear-gradient(135deg,#7c3aed,#6366f1);color:white;border:none;font-family:'Nunito',sans-serif;font-size:13px;font-weight:800;}
.doc-ex{background:${B.bg2};border-radius:9px;border:2px solid ${B.border};padding:10px 12px;margin-bottom:7px;display:flex;align-items:center;gap:9px;}
.doc-ex-txt{font-family:'JetBrains Mono',monospace;font-size:13px;font-weight:600;color:${B.txt};flex:1;}
.doc-ex-del{background:none;border:2px solid #ef4444;color:#ef4444;border-radius:7px;padding:3px 8px;cursor:pointer;font-size:11px;font-weight:700;}
.doc-code{background:${B.bg2};border:2px solid #6366f1;border-radius:8px;padding:9px 13px;font-family:'JetBrains Mono',monospace;font-size:13px;color:#6366f1;font-weight:700;text-align:center;cursor:pointer;transition:all .15s;}
.doc-code:hover{background:#6366f1;color:white;}
/* ── DESAFÍOS ── */
.dpage{max-width:600px;margin:0 auto;padding:16px;}
.dcard{background:${B.bg1};border-radius:13px;border:2px solid ${B.border};margin-bottom:10px;overflow:hidden;transition:all .2s;}
.dcard.done{border-color:#10b981;}
.dcard.active{border-color:#1d4ed8;box-shadow:0 3px 16px rgba(29,78,216,.1);}
.dhdr{padding:13px 14px;display:flex;align-items:center;gap:10px;}
.dic{width:42px;height:42px;border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:20px;flex-shrink:0;}
.dname{font-size:14px;font-weight:800;color:${B.txt};margin-bottom:2px;}
.ddesc{font-size:12px;color:${B.txt2};}
.dpb{padding:0 14px 13px;}
.dpb-bg{background:${B.border};border-radius:20px;height:7px;overflow:hidden;margin-bottom:5px;}
.dpb-fill{height:100%;border-radius:20px;transition:width .5s;}
.dpb-lbl{font-size:11px;font-weight:700;color:${B.txt2};display:flex;justify-content:space-between;}
.drec{display:flex;align-items:center;gap:5px;background:${B.bg2};border-radius:7px;padding:6px 10px;margin-top:6px;font-size:12px;color:${B.txt2};font-weight:600;}
.dlock{padding:8px 14px 12px;font-size:12px;color:${B.txt2};font-weight:600;display:flex;align-items:center;gap:5px;}
/* ── AJUSTES ── */
.ajuste-overlay{position:fixed;inset:0;z-index:1000;background:rgba(0,0,0,.6);backdrop-filter:blur(5px);display:flex;align-items:flex-end;justify-content:center;}
.ajuste-panel{background:${B.bg1};border-radius:22px 22px 0 0;width:100%;max-width:520px;max-height:88vh;overflow-y:auto;box-shadow:0 -6px 36px rgba(0,0,0,.4);}
.aj-handle{display:flex;justify-content:center;padding:12px 0 5px;}
.aj-bar{width:38px;height:4px;border-radius:2px;background:${B.border};}
.aj-body{padding:4px 20px 28px;}
.aj-title{font-size:18px;font-weight:900;color:${B.txt};margin-bottom:2px;}
.aj-sub{font-size:13px;color:${B.txt2};margin-bottom:20px;}
.aj-sec{font-size:10px;font-weight:800;color:${B.txt2};text-transform:uppercase;letter-spacing:.8px;margin-bottom:9px;}
.fondo-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:7px;margin-bottom:20px;}
.fondo-btn{padding:11px 4px;border-radius:12px;cursor:pointer;display:flex;flex-direction:column;align-items:center;gap:4px;transition:all .15s;}
.fondo-btn.on{box-shadow:0 0 0 3px #fbbf24;}
.toggle-row{display:flex;align-items:center;justify-content:space-between;padding:3px 0;}
.toggle-lbl{font-size:14px;font-weight:700;color:${B.txt};}
.toggle-sub{font-size:11px;color:${B.txt2};}
.toggle-sw{width:46px;height:25px;border-radius:13px;cursor:pointer;transition:background .2s;position:relative;flex-shrink:0;}
.toggle-thumb{position:absolute;width:19px;height:19px;border-radius:50%;background:white;top:3px;transition:left .2s;box-shadow:0 1px 4px rgba(0,0,0,.25);}
.aj-apply{width:100%;padding:13px;border-radius:11px;cursor:pointer;background:linear-gradient(135deg,#1e3a8a,#1d4ed8);color:white;border:none;font-family:'Nunito',sans-serif;font-size:14px;font-weight:800;box-shadow:0 3px 14px rgba(29,78,216,.3);margin-top:8px;}
/* ── MISC ── */
.spin{display:inline-block;width:15px;height:15px;border:2px solid rgba(255,255,255,.3);border-top-color:white;border-radius:50%;animation:sp .7s linear infinite;vertical-align:middle;margin-right:5px;}
@keyframes sp{to{transform:rotate(360deg);}}
.errbox{background:#fee2e2;border:2px solid #ef4444;border-radius:9px;padding:10px 13px;font-size:13px;font-weight:700;color:#991b1b;margin-bottom:10px;}
.toast{position:fixed;bottom:20px;left:50%;transform:translateX(-50%);background:#1e293b;color:white;padding:10px 18px;border-radius:26px;font-size:13px;font-weight:700;z-index:9999;box-shadow:0 6px 24px rgba(0,0,0,.3);animation:tin .3s ease;pointer-events:none;white-space:nowrap;}
@keyframes tin{from{opacity:0;transform:translateX(-50%) translateY(7px);}to{opacity:1;transform:translateX(-50%) translateY(0);}}
.ftr{background:#0f172a;padding:11px 14px;display:flex;align-items:center;justify-content:center;gap:7px;border-top:1px solid rgba(255,255,255,.05);}
.ftr img{width:20px;height:20px;object-fit:contain;opacity:.55;}
.ftr-t{font-size:11px;color:#475569;font-weight:600;}
.ftr-t strong{color:#94a3b8;}
`;
}

// ── HELPERS ───────────────────────────────────────────────────────────
function Toast({ msg }) { return msg ? <div className="toast">{msg}</div> : null; }
function Spinner() { return <span className="spin" />; }
function useToast() {
  const [msg, setMsg] = useState("");
  const show = (m) => { setMsg(m); setTimeout(() => setMsg(""), 2800); };
  return [msg, show];
}

// ── INTRO ─────────────────────────────────────────────────────────────
function Intro({ onNav }) {
  const stars = Array.from({ length: 38 }, () => ({
    s: Math.random() * 2.5 + .5, top: Math.random() * 100, left: Math.random() * 100,
    d: (2 + Math.random() * 3) + "s", dl: (Math.random() * 4) + "s"
  }));
  return (
    <div className="intro">
      {stars.map((s, i) => (
        <div key={i} className="star" style={{ width: s.s, height: s.s, top: s.top + "%", left: s.left + "%", "--d": s.d, "--dl": s.dl }} />
      ))}
      <div className="logo-hero-wrap">
        <div className="logo-hero-glow" />
        <div className="logo-hero-r1" />
        <div className="logo-hero-r2" />
        <div className="logo-dot" />
        <div className="logo-hero-bg">
          <img src={LOGO} alt="Escudo Unimagdalena"
            onError={e => { e.target.style.display = "none"; e.target.parentNode.innerHTML = '<span style="font-size:52px">🎓</span>'; }} />
        </div>
      </div>
      <div className="inst-banner">
        <span className="inst-name">Universidad del Magdalena</span>
        <div className="inst-sep" />
        <span className="inst-dept">Dep. de Matemáticas</span>
      </div>
      <div className="ititle">Domina la<br /><span>Factorización</span></div>
      <div className="isub">Aprende los 8 casos con teoría, ejemplos, ejercicios propuestos, evaluación IA, Quiz y más.</div>
      <div className="chips">
        {["ax+ay=a(x+y)", "a²−b²", "(a±b)²", "a³±b³", "ax²+bx+c", "agrupación"].map((c, i) =>
          <div key={i} className="chip">{c}</div>
        )}
      </div>
      <div className="ibtns">
        <button className="ib1" onClick={() => onNav("menu")}>🚀 Comenzar a Aprender</button>
        <button className="ib2" onClick={() => onNav("quiz")}>⚡ Modo Quiz</button>
        <button className="ib3" onClick={() => onNav("desafios")}>🏆 Desafíos y Desbloqueos</button>
        <button className="ib4" onClick={() => onNav("docente")}>👨‍🏫 Modo Docente</button>
        <button className="ib5" onClick={() => onNav("__ajustes")}>🎨 Personalizar fondo y sonidos</button>
      </div>
      <div className="istat">
        {[["8","Casos"],["∞","Ejercicios"],["12","Insignias"],["∞","IA"]].map(([n,l]) => (
          <div key={l}><div className="istat-n">{n}</div><div className="istat-l">{l}</div></div>
        ))}
      </div>
    </div>
  );
}

// ── QUIZ ──────────────────────────────────────────────────────────────
function Quiz({ onBack, onScore, sfx }) {
  const [idx, setIdx] = useState(0);
  const [sel, setSel] = useState(null);
  const [score, setScore] = useState(0);
  const [done, setDone] = useState(false);
  const L = ["A","B","C","D"];
  const q = QUIZ_QS[idx];
  const pick = (i) => {
    if (sel !== null) return;
    setSel(i);
    if (i === q.ok) { setScore(s => s + 1); sfx.correcto(); } else sfx.incorrecto();
  };
  const next = () => {
    sfx.click();
    const fs = score + (sel === q.ok ? 1 : 0);
    if (idx + 1 >= QUIZ_QS.length) { setDone(true); onScore(fs); return; }
    setIdx(i => i + 1); setSel(null);
  };
  const reset = () => { sfx.click(); setIdx(0); setSel(null); setScore(0); setDone(false); };

  if (done) {
    const pct = Math.round(score / QUIZ_QS.length * 100);
    const stars = pct === 100 ? "🌟🌟🌟" : pct >= 75 ? "⭐⭐⭐" : pct >= 50 ? "⭐⭐" : "⭐";
    return (
      <div className="main"><div className="qwrap" style={{ paddingTop: 22 }}>
        <div className="qres">
          <div className="qstars">{stars}</div>
          <div className="qscore">{score}/{QUIZ_QS.length}</div>
          <div className="qmsg">{pct === 100 ? "¡Perfecto! ¡Eres un experto!" : pct >= 75 ? "¡Muy bien!" : pct >= 50 ? "Buen intento. ¡Sigue!" : "Repasa los casos. ¡Tú puedes!"}</div>
          <div className="qmsub">{pct}% de respuestas correctas</div>
          <div className="qacts">
            <button className="qa1" onClick={reset}>🔄 Reintentar</button>
            <button className="qa2" onClick={onBack}>📚 Estudiar</button>
          </div>
        </div>
      </div></div>
    );
  }
  return (
    <div className="main"><div className="qwrap">
      <div className="qtitle">⚡ Quiz de Factorización</div>
      <div className="qsub">Elige la opción correcta en cada pregunta</div>
      <div className="qpbg"><div className="qpfill" style={{ width: (idx / QUIZ_QS.length * 100) + "%" }} /></div>
      <div className="qlbl">Pregunta {idx + 1} / {QUIZ_QS.length} · {score} correctas</div>
      <div className="qcard">
        <div className="qhdr">
          <div className="qnum">Pregunta {idx + 1}</div>
          <div className="qcaso">{q.caso}</div>
          <div className="qtext">{q.q}</div>
        </div>
        <div className="qopts">
          {q.ops.map((op, i) => {
            let cls = "qopt";
            if (sel !== null) { if (i === q.ok) cls += " ok"; else if (i === sel) cls += " no"; }
            return (
              <button key={i} className={cls} onClick={() => pick(i)} disabled={sel !== null}>
                <span className="qletter">{L[i]}</span><span>{op}</span>
              </button>
            );
          })}
        </div>
        {sel !== null && <div className={`qfb ${sel === q.ok ? "ok" : "no"}`}>{sel === q.ok ? "✅ ¡Correcto!" : "❌ Incorrecto. Correcta: " + q.ops[q.ok]}</div>}
        {sel !== null && <button className="qnext" onClick={next}>{idx + 1 >= QUIZ_QS.length ? "Ver resultado 🏆" : "Siguiente →"}</button>}
      </div>
    </div></div>
  );
}

// ── DESAFÍOS ──────────────────────────────────────────────────────────
function Desafios({ prog }) {
  const cols = ["#10B981","#F59E0B","#6366F1","#EC4899"];
  return (
    <div className="main"><div className="dpage">
      <div className="stitle">🏆 Desafíos y Desbloqueos</div>
      <div className="ssub">Supera retos para desbloquear ejercicios de mayor dificultad</div>
      <div style={{ background:"linear-gradient(135deg,#1e3a8a,#1d4ed8)", borderRadius:12, padding:"12px 14px", marginBottom:14, display:"flex", alignItems:"center", gap:10 }}>
        <span style={{ fontSize:24 }}>🔓</span>
        <div>
          <div style={{ fontSize:14, fontWeight:800, color:"white" }}>Nivel desbloqueado</div>
          <div style={{ fontSize:12, color:"rgba(255,255,255,.7)", marginTop:2 }}>Tienes acceso hasta <strong style={{ color:"#fbbf24" }}>{NV_LABELS[prog.nivelDesbloqueado]}</strong></div>
        </div>
      </div>
      {DESAFIOS.map((d, i) => {
        const curr = prog[d.campo] || 0;
        const pct = Math.min(100, Math.round(curr / d.meta * 100));
        const done = curr >= d.meta;
        const prevDone = i === 0 || (prog[DESAFIOS[i-1].campo] || 0) >= DESAFIOS[i-1].meta;
        let cls = "dcard"; if (done) cls += " done"; else if (prevDone) cls += " active";
        return (
          <div key={d.id} className={cls}>
            <div className="dhdr">
              <div className="dic" style={{ background: cols[i] + "22" }}>{d.ico}</div>
              <div style={{ flex:1 }}><div className="dname">{d.titulo}</div><div className="ddesc">{d.desc}</div></div>
              <span style={{ fontSize:18 }}>{done ? "✅" : prevDone ? "🔓" : "🔒"}</span>
            </div>
            {prevDone ? (
              <div className="dpb">
                <div className="dpb-bg"><div className="dpb-fill" style={{ width: pct + "%", background: done ? "#10b981" : cols[i] }} /></div>
                <div className="dpb-lbl"><span>{curr} / {d.meta}</span><span>{pct}%</span></div>
                <div className="drec">{d.ico} {d.recompensa}</div>
              </div>
            ) : <div className="dlock">🔒 Completa el desafío anterior primero</div>}
          </div>
        );
      })}
    </div></div>
  );
}

// ── ESTADÍSTICAS ──────────────────────────────────────────────────────
function Estadisticas({ prog }) {
  const xp = prog.correctasPropuestas * 8 + prog.iaCorrectos * 15 + prog.quizMax * 5 + prog.streak * 8;
  const ins = INSIGNIAS.filter(b => b.cond(prog));
  const bars = [
    { label:"Propuestos",  val: prog.ejercsPropuestos,  max: 20, color:"#0EA5E9" },
    { label:"Correctas",   val: prog.correctasPropuestas, max: 20, color:"#10B981" },
    { label:"IA Correct.", val: prog.iaCorrectos,        max: 10, color:"#6366F1" },
    { label:"Quiz Máx.",   val: prog.quizMax,            max: 8,  color:"#EC4899" },
    { label:"Racha días",  val: prog.streak,             max: 7,  color:"#EF4444" }
  ];
  return (
    <div className="main"><div className="page">
      <div className="stitle">📊 Mis Estadísticas</div>
      <div className="ssub">Tu progreso acumulado en la app</div>
      <div className="stat-grid">
        <div className="stat-card"><div className="stat-n" style={{ color:"#fbbf24" }}>{xp}</div><div className="stat-l">XP Total</div></div>
        <div className="stat-card"><div className="stat-n" style={{ color:"#10B981" }}>{prog.correctasPropuestas}</div><div className="stat-l">Correctas</div></div>
        <div className="stat-card"><div className="stat-n" style={{ color:"#6366F1" }}>{ins.length}</div><div className="stat-l">Insignias</div></div>
        <div className="stat-card"><div className="stat-n" style={{ color:"#EF4444" }}>🔥{prog.streak}</div><div className="stat-l">Racha días</div></div>
      </div>
      <div style={{ marginBottom:16 }}>
        <div style={{ fontSize:14, fontWeight:900, marginBottom:11 }}>Actividad por categoría</div>
        {bars.map(b => (
          <div key={b.label} className="bar-row">
            <div className="bar-lbl">{b.label}</div>
            <div className="bar-bg"><div className="bar-fill" style={{ width: Math.min(100, b.val / b.max * 100) + "%", background: b.color }} /></div>
            <div className="bar-val">{b.val}</div>
          </div>
        ))}
      </div>
      <div style={{ fontSize:14, fontWeight:900, marginBottom:10 }}>🏅 Mis Insignias</div>
      <div className="badge-grid">
        {INSIGNIAS.map(b => {
          const g = b.cond(prog);
          return (
            <div key={b.id} className={`badge-card${g ? " on" : ""}`}>
              <div className="badge-ico" style={{ filter: g ? "none" : "grayscale(1)", opacity: g ? 1 : .35 }}>{b.ico}</div>
              <div className="badge-name">{b.nombre}</div>
              <div className="badge-desc">{b.desc}</div>
              {g && <div style={{ marginTop:5, fontSize:10, fontWeight:800, color:"#d97706" }}>✅ Obtenida</div>}
            </div>
          );
        })}
      </div>
    </div></div>
  );
}

// ── LEADERBOARD ───────────────────────────────────────────────────────
function Leaderboard({ prog }) {
  const xp = prog.correctasPropuestas * 8 + prog.iaCorrectos * 15 + prog.quizMax * 5 + prog.streak * 8;
  const ins = INSIGNIAS.filter(b => b.cond(prog)).length;
  const todos = [...LEADERBOARD_BASE, { nombre:"Tú", xp, ins, nivel: NV_LABELS[prog.nivelDesbloqueado]?.split(" ")[0] || "Básico", yo: true }]
    .sort((a, b) => b.xp - a.xp);
  const medals = ["🥇","🥈","🥉"];
  return (
    <div className="main"><div className="page">
      <div className="stitle">🏅 Tabla de Clasificación</div>
      <div className="ssub">Ranking del curso por XP acumulado</div>
      {todos.map((r, i) => (
        <div key={i} className={`lb-row${r.yo ? " yo" : ""}`}>
          <div className="lb-pos">{i < 3 ? medals[i] : i + 1}</div>
          <div style={{ flex:1 }}>
            <div className="lb-name">{r.nombre}{r.yo ? " (Tú)" : ""}</div>
            <div className="lb-sub">{r.ins} insignias · {r.nivel}</div>
          </div>
          <div className="lb-xp">⭐ {r.xp}</div>
        </div>
      ))}
    </div></div>
  );
}

// ── GLOSARIO ──────────────────────────────────────────────────────────
function Glosario() {
  const [q, setQ] = useState("");
  const filt = GLOSARIO.filter(g => g.t.toLowerCase().includes(q.toLowerCase()) || g.d.toLowerCase().includes(q.toLowerCase()));
  return (
    <div className="main"><div className="page">
      <div className="stitle">📚 Glosario de Términos</div>
      <div className="ssub">Conceptos clave de factorización algebraica</div>
      <input className="glos-search" placeholder="🔍 Buscar término..." value={q} onChange={e => setQ(e.target.value)} />
      {filt.map((g, i) => (
        <div key={i} className="glos-card">
          <div className="glos-term">{g.t}</div>
          <div className="glos-def">{g.d}</div>
          <div className="glos-ej">Ej: {g.e}</div>
        </div>
      ))}
      {!filt.length && <div style={{ textAlign:"center", padding:28, color:"#94a3b8", fontSize:14, fontWeight:700 }}>Sin resultados</div>}
    </div></div>
  );
}

// ── MODO DOCENTE ──────────────────────────────────────────────────────
function ModoDocente() {
  const [ejercicios, setEjercicios] = useState([]);
  const [prob, setProb] = useState(""); const [resp, setResp] = useState("");
  const [tema, setTema] = useState(""); const [genLoad, setGenLoad] = useState(false);
  const [codigo, setCodigo] = useState(""); const [errDoc, setErrDoc] = useState("");
  const [toastMsg, showToast] = useToast();

  const agregar = () => { if (!prob.trim()) return; setEjercicios(p => [...p, { prob, resp }]); setProb(""); setResp(""); };

  const genConIA = async () => {
    if (!tema.trim()) return;
    setGenLoad(true); setErrDoc("");
    try {
      const prompt = `Genera exactamente 3 ejercicios de factorización algebraica sobre: "${tema}".
Responde SOLO con este JSON (sin texto antes ni después):
{"ejercicios":[{"prob":"expresión algebraica","resp":"factorización correcta"}]}`;
      const data = await apiClaude(prompt, 800);
      setEjercicios(p => [...p, ...(Array.isArray(data.ejercicios) ? data.ejercicios : [])]);
      showToast("✅ 3 ejercicios generados con IA");
    } catch {
      setErrDoc("Error al generar. Intenta de nuevo.");
    }
    setGenLoad(false);
  };

  return (
    <div className="main">
      <Toast msg={toastMsg} />
      <div className="page">
        <div className="stitle">👨‍🏫 Panel del Docente</div>
        <div className="ssub">Crea y comparte ejercicios con tus estudiantes</div>

        <div className="doc-panel">
          <div className="doc-hdr" style={{ background:"linear-gradient(135deg,#7c3aed,#6366f1)" }}>
            <div style={{ width:32,height:32,borderRadius:8,background:"rgba(251,191,36,.2)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:17 }}>🤖</div>
            <div><div className="doc-ht">Generar con IA</div><div className="doc-hs">La IA crea ejercicios según el tema que indiques</div></div>
          </div>
          <div className="doc-body">
            <input className="doc-input" placeholder="Tema (ej: diferencia de cuadrados, nivel intermedio)" value={tema} onChange={e => setTema(e.target.value)} />
            {errDoc && <div className="errbox">{errDoc}</div>}
            <button className="doc-btn" onClick={genConIA} disabled={genLoad || !tema.trim()}>
              {genLoad ? <><Spinner />Generando...</> : "✨ Generar 3 ejercicios"}
            </button>
          </div>
        </div>

        <div className="doc-panel">
          <div className="doc-hdr" style={{ background:"linear-gradient(135deg,#1e3a8a,#1d4ed8)" }}>
            <div style={{ width:32,height:32,borderRadius:8,background:"rgba(251,191,36,.2)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:17 }}>✏️</div>
            <div><div className="doc-ht">Agregar manualmente</div><div className="doc-hs">Escribe el problema y la respuesta esperada</div></div>
          </div>
          <div className="doc-body">
            <input className="doc-input" placeholder="Problema (ej: 6x² + 9x + 3)" value={prob} onChange={e => setProb(e.target.value)} />
            <input className="doc-input" placeholder="Respuesta (ej: 3(2x² + 3x + 1))" value={resp} onChange={e => setResp(e.target.value)} />
            <button className="doc-btn" onClick={agregar} disabled={!prob.trim()}>+ Agregar</button>
          </div>
        </div>

        {ejercicios.length > 0 && (
          <div>
            <div style={{ fontSize:14,fontWeight:900,marginBottom:10 }}>📋 Banco de ejercicios ({ejercicios.length})</div>
            {ejercicios.map((e, i) => (
              <div key={i} className="doc-ex">
                <div className="doc-ex-txt">{e.prob}{e.resp ? ` → ${e.resp}` : ""}</div>
                <button className="doc-ex-del" onClick={() => setEjercicios(p => p.filter((_,j) => j !== i))}>✕</button>
              </div>
            ))}
            <div style={{ marginTop:12 }}>
              {codigo
                ? <div className="doc-code" onClick={() => showToast("📋 Código: " + codigo)}>📤 Código: <strong>{codigo}</strong> — clic para copiar</div>
                : <button className="doc-btn" onClick={() => setCodigo("DOC" + Math.random().toString(36).slice(2,8).toUpperCase())} style={{ width:"100%",background:"linear-gradient(135deg,#7c3aed,#6366f1)" }}>🔗 Generar código para compartir</button>
              }
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── AJUSTES ───────────────────────────────────────────────────────────
function PanelAjustes({ fondoId, setFondoId, dark, setDark, sonidoOn, setSonidoOn, volumen, setVolumen, sfx, onClose }) {
  const B = dark ? { txt:"#f1f5f9", txt2:"#94a3b8", bg2:"#0f172a", border:"#334155" }
                 : { txt:"#1e293b", txt2:"#64748b", bg2:"#f8fafc", border:"#e2e8f0" };
  const Toggle = ({ on, toggle, label, sub }) => (
    <div className="toggle-row">
      <div><div className="toggle-lbl">{label}</div>{sub && <div className="toggle-sub">{sub}</div>}</div>
      <div className="toggle-sw" style={{ background: on ? "#1d4ed8" : B.border }} onClick={toggle}>
        <div className="toggle-thumb" style={{ left: on ? 24 : 3 }} />
      </div>
    </div>
  );
  return (
    <div className="ajuste-overlay" onClick={onClose}>
      <div className="ajuste-panel" onClick={e => e.stopPropagation()}>
        <div className="aj-handle"><div className="aj-bar" /></div>
        <div className="aj-body">
          <div className="aj-title">🎨 Personalización</div>
          <div className="aj-sub">Ajusta el fondo, tema y sonidos de la app</div>

          <div className="aj-sec">🌙 Tema de color</div>
          <div style={{ display:"flex", gap:9, marginBottom:20 }}>
            {[{d:false,ico:"☀️",label:"Claro"},{d:true,ico:"🌙",label:"Oscuro"}].map(({d,ico,label}) => (
              <button key={label} onClick={() => setDark(d)} style={{
                flex:1, padding:"11px 8px", borderRadius:12, cursor:"pointer",
                fontFamily:"'Nunito',sans-serif", border:`2px solid ${dark===d?"#3b82f6":B.border}`,
                background: dark===d ? (dark?"#1e3a8a":"#eff6ff") : "transparent"
              }}>
                <div style={{ fontSize:20, marginBottom:3 }}>{ico}</div>
                <div style={{ fontSize:13, fontWeight:700, color: dark===d ? (dark?"white":"#1d4ed8") : B.txt2 }}>{label}</div>
              </button>
            ))}
          </div>

          <div className="aj-sec">🖼️ Fondo de portada</div>
          <div className="fondo-grid">
            {FONDOS.map(f => (
              <button key={f.id} className={`fondo-btn${fondoId===f.id?" on":""}`}
                onClick={() => setFondoId(f.id)}
                style={{ background: f.main, border:`2px solid ${fondoId===f.id?"#fbbf24":B.border}` }}>
                <span style={{ fontSize:20 }}>{f.emoji}</span>
                <span style={{ fontSize:10, fontWeight:700, color:"white", textShadow:"0 1px 4px rgba(0,0,0,.9)", textAlign:"center" }}>{f.nombre}</span>
                {fondoId===f.id && <span style={{ fontSize:12, color:"#fbbf24" }}>★</span>}
              </button>
            ))}
          </div>

          <div className="aj-sec">🔊 Sonidos</div>
          <div style={{ background:B.bg2, borderRadius:12, border:`2px solid ${B.border}`, padding:"12px 14px", marginBottom:16 }}>
            <Toggle on={sonidoOn} toggle={() => setSonidoOn(s => !s)} label="Efectos de sonido" sub="Sonidos al responder y navegar" />
            {sonidoOn && <>
              <div style={{ marginTop:12, fontSize:12, fontWeight:700, color:B.txt2, marginBottom:6, display:"flex", justifyContent:"space-between" }}>
                <span>🔉 Volumen</span><span style={{ color:"#3b82f6", fontWeight:800 }}>{volumen}%</span>
              </div>
              <input type="range" min="10" max="100" step="10" value={volumen}
                onChange={e => setVolumen(Number(e.target.value))}
                style={{ width:"100%", accentColor:"#1d4ed8", cursor:"pointer", height:5 }} />
              <div style={{ display:"flex", gap:8, marginTop:10, flexWrap:"wrap" }}>
                {[["✅","Correcto",()=>sfx.correcto()],["❌","Incorrecto",()=>sfx.incorrecto()],["🔔","Clic",()=>sfx.click()],["🎊","Desbloqueo",()=>sfx.desbloqueo()]].map(([ico,lbl,fn]) => (
                  <button key={lbl} onClick={fn} style={{ flex:1, minWidth:60, padding:"8px 4px", borderRadius:9, cursor:"pointer", fontFamily:"'Nunito',sans-serif", fontSize:12, fontWeight:700, border:`2px solid ${B.border}`, background:"transparent", color:B.txt }}>
                    {ico} {lbl}
                  </button>
                ))}
              </div>
            </>}
          </div>

          <button className="aj-apply" onClick={onClose}>✅ Aplicar y cerrar</button>
        </div>
      </div>
    </div>
  );
}

// ── CASO PANEL ────────────────────────────────────────────────────────
function CasoPanel({ caso, onBack, prog, onProgUpdate, sfx }) {
  const [tab, setTab]             = useState("teoria");
  const [ans, setAns]             = useState({});
  const [inputs, setInputs]       = useState({});
  const [estados, setEstados]     = useState({});
  const [feedbacks, setFeedbacks] = useState({});
  const [pistas, setPistas]       = useState({});
  const [nivel, setNivel]         = useState("Básico");
  const [cantidad, setCantidad]   = useState(1);
  const [genLoad, setGenLoad]     = useState(false);
  const [genEjers, setGenEjers]   = useState([]);
  const [genIdx, setGenIdx]       = useState(0);
  const [genErr, setGenErr]       = useState("");
  const [verSoles, setVerSoles]   = useState({});
  const [genResps, setGenResps]   = useState({});
  const [evalLoads, setEvalLoads] = useState({});
  const [evalReses, setEvalReses] = useState({});
  const [nota, setNota]           = useState("");
  const [notaSaved, setNotaSaved] = useState(false);
  const [toastMsg, showToast]     = useToast();
  const montado                   = useRef(true);

  useEffect(() => {
    montado.current = true;
    return () => { montado.current = false; };
  }, []);

  const c = caso.color, bg = caso.bg;

  // ── Verificar ejercicio propuesto (local, instantáneo) ─────────────
  const verificarEjercicio = (idx, ej) => {
    const raw = (inputs[idx] || "").trim();
    if (!raw) return;

    const norm = (s) => s
      .toLowerCase()
      .replace(/\s+/g, "")
      .replace(/[×·]/g, "*")
      .replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹]/g, d => String("⁰¹²³⁴⁵⁶⁷⁸⁹".indexOf(d)))
      .replace(/[−–]/g, "-")
      .replace(/\+-/g, "-")
      .replace(/-\+/g, "-")
      .replace(/\^/g, "");

    const u = norm(raw);
    const c_ = norm(ej.resp);
    const exacto = u === c_;
    const factores = c_.replace(/[()]/g, " ").split(/[\s*+\-]/).filter(f => f.length > 1);
    const aciertos = factores.filter(f => u.includes(f)).length;
    const parcial  = !exacto && factores.length > 0 && aciertos >= Math.ceil(factores.length * 0.6);

    if (exacto) {
      setEstados(p => ({ ...p, [idx]: "ok" }));
      setFeedbacks(p => ({ ...p, [idx]: "¡Excelente! Tu respuesta es correcta." }));
      sfx.correcto();
      showToast("🎉 ¡Correcto! +XP");
      onProgUpdate("propuesto_correcto");
    } else if (parcial) {
      setEstados(p => ({ ...p, [idx]: "par" }));
      setFeedbacks(p => ({ ...p, [idx]: `Casi. Revisa la forma completa. Correcta: ${ej.resp}` }));
      sfx.incorrecto();
    } else {
      setEstados(p => ({ ...p, [idx]: "no" }));
      setFeedbacks(p => ({ ...p, [idx]: `Incorrecto. La respuesta correcta es: ${ej.resp}` }));
      sfx.incorrecto();
    }
  };

  const resetEj = (idx) => {
    setInputs(p    => { const n = {...p}; delete n[idx]; return n; });
    setEstados(p   => { const n = {...p}; delete n[idx]; return n; });
    setFeedbacks(p => { const n = {...p}; delete n[idx]; return n; });
    setAns(p       => { const n = {...p}; delete n[idx]; return n; });
    setPistas(p    => { const n = {...p}; delete n[idx]; return n; });
  };

  // ── Generador IA ───────────────────────────────────────────────────
  const generarEjercicios = async () => {
    const nv = { "Básico":1, "Intermedio":2, "Avanzado":3 }[nivel];
    if (nv > prog.nivelDesbloqueado) { showToast("🔒 Completa desafíos para desbloquear este nivel"); return; }
    if (!montado.current) return;
    setGenLoad(true); setGenEjers([]); setGenIdx(0); setGenErr("");
    setVerSoles({}); setGenResps({}); setEvalLoads({}); setEvalReses({});
    try {
      let data;
      if (cantidad === 1) {
        const p = `Genera UN ejercicio de factorización algebraica tipo "${caso.nombre}" dificultad "${nivel}". Responde ÚNICAMENTE este JSON:\n{"problema":"expresión","respuesta":"factorización","tip":"pista corta","pasos":["paso1","paso2","paso3","paso4"]}`;
        data = [await apiClaude(p, 700)];
      } else {
        const p = `Genera ${cantidad} ejercicios DISTINTOS de factorización algebraica tipo "${caso.nombre}" dificultad "${nivel}". Responde ÚNICAMENTE este JSON:\n{"ejercicios":[{"problema":"expresión","respuesta":"factorización","tip":"pista","pasos":["paso1","paso2","paso3","paso4"]}]}`;
        const multi = await apiClaude(p, 2000);
        data = Array.isArray(multi.ejercicios) ? multi.ejercicios : [multi];
      }
      if (!data?.[0]?.problema) throw new Error("Formato inesperado");
      if (montado.current) setGenEjers(data);
    } catch (e) {
      if (montado.current) setGenErr("No se pudo generar: " + (e?.message || "intenta de nuevo"));
    }
    if (montado.current) setGenLoad(false);
  };

  const evaluarGenIA = async (idx) => {
    const ej = genEjers[idx];
    const r  = (genResps[idx] || "").trim();
    if (!ej || !r || !montado.current) return;
    setEvalLoads(p => ({ ...p, [idx]: true }));
    setEvalReses(p => { const n = {...p}; delete n[idx]; return n; });
    try {
      const p = `Factorización — Ejercicio: ${ej.problema} | Correcta: ${ej.respuesta} | Estudiante: ${r}\nResponde ÚNICAMENTE este JSON (estado: correcto/incorrecto/parcial):\n{"estado":"correcto","mensaje":"retroalimentación breve"}`;
      const data = await apiClaude(p, 300);
      if (!data?.estado) throw new Error("sin estado");
      if (!montado.current) return;
      setEvalReses(p => ({ ...p, [idx]: data }));
      if (data.estado === "correcto") { sfx.correcto(); showToast("🎉 ¡Correcto! +XP"); onProgUpdate("ia_correcto"); }
      else sfx.incorrecto();
    } catch (e) {
      if (montado.current)
        setEvalReses(p => ({ ...p, [idx]: { estado:"incorrecto", mensaje:"Error: " + (e?.message || "intenta de nuevo") } }));
    }
    if (montado.current) setEvalLoads(p => ({ ...p, [idx]: false }));
  };

  const TABS = [["teoria","📖 Teoría"],["ejemplos","💡 Ejemplos"],["propuestos","✏️ Ejercicios"],["ia","🤖 IA"],["notas","📝 Notas"]];

  return (
    <>
      <Toast msg={toastMsg} />
      <div style={{ background:"linear-gradient(135deg,#0f172a,#1e3a8a)" }}>
        <button className="cbk" onClick={onBack}>← Volver</button>
        <div className="chero-w">
          <div className="chero">
            <div className="ch-row">
              <span className="ch-ic" style={{ background:bg, color:c }}>{caso.icono}</span>
              <span className="ch-name">{caso.nombre}</span>
            </div>
            <div className="ch-desc">{caso.descripcion}</div>
            <div className="fbox" style={{ background:"rgba(255,255,255,.07)", color:"#fbbf24", borderColor:c }}>{caso.formula}</div>
          </div>
        </div>
        <div className="tabs-row">
          {TABS.map(([id,lbl]) => (
            <button key={id} className={`tb${tab===id?" on":""}`}
              style={tab===id ? { background:c, borderColor:c } : {}}
              onClick={() => { sfx.click(); setTab(id); }}>{lbl}</button>
          ))}
        </div>
      </div>

      <div className="main" style={{ minHeight:"60vh" }}>
        <div className="cont" style={{ paddingTop:14 }}>

          {/* ── TEORÍA ── */}
          {tab === "teoria" && caso.pasos.map((p, i) => (
            <div key={i} className="prow">
              <div className="pnum" style={{ background:bg, color:c }}>{i+1}</div>
              <div className="ptxt">{p}</div>
            </div>
          ))}

          {/* ── EJEMPLOS ── */}
          {tab === "ejemplos" && caso.ejemplos.map((e, i) => (
            <div key={i} className="ecard">
              <div className="etag">Ejemplo {i+1}</div>
              <div className="eprob">{e.p}</div>
              <div className="esol" style={{ color:c }}>{e.s}</div>
              <div className="eexp">💡 {e.e}</div>
            </div>
          ))}

          {/* ── EJERCICIOS PROPUESTOS ── */}
          {tab === "propuestos" && (
            <>
              <div style={{ background:"linear-gradient(135deg,#1e3a8a,#1d4ed8)", borderRadius:12, padding:"12px 14px", marginBottom:14, display:"flex", alignItems:"center", gap:10 }}>
                <span style={{ fontSize:22 }}>✏️</span>
                <div>
                  <div style={{ fontSize:14, fontWeight:800, color:"white" }}>Ejercicios propuestos</div>
                  <div style={{ fontSize:12, color:"rgba(255,255,255,.7)" }}>Escribe tu respuesta y presiona Verificar — 🔓 Nivel: <strong style={{ color:"#fbbf24" }}>{NV_LABELS[prog.nivelDesbloqueado]}</strong></div>
                </div>
              </div>
              {caso.ejercicios.map((ej, i) => {
                const locked = ej.dif > prog.nivelDesbloqueado;
                const estado = estados[i];
                const d = DIF_INFO[ej.dif];
                return (
                  <div key={i} className={`xcard${estado==="ok"?" correcto":estado==="no"?" incorrecto":estado==="par"?" parcial":""}`}
                    style={locked ? { opacity:.55, filter:"grayscale(.4)" } : {}}>
                    <div className="xrow">
                      <span className="xlabel">Ejercicio {i+1}</span>
                      <span className="xbadge" style={{ background:d.bg, color:d.color }}>{d.label}</span>
                    </div>
                    {locked ? (
                      <div className="xlock">🔒 Supera desafíos para desbloquear este nivel</div>
                    ) : (
                      <>
                        <div className="xprob">{ej.prob}</div>
                        {pistas[i] && <div className="xpista">💡 {ej.pista}</div>}
                        <input
                          className="xinput"
                          placeholder="Escribe tu factorización aquí..."
                          value={inputs[i] || ""}
                          onChange={e => { setInputs(p => ({ ...p, [i]: e.target.value })); setEstados(p => { const n={...p}; delete n[i]; return n; }); setFeedbacks(p => { const n={...p}; delete n[i]; return n; }); }}
                          disabled={estado === "loading"}
                          style={{ "--c": c }}
                        />
                        <div className="xbtns">
                          {!pistas[i] && <button className="xbtn-ver" style={{ "--c":"#f59e0b" }} onClick={() => setPistas(p => ({ ...p, [i]: true }))}>💡 Pista</button>}
                          <button className="xbtn-check"
                            disabled={estados[i] === "loading" || !(inputs[i] || "").trim()}
                            onClick={() => verificarEjercicio(i, ej)}>
                            {estados[i] === "loading" ? <><Spinner />Verificando...</> : "🎯 Verificar"}
                          </button>
                          <button className="xbtn-ver" style={{ "--c":c }} onClick={() => setAns(a => ({ ...a, [i]: !a[i] }))}>
                            {ans[i] ? "Ocultar" : "Ver respuesta"}
                          </button>
                          {(estado === "ok" || estado === "no" || estado === "par") && (
                            <button className="xbtn-reset" onClick={() => resetEj(i)}>🔄</button>
                          )}
                        </div>
                        {feedbacks[i] && (
                          <div className={`xfeedback xfb-${estado==="ok"?"ok":estado==="par"?"par":"no"}`}>
                            {estado==="ok"?"✅ ":estado==="par"?"⚠️ ":"❌ "}{feedbacks[i]}
                          </div>
                        )}
                        {ans[i] && <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:15, fontWeight:700, color:c, marginTop:9, paddingTop:9, borderTop:"2px dashed #e2e8f0" }}>= {ej.resp}</div>}
                      </>
                    )}
                  </div>
                );
              })}
            </>
          )}

          {/* ── IA GENERADOR ── */}
          {tab === "ia" && (
            <div className="ia-box" style={{ "--c":c, "--bg":bg }}>
              <div className="ia-hdr">
                <div className="ia-hic">🤖</div>
                <div><div className="ia-ht">Generador + Evaluador con IA</div><div className="ia-hs">Genera hasta 5 ejercicios y evalúa tus respuestas</div></div>
              </div>
              <div className="ia-body">
                <div style={{ fontSize:11,fontWeight:800,color:"#94a3b8",marginBottom:7,textTransform:"uppercase",letterSpacing:".5px" }}>Dificultad:</div>
                <div className="nrow">
                  {["Básico","Intermedio","Avanzado"].map((n,i) => {
                    const nv=i+1; const lock=nv>prog.nivelDesbloqueado;
                    return (
                      <button key={n} className={`nbtn${nivel===n?" on":""}`}
                        style={{ "--c":NV_COLORS[nv], "--bg":NV_BGS[nv] }}
                        onClick={() => { if(!lock){ setNivel(n); setGenEjers([]); setEvalReses({}); setGenResps({}); } }}>
                        {lock?"🔒":n==="Básico"?"🟢":n==="Intermedio"?"🟡":"🔴"} {n}
                      </button>
                    );
                  })}
                </div>
                <div style={{ fontSize:11,fontWeight:800,color:"#94a3b8",marginBottom:7,textTransform:"uppercase",letterSpacing:".5px" }}>Cantidad:</div>
                <div className="nrow" style={{ marginBottom:12 }}>
                  {[1,2,3,5].map(n => (
                    <button key={n} className={`nbtn${cantidad===n?" on":""}`}
                      style={{ "--c":c, "--bg":bg }}
                      onClick={() => setCantidad(n)}>
                      {n}
                    </button>
                  ))}
                </div>
                <button className="gbtn" onClick={generarEjercicios} disabled={genLoad}>
                  {genLoad ? <><Spinner />Generando {cantidad} ejercicio{cantidad>1?"s":""}...</> : `✨ Generar ${cantidad} ejercicio${cantidad>1?"s":""}`}
                </button>
                {genErr && <div className="errbox">{genErr}</div>}

                {/* Navegación entre ejercicios generados */}
                {genEjers.length > 1 && (
                  <div style={{ display:"flex", alignItems:"center", gap:7, marginBottom:11, justifyContent:"center" }}>
                    <button onClick={() => setGenIdx(i => Math.max(0,i-1))} disabled={genIdx===0}
                      style={{ background:"none",border:`2px solid ${c}`,color:c,borderRadius:7,width:32,height:32,cursor:"pointer",fontSize:15,fontWeight:800,opacity:genIdx===0?.35:1 }}>‹</button>
                    {genEjers.map((_,i) => (
                      <button key={i} onClick={() => setGenIdx(i)}
                        style={{ width:30,height:30,borderRadius:7,border:`2px solid ${i===genIdx?c:"#e2e8f0"}`,background:i===genIdx?c:"transparent",color:i===genIdx?"white":"#64748b",fontWeight:800,fontSize:12,cursor:"pointer",position:"relative" }}>
                        {i+1}
                        {evalReses[i]?.estado==="correcto" && <span style={{ position:"absolute",top:-5,right:-5,fontSize:9 }}>✅</span>}
                        {evalReses[i]?.estado==="incorrecto" && <span style={{ position:"absolute",top:-5,right:-5,fontSize:9 }}>❌</span>}
                      </button>
                    ))}
                    <button onClick={() => setGenIdx(i => Math.min(genEjers.length-1,i+1))} disabled={genIdx===genEjers.length-1}
                      style={{ background:"none",border:`2px solid ${c}`,color:c,borderRadius:7,width:32,height:32,cursor:"pointer",fontSize:15,fontWeight:800,opacity:genIdx===genEjers.length-1?.35:1 }}>›</button>
                  </div>
                )}

                {genEjers[genIdx] && (() => {
                  const ej = genEjers[genIdx];
                  const idx = genIdx;
                  return (
                    <div className="ia-res">
                      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:7 }}>
                        <div className="iachip" style={{ background:bg, color:c }}>✦ IA · {nivel}{genEjers.length>1?` · ${idx+1}/${genEjers.length}`:""}</div>
                        {evalReses[idx] && (
                          <span style={{ fontSize:11,fontWeight:800,color:evalReses[idx].estado==="correcto"?"#10b981":evalReses[idx].estado==="parcial"?"#f59e0b":"#ef4444" }}>
                            {evalReses[idx].estado==="correcto"?"✅":evalReses[idx].estado==="parcial"?"⚠️":"❌"} {evalReses[idx].estado}
                          </span>
                        )}
                      </div>
                      <div className="iaprob">{ej.problema}</div>
                      {ej.tip && <div className="iatip">💡 {ej.tip}</div>}
                      <div style={{ fontSize:11,fontWeight:800,color:"#94a3b8",marginBottom:5,textTransform:"uppercase",letterSpacing:".5px" }}>Tu respuesta:</div>
                      <input className="iainput" placeholder="Escribe tu factorización..."
                        value={genResps[idx]||""}
                        onChange={e => { setGenResps(p=>({...p,[idx]:e.target.value})); setEvalReses(p=>{const n={...p};delete n[idx];return n;}); }} />
                      <button className="evalbtn" onClick={() => evaluarGenIA(idx)} disabled={evalLoads[idx]||!(genResps[idx]||"").trim()}>
                        {evalLoads[idx] ? <><Spinner />Evaluando...</> : "🎯 Evaluar con IA"}
                      </button>
                      {evalReses[idx] && (
                        <div className={`evalres ${evalReses[idx].estado==="correcto"?"ok":evalReses[idx].estado==="parcial"?"par":"no"}`}>
                          {evalReses[idx].estado==="correcto"?"✅ ":evalReses[idx].estado==="parcial"?"⚠️ ":"❌ "}{evalReses[idx].mensaje}
                        </div>
                      )}
                      <button className="stoggle" style={{ "--c":c }} onClick={() => setVerSoles(p=>({...p,[idx]:!p[idx]}))}>
                        {verSoles[idx]?"▲ Ocultar solución":"▼ Ver solución paso a paso"}
                      </button>
                      {verSoles[idx] && (
                        <div className="sbody">
                          {ej.pasos?.map((p,i) => (
                            <div key={i} className="srow">
                              <div className="snum" style={{ background:bg, color:c }}>{i+1}</div>
                              <div className="stxt">{p}</div>
                            </div>
                          ))}
                          <div className="sfinal" style={{ color:c }}>= {ej.respuesta}</div>
                        </div>
                      )}
                      {genEjers.length>1 && (
                        <div style={{ marginTop:11,paddingTop:10,borderTop:`2px dashed ${bg}`,display:"flex",gap:10,justifyContent:"center" }}>
                          <span style={{ fontSize:12,fontWeight:800,color:"#10b981" }}>✅ {Object.values(evalReses).filter(r=>r?.estado==="correcto").length} correctas</span>
                          <span style={{ fontSize:12,fontWeight:800,color:"#94a3b8" }}>de {genEjers.length}</span>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            </div>
          )}

          {/* ── NOTAS ── */}
          {tab === "notas" && (
            <div className="nota-box">
              <div className="nota-hdr">
                <span className="nota-title">📝 Mis apuntes — {caso.nombre}</span>
                {notaSaved && <span style={{ fontSize:11,color:"#10b981",fontWeight:700 }}>✅ Guardado</span>}
              </div>
              <textarea className="nota-ta"
                placeholder={`Escribe tus apuntes sobre ${caso.nombre}...\n\nEj:\n- Recuerda verificar cuadrados perfectos\n- El MCD siempre va al frente`}
                value={nota} onChange={e => setNota(e.target.value)} />
              <div className="nota-footer">
                <button className="nota-clear" onClick={() => setNota("")}>Limpiar</button>
                <button className="nota-save" onClick={() => { setNotaSaved(true); onProgUpdate("nota"); setTimeout(()=>setNotaSaved(false),2000); }}>💾 Guardar</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

// ── APP RAÍZ ──────────────────────────────────────────────────────────
export default function App() {
  const [screen, setScreen]       = useState("intro");
  const [casoActivo, setCasoActivo] = useState(null);
  const [dark, setDark]           = useState(false);
  const [fondoId, setFondoId]     = useState("cosmos");
  const [sonidoOn, setSonidoOn]   = useState(true);
  const [volumen, setVolumen]     = useState(60);
  const [showAjustes, setShowAjustes] = useState(false);
  const [toastMsg, showToast]     = useToast();
  const sfx = useSonidos(sonidoOn, volumen);

  const fondo = FONDOS.find(f => f.id === fondoId) || FONDOS[0];

  const [prog, setProg] = useState({
    ejercsPropuestos:    0,
    correctasPropuestas: 0,
    iaCorrectos:         0,
    iaTotal:             0,
    quizMax:             0,
    streak:              1,
    casoConNotas:        0,
    casosVisitados:      0,
    quizRapido:          false,
    nivelDesbloqueado:   1
  });

  const xp = prog.correctasPropuestas * 8 + prog.iaCorrectos * 15 + prog.quizMax * 5 + prog.streak * 8;

  const navTo = (s) => { sfx.navegar(); setScreen(s); };

  const onProgUpdate = (tipo, extra) => {
    setProg(prev => {
      const next = { ...prev };
      if (tipo === "propuesto_correcto") { next.ejercsPropuestos++; next.correctasPropuestas++; }
      if (tipo === "propuesto_intento")  { next.ejercsPropuestos++; }
      if (tipo === "ia_correcto")        { next.iaCorrectos++; next.iaTotal++; }
      if (tipo === "nota")               { next.casoConNotas = Math.min(CASOS.length, prev.casoConNotas + 1); }

      // Verificar desbloqueos
      if (next.correctasPropuestas >= DESAFIOS[0].meta && next.nivelDesbloqueado < 2) {
        next.nivelDesbloqueado = 2; showToast("🥈 ¡Nivel Intermedio desbloqueado!"); sfx.desbloqueo();
      }
      if (next.correctasPropuestas >= DESAFIOS[1].meta && next.nivelDesbloqueado < 3) {
        next.nivelDesbloqueado = 3; showToast("🥇 ¡Nivel Avanzado desbloqueado!"); sfx.desbloqueo();
      }
      if (next.iaCorrectos >= DESAFIOS[3].meta && next.nivelDesbloqueado < 4) {
        next.nivelDesbloqueado = 4; showToast("🏆 ¡Nivel Experto desbloqueado!"); sfx.desbloqueo();
      }

      // Verificar insignias nuevas
      const prevIns = INSIGNIAS.filter(b => b.cond(prev)).length;
      const nextIns = INSIGNIAS.filter(b => b.cond(next)).length;
      if (nextIns > prevIns) {
        const nueva = INSIGNIAS.find(b => b.cond(next) && !b.cond(prev));
        if (nueva) showToast(`🏅 ¡Insignia obtenida: ${nueva.nombre}!`);
      }
      return next;
    });
  };

  const onQuizScore = (s) => {
    setProg(prev => {
      const next = { ...prev, quizMax: Math.max(prev.quizMax, s) };
      if (next.quizMax >= DESAFIOS[2].meta && next.nivelDesbloqueado < 4) {
        next.nivelDesbloqueado = 4; showToast("💎 ¡Maestro del Quiz! Nivel Experto."); sfx.desbloqueo();
      }
      return next;
    });
  };

  const NAVS = [
    ["menu","📐 Casos"],["quiz","⚡ Quiz"],["desafios","🏆 Desafíos"],
    ["stats","📊 Stats"],["ranking","🏅 Ranking"],
    ["glosario","📚 Glosario"],["docente","👨‍🏫 Docente"]
  ];

  return (
    <>
      <style>{makeCSS(dark)}</style>
      <style>{`body{background:${dark?"#0f172a":"#f1f5f9"} !important;} .intro{background:${fondo.main} !important;} .hdr{background:${fondo.hdr} !important;}`}</style>

      <Toast msg={toastMsg} />
      {showAjustes && (
        <PanelAjustes
          fondoId={fondoId} setFondoId={setFondoId}
          dark={dark} setDark={setDark}
          sonidoOn={sonidoOn} setSonidoOn={setSonidoOn}
          volumen={volumen} setVolumen={setVolumen}
          sfx={sfx} onClose={() => setShowAjustes(false)}
        />
      )}

      <div className="root">
        {screen === "intro" && (
          <Intro onNav={s => { if (s === "__ajustes") { setShowAjustes(true); } else navTo(s); }} />
        )}

        {screen !== "intro" && (
          <div className="hdr">
            <div className="hdr-in">
              <div className="hdr-logo">
                <img src={LOGO} alt="Unimagdalena" onError={e => { e.target.style.display="none"; e.target.parentNode.innerHTML="🎓"; }} />
              </div>
              <div className="hdr-info">
                <div className="hdr-u">Universidad del Magdalena</div>
                <div className="hdr-t">Factorización Algebraica</div>
              </div>
              <div className="hdr-nav">
                {NAVS.map(([id,lbl]) => (
                  <button key={id} className={`hn${screen===id?" on":""}`} onClick={() => navTo(id)}>{lbl}</button>
                ))}
                <button className="hn" onClick={() => { sfx.click(); setShowAjustes(true); }} title="Personalizar">🎨</button>
                <button className="hn" onClick={() => { sfx.click(); setDark(d => !d); }} title="Modo oscuro">{dark?"☀️":"🌙"}</button>
              </div>
            </div>
            <div className="xpbar">
              <span className="xplbl">⭐ {xp} XP</span>
              <div className="xpbg"><div className="xpfill" style={{ width: Math.min(100, xp/500*100) + "%" }} /></div>
              <span className="nvlbl">🔓 {NV_LABELS[prog.nivelDesbloqueado]}</span>
            </div>
          </div>
        )}

        {screen === "menu" && (
          <div className="main">
            <div className="page">
              <div className="stitle">📐 Casos de Factorización</div>
              <div className="ssub">Selecciona un caso para estudiar y practicar</div>
              <div className="grid">
                {CASOS.map(c => (
                  <button key={c.id} className="cc" style={{ "--c":c.color }}
                    onClick={() => { sfx.click(); setCasoActivo(c); setScreen("caso"); }}>
                    <div className="cc-badge" style={{ background:c.bg, color:c.color }}>{c.icono}</div>
                    <div className="cc-name">{c.nombre}</div>
                    <div className="cc-f">{c.formula}</div>
                    <div className="ndots">{Array.from({length:4}).map((_,i)=><div key={i} className={`nd${i<c.nivel?" on":""}`} style={{"--c":c.color}} />)}</div>
                  </button>
                ))}
              </div>
              {[
                { bg:"linear-gradient(135deg,#1e3a8a,#1d4ed8)", ic:"⚡", t:"Modo Quiz",              s:"8 preguntas · Opción múltiple · Feedback inmediato",              sc:"quiz" },
                { bg:"linear-gradient(135deg,#312e81,#6366f1)", ic:"🏆", t:"Desafíos y Desbloqueos", s:"Supera retos para acceder a ejercicios de mayor dificultad",      sc:"desafios" },
                { bg:"linear-gradient(135deg,#065f46,#059669)", ic:"🏅", t:"Tabla de Clasificación",  s:"Compite con tus compañeros por el primer lugar",                 sc:"ranking" },
                { bg:"linear-gradient(135deg,#7c2d12,#ea580c)", ic:"🎨", t:"Personalizar App",        s:"Cambia fondos, modo oscuro/claro y efectos de sonido",           sc:"__ajustes" },
              ].map(({ bg, ic, t, s, sc }) => (
                <div key={sc} className="promo" style={{ background:bg }}
                  onClick={() => { sfx.click(); sc==="__ajustes" ? setShowAjustes(true) : navTo(sc); }}>
                  <div className="promo-ic">{ic}</div>
                  <div><div className="promo-t">{t}</div><div className="promo-s">{s}</div></div>
                  <div className="promo-arr">→</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {screen === "caso" && casoActivo && (
          <CasoPanel caso={casoActivo} onBack={() => { sfx.navegar(); setScreen("menu"); }}
            prog={prog} onProgUpdate={onProgUpdate} sfx={sfx} />
        )}

        {screen === "quiz"     && <Quiz     onBack={() => navTo("menu")} onScore={onQuizScore} sfx={sfx} />}
        {screen === "desafios" && <Desafios prog={prog} />}
        {screen === "stats"    && <Estadisticas prog={prog} />}
        {screen === "ranking"  && <Leaderboard prog={prog} />}
        {screen === "glosario" && <Glosario />}
        {screen === "docente"  && <ModoDocente />}

        {screen !== "intro" && (
          <div className="ftr">
            <img src={LOGO} alt="" onError={e => e.target.style.display="none"} />
            <div className="ftr-t"><strong>Universidad del Magdalena</strong> · Santa Marta · Herramienta Académica de Matemáticas</div>
          </div>
        )}
      </div>
    </>
  );
}
