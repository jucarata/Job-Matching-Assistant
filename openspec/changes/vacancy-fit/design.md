# Design

## Context

La carga ya guarda un `profile` con `flat_text` y la clave vive en `localStorage` bajo `geminiApiKey`. `src/shell/AssistantShell.tsx` deja `onSend` vacío. Ajustes no tiene campos. `src/ai/gemini.ts` fija `GEMINI_MODEL` en `gemini-3.8-flash`. Los deltas abiertos de `remove-rag` y `job-fit-assistant` todavía hablan de un veredicto sin el texto literal, o de LangGraph y chunks. Ver `proposal.md` para la motivación y los specs de esta change para el comportamiento.

## Goals / Non-Goals

**Goals:**

- Una cadena de veredicto que comparte el cliente y el `GEMINI_MODEL` de la carga.
- El corte de postular fuera del prompt, con valor inicial 7, editable en Ajustes.
- Un solo intercambio en memoria: el mensaje enviado y el veredicto.

**Non-Goals:**

- Pedirle al modelo consejos, un booleano de postular o el corte.
- Persistencia del intercambio, o un historial de varios mensajes.
- Cambiar la cadena de carga, el id del modelo o mover la clave a Ajustes.
- Un backend, chunks, embeddings o LangGraph.

## Decisions

### Alinear los deltas abiertos antes de archivar

`cv-profile` y `assistant-shell` no están en `openspec/specs/`. El delta de esta change es el contrato nuevo. Se reescribe `openspec/changes/remove-rag/specs/cv-profile/spec.md` para que una carga válida conserve el `profile` con `flat_text` y siga sin chunks ni embeddings. En los artefactos de `remove-rag`, la frase de que el veredicto pierde el texto literal pasa a decir que ese texto se guarda como `flat_text` y la llamada del veredicto lo envía. La propuesta, el diseño y las tareas de `job-fit-assistant` pasan a la cadena lineal de LangChain y a esos campos. `remove-rag` ya iba a quitar el índice; esta change no reabre esa retirada.

No se archiva `vacancy-fit` encima de una spec durable que todavía no existe. El cierre de `remove-rag` sigue siendo la corrección de `job-fit-assistant`, ya con `profile` y `flat_text`.

Alternativa considerada: dejar esos deltas intactos. Quien los lea seguiría creyendo que el veredicto no ve el CV literal.

### Una cadena, el mismo cliente

`@langchain/google-genai` crea el chat con la clave del navegador, cabecera `x-goog-api-key`, sin proxy y sin project id. La salida estructurada fija `matches`, `mismatches` y `score`. Las pruebas inyectan un cliente falso y no abren red.

```
profile + mensaje
        |
        v
cadena de veredicto
  system prompt en ingles
        |
        v
matches, mismatches, score
        |
        v
codigo rechaza score fuera de la grilla
        |
        v
score >= corte --> Postular
score <  corte --> No postular
```

La grilla es 0, 0.5, 1, …, 10. La comprobación usa el doble del puntaje: tiene que ser un entero de 0 a 20. Un 7.3 o un 11 no se redondea; el veredicto queda incompleto.

El system prompt pide cobertura, con 0 como nada en común y 10 como requisitos cubiertos. Pide las listas en el idioma del `profile`. Dice que las palabras del mensaje que no son la vacante son notas del usuario y no requisitos. Dice que una coincidencia tiene que poder señalarse en los campos o en `flat_text`, y que si se contradicen manda el texto literal. No nombra el corte ni pide recomendar postular.

El mensaje humano lleva el JSON del `profile`, `flat_text` incluido, y el texto escrito. No lleva el corte, el mensaje anterior ni el veredicto anterior.

Alternativa considerada: que el modelo devuelva también el sí o el no. El corte lo cambia el usuario, y un booleano del modelo quedaría atado a una regla que ya no está en el prompt.

### El corte en Ajustes

El control se etiqueta «Postular desde» y solo ofrece la grilla. Se guarda en `localStorage` bajo `fitThreshold` al cambiar, y al abrir la página se rellena. Si falta o no está en la grilla, el valor es 7. La clave de Gemini no entra en ese diálogo.

La etiqueta se calcula en el render: `score >= corte` es «Postular»; si no, «No postular». Mover el control actualiza la etiqueta del puntaje que ya está en pantalla y no llama al modelo.

Alternativa considerada: dejar el 7 fijo en el código. El corte es un criterio del usuario y tiene que poder moverse sin otra llamada.

### Un intercambio en memoria

El aviso «La conversación está abierta» ocupa hoy la zona sobre el compositor. Esa zona pasa a ser el chat cuando hay un intercambio, y el aviso vuelve cuando no lo hay. El intercambio es estado de React: el texto enviado y el veredicto. No se escribe en IndexedDB ni en `localStorage`. Recargar la página lo pierde; el `profile`, la clave y el corte siguen.

```
Enviar con texto y clave
        |
        v
el intercambio anterior sale
el texto sube al chat y el compositor queda vacio
        |
        +-- llamada bien --> queda ese texto y la respuesta
        |
        +-- llamada mal ---> el aviso vacio vuelve,
                             el texto regresa al compositor,
                             error junto a Enviar

Enviar sin clave o sin texto
        |
        v
intercambio y borrador siguen, sin llamada
```

La respuesta muestra «Puntaje», «Postular» o «No postular», «Coincidencias» y «No coinciden». Un reemplazo de CV que termina bien borra el intercambio y el borrador, y devuelve el aviso. Uno que falla los conserva.

Alternativa considerada: dejar el veredicto suelto, sin el mensaje enviado. El usuario no vería a qué vacante corresponde el puntaje, porque el compositor ya se vació.

## Risks / Trade-offs

- [El modelo recomienda postular dentro de una lista] → El prompt no lo pide. Las pruebas fijan el prompt y la forma, no la prosa de un modelo real.
- [`flat_text` alarga la llamada] → Viaja en el mismo envío. No hay un segundo paso ni un índice.
- [Un `score` de 6.8 se rechaza] → No se redondea, porque el redondeo cruzaría el corte. La pantalla muestra el error junto a «Enviar».
- [La clave y el corte viven en `localStorage`] → Son datos de quien usa el navegador. El build y el repositorio no los contienen.
- [Los deltas abiertos se contradicen hasta alinearlos] → La primera tarea reescribe el spec de `remove-rag` y los artefactos de `job-fit-assistant`.
- [Archivar este delta antes de que existan las specs durables] → Un MODIFIED no crea la spec principal. Se archiva cuando `cv-profile` y `assistant-shell` ya existan, o el cierre queda en la corrección de las changes abiertas.

## Migration Plan

No hay veredictos guardados que migrar. Publicar el sitio nuevo basta. Para volver atrás, se deja de publicar y se borran `geminiApiKey`, `fitThreshold` y la base local en el navegador.

## Open Questions

Ninguna que cambie los specs, el enfoque o las tareas.
