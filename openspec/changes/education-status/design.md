# Design

## Context

La carga es una secuencia de 7 pasos: valida el PDF, saca `flat_text`, pide habilidades e idiomas y `education` como frases, propone roles y redondea. El perfil vive en IndexedDB, almacén `profile`, base `johai`. La pantalla junta las frases en una sola fila. El veredicto envía esas frases y, si un campo y `flat_text` no coinciden, el prompt hace mandar a `flat_text`. Ver `proposal.md` para el motivo. Los requisitos están en los deltas de esta change.

## Goals / Non-Goals

**Goals:**

- Una tercera salida estructurada, solo de estudios y certificaciones, sobre el mismo `flat_text` y el mismo `GEMINI_MODEL`.
- El modelo copia nombre, emisor, año, mes y `ongoing`. El código escribe `status` con una fecha inyectada.
- Un perfil viejo, con `education` como lista de frases, no se reutiliza.

**Non-Goals:**

- Una frase de evidencia o un corte de fiabilidad, como en los roles.
- Un campo que separe estudio y certificación.
- Volver a calcular `status` al abrir la página.
- Paralelizar las llamadas a Gemini.
- Reescribir `role-experience`, `vacancy-fit`, `job-fit-assistant` ni `remove-rag`.
- Migrar las frases viejas a entradas con estado.

## Decisions

### Tres cadenas, el mismo cliente

La primera cadena deja de pedir `education` y de incluirlo en el esquema. La tercera recibe solo `flat_text` y devuelve una lista. Cada ítem trae `name`, `issuer`, `end_year`, `end_month` y `ongoing`. Usa el mismo chat de Gemini, sin project id y sin reintentos. El prompt está en español y no tiene variable de fecha: la llamada no puede colar el día de hoy.

El prompt fija la copia:

- Copia la fecha de cierre o de graduación. Si el CV solo trae el año, `end_month` queda vacío.
- `ongoing` es true solo si el CV dice que ese estudio sigue, con palabras como actual, en curso, presente o cursando, y no hay fecha de fin.
- Si hay fecha de fin, `ongoing` es false.
- En una certificación, la fecha copiada es la de emisión. La de vencimiento no se copia.
- No inventes fechas.

Alternativa considerada: meter la educación en la primera salida. El mismo prompt que lista habilidades ya devolvió la fecha como frase, y esa frase es la que el veredicto mal lee. Otra alternativa: darle el día de hoy al modelo para que escriba `FINALIZADO`. El estado volvería a ser una lectura del modelo.

### El código marca y guarda solo el estado

Después de una lista utilizable, se descarta el ítem cuyo `name` está vacío. `issuer` vacío se conserva. Un `end_month` fuera de 1 a 12, o un mes sin año, deja el ítem sin fecha utilizable. No aborta la carga.

La marca recibe un `Date` y usa su año y mes locales. En la carga, ese `Date` es el momento del paso. En las pruebas, es una fecha fija. La regla, con una fecha de fin utilizable por encima de `ongoing`:

- Año y mes anteriores al día de la carga: `FINALIZADO`. Un año suelto menor que el año de la carga también.
- Año y mes posteriores: `ACTUALMENTE`. Un año suelto mayor también.
- El mismo año y el mismo mes, o el año de la carga sin mes: `status` null.
- Sin fecha utilizable y `ongoing` true: `ACTUALMENTE`.
- Sin fecha utilizable y `ongoing` false: `status` null.

Lo guardado es `name`, `issuer` y `status`. El año, el mes y `ongoing` no se guardan. `readProfile` devuelve el `status` guardado y no lo recalcula.

El esquema de la cadena acepta el mes como número o vacío, sin rango. El rango lo aplica la marca. Así un mes 13 no tira la carga entera.

Alternativa considerada: que el modelo devuelva `status`. Un marzo de 2026 omitido, o convertido en vacío, volvería a leerse como «sigue en curso» si el vacío significara eso.

### La barra gana dos pasos

Después de «Redondear la experiencia» entran «Leer la educación» y «Marcar la educación». El tope de la llamada es el de las otras llamadas a Gemini, 90 segundos. El total pasa de 7 a 9. La marca es síncrona.

Si la llamada lanza, se agota el tiempo o no devuelve una lista, la carga aborta, no se escribe el perfil de esa carga y se conserva el anterior. Una lista vacía, o una cuyos ítems se descartan todos, guarda el perfil con `education: []`.

### El perfil de frases no se lee

`readProfile` acepta `education` solo si cada entrada tiene `name`, `issuer` y `status` en `FINALIZADO`, `ACTUALMENTE` o null. Una lista de frases se trata como ausencia de perfil. No se borra la base: la próxima carga que termina bien reemplaza el registro.

### La pantalla y el veredicto

La zona de perfil pinta una línea por entrada, uniendo con coma las partes presentes: `name`, `issuer` y `status`. Sin estado, la línea no lleva esa palabra. Sin entradas, no hay línea de educación y el perfil sigue contando como perfil. `Ingeniero en Sistemas, Universidad ICESI, FINALIZADO` es la línea del caso de marzo de 2026 cargado el 15 de octubre de 2026.

`profileForVerdict` envía de cada entrada solo `name`, `issuer` y `status`. El prompt del veredicto sigue en inglés. Acota la regla actual de `flat_text`: para decir si un título o certificado ya se tiene, manda `status`. `FINALIZADO` ya se obtuvo. `ACTUALMENTE` sigue en curso. `status` null no afirma ninguna de las dos. El resto de desacuerdos entre campos y `flat_text` sigue mandando `flat_text`.

## Risks / Trade-offs

- [El modelo copia el vencimiento como fecha de fin] → El prompt pide la fecha de emisión. El código no distingue un vencimiento de un cierre. Una certificación con vencimiento futuro puede quedar en `ACTUALMENTE`.
- [El modelo omite una fecha que sí está en el CV] → Sin fecha y sin `ongoing`, `status` queda null. El veredicto no afirma que el título siga en curso. Es el fallo más cercano al de hoy, y ya no lo afirma en falso.
- [El modelo pone `ongoing` true junto a marzo de 2026] → La fecha utilizable manda. Con el día de la carga en octubre de 2026, queda `FINALIZADO`.
- [La tercera llamada alarga la carga y suma otro 503] → Si falla, no se guarda un perfil a medias. El paso tiene el tope de 90 segundos.
- [Un título cerrado el día 1 de este mes queda sin estado] → El mismo mes no se marca. El veredicto no lo da por terminado ni por pendiente.
- [El prompt nuevo no basta y el veredicto sigue leyendo `flat_text`] → La llamada ya no envía la fecha cruda. El prompt dice que, para ese punto, manda `status`.
- [Un perfil ya guardado desaparece al recargar] → No hay de dónde sacar el estado. Hay que volver a cargar el CV.

## Migration Plan

Publicar el código nuevo basta. Quien ya tenga un perfil guardado vuelve a cargar el CV. Para volver atrás, se publica el código anterior y se borra la base `johai` en el navegador: el registro con entradas de educación no lo entiende la versión vieja.

## Open Questions

Ninguna que cambie los specs, el enfoque o las tareas.
