# Tasks

## 1. Alinear el spec de RAG

- [x] 1.1 Reescribir `openspec/changes/remove-rag/specs/cv-profile/spec.md` para que una carga válida conserve un `profile` con `tech_skills`, `soft_skills`, `languages`, `experience_time`, `education` y `flat_text`, y siga sin chunks ni embeddings. En `openspec/changes/remove-rag/design.md`, `proposal.md` y `tasks.md`, sustituir la frase de que el veredicto pierde el texto literal: el texto se guarda como `flat_text` y la llamada del veredicto lo envía. Verificar que ese spec contiene `flat_text` y `profile`, que no contiene `embedding`, y que `openspec validate remove-rag --type change` pasa.
- [x] 1.2 Actualizar `proposal.md`, `design.md`, `tasks.md` y `specs/cv-profile/spec.md` de `openspec/changes/job-fit-assistant/` para una cadena lineal de LangChain, el `profile` con `flat_text` y la clave en la fila de carga. Quitar LangGraph, los chunks y `gemini-embedding-2`. Verificar que esos cuatro archivos no contienen `langgraph` ni `embedding`, que sí contienen `flat_text`, y que `openspec validate job-fit-assistant --type change` pasa.

## 2. Profile y cadena de carga

- [x] 2.1 Añadir `@langchain/google-genai`, `@langchain/core` y `pdfjs-dist`. Verificar que `package.json` los declara y que `npm test` sigue pasando.
- [x] 2.2 Cambiar `src/profile/types.ts` al `profile` en snake_case, con `flat_text: string` y `experience_time: number | null`. Verificar que `npm test` compila y que el tipo ya no usa `techSkills`, `softSkills` ni `experienceTime`.
- [x] 2.3 Implementar la cadena de carga: validar el PDF, extraer el texto con `pdfjs-dist`, asignar ese texto a `flat_text`, pedir el resto de campos con `GEMINI_MODEL` y redondear `experience_time` en código. Si falla la validación, el texto, el modelo o el guardado, no escribir el `profile` de esa carga. Verificar con un cliente falso: PDF con texto cuyo `flat_text` es ese texto, archivo que no es PDF, PDF sin texto sin llamada al modelo, fallo del modelo, 2 años y 3 meses quedan en 2, 2 años y 6 meses quedan en 3, y 1.5 años queda en 1.5.
- [x] 2.4 Guardar un solo `profile` en IndexedDB, sin almacén `chunks` y sin el archivo PDF. Una carga nueva que termina bien reemplaza el anterior, incluido `flat_text`. Verificar con una base de prueba: éxito, reemplazo, fallo de escritura que conserva el anterior, y que el registro no tiene chunks ni embeddings.

## 3. Clave, corte y veredicto

- [x] 3.1 Guardar la clave en `localStorage` bajo `geminiApiKey`, rellenarla al abrir la página y no pedir project id. Sin clave, la carga no llama al modelo. Verificar con pruebas: clave releída, carga sin clave que no guarda `profile`, y ausencia de project id en el módulo.
- [x] 3.2 Guardar el corte en `localStorage` bajo `fitThreshold`, rellenarlo al abrir la página y usar 7 si falta o no está en la grilla de 0.5. Calcular «Postular» cuando `score` es mayor o igual al corte, y «No postular» cuando es menor. Verificar con pruebas: ausencia guarda 7, un valor fuera de la grilla vuelve a 7, 6.5 se conserva, 7 con corte 7 es «Postular», 6.5 con corte 7 es «No postular» y 6.5 con corte 6 es «Postular».
- [x] 3.3 Implementar la cadena de veredicto con system prompt en inglés y salida `matches`, `mismatches` y `score` de la grilla 0–10 en pasos de 0.5. Enviar el `profile` completo, `flat_text` incluido, y el texto del mensaje. El prompt pide las listas en el idioma del `profile`, dice que las notas del mensaje no son requisitos y no menciona el corte ni una recomendación de postular. Verificar con un cliente falso: la llamada incluye `flat_text` y el mensaje, no incluye `fitThreshold` ni el mensaje anterior, un segundo envío no recibe el veredicto previo, un `score` de 7.5 se acepta, y un resultado incompleto o un `score` de 7.3 o 11 no se acepta.

## 4. Pantalla

- [x] 4.1 Poner el campo «Clave de Gemini» (`type="password"`) en la fila de «Cargar CV» y de «Reemplazar CV», sin `data-primary` y fuera de los ajustes. Verificar en `src/shell/AssistantShell.test.tsx`: sin perfil la única acción primaria sigue siendo «Cargar CV», con perfil el campo sigue visible, y el diálogo de ajustes no contiene el campo.
- [x] 4.2 Sustituir el aviso «La conversación está abierta» por un chat de un solo intercambio: el texto enviado y la respuesta con «Puntaje», «Coincidencias», «No coinciden» y «Postular» o «No postular». Al enviar una llamada nueva, limpiar el intercambio anterior, mostrar el texto nuevo y vaciar el compositor. Si la llamada termina bien, mostrar la respuesta. Si falla, devolver el aviso, regresar el texto al compositor y poner el error junto a «Enviar». Sin clave o sin texto, conservar el intercambio y el borrador y no llamar al modelo. Un reemplazo de CV que termina bien borra el intercambio y devuelve el aviso; uno que falla lo conserva. Recargar no recupera el intercambio. Verificar esos casos en las pruebas del shell con un cliente de veredicto falso, y que `localStorage` no guarda el intercambio.
- [x] 4.3 Poner en Ajustes el control «Postular desde», limitado a la grilla de 0.5, fuera de la conversación y sin la clave de Gemini. Cambiar el corte vuelve a etiquetar el puntaje visible sin llamar al modelo. Verificar en las pruebas del shell: el control está en Ajustes, la clave no está ahí, y pasar el corte de 7 a 6 cambia un 6.5 de «No postular» a «Postular» sin una llamada.
- [x] 4.4 Crear `README.md` con la fila de la clave, el `profile` (incluido `flat_text`), el id de `GEMINI_MODEL`, el chat de un solo intercambio, las tres piezas del veredicto y el corte en Ajustes. Verificar que el README no pide project id ni describe embeddings, y que `npm run build` no contiene una API key de ejemplo.

## Workflow follow-up

- Archivar `vacancy-fit` solo cuando `cv-profile` y `assistant-shell` ya existan como specs durables, porque este delta modifica requisitos que todavía viven en changes abiertas.
- El cierre de `remove-rag` sigue siendo la corrección de `job-fit-assistant`, ya con `profile` y `flat_text`. No archivar ese delta encima de la spec durable si sus requisitos REMOVED ya no están allí.
