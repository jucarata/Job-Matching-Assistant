# Proposal

## Why

El perfil ya no se recupera por embeddings, y el veredicto de una vacante sigue sin estar definido. Hay que fijarlo ahora, con el estado estructurado y el texto de la vacante, y guardar además el texto plano del CV para validaciones posteriores.

## What Changes

- Comparar, en un solo envío, el estado estructurado del CV con el texto de la vacante. Un system prompt pide la decisión. La respuesta tiene cuatro campos en inglés: `matches`, `weaknesses`, `score` y `apply_recommendation`.
- El estado guardado se llama `profile`. Todos sus campos van en inglés: `tech_skills`, `soft_skills`, `languages`, `experience_time`, `education` y `flat_text`.
- `flat_text` es el texto tal cual extraído del PDF, sin modelo. Se guarda con el perfil y no entra en la llamada del veredicto. El archivo PDF sigue sin guardarse.
- La clave de Gemini se escribe en la misma fila que «Cargar CV» (y que «Reemplazar CV» cuando ya hay perfil). Sirve para extraer el estado y para el veredicto. Persiste en el navegador.
- «Enviar» llama a Gemini y muestra esas cuatro piezas. Sin perfil, sin clave o sin texto de vacante, no hay llamada.
- La carga del CV y el veredicto usan una cadena de LangChain, no un grafo de LangGraph. Sigue sin chunks, sin embeddings y sin memoria de mensajes.
- **BREAKING** respecto del contrato abierto de `cv-profile`: el perfil deja de ser solo los cinco campos estructurados y pasa a incluir `flat_text`. Los nombres de campo del estado quedan fijados en inglés bajo `profile`.

Supuestos de este cambio, corregibles antes de implementar:

- `score` es un entero de 0 a 100. `apply_recommendation` es booleano. `matches` y `weaknesses` son listas de textos.
- Las etiquetas de la interfaz siguen en español. Los valores de nivel de idioma siguen siendo `básico`, `intermedio`, `avanzado` y `nativo`.
- `flat_text` no se envía al modelo del veredicto. Queda reservado para validaciones que esta change no define.
- `cv-profile` y `assistant-shell` todavía no están en `openspec/specs/`. Sus requisitos viven en las changes abiertas `job-fit-assistant`, `remove-rag` y `assistant-ui`.
- Ningún navegador tiene un perfil guardado de este proyecto. No hay datos que migrar.

## Capabilities

### New Capabilities

- `vacancy-fit`: decidir el ajuste entre el `profile` estructurado y el texto de una vacante, y devolver `matches`, `weaknesses`, `score` y `apply_recommendation`.

### Modified Capabilities

- `cv-profile`: el estado se llama `profile`, sus campos están en inglés y incluye `flat_text`. Sigue sin guardar el PDF, chunks ni embeddings.
- `assistant-shell`: la clave de Gemini está en la fila de carga del CV, y «Enviar» muestra el veredicto de cuatro piezas.

## Impact

- Hay que reescribir el delta `openspec/changes/remove-rag/specs/cv-profile/spec.md`: hoy dice que una carga válida conserva solo el estado estructurado y que el veredicto pierde el texto literal del CV. `flat_text` conserva ese texto, sin volver a introducir chunks ni embeddings.
- `job-fit-assistant` todavía describe LangGraph, chunks y los campos sin `flat_text`. `remove-rag` ya iba a aplanar esa change; esta añade el nombre `profile`, `flat_text` y la cadena de LangChain.
- `assistant-shell` dice que «Enviar» no llama a un modelo y que conserva el borrador. Ese requisito cambia.
- Código afectado cuando se implemente: `src/shell/AssistantShell.tsx`, `src/profile/types.ts` y `src/profile/load-cv.ts`. Hoy la carga rechaza el archivo y el diálogo de ajustes no pide la clave.
- Dependencia nueva para la cadena: LangChain con el cliente de Gemini en el navegador. No hay backend ni project id. La clave no entra en el build.
