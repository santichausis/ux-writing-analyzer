import Anthropic from "@anthropic-ai/sdk";
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

export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "ANTHROPIC_API_KEY no está configurada en las variables de entorno." },
        { status: 500 }
      );
    }

    const formData = await request.formData();
    const imageFile = formData.get("image") as File;

    if (!imageFile) {
      return NextResponse.json({ error: "No se recibió imagen" }, { status: 400 });
    }

    const bytes = await imageFile.arrayBuffer();
    const base64 = Buffer.from(bytes).toString("base64");
    const mediaType = imageFile.type as "image/jpeg" | "image/png" | "image/gif" | "image/webp";

    const client = new Anthropic({ apiKey });

    const response = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 2048,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: { type: "base64", media_type: mediaType, data: base64 },
            },
            {
              type: "text",
              text: `Sos un experto en UX Writing. Analizá esta imagen de un formulario o pantalla y comparala contra la siguiente base de conocimiento de UX Writing para textfields de datos personales:

${UX_WRITING_KNOWLEDGE}

Tu análisis debe:
1. Identificar qué campos de datos personales aparecen en la imagen (nombre, apellido, DNI, email, teléfono, número de trámite, etc.)
2. Para cada campo encontrado, verificar si el label, supporting text y mensajes de error (si son visibles) coinciden con los estándares definidos
3. Marcar con ✅ lo que está correcto y con ❌ lo que está incorrecto o difiere del estándar
4. Si hay diferencias, indicar cuál es el texto correcto según la base de conocimiento
5. Dar un resumen final con el porcentaje de cumplimiento

Respondé en español, con formato estructurado y claro. Si la imagen no contiene ningún campo de datos personales, indicalo.`,
            },
          ],
        },
      ],
    });

    const analysis = response.content[0].type === "text" ? response.content[0].text : "";
    return NextResponse.json({ analysis });
  } catch (error) {
    console.error("Error analyzing image:", error);
    return NextResponse.json(
      { error: "Error al analizar la imagen. Verificá que ANTHROPIC_API_KEY esté configurada." },
      { status: 500 }
    );
  }
}
