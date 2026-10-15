# Tasks

## 1. Alinear el spec de RAG

- [ ] 1.1 Reescribir `openspec/changes/remove-rag/specs/cv-profile/spec.md` para que una carga válida conserve un `profile` con `tech_skills`, `soft_skills`, `languages`, `experience_time`, `education` y `flat_text`, y siga sin chunks ni embeddings. En `openspec/changes/remove-rag/design.md`, `proposal.md` y `tasks.md`, sustituir la frase de que el veredicto pierde el texto literal: el texto se guarda como `flat_text` y la llamada del veredicto no lo envía. Verificar que ese spec contiene `flat_text` y `profile`, que no contiene `embedding`, y que `openspec validate remove-rag --type change` pasa.
- [ ] 1.2 Actualizar `proposal.md`, `design.md`, `tasks.md` y `specs/cv-profile/spec.md` de `openspec/changes/job-fit-assistant/` para una cadena lineal de LangChain, el `profile` con `flat_text` y la clave en la fila de carga. Quitar LangGraph, los chunks y `gemini-embedding-2`. Verificar que esos cuatro archivos no contienen `langgraph` ni `embedding`, que sí contienen `flat_text`, y que `openspec validate job-fit-assistant --type change` pasa.

## 2. Profile y cadena de carga

- [x] 2.1 Añadir `@langchain/google-genai`, `@langchain/core` y `pdfjs-dist`. Verificar que `package.json` los declara y que `npm test` sigue pasando.
- [x] 2.2 Cambiar `src/profile/types.ts` al `profile` en snake_case, con `flat_text: string` y `experience_time: number | null`. Verificar que `npm test` compila y que el tipo ya no usa `techSkills`, `softSkills` ni `experienceTime`.
- [x] 2.3 Implementar la cadena de carga: validar el PDF, extraer el texto con `pdfjs-dist`, asignar ese texto a `flat_text`, pedir el resto de campos a `gemini-3.5-flash` y redondear `experience_time` en código. Si falla la validación, el texto, el modelo o el guardado, no escribir el `profile` de esa carga. Verificar con un cliente falso: PDF con texto cuyo `flat_text` es ese texto, archivo que no es PDF, PDF sin texto sin llamada al modelo, fallo del modelo, 2 años y 3 meses quedan en 2, 2 años y 6 meses quedan en 3, y 1.5 años queda en 1.5.
- [x] 2.4 Guardar un solo `profile` en IndexedDB, sin almacén `chunks` y sin el archivo PDF. Una carga nueva que termina bien reemplaza el anterior, incluido `flat_text`. Verificar con una base de prueba: éxito, reemplazo, fallo de escritura que conserva el anterior, y que el registro no tiene chunks ni embeddings.

## 3. Clave y veredicto

- [x] 3.1 Guardar la clave en `localStorage` bajo `geminiApiKey`, rellenarla al abrir la página y no pedir project id. Sin clave, la carga no llama al modelo. Verificar con pruebas: clave releída, carga sin clave que no guarda `profile`, y ausencia de project id en el módulo.
- [ ] 3.2 Implementar la cadena de veredicto con system prompt y salida `matches`, `weaknesses`, `score` (entero 0–100) y `apply_recommendation` (booleano). Enviar solo los campos estructurados y el texto de la vacante. Verificar con un cliente falso: la llamada no incluye `flat_text` ni el mensaje anterior, un segundo envío no recibe el veredicto previo, y un resultado incompleto o un `score` fuera de rango no se acepta.

## 4. Pantalla

- [x] 4.1 Poner el campo «Clave de Gemini» (`type="password"`) en la fila de «Cargar CV» y de «Reemplazar CV», sin `data-primary` y fuera de los ajustes. Verificar en `src/shell/AssistantShell.test.tsx`: sin perfil la única acción primaria sigue siendo «Cargar CV», con perfil el campo sigue visible, y el diálogo de ajustes no contiene el campo.
- [ ] 4.2 Al terminar bien la llamada, vaciar el compositor y mostrar «Coincidencias», «Debilidades», «Puntaje» y «Postular» o «No postular». Si falta la clave, falta el texto o la llamada falla, conservar el borrador, no mostrar veredicto y poner el error junto a «Enviar». Un reemplazo de CV que termina bien borra el veredicto; uno que falla lo conserva. Verificar esos casos en las pruebas del shell con un cliente de veredicto falso.
- [ ] 4.3 Actualizar `README.md` con la fila de la clave, el `profile` (incluido `flat_text`), el modelo `gemini-3.5-flash` y las cuatro piezas del veredicto. Verificar que el README no pide project id ni describe embeddings, y que `npm run build` no contiene una API key de ejemplo.

## Workflow follow-up

- Archivar `vacancy-fit` solo cuando `cv-profile` y `assistant-shell` ya existan como specs durables, porque este delta modifica requisitos que todavía viven en changes abiertas.
- El cierre de `remove-rag` sigue siendo la corrección de `job-fit-assistant`, ya con `profile` y `flat_text`. No archivar ese delta encima de la spec durable si sus requisitos REMOVED ya no están allí.
