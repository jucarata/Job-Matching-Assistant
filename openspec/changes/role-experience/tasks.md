# Tasks

## 1. Cadena de roles

- [x] 1.1 Añadir la segunda cadena en un módulo nuevo, con salida `role`, `experience_years`, `experience_months`, `reliability` y `evidence`, el mismo `GEMINI_MODEL` y sin project id. El prompt, en español, pide el cargo y sus partes, copia el tiempo entero de la experiencia de origen, y deja bajo 0.7 un título inferido de tareas sueltas. Verificar con una prueba que el prompt contiene esas tres reglas, que el esquema exige esos cinco campos y que `npm test` sigue pasando.

## 2. Corte, redondeo y guardado

- [x] 2.1 Filtrar cada ítem en código: conservar fiabilidad de 0 a 1 solo si es mayor o igual que 0.7 y la frase aparece en `flat_text` con espacios seguidos tratados como uno; descartar fiabilidad fuera de rango, frase ausente, campos incompletos y años o meses que el redondeo no acepta. Verificar con pruebas: 0.7 se conserva, 0.3 se descarta, 0.95 sin frase se descarta, la misma frase con espacios distintos se conserva, y un ítem incompleto no aborta el resto.
- [x] 2.2 Quitar `experience_years` y `experience_months` de la primera cadena. En el pipeline, proponer roles con la segunda cadena, redondear cada uno con `roundExperienceTime` y guardar `roles` con `role`, `experience_time`, `reliability` y `evidence`. Una lista vacía o toda descartada guarda el perfil con `roles` vacío. Un fallo o una respuesta que no es lista aborta y conserva el perfil anterior. El mismo nombre salido de dos experiencias queda en dos entradas. Verificar en `src/profile/load-pipeline.test.ts` con cadenas falsas: Full Stack en 0.95 y Arquitecto en 0.3 de la misma experiencia de 2 años guardan solo Full Stack; 1 año y 6 meses queda en 2; 1 año y 2 meses queda en 1; 1.5 con meses vacíos queda en 1.5; todos bajo 0.7 guardan `roles` vacío; el fallo no escribe el perfil nuevo. `npm test` pasa.
- [x] 2.3 Añadir el paso «Proponer los roles» entre «Leer los datos con Gemini» y «Redondear la experiencia», con el tope de 90 segundos, y dejar el total en 7. Verificar que la prueba de progreso marca ese paso y que `src/shell/AssistantShell.test.tsx` espera `aria-valuemax` 7. `npm test` pasa.

## 3. Perfil ya guardado

- [x] 3.1 Hacer que la lectura del almacén `profile` ignore un registro con `experience_time` numérico y sin `roles`, sin borrar la base. Verificar con una base de prueba: ese registro no se devuelve, y un registro con `roles` sí. `npm test` pasa.

## 4. Pantalla

- [x] 4.1 Mostrar en la zona de perfil una línea por rol conservado, con el nombre, `experience_time` y «años», sin fiabilidad ni frase. Con `roles` vacío, no hay línea de experiencia y la conversación sigue habilitada. Verificar en `src/shell/AssistantShell.test.tsx` los tres casos: Full Stack, Backend y Frontend en 2 años; Arquitecto descartado ausente; perfil sin roles que igual acepta texto. `npm test` pasa.

## 5. Contrato del veredicto

- [x] 5.1 Actualizar en `openspec/changes/vacancy-fit/specs/vacancy-fit/spec.md` el requisito de la llamada para que envíe los roles conservados, con `role` y `experience_time`, y no envíe `reliability`, `evidence`, los roles descartados ni un `experience_time` suelto. Verificar que ese requisito quedó así y que `openspec validate role-experience --type change` pasa. No implementar la llamada.

## Workflow follow-up

- No archivar `role-experience` mientras `cv-profile`, `assistant-shell` y `vacancy-fit` no existan como specs durables: este delta modifica requisitos que todavía viven en changes abiertas.
- Cuando se implemente el veredicto, la llamada usa el contrato de roles de este cambio, no el número único.
