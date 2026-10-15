# Spec Delta

## MODIFIED Requirements

### Requirement: Guardar el estado estructurado
El sistema SHALL guardar un único `profile` con campos en inglés: `tech_skills`, `soft_skills`, `languages`, `roles`, `education` y `flat_text`. `languages` SHALL incluir cada idioma humano y su nivel. `education` SHALL ser la lista de estudios y certificaciones conservados. Cada entrada SHALL tener `name`, `issuer` y `status`. `status` SHALL ser `FINALIZADO`, `ACTUALMENTE` o null. `roles` SHALL ser la lista de roles conservados. Cada rol SHALL tener `role`, `experience_time`, `reliability` y `evidence`. `flat_text` SHALL ser el texto extraído del PDF, sin un modelo.

#### Scenario: CV con habilidades, idiomas y títulos
- **WHEN** el texto del CV menciona habilidades técnicas, habilidades blandas, idiomas y títulos
- **THEN** el `profile` guardado lista esas habilidades, cada idioma con su nivel y la educación como entradas con `name`, `issuer` y `status`, bajo esos nombres en inglés

#### Scenario: Texto plano guardado
- **WHEN** una carga válida extrajo texto del PDF
- **THEN** `flat_text` es ese texto, tal cual se extrajo

#### Scenario: Rol conservado
- **WHEN** una carga válida conserva un rol
- **THEN** ese rol guardado tiene `role`, `experience_time`, `reliability` y `evidence`, y el `profile` no tiene un `experience_time` fuera de `roles`

#### Scenario: Entrada de educación guardada
- **WHEN** una carga válida conserva un estudio o una certificación
- **THEN** esa entrada tiene `name`, `issuer` y `status`, y el `profile` no guarda `end_year`, `end_month` ni `ongoing`

#### Scenario: Falla la extracción estructurada
- **WHEN** el modelo no devuelve el estado utilizable
- **THEN** el sistema aborta toda la carga, muestra un error claro y no guarda `profile` de esa carga

#### Scenario: Falla el guardado del estado
- **WHEN** el estado se obtuvo y su escritura en la base falla
- **THEN** el sistema aborta toda la carga, muestra un error claro y no deja `profile` de esa carga guardado

#### Scenario: Carga sin API key
- **WHEN** no hay una API key de Gemini y el usuario carga un PDF
- **THEN** el sistema no guarda `profile` e indica que falta la API key

## ADDED Requirements

### Requirement: Extraer estudios y certificaciones
El sistema SHALL extraer del texto del CV cada estudio y cada certificación con `name`, `issuer`, `end_year`, `end_month` y `ongoing`. SHALL NOT enviar a esa extracción la fecha de hoy.

#### Scenario: Título con mes y año
- **WHEN** el CV nombra Ingeniero en Sistemas, emitido por Universidad ICESI, con cierre en marzo de 2026
- **THEN** la extracción trae ese nombre, ese emisor, `end_year` 2026, `end_month` 3 y `ongoing` false

#### Scenario: Solo el año
- **WHEN** el CV fecha un título solo con 2019
- **THEN** `end_year` es 2019 y `end_month` queda vacío

#### Scenario: Sigue sin fecha de fin
- **WHEN** el CV dice que un estudio sigue y no trae fecha de fin
- **THEN** `ongoing` es true y `end_year` y `end_month` quedan vacíos

#### Scenario: Hay fecha de fin
- **WHEN** el CV trae fecha de fin de un estudio
- **THEN** `ongoing` es false

#### Scenario: Certificación con emisión y vencimiento
- **WHEN** una certificación trae fecha de emisión y fecha de vencimiento
- **THEN** la fecha copiada es la de emisión

#### Scenario: La extracción no recibe el día
- **WHEN** el sistema pide esa extracción
- **THEN** la llamada no incluye la fecha de hoy

### Requirement: Marcar el estado con el día de la carga
El sistema SHALL asignar `status` comparando la fecha de fin copiada con el día de la carga. Una fecha de fin utilizable SHALL mandar sobre `ongoing`.

#### Scenario: Marzo de 2026 ya pasó
- **WHEN** la fecha copiada es marzo de 2026 y el día de la carga es 15 de octubre de 2026
- **THEN** `status` es `FINALIZADO`

#### Scenario: Marzo de 2027 no ha llegado
- **WHEN** la fecha copiada es marzo de 2027 y el día de la carga es 15 de octubre de 2026
- **THEN** `status` es `ACTUALMENTE`

#### Scenario: Un año anterior
- **WHEN** la fecha copiada es 2019, sin mes, y el día de la carga es 15 de octubre de 2026
- **THEN** `status` es `FINALIZADO`

#### Scenario: Un año futuro
- **WHEN** la fecha copiada es 2027, sin mes, y el día de la carga es 15 de octubre de 2026
- **THEN** `status` es `ACTUALMENTE`

#### Scenario: El mismo mes
- **WHEN** la fecha copiada es octubre de 2026 y el día de la carga es 15 de octubre de 2026
- **THEN** `status` es null

#### Scenario: El año actual sin mes
- **WHEN** la fecha copiada es 2026, sin mes, y el día de la carga es 15 de octubre de 2026
- **THEN** `status` es null

#### Scenario: En curso sin fecha
- **WHEN** no hay fecha de fin utilizable y `ongoing` es true
- **THEN** `status` es `ACTUALMENTE`

#### Scenario: Sin fecha y sin marca de curso
- **WHEN** no hay fecha de fin utilizable y `ongoing` es false
- **THEN** `status` es null

#### Scenario: Una fecha pasada manda sobre la marca de curso
- **WHEN** la fecha copiada es marzo de 2026, `ongoing` es true y el día de la carga es 15 de octubre de 2026
- **THEN** `status` es `FINALIZADO`

### Requirement: Descartar la entrada sin nombre
El sistema SHALL descartar una entrada cuyo `name` está vacío. SHALL conservar una entrada con nombre aunque `issuer` esté vacío.

#### Scenario: Nombre vacío
- **WHEN** una entrada no trae nombre
- **THEN** esa entrada no queda guardada

#### Scenario: Emisor vacío
- **WHEN** una entrada trae nombre y el emisor vacío
- **THEN** esa entrada queda guardada

### Requirement: Ignorar una fecha de fin inutilizable
El sistema SHALL tratar como ausencia de fecha un `end_month` fuera de 1 a 12, o un mes sin año. SHALL conservar la entrada si tiene nombre.

#### Scenario: Mes fuera de rango
- **WHEN** una entrada trae nombre, `end_month` 13 y `ongoing` false
- **THEN** la entrada queda guardada y `status` es null

### Requirement: Guardar el perfil sin educación
El sistema SHALL guardar el `profile` cuando la extracción de educación es una lista utilizable y ninguna entrada se conserva, o cuando esa lista llega vacía. `education` SHALL quedar vacío.

#### Scenario: Lista vacía
- **WHEN** la extracción de educación es una lista utilizable y vacía
- **THEN** la carga termina bien, el perfil se guarda y `education` está vacío

### Requirement: Abortar si la educación no es utilizable
El sistema SHALL abortar la carga cuando la extracción de educación falla o no es una lista utilizable. SHALL NOT guardar el `profile` de esa carga y SHALL conservar el perfil anterior.

#### Scenario: La extracción falla
- **WHEN** las habilidades y los roles ya se leyeron y la extracción de educación falla
- **THEN** no se guarda el perfil de esa carga, el perfil anterior sigue igual y no se informa éxito

### Requirement: Ignorar un perfil con la educación antigua
El sistema SHALL NOT usar, al abrir la página, un `profile` guardado cuya `education` sea una lista de frases.

#### Scenario: Perfil guardado con frases
- **WHEN** el navegador tiene un perfil cuya `education` es una lista de frases, y el usuario abre la página
- **THEN** el sistema no usa ese perfil

### Requirement: Conservar el estado de la carga
El sistema SHALL usar, al abrir la página, el `status` guardado en la carga. SHALL NOT volver a calcularlo con el día en que se abre la página.

#### Scenario: Se abre después
- **WHEN** una carga guardó `FINALIZADO` y el usuario abre la página otro día
- **THEN** el perfil sigue mostrando `FINALIZADO`
