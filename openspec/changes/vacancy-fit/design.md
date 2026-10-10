# Design

## Context

`openspec/specs/` no tiene capacidades durables. El contrato de carga vive en `job-fit-assistant` y en el delta de `remove-rag`. Ese delta conserva solo cinco campos y da por perdido el texto literal del CV. `assistant-shell` exige que «Enviar» no llame a un modelo. `src/profile/load-cv.ts` rechaza la carga. `src/profile/types.ts` usa camelCase y no tiene `flat_text`. `package.json` no trae LangChain ni un lector de PDF. El diálogo de ajustes no pide la clave. Ver `proposal.md` para la motivación y los specs de esta change para el comportamiento.

## Goals / Non-Goals

**Goals:**

- Dos cadenas de LangChain que comparten la clave de Gemini y el modelo `gemini-3.5-flash`.
- Un solo `profile` guardado, con `flat_text`, y un veredicto de cuatro campos.
- Alinear el delta de `remove-rag` para que deje de decir que el texto literal se pierde.

**Non-Goals:**

- Definir las validaciones futuras que lean `flat_text`, o enviarlo en el veredicto.
- Volver a chunks, embeddings o LangGraph.
- Memoria de mensajes, varias respuestas o un fit distinto de las cuatro piezas.
- Un campo para cambiar el id del modelo. El valor por defecto queda en el código.
- Mover la clave a los ajustes o añadir un backend.

## Decisions

### Alinear los deltas abiertos antes de archivar

`cv-profile` y `assistant-shell` no están en `openspec/specs/`. El delta de esta change es el contrato nuevo. Además se reescribe `openspec/changes/remove-rag/specs/cv-profile/spec.md` para que una carga válida conserve el `profile` con `flat_text`, siga sin chunks ni embeddings, y no afirme que el veredicto pierde el texto literal. El texto queda guardado; el veredicto no lo usa. La propuesta, el diseño y las tareas de `job-fit-assistant` pasan a la cadena lineal de LangChain y a esos campos. `remove-rag` ya iba a quitar el índice; esta change no reabre esa retirada.

No se archiva `vacancy-fit` encima de una spec durable que todavía no existe. El cierre de `remove-rag` sigue siendo la corrección de `job-fit-assistant`, ya con `profile` y `flat_text`.

Alternativa considerada: dejar el delta de `remove-rag` intacto y fiarse solo de esta change. Quien lea esa spec seguiría creyendo que el texto del CV no se guarda.

### Un objeto `profile` en snake_case

El estado guardado y el que viaja al modelo usan las mismas claves:

```
profile
  tech_skills: string[]
  soft_skills: string[]
  languages: { language, level }[]
  experience_time: number | null
  education: string[]
  flat_text: string
```

`src/profile/types.ts` deja el camelCase. `flat_text` lo asigna el código con el texto de `pdfjs-dist`, no el modelo. El redondeo de `experience_time` sigue en código, con la regla ya escrita en `job-fit-assistant`. Los niveles de idioma siguen siendo `básico`, `intermedio`, `avanzado` y `nativo`.

Hay un solo registro en IndexedDB, almacén `profile`. No hay almacén `chunks`. El PDF no se escribe. Una carga rechazada no toca el registro anterior.

Alternativa considerada: guardar `flat_text` en otro almacén. El perfil es un solo estado y se reemplaza entero.

### Dos cadenas, un cliente

`@langchain/google-genai` crea el chat con la clave del navegador, cabecera `x-goog-api-key`, sin proxy y sin project id. La salida estructurada fija el esquema. Las pruebas inyectan un cliente falso y no abren red.

```
PDF
 |
 v
validar tipo --no--> error, profile anterior
 |
 v
texto pdf.js ---- vacio --> error, profile anterior
 |
 +--> flat_text = ese texto
 |
 v
cadena de carga: prompt de extraccion
  --> tech_skills, soft_skills, languages,
      experience_time, education
 |
 v
codigo redondea experience_time
 |
 v
guardar profile (campos + flat_text)

vacante + campos estructurados
 |
 v
cadena de veredicto: system prompt
  --> matches, weaknesses, score, apply_recommendation
```

El system prompt exige decidir solo con esos campos y la vacante, escribir `matches` y `weaknesses` en español, y devolver `score` de 0 a 100 y `apply_recommendation` booleano. `flat_text` no entra en esa cadena. Un valor fuera de forma se trata como veredicto incompleto. No hay checkpointer ni historial.

Alternativa considerada: un grafo LangGraph de un solo camino. No hay ramas que el grafo tenga que hacer explícitas.

### La clave en la fila de carga

El campo «Clave de Gemini» es `type="password"`, en la misma fila que «Cargar CV» o «Reemplazar CV». No lleva `data-primary`. Se guarda en `localStorage` bajo `geminiApiKey` al cambiar el valor y se rellena al abrir la página. Los ajustes siguen fuera de la conversación y no muestran la clave. Sin clave, la carga falla junto al botón de CV y «Enviar» falla junto a «Enviar», sin llamar al modelo. Un mensaje vacío tampoco llama.

«Postular» y «No postular» muestran el booleano. Un reemplazo de CV que termina bien borra el veredicto y el borrador. Uno que falla los conserva.

Alternativa considerada: pedir la clave en el diálogo de ajustes. El veredicto y la carga comparten el campo que ya está junto al PDF.

## Risks / Trade-offs

- [El veredicto no ve el texto literal] → `flat_text` queda guardado para una validación posterior. Esta change no la define ni la mete en el prompt.
- [El modelo inventa coincidencias] → El prompt limita la decisión a los campos enviados. Las pruebas fijan la forma, no la calidad de un modelo real.
- [La clave vive en `localStorage`] → Es la clave de quien usa el navegador. El build y el repositorio no la contienen.
- [Los deltas abiertos se contradicen hasta alinearlos] → La primera tarea reescribe el spec de `remove-rag` y los artefactos de `job-fit-assistant`.
- [Archivar este delta antes de que existan las specs durables] → Mismo límite que `remove-rag`: un MODIFIED no crea la spec principal. Se archiva cuando `cv-profile` y `assistant-shell` ya existan, o el cierre queda en la corrección de las changes abiertas.

## Migration Plan

No hay perfil guardado que migrar. Publicar el sitio nuevo basta. Para volver atrás, se deja de publicar y se borra `geminiApiKey` y la base local en el navegador.

## Open Questions

Ninguna que cambie los specs, el enfoque o las tareas.
