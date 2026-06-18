import { NextRequest, NextResponse } from "next/server";
import { getRedis, type AnalysisEntry } from "@/lib/redis";

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

const SYSTEM_PROMPT = `Sos un especialista en UX writing y sistemas de diseño. Analizás bases de
conocimiento de textfields/contenido de UI en español rioplatense (voseo).

Evaluá la imagen que te paso SIEMPRE contra estas 6 dimensiones, en este
orden, sin agregar ni omitir ninguna:
1. Errores de contenido (copy incorrecto o que perjudica al usuario).
2. Consistencia (estructura de mensajes, terminología, voseo, patrones).
3. Reglas implícitas no documentadas.
4. Huecos (campos sin especificar, reglas vacías, instrucciones sin ejemplo).
5. Documentación transversal (principios, voz/tono, accesibilidad, placeholder).
6. Formato del documento (índice, tablas, glosario, changelog).

Clasificá cada hallazgo con esta escala de severidad:
- Alta: afecta al usuario final o rompe una función (dato válido rechazado, instrucción falsa).
- Media: ambigüedad para quien implementa/autorea, sin romper la experiencia.
- Baja: mejora de formato/documentación sin cambio de comportamiento.

Devolvé SIEMPRE en este formato, sin variar la estructura:

## Resumen ejecutivo
[2-3 oraciones]

## Hallazgos
Por cada dimensión con hallazgos, listá cada uno con estos campos exactos:
- Severidad:
- Ubicación:
- Problema:
- Recomendación:
- ¿Requiere validación?: (Sí si cambia copy visible o regla de negocio; No si es una mejora estructural segura)

## Pendientes
Tabla con todo lo marcado como "Requiere validación: Sí", columnas:
# | Tema | Detalle | Quién decide

## Changelog
Entrada con fecha y versión propuesta.

Reglas:
- No cambies copy visible al usuario por tu cuenta: marcalo como propuesta con "¿Requiere validación?: Sí".
- Respetá el voseo del producto.
- Si una instrucción dice "cambia según X" pero no da ejemplos, es un hueco.
- No inventes reglas de negocio que no estén en el documento.

La base de conocimiento de referencia es:

${UX_WRITING_KNOWLEDGE}`;

function parseFigmaUrl(url: string): { fileKey: string; nodeId: string } | null {
  try {
    const u = new URL(url);
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

async function fetchFigmaImageAsBase64(fileKey: string, nodeId: string, token: string) {
  const renderRes = await fetch(
    `https://api.figma.com/v1/images/${fileKey}?ids=${encodeURIComponent(nodeId)}&format=png&scale=2`,
    { headers: { "X-Figma-Token": token } }
  );
  if (!renderRes.ok) {
    const err = await renderRes.text();
    throw new Error(`Figma API ${renderRes.status}: ${err}`);
  }
  const renderData = await renderRes.json();
  const imageUrl =
    renderData.images?.[nodeId] ??
    renderData.images?.[nodeId.replace("-", ":")];

  if (!imageUrl) throw new Error("Figma no devolvió imagen para ese nodo. Verificá el node-id.");

  const imgRes = await fetch(imageUrl);
  if (!imgRes.ok) throw new Error(`Error descargando imagen de Figma: ${imgRes.status}`);
  const buffer = await imgRes.arrayBuffer();
  return { base64: Buffer.from(buffer).toString("base64"), mimeType: "image/png" };
}

async function analyzeWithOpenRouter(base64: string, mimeType: string, apiKey: string) {
  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "nvidia/nemotron-nano-12b-v2-vl:free",
      messages: [
        {
          role: "user",
          content: [
            { type: "image_url", image_url: { url: `data:${mimeType};base64,${base64}` } },
            { type: "text", text: SYSTEM_PROMPT },
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

async function saveToHistory(entry: AnalysisEntry) {
  try {
    const redis = getRedis();
    if (!redis) return;
    await redis.lpush("ux_analyses", JSON.stringify(entry));
    await redis.ltrim("ux_analyses", 0, 19); // keep last 20
  } catch (e) {
    console.error("Redis save error:", e);
  }
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
      const { figmaUrl, figmaToken, thumbnail } = await request.json();
      const token = figmaToken || process.env.FIGMA_TOKEN;
      if (!token) return NextResponse.json({ error: "Se necesita un Figma Personal Access Token." }, { status: 400 });

      const parsed = parseFigmaUrl(figmaUrl);
      if (!parsed) return NextResponse.json({ error: "URL de Figma inválida. Debe incluir el node-id (ej: ?node-id=118:10566)." }, { status: 400 });

      const { base64, mimeType } = await fetchFigmaImageAsBase64(parsed.fileKey, parsed.nodeId, token);
      const analysis = await analyzeWithOpenRouter(base64, mimeType, openrouterKey);

      await saveToHistory({
        id: crypto.randomUUID(),
        timestamp: Date.now(),
        thumbnail: thumbnail || `data:image/png;base64,${base64.slice(0, 8000)}`,
        analysis,
        source: "figma",
        figmaUrl,
      });

      return NextResponse.json({ analysis });
    }

    // --- Image upload mode ---
    const formData = await request.formData();
    const imageFile = formData.get("image") as File;
    const thumbnail = formData.get("thumbnail") as string | null;

    if (!imageFile) return NextResponse.json({ error: "No se recibió imagen" }, { status: 400 });

    const bytes = await imageFile.arrayBuffer();
    const base64 = Buffer.from(bytes).toString("base64");
    const mimeType = imageFile.type || "image/jpeg";

    const analysis = await analyzeWithOpenRouter(base64, mimeType, openrouterKey);

    await saveToHistory({
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      thumbnail: thumbnail || `data:${mimeType};base64,${base64.slice(0, 8000)}`,
      analysis,
      source: "image",
      filename: imageFile.name,
    });

    return NextResponse.json({ analysis });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("Error analyzing:", msg);
    return NextResponse.json({ error: `Error al analizar: ${msg}` }, { status: 500 });
  }
}
