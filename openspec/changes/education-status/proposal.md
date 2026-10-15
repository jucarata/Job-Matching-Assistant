# Proposal

## Why

La carga guarda la educación como frases. Una frase como «Ingeniero en Sistemas. Universidad ICESI. Marzo 2026.» no dice si el título ya cerró. El veredicto no conoce el día de la carga y lee esa fecha como una graduación futura, así que en octubre de 2026 trata como pendiente un título terminado en marzo.

## What Changes

- La primera llamada deja de pedir la educación. Sigue pidiendo habilidades e idiomas.
- Una llamada nueva, con el texto del CV, extrae estudios y certificaciones. No recibe la fecha de hoy. Cada ítem trae `name`, `issuer`, `end_year`, `end_month` y `ongoing`.
- El modelo copia la fecha de cierre o de graduación. Si el CV solo trae el año, `end_month` queda vacío. `ongoing` queda en true solo cuando el CV dice que ese estudio sigue y no hay fecha de fin. Si hay fecha, `ongoing` queda en false. En una certificación, la fecha copiada es la de emisión.
- El código, con la fecha del día de la carga, escribe el estado. Una fecha escrita manda sobre `ongoing`.
- Una fecha anterior a este año y este mes queda en `FINALIZADO`. Un año suelto anterior a este año también. Una fecha posterior queda en `ACTUALMENTE`. Un año suelto futuro también. El mismo año y el mismo mes que hoy, o el año actual sin mes, quedan sin estado. Sin fecha, `ongoing` en true queda en `ACTUALMENTE`. Sin fecha y `ongoing` en false queda sin estado.
- **BREAKING**: `education` deja de ser una lista de frases. Cada entrada guardada tiene `name`, `issuer` y `status`. `status` es `FINALIZADO`, `ACTUALMENTE` o null. No se guardan `end_year`, `end_month` ni `ongoing`.
- La pantalla muestra una línea por entrada: nombre, emisor y, si hay estado, esa palabra. Sin entradas, no hay línea de educación y la conversación sigue habilitada.
- La llamada del veredicto envía `name`, `issuer` y `status`. No envía el año, el mes ni `ongoing`. `FINALIZADO` significa que ese título o certificado ya se tiene. `ACTUALMENTE` significa que sigue en curso. Sin estado, el veredicto no afirma ninguna de las dos. Para ese punto, el estado manda sobre `flat_text`.
- Un ítem sin nombre se descarta. Si la llamada nueva falla o no devuelve una lista, la carga aborta y se conserva el perfil anterior. Una lista vacía, o una que se descarta por completo, guarda el perfil con `education` vacío.
- La barra gana dos pasos, «Leer la educación» y «Marcar la educación», y el total pasa de 7 a 9.

Supuestos de este cambio, corregibles antes de implementar:

- Estudios y certificaciones comparten la misma lista y la misma regla de estado. No hay un campo de tipo.
- La fecha de vencimiento de una certificación no se copia. Si el modelo la pone como fecha de fin, el código no tiene otra señal para distinguirla.
- El estado queda fijo en la carga. Un calendario posterior no lo recalcula.
- El emisor puede quedar vacío. La entrada igual se guarda si tiene nombre.
- El prompt va en español. El código no recibe una lista de títulos ni de palabras de «en curso»: esas palabras las nombra el prompt.
- Un perfil ya guardado con `education` como lista de frases no se migra. Al abrir la página no se usa, hasta una carga nueva.
- `cv-profile`, `assistant-shell` y `vacancy-fit` todavía no están en `openspec/specs/`. Sus requisitos viven en changes abiertas. El delta de esta change es el contrato nuevo.

## Capabilities

### New Capabilities

- Ninguna.

### Modified Capabilities

- `cv-profile`: `education` pasa de frases a entradas con `name`, `issuer` y `status`, marcadas en código a partir de la fecha copiada.
- `assistant-shell`: la zona de perfil muestra cada entrada con su estado, y omite el bloque cuando la lista está vacía.
- `vacancy-fit`: la llamada envía `name`, `issuer` y `status`, y el estado manda sobre `flat_text` al decir si el título o certificado ya se tiene.

## Impact

- `src/ai/load-chain.ts` deja de pedir `education`. Hace falta otra cadena, con su propio esquema, para estudios y certificaciones.
- Hace falta una función pura que, con la fecha de hoy inyectada, escriba `status`.
- `src/profile/types.ts`, `src/profile/load-pipeline.ts`, `src/profile/load-progress.ts` y `src/profile/profile-store.ts` cambian la forma guardada en IndexedDB, almacén `profile`. Sigue habiendo un solo perfil, sin PDF, sin chunks y sin embeddings.
- `src/shell/AssistantShell.tsx` sustituye la fila de frases por una línea por entrada.
- `src/ai/verdict-chain.ts` envía el estado y deja de tratar una fecha del CV como graduación estimada cuando ese estado existe. El prompt implementado hoy dice que, si los campos y `flat_text` discrepan, manda `flat_text`. Este delta acota esa regla al estado de la educación. Esa regla no está en un spec archivado.
- `role-experience` y `vacancy-fit` siguen diciendo que `education` son los títulos de graduación. Este delta es el contrato que lo reemplaza. `job-fit-assistant` y `remove-rag` tampoco se reescriben.
- Sigue sin backend, sin project id y sin guardar el PDF.
