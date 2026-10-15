# Proposal

## Why

El veredicto de una vacante sigue sin estar implementado, y el contrato escrito le pide al modelo un sí o un no. El puntaje tiene que medir solo cuánto cubre el perfil, para que la decisión de postular sea un corte que el usuario pueda mover sin otra llamada.

## What Changes

- Una cadena de LangChain compara el `profile` completo con el mensaje. El system prompt está en inglés. La salida del modelo tiene tres campos en inglés: `matches`, `mismatches` y `score`.
- La llamada envía `tech_skills`, `soft_skills`, `languages`, `experience_time`, `education`, `flat_text` y el texto del mensaje. El mensaje trae la vacante y puede traer notas del usuario. Esas notas no son requisitos del puesto.
- `score` es cobertura, de 0 a 10, en pasos de 0.5. 0 es que nada de la experiencia coincide. 10 es que la experiencia cubre todos los requisitos. Un valor fuera de esa grilla no se acepta ni se redondea.
- El modelo no devuelve recomendación de postular, ni consejos, ni conoce el corte. `matches` y `mismatches` se piden en el idioma del `profile`.
- La aplicación etiqueta el puntaje: `score` mayor o igual al corte es «Postular»; por debajo es «No postular». El corte inicial es 7, usa la misma grilla de 0.5 y se guarda en el navegador. Cambiarlo vuelve a etiquetar el puntaje visible sin llamar al modelo. El control está en Ajustes.
- «Enviar» muestra un solo intercambio en la zona que hoy dice «La conversación está abierta»: el texto enviado y, en la respuesta, el puntaje, la etiqueta y las dos listas. Un envío nuevo limpia el anterior y no se persiste. Sin perfil, sin clave o sin texto, no hay llamada.
- **BREAKING** respecto del contrato anterior de esta change: el veredicto deja de ser `matches`, `weaknesses`, `score` de 0 a 100 y `apply_recommendation`. `flat_text` entra en la llamada.

Supuestos de este cambio, corregibles antes de implementar:

- «La conversación está abierta» se ve solo cuando no hay intercambio.
- Un envío que llama al modelo limpia el intercambio anterior, muestra el texto enviado y vacía el compositor. Si la llamada termina bien, aparece la respuesta. Si falla, el texto vuelve al compositor, no queda intercambio y el error queda junto a «Enviar».
- Un envío que no llama al modelo conserva el intercambio y el borrador.
- El corte se elige solo entre los valores de la grilla. Si no hay uno guardado, es 7.
- Las etiquetas de la interfaz siguen en español. Los niveles de idioma siguen siendo `básico`, `intermedio`, `avanzado` y `nativo`.
- `cv-profile` y `assistant-shell` todavía no están en `openspec/specs/`. Sus requisitos viven en las changes abiertas.

## Capabilities

### New Capabilities

- `vacancy-fit`: comparar el `profile` completo con el mensaje de una vacante y devolver `matches`, `mismatches` y `score`.

### Modified Capabilities

- `cv-profile`: el estado se llama `profile`, sus campos están en inglés e incluye `flat_text`. Sigue sin guardar el PDF, chunks ni embeddings.
- `assistant-shell`: «Enviar» muestra un chat de un solo intercambio, la etiqueta de postular sale del corte, y ese corte se edita en Ajustes.

## Impact

- Hay que reescribir el delta `openspec/changes/remove-rag/specs/cv-profile/spec.md`: hoy una carga válida conserva solo el estado estructurado. `flat_text` conserva el texto literal, y la llamada del veredicto lo envía junto con el resto del `profile`.
- `remove-rag` dice que el veredicto pierde el texto literal del CV. Ese texto se guarda y el veredicto lo usa.
- `job-fit-assistant` todavía describe LangGraph, chunks y los campos sin `flat_text`. `remove-rag` ya iba a aplanar esa change; esta mantiene el nombre `profile`, `flat_text` y la cadena de LangChain.
- `assistant-shell` dice que «Enviar» no llama a un modelo y que conserva el borrador. Ese requisito cambia.
- Código ya en el repo: la carga, el `profile` y la clave en la fila del CV. `src/shell/AssistantShell.tsx` todavía no llama al modelo en «Enviar». El diálogo de Ajustes no tiene el corte. No hay `README.md`.
- La cadena de veredicto usa el mismo cliente y el mismo `GEMINI_MODEL` que la carga. Hoy ese id es `gemini-3.8-flash`.
- Sigue sin backend, sin project id, sin chunks, sin embeddings y sin memoria de mensajes.
