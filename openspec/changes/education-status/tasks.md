# Tasks

## 1. Cadena de educación

- [x] 1.1 Añadir la tercera cadena en un módulo nuevo, con salida `name`, `issuer`, `end_year`, `end_month` y `ongoing`, el mismo `GEMINI_MODEL` y sin project id. El prompt, en español, pide estudios y certificaciones, copia la fecha de cierre o de graduación, deja `end_month` vacío si solo hay año, pone `ongoing` en true solo cuando el CV dice que sigue y no hay fecha de fin, lo deja en false si hay fecha, copia la emisión de una certificación y no su vencimiento, y no inventa fechas. La plantilla no tiene variable de fecha. Verificar con una prueba que el prompt contiene esas reglas, que el texto formateado no incluye el día de hoy, que el esquema exige esos cinco campos y que `npm test` sigue pasando.

## 2. Marca, carga y guardado

- [x] 2.1 Marcar en código, con un `Date` inyectado y su año y mes locales. Una fecha utilizable manda sobre `ongoing`. Marzo de 2026 con el día 15 de octubre de 2026 queda en `FINALIZADO`. Marzo de 2027 queda en `ACTUALMENTE`. El año 2019, sin mes, queda en `FINALIZADO`. El año 2027, sin mes, queda en `ACTUALMENTE`. Octubre de 2026 y el año 2026 sin mes quedan con `status` null. Sin fecha y `ongoing` true queda en `ACTUALMENTE`. Sin fecha y `ongoing` false queda con `status` null. Una fecha de marzo de 2026 con `ongoing` true queda en `FINALIZADO`. Un `end_month` fuera de 1 a 12, o un mes sin año, deja la entrada sin fecha. Se descarta el nombre vacío y se conserva el emisor vacío. Un ítem mal formado no aborta el resto. Lo que sale de la marca es `name`, `issuer` y `status`. Verificar con pruebas de esa función y `npm test`.
- [x] 2.2 Quitar `education` de la primera cadena. En el pipeline, leer la educación con la tercera cadena después de redondear los roles, marcar con una fecha inyectable que por defecto es el momento de la carga, y guardar `education` con `name`, `issuer` y `status`. Una lista vacía o toda descartada guarda `education` vacío. Un fallo o una respuesta que no es lista aborta y conserva el perfil anterior. Actualizar los perfiles de prueba al nuevo tipo para que la suite compile, y pintar en la zona de perfil una línea por entrada. Verificar en `src/profile/load-pipeline.test.ts` con cadenas falsas y el día 15 de octubre de 2026: Ingeniero en Sistemas, Universidad ICESI, marzo de 2026 guarda `FINALIZADO`; Técnico en Sistemas, SENA, 2019 guarda `FINALIZADO`; un estudio en curso sin fecha guarda `ACTUALMENTE`; una entrada sin fecha ni curso guarda `status` null; un mes 13 se guarda con `status` null; un nombre vacío no se guarda; la lista vacía guarda `education` vacío; el fallo no escribe el perfil nuevo. `npm test` pasa.
- [x] 2.3 Añadir «Leer la educación» y «Marcar la educación» después de «Redondear la experiencia», con el tope de 90 segundos en la llamada, y dejar el total en 9. Verificar que la prueba de progreso marca esos pasos y que `src/shell/AssistantShell.test.tsx` espera `aria-valuemax` 9. `npm test` pasa.

## 3. Perfil ya guardado

- [x] 3.1 Hacer que la lectura del almacén `profile` ignore un registro cuya `education` es una lista de frases, sin borrar la base, y que devuelva un registro con `name`, `issuer` y `status`. Verificar con una base de prueba: las frases no se devuelven y la entrada nueva sí. `npm test` pasa.

## 4. Pantalla

- [x] 4.1 Mostrar en la zona de perfil una línea por entrada, con `name`, `issuer` y, si hay estado, esa palabra. Sin estado, la línea no lleva `FINALIZADO` ni `ACTUALMENTE`. Con emisor vacío, muestra el nombre y el estado. Con `education` vacío, no hay línea de educación y la conversación sigue habilitada. Verificar en `src/shell/AssistantShell.test.tsx` esos cuatro casos. `npm test` pasa.

## 5. Veredicto

- [x] 5.1 Enviar en la llamada solo `name`, `issuer` y `status` de cada entrada guardada. El prompt sigue en inglés, sin tildes, y dice que `FINALIZADO` ya se obtuvo, que `ACTUALMENTE` sigue en curso, que un `status` null no afirma ninguna de las dos, y que para ese punto manda `status` sobre `flat_text`. Verificar en `src/ai/verdict-chain.test.ts` que el cuerpo no trae `end_year`, `end_month` ni `ongoing`, que el prompt contiene esas cuatro reglas y sigue sin tildes, y que `openspec validate education-status --type change` pasa. `npm test` pasa.

## Workflow follow-up

- No archivar `education-status` mientras `cv-profile`, `assistant-shell` y `vacancy-fit` no existan como specs durables: este delta modifica requisitos que todavía viven en changes abiertas.
