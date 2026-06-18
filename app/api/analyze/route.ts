import { NextRequest, NextResponse } from "next/server";

const UX_WRITING_KNOWLEDGE = `
# Base de Conocimiento: UX Writing — Datos Personales

**Componente maestro:** TextFieldPersonal

---

### Componente: Nombre/Apellido

#### Variante: Puede ingresarlo como quiera (ej: form de contacto)
- Label (Nombre/s): "Nombre/s"
- Label (Apellido/s): "Apellido/s"
- Error campo obligatorio: "Campo obligatorio"

#### Variante: Debe ingresarlo como figura en el DNI
- Label (Nombre/s): "Nombre/s"
- Supporting Text (Nombre/s): "Ingresalo como figura en tu DNI"
- Label (Apellido/s): "Apellido/s"
- Supporting Text (Apellido/s): "Ingresalo como figura en tu DNI"
- Error campo obligatorio: "Campo obligatorio"

#### Variante: Debe ingresarlo como figura en la tarjeta
- Label (Nombre/s): "Nombre/s"
- Supporting Text (Nombre/s): "Ingresalo como figura en tu tarjeta"
- Label (Apellido/s): "Apellido/s"
- Supporting Text (Apellido/s): "Ingresalo como figura en tu tarjeta"
- Error campo obligatorio: "Campo obligatorio"

---

### Componente: Documento

#### Variante: Puede ingresar + de un tipo de documento
- Label (desplegable): "Tipo de documento"
- Label (campo número): "Número"
- Supporting Text: "Ingresá entre 7 y 8 dígitos, sin puntos ni espacios"
- Error campo obligatorio: "Campo obligatorio"
- Error número inválido: "Número inválido. Debe tener entre 7 y 8 dígitos."
- Regla: Por defecto viene seleccionado DNI.

#### Variante: Solo puede ingresar DNI
- Label: "DNI"
- Supporting Text: "Ingresá entre 7 y 8 dígitos, sin puntos ni espacios"
- Error campo obligatorio: "Campo obligatorio"
- Error número inválido: "Número inválido. Debe tener entre 7 y 8 dígitos."

---

### Componente: Número de trámite

#### Variante: Con ayuda contextual (ilustración del DNI en pantalla)
- Label: "Número de trámite"
- Supporting Text: "Ingresá entre 9 y 11 dígitos, sin puntos ni espacios"
- Error número inválido: "Número inválido. Debe tener entre 9 y 11 dígitos."
- Error campo obligatorio: "Campo obligatorio"

#### Variante: Sin ayuda contextual
- Label: "Número de trámite"
- Supporting Text: "Ingresá entre 9 y 11 dígitos. Figuran en el frente del DNI."
- Error número inválido: "Número inválido. Debe tener entre 9 y 11 dígitos."
- Error campo obligatorio: "Campo obligatorio"

---

### Componente: Email

- Label: "Email"
- Error campo obligatorio: "Campo obligatorio"
- Error mínimo caracteres: "Email inválido. Debe tener al menos 7 caracteres."
- Error formato: "Formato inválido. Debe incluir al menos un @ y un .com."

---

### Componente: Teléfono

#### Variante: Celular (radio button + campo)
- Label: "Número de línea móvil"
- Supporting Text: "Ingresá el código de área sin 0 y el número de línea sin 15"
- Error campo obligatorio: "Campo obligatorio"
- Error número inválido: "Número inválido. Debe tener 10 dígitos."
- Error formato: "Formato inválido. Debe tener el código de área sin 0 y el número de línea sin 15."
- Error línea ya es de Personal: "Número inválido. Esta línea ya es de Personal."
- Error línea no es de Personal (puede decirse): "Número inválido. Esta línea no es de Personal."
- Error línea no es de Personal (no puede decirse): "Número inválido. Intentá con otra línea móvil."
- Regla: Por defecto viene seleccionado 'Celular'. Máximo 10 dígitos.

#### Variante: Fijo (radio button + campo)
- Label: "Número de línea fija"
- Supporting Text: "Ingresá el código de área sin 0"
- Error campo obligatorio: "Campo obligatorio"
- Error número inválido: "Número inválido. Debe tener 10 dígitos."
- Error formato: "Formato inválido. Debe tener el código de área sin 0."

#### Variante: Solo línea móvil
- Label: "Número de línea móvil"
- Supporting Text: "Ingresá el código de área sin 0 y el número de línea sin 15"
- Máximo 10 dígitos, no permite más.

#### Variante: Solo línea fija
- Label: "Número de línea fija"
- Supporting Text: "Ingresá el código de área sin 0"
- Máximo 10 dígitos, no permite más.
`;

const PROMPT = `Sos un experto en UX Writing. Analizá esta imagen de un formulario o pantalla y comparala contra la siguiente base de conocimiento de UX Writing para textfields de datos personales:

${UX_WRITING_KNOWLEDGE}

Tu análisis debe:
1. Identificar qué campos de datos personales aparecen en la imagen (nombre, apellido, DNI, email, teléfono, número de trámite, etc.)
2. Para cada campo encontrado, verificar si el label, supporting text y mensajes de error (si son visibles) coinciden con los estándares definidos
3. Marcar con ✅ lo que está correcto y con ❌ lo que está incorrecto o difiere del estándar
4. Si hay diferencias, indicar cuál es el texto correcto según la base de conocimiento
5. Dar un resumen final con el porcentaje de cumplimiento

Respondé en español, con formato estructurado y claro. Si la imagen no contiene ningún campo de datos personales, indicalo.`;

function parseFigmaUrl(url: string): { fileKey: string; nodeId: string } | null {
  try {
    const u = new URL(url);
    // Supports /file/KEY/... and /design/KEY/...
    const match = u.pathname.match(/\/(file|design)\/([^/]+)/);
    if (!match) return null;
    const fileKey = match[2];
    const nodeId = u.searchParams.get("node-id");
    if (!nodeId) return null;
    return { fileKey, nodeId };
  } catch {
    return null;
  }
}

async function fetchFigmaImageAsBase64(fileKey: string, nodeId: string, token: string): Promise<{ base64: string; mimeType: string }> {
  // Get the render URL from Figma
  const renderRes = await fetch(
    `https://api.figma.com/v1/images/${fileKey}?ids=${encodeURIComponent(nodeId)}&format=png&scale=2`,
    { headers: { "X-Figma-Token": token } }
  );
  if (!renderRes.ok) {
    const err = await renderRes.text();
    throw new Error(`Figma API ${renderRes.status}: ${err}`);
  }
  const renderData = await renderRes.json();
  const imageUrl = renderData.images?.[nodeId] ?? renderData.images?.[nodeId.replace("-", ":")];

  if (!imageUrl) {
    throw new Error("Figma no devolvió una imagen para ese nodo. Verificá que el node-id sea correcto.");
  }

  // Download the rendered image
  const imgRes = await fetch(imageUrl);
  if (!imgRes.ok) throw new Error(`Error descargando imagen de Figma: ${imgRes.status}`);
  const buffer = await imgRes.arrayBuffer();
  return {
    base64: Buffer.from(buffer).toString("base64"),
    mimeType: "image/png",
  };
}

async function analyzeWithOpenRouter(base64: string, mimeType: string, apiKey: string): Promise<string> {
  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "nvidia/nemotron-nano-12b-v2-vl:free",
      messages: [
        {
          role: "user",
          content: [
            { type: "image_url", image_url: { url: `data:${mimeType};base64,${base64}` } },
            { type: "text", text: PROMPT },
          ],
        },
      ],
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`OpenRouter ${response.status}: ${err}`);
  }
  const data = await response.json();
  return data.choices?.[0]?.message?.content ?? "";
}

export async function POST(request: NextRequest) {
  try {
    const openrouterKey = process.env.OPENROUTER_API_KEY;
    if (!openrouterKey) {
      return NextResponse.json({ error: "OPENROUTER_API_KEY no está configurada." }, { status: 500 });
    }

    const contentType = request.headers.get("content-type") ?? "";

    // --- Figma URL mode ---
    if (contentType.includes("application/json")) {
      const { figmaUrl, figmaToken } = await request.json();

      const token = figmaToken || process.env.FIGMA_TOKEN;
      if (!token) {
        return NextResponse.json({ error: "Se necesita un Figma Personal Access Token." }, { status: 400 });
      }

      const parsed = parseFigmaUrl(figmaUrl);
      if (!parsed) {
        return NextResponse.json(
          { error: "URL de Figma inválida. Debe incluir el node-id (ej: ?node-id=118:10566)." },
          { status: 400 }
        );
      }

      const { base64, mimeType } = await fetchFigmaImageAsBase64(parsed.fileKey, parsed.nodeId, token);
      const analysis = await analyzeWithOpenRouter(base64, mimeType, openrouterKey);
      return NextResponse.json({ analysis });
    }

    // --- Image upload mode ---
    const formData = await request.formData();
    const imageFile = formData.get("image") as File;
    if (!imageFile) {
      return NextResponse.json({ error: "No se recibió imagen" }, { status: 400 });
    }

    const bytes = await imageFile.arrayBuffer();
    const base64 = Buffer.from(bytes).toString("base64");
    const mimeType = imageFile.type || "image/jpeg";

    const analysis = await analyzeWithOpenRouter(base64, mimeType, openrouterKey);
    return NextResponse.json({ analysis });

  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("Error analyzing:", msg);
    return NextResponse.json({ error: `Error al analizar: ${msg}` }, { status: 500 });
  }
}
