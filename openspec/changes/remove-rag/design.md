# Design

## Context

`cv-profile` no está en `openspec/specs/`. El único texto que exige chunks, embeddings y dos ramas en paralelo es la change abierta `job-fit-assistant` (spec, propuesta, diseño y tareas 2.2 y 2.4). Esa change tiene 0 de 9 tareas hechas. `src/profile/load-cv.ts` rechaza la carga y no escribe perfil. `package.json` no trae LangGraph, `pdfjs-dist` ni un cliente de embeddings. La spec `assistant-shell` muestra el estado del perfil y no menciona chunks. Ver `proposal.md` para la motivación y `specs/cv-profile/spec.md` para el comportamiento que queda.

`openspec validate remove-rag` pasa y avisa que archivar este delta ahora sería rechazado: no existe la spec durable, y un delta con MODIFIED no puede crearla.

## Goals / Non-Goals

**Goals:**

- Dejar un solo camino de carga: validar el PDF, extraer el texto sin un modelo, pedir el estado estructurado y guardarlo.
- Quitar de los artefactos de `job-fit-assistant` el índice de chunks, `gemini-embedding-2` y la rama paralela, antes de que esa change se implemente.
- Hacer comprobable que una carga válida no deja chunks ni embeddings y que no hay una consulta de recuperación.

**Non-Goals:**

- Implementar aquí el grafo, IndexedDB o la llamada a Gemini. Eso sigue en las tareas de `job-fit-assistant`, ya sin RAG.
- Cambiar escenarios de `assistant-shell`.
- Definir consultas exactas sobre el estado estructurado, ni el fit con vacantes.
- Añadir un flag para reactivar el índice.

## Decisions

### Corregir la change viva, no archivar RAG para luego borrarlo

El corte se aplica editando `openspec/changes/job-fit-assistant/`: el propósito y los requisitos ADDED de `specs/cv-profile/spec.md`, más `proposal.md`, `design.md` y `tasks.md`. Esos archivos pasan a describir solo el estado estructurado. El delta de esta change queda como registro del corte.

No se crea `openspec/specs/cv-profile` en este trabajo. Archivar `job-fit-assistant` con los requisitos de chunks publicaría un contrato que no se va a cumplir. Archivar `remove-rag` antes de que exista esa spec durable falla por el aviso de MODIFIED.

Cuando `job-fit-assistant` se archive ya corregida, la spec durable nace sin chunks. Este delta no se archiva encima de esa spec: sus requisitos REMOVED ya no estarían allí. El cierre de `remove-rag` es esa corrección, no un segundo archivo.

Alternativa considerada: dejar `job-fit-assistant` intacta y fiarse de este delta. Quien implemente esa change seguiría las tareas 2.2 y 2.4 y construiría el índice.

### Un grafo lineal y un solo cliente de modelo

La carga que implementará `job-fit-assistant` queda así:

```
[1 validar PDF] --no--> error, perfil anterior intacto
        |
       si
        v
[2 texto sin modelo] --falla--> error, perfil anterior intacto
        |
       ok
        v
[3 estado con el modelo; el código redondea experience_time]
        |
        v
[4 guardar solo el estado]
        |
        v
[5 avisar éxito]
```

No hay nodo de chunks, ni embeddings, ni un nodo que espere dos escrituras. Si el paso 3 o el 4 falla, no se escribe estado de esa carga y no se avisa éxito. Sigue sin checkpointer y sin memoria de mensajes. El modelo de estado sigue siendo `gemini-3.5-flash`. No se usa `gemini-embedding-2`.

Las pruebas inyectan un cliente de modelo. No hay un cliente de embeddings que fingir. Un caso comprueba que una carga válida no escribe chunks ni vectores.

Alternativa considerada: conservar la rama 3.1 y no llamarla. El grafo seguiría documentando un flujo que el proyecto rechazó.

### Un almacén para el estado, ninguno para vectores

Cuando se cree la base local, el perfil es un solo estado. No hay almacén `chunks` ni campo de embedding. La API key sigue en `localStorage`. No hay vectores que migrar ni que borrar: ningún navegador guardó un índice de este proyecto.

Alternativa considerada: crear el almacén `chunks` vacío. Reservaría un sitio para el flujo que acaba de salir.

### La prohibición de consulta vive en `cv-profile`

No se abre una capacidad `rag`. El inventario de specs durables está vacío y el comportamiento pertenece a la carga del perfil. El requisito añadido «No indexar ni consultar el CV por embeddings» cubre la carga y cualquier uso posterior del perfil guardado.

Alternativa considerada: una capacidad nueva solo para prohibir la recuperación. Duplicaría el límite y no tiene un spec previo que modificar.

### La pantalla no cambia de contrato

`assistant-shell` sigue mostrando el estado. En `assistant-ui`, la propuesta y el diseño dicen que `job-fit-assistant` guarda chunks. Esas frases se corrigen para decir que guarda el estado estructurado. No se añade un delta de `assistant-shell`.

## Risks / Trade-offs

- [Las dos changes describen `cv-profile` hasta que `job-fit-assistant` se reescriba] → Esta change se aplica antes de implementar esa change. Las tareas 2.2 y 2.4 dejan de pedir chunks y embeddings.
- [Archivar `remove-rag` ahora falla] → No se archiva este delta mientras no exista `openspec/specs/cv-profile` con los requisitos que retira. Si la change de origen se corrige antes de archivarse, el cierre es esa corrección.
- [Una change posterior vuelve a introducir recuperación por embeddings] → Tiene que modificar el requisito que lo prohíbe. No queda un cliente ni un almacén a medio conectar.
- [El veredicto de una vacante pierde el texto literal del CV] → El estado estructurado es lo que se guarda. Volver a indexar el PDF queda fuera de este diseño.

## Migration Plan

1. Reescribir la spec, la propuesta, el diseño y las tareas de `job-fit-assistant` para que la carga guarde solo el estado estructurado.
2. Corregir en `assistant-ui` las frases de propuesta y diseño que atribuyen chunks a esa carga.
3. No añadir dependencias de embeddings. `load-cv.ts` sigue siendo el punto de enganche hasta que `job-fit-assistant` lo sustituya, ya sin índice.
4. Rollback: restaurar esos artefactos. No hay datos de usuario que recuperar ni código de índice que desmontar.
