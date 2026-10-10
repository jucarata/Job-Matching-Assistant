# Proposal

## Why

El perfil del CV no va a recuperarse por similitud. Partir el texto en chunks, embederlos y consultarlos después no aporta al veredicto y deja de formar parte del proyecto. Hay que sacarlo ahora, antes de implementar la change `job-fit-assistant`, que todavía lo exige.

## What Changes

- **BREAKING** El perfil deja de incluir chunks y embeddings. Tras una carga válida solo se conserva el estado estructurado.
- **BREAKING** Se elimina generar chunks por aspecto del CV, pedir un embedding por chunk y guardar texto, aspecto y vector en la base local.
- **BREAKING** Queda fuera del proyecto la consulta posterior de esos chunks: no hay índice vectorial ni recuperación por embeddings, ni en esta etapa ni en una posterior.
- La carga sigue aceptando solo un PDF, extrae el texto sin un modelo y pide a Gemini únicamente el estado estructurado (`tech_skills`, `soft_skills`, `languages`, `experience_time`, `education`).
- Cada carga sigue siendo una ejecución nueva. Sigue habiendo un solo perfil, la API key de Gemini en el navegador y el redondeo de los años en código.
- La pantalla de `assistant-shell` no cambia: sigue mostrando el estado del perfil, no chunks.

Supuestos de este cambio, corregibles antes de implementar:

- El estado estructurado se mantiene. Lo que sale es solo el flujo de chunks, embeddings y su consulta.
- «Consulta» aquí es la recuperación a partir de embeddings. Mostrar el estado en la zona de perfil sigue. Las consultas exactas sobre ese estado no están especificadas y esta change no las añade ni las prohíbe.
- `cv-profile` todavía no está en `openspec/specs/`. Sus requisitos viven en la change abierta `job-fit-assistant`. Esta change modifica esa capacidad.
- El código actual no indexa: `src/profile/load-cv.ts` es un punto de enganche que rechaza la carga. No hay almacén de chunks que migrar.

## Capabilities

### New Capabilities

- Ninguna.

### Modified Capabilities

- `cv-profile`: deja de generar chunks, de guardarlos con embeddings y de prever su consulta. El perfil guardado es solo el estado estructurado.

## Impact

- La spec, el diseño y las tareas de `job-fit-assistant` todavía describen chunks, `gemini-embedding-2` y dos ramas en paralelo. Hay que alinearlos con esta retirada para que un archivo posterior no vuelva a introducir RAG.
- `assistant-ui` menciona chunks en su propuesta y su diseño. La spec `assistant-shell` no exige chunks ni embeddings; su comportamiento no cambia.
- No se añade un cliente de embeddings ni un almacén `chunks`. Gemini se usa solo para el estado estructurado. La API key sigue haciendo falta para esa extracción.
- No hay código de indexación que borrar. La implementación de `job-fit-assistant` (0 de 9 tareas) debe construirse ya sin ese flujo.
