# Proposal

## Why

La carga pide un solo par de años y meses para «el sector». Gemini colapsa todos los empleos en un número y el redondeo se queda con uno, así que un Full Stack de 1 año y 6 meses puede desaparecer detrás de otro trabajo de 1 año y 2 meses. Hace falta una lista de roles, inferidos de cada experiencia, con un corte de fiabilidad que tire los títulos débiles.

## What Changes

- La extracción de habilidades, idiomas y educación sigue en la primera llamada. Esa llamada ya no pide la experiencia.
- Una segunda llamada, con el texto del CV, propone los roles posibles. Incluye el cargo ejercido y los que se desprenden de él: un Full Stack puede salir también como Backend y Frontend.
- Cada rol trae el tiempo entero de la experiencia de la que salió, una fiabilidad de 0 a 1 y una frase del CV. La fiabilidad no acorta el tiempo. Si el Full Stack duró 2 años, un Arquitecto deducido de esa misma experiencia también trae 2 años.
- El código descarta el rol si la fiabilidad es menor que 0.7 o si la frase no está en el texto del CV. 0.7 se conserva. Un Arquitecto en 0.3 no se guarda; si hubiera quedado en 0.7 o más, sí serían 2 años.
- El redondeo actual se aplica en código a los años y meses de cada rol que pasa el corte. Menos de 6 meses sobrantes dejan el entero. 6 meses o más suben al año siguiente. Un decimal ya expresado, con los meses vacíos, se conserva con un decimal.
- **BREAKING**: el `profile` deja de tener un `experience_time` numérico. Pasa a tener `roles`. Cada rol guardado tiene `role`, `experience_time`, `reliability` y `evidence`.
- La pantalla muestra cada rol conservado como «Full Stack: 2 años». No muestra la fiabilidad ni la frase.
- La llamada del veredicto envía esos roles conservados, con `role` y `experience_time`, en lugar del número único. No envía los roles descartados, ni `reliability`, ni `evidence`.
- Si la segunda llamada propone una lista utilizable y todos los roles se descartan, o no propone ninguno, la carga termina bien y `roles` queda vacío. El resto del perfil se guarda. Si esa llamada falla o no devuelve una lista utilizable, la carga aborta y no se guarda el perfil de esa carga.

Supuestos de este cambio, corregibles antes de implementar:

- Cada entrada es un rol sacado de una experiencia. El mismo nombre puede repetirse si sale de experiencias distintas. Esas entradas no se suman.
- La frase tiene que aparecer en `flat_text`. Una diferencia de espacios no cuenta como otra frase.
- Un perfil ya guardado solo con `experience_time` numérico no se migra. Al abrir la página no se usa, hasta una carga nueva.
- El prompt de roles va en español, como la extracción actual. El código no trae una lista de títulos prohibidos: el techo de los títulos débiles lo escribe el prompt, y el corte lo aplica el código.
- `cv-profile`, `assistant-shell` y `vacancy-fit` todavía no están en `openspec/specs/`. Sus requisitos viven en changes abiertas.

## Capabilities

### New Capabilities

- Ninguna.

### Modified Capabilities

- `cv-profile`: el único `experience_time` pasa a ser `roles`, con el tiempo de la experiencia de origen, la fiabilidad y el corte en 0.7.
- `assistant-shell`: la zona de perfil muestra cada rol conservado y sus años, sin fiabilidad ni frase.
- `vacancy-fit`: la llamada envía los roles conservados, con `role` y `experience_time`, en lugar de un solo `experience_time`.

## Impact

- `src/ai/load-chain.ts` deja de pedir `experience_years` y `experience_months`. Hace falta otra cadena, con su propio esquema, para los roles.
- `src/profile/experience.ts` sigue redondeando, ahora una vez por rol conservado.
- `src/profile/types.ts`, `src/profile/load-pipeline.ts` y `src/profile/profile-store.ts` cambian la forma guardada en IndexedDB, almacén `profile`. Sigue habiendo un solo perfil, sin PDF, sin chunks y sin embeddings.
- `src/shell/AssistantShell.tsx` sustituye la fila única de experiencia por la lista de roles.
- La change abierta `vacancy-fit` todavía dice que el veredicto envía un `experience_time` numérico. Este delta es el contrato que lo reemplaza. El veredicto aún no está implementado.
- `job-fit-assistant` y `remove-rag` también describen un solo `experience_time`. No se reescriben en este cambio.
- Sigue sin backend, sin project id y sin guardar el PDF.
