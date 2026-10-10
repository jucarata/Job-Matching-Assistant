# Tasks

## 1. Spec viva de cv-profile

- [ ] 1.1 Reescribir `openspec/changes/job-fit-assistant/specs/cv-profile/spec.md` para que el propósito y los requisitos ADDED guarden solo el estado estructurado. Quitar «Generar chunks por aspecto del CV», «Guardar chunks con embeddings» y «Terminar solo si las dos ramas quedan guardadas». Ajustar «No guardar el PDF», «Guardar el estado estructurado» (incluido el escenario sin API key), «Conservar un solo perfil», «Reemplazar el perfil» y «Rechazar un PDF sin texto». Añadir «Informar éxito solo con el estado guardado» y «No indexar ni consultar el CV por embeddings», como en `openspec/changes/remove-rag/specs/cv-profile/spec.md`. Verificar con `openspec validate job-fit-assistant --type change` y que ese archivo ya no contiene `embedding`.

## 2. Plan de job-fit-assistant

- [ ] 2.1 Actualizar `openspec/changes/job-fit-assistant/proposal.md` para que el perfil de salida sea el estado estructurado, sin chunks ni embeddings, y para que Gemini no se use al embeder. Verificar que el archivo no contiene `embedding` ni `chunks`.
- [ ] 2.2 Actualizar `openspec/changes/job-fit-assistant/design.md`: un grafo lineal (validar PDF, texto sin modelo, estado con `gemini-3.5-flash`, guardar estado, avisar éxito), un solo almacén de estado y sin `gemini-embedding-2` ni almacén `chunks`. Verificar que el archivo no contiene `embedding` ni `768`.
- [ ] 2.3 Reescribir las tareas 2.2 y 2.4 de `openspec/changes/job-fit-assistant/tasks.md` para el grafo lineal y el estado en la base local, sin cliente de embeddings ni corte por aspectos. Conservar el redondeo de `experience_time` y la API key en `localStorage`. Verificar que esas dos tareas no piden chunks, embeddings ni dos ramas, y que 2.3 y 2.5 siguen cubriendo el redondeo y la clave.

## 3. Menciones en assistant-ui

- [ ] 3.1 Corregir en `openspec/changes/assistant-ui/proposal.md` y `openspec/changes/assistant-ui/design.md` las frases que dicen que `job-fit-assistant` guarda chunks, para que digan que guarda el estado estructurado. No editar `openspec/changes/assistant-ui/specs/assistant-shell/spec.md`. Verificar que la spec del shell no contiene `chunk` ni `embedding`, y que la propuesta y el diseño de `assistant-ui` ya no dicen que esa carga guarda chunks.

## 4. Código que todavía no indexa

- [ ] 4.1 Confirmar que `package.json` no gana una dependencia de embeddings y que `src/profile/load-cv.ts` sigue rechazando la carga sin escribir perfil. Verificar con `npm test` en verde y que una búsqueda de `embedding` en `src/` y `package.json` no encuentra un cliente ni un almacén de vectores.

## Workflow follow-up

- No archivar `remove-rag` mientras no exista `openspec/specs/cv-profile`. El aviso de validate dice que un delta con MODIFIED no puede crear esa spec.
- Archivar `job-fit-assistant` solo después de estas correcciones, para que la spec durable nazca sin chunks ni embeddings.
- No archivar el delta de `remove-rag` encima de esa spec durable: los requisitos REMOVED ya no estarían allí. El cierre de esta change es la corrección de `job-fit-assistant`.
