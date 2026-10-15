# Spec Delta

## MODIFIED Requirements

### Requirement: Guardar el estado estructurado
El sistema SHALL guardar un único `profile` con campos en inglés: `tech_skills`, `soft_skills`, `languages`, `roles`, `education` y `flat_text`. `languages` SHALL incluir cada idioma humano y su nivel. `education` SHALL incluir los títulos de graduación. `roles` SHALL ser la lista de roles conservados. Cada rol SHALL tener `role`, `experience_time`, `reliability` y `evidence`. `flat_text` SHALL ser el texto extraído del PDF, sin un modelo.

#### Scenario: CV con habilidades, idiomas y títulos
- **WHEN** el texto del CV menciona habilidades técnicas, habilidades blandas, idiomas y títulos
- **THEN** el `profile` guardado lista esas habilidades, cada idioma con su nivel y esos títulos, bajo esos nombres en inglés

#### Scenario: Texto plano guardado
- **WHEN** una carga válida extrajo texto del PDF
- **THEN** `flat_text` es ese texto, tal cual se extrajo

#### Scenario: Rol conservado
- **WHEN** una carga válida conserva un rol
- **THEN** ese rol guardado tiene `role`, `experience_time`, `reliability` y `evidence`, y el `profile` no tiene un `experience_time` fuera de `roles`

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

### Requirement: Proponer los roles de cada experiencia
El sistema SHALL proponer, desde el texto del CV, el cargo ejercido y los roles que se desprenden del trabajo hecho en esa experiencia. SHALL NOT limitar la propuesta a los títulos escritos.

#### Scenario: El Full Stack propone sus partes
- **WHEN** el CV nombra un puesto de Full Stack y describe trabajo de backend y de frontend
- **THEN** la propuesta incluye Full Stack, Backend y Frontend

#### Scenario: Un título débil también se propone
- **WHEN** el CV describe tareas de arquitectura dentro de ese Full Stack y no nombra el cargo de arquitecto
- **THEN** la propuesta puede incluir Arquitecto de software

### Requirement: Heredar el tiempo de la experiencia
El sistema SHALL asignar a cada rol el tiempo entero de la experiencia de la que salió. SHALL NOT acortar ese tiempo según la fiabilidad.

#### Scenario: El arquitecto hereda los dos años
- **WHEN** un Full Stack duró 2 años y de esa experiencia se propone Arquitecto de software
- **THEN** ese arquitecto trae 2 años, con cualquier fiabilidad

### Requirement: Descartar el rol débil o sin frase
El sistema SHALL descartar un rol con fiabilidad menor que 0.7. SHALL descartar un rol cuya frase no aparece en `flat_text`. SHALL conservar un rol con fiabilidad de 0.7 o más si su frase aparece en `flat_text`. Una diferencia solo de espacios SHALL seguir contando como la misma frase.

#### Scenario: Arquitecto en 0.3
- **WHEN** Arquitecto de software trae 2 años, fiabilidad 0.3 y una frase presente en `flat_text`
- **THEN** ese rol no queda guardado

#### Scenario: Full Stack en 0.7
- **WHEN** Full Stack trae 2 años, fiabilidad 0.7 y una frase presente en `flat_text`
- **THEN** ese rol queda guardado

#### Scenario: Frase ausente
- **WHEN** un rol trae fiabilidad 0.95 y su frase no aparece en `flat_text`
- **THEN** ese rol no queda guardado

### Requirement: Redondear el tiempo de cada rol
El sistema SHALL redondear en código los años y meses de cada rol conservado. Menos de 6 meses sobrantes SHALL dejar el entero de años. 6 meses o más SHALL subir al año siguiente. Un valor ya expresado con un decimal y con los meses vacíos SHALL conservarse con como máximo un decimal.

#### Scenario: Un año y seis meses
- **WHEN** un rol conservado trae 1 año y 6 meses
- **THEN** su `experience_time` guardado es 2

#### Scenario: Un año y dos meses
- **WHEN** un rol conservado trae 1 año y 2 meses
- **THEN** su `experience_time` guardado es 1

#### Scenario: Un año y medio ya en decimal
- **WHEN** un rol conservado trae 1.5 años y los meses vacíos
- **THEN** su `experience_time` guardado es 1.5

### Requirement: Guardar el perfil sin roles
El sistema SHALL guardar el `profile` cuando la propuesta de roles es una lista utilizable y ningún rol pasa el corte, o cuando esa lista llega vacía. `roles` SHALL quedar vacío.

#### Scenario: Todos bajo 0.7
- **WHEN** la propuesta es utilizable y todos los roles quedan bajo 0.7
- **THEN** la carga termina bien, el perfil se guarda y `roles` está vacío

### Requirement: Abortar si los roles no son utilizables
El sistema SHALL abortar la carga cuando la propuesta de roles falla o no es una lista utilizable. SHALL NOT guardar el `profile` de esa carga y SHALL conservar el perfil anterior.

#### Scenario: La propuesta falla
- **WHEN** las habilidades ya se leyeron y la propuesta de roles falla
- **THEN** no se guarda el perfil de esa carga, el perfil anterior sigue igual y no se informa éxito

### Requirement: Ignorar un perfil con la experiencia antigua
El sistema SHALL NOT usar, al abrir la página, un `profile` guardado que tenga `experience_time` numérico y no tenga `roles`.

#### Scenario: Perfil guardado antes de los roles
- **WHEN** el navegador tiene un perfil con `experience_time` numérico y sin `roles`, y el usuario abre la página
- **THEN** el sistema no usa ese perfil
