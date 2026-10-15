# Spec Delta

## MODIFIED Requirements

### Requirement: No guardar el PDF
El sistema SHALL NOT guardar el archivo PDF. Tras una carga válida, SHALL conservar un `profile` con `tech_skills`, `soft_skills`, `languages`, `experience_time`, `education` y `flat_text`, y SHALL NOT conservar chunks ni vectores.

#### Scenario: Carga válida
- **WHEN** el usuario carga un PDF válido
- **THEN** el archivo PDF no queda almacenado, `flat_text` queda guardado y no se guardan chunks ni vectores

### Requirement: Guardar el estado estructurado
El sistema SHALL guardar un único `profile` con `tech_skills`, `soft_skills`, `languages`, `experience_time`, `education` y `flat_text`. `languages` SHALL incluir cada idioma humano y su nivel. `education` SHALL incluir los títulos de graduación. `experience_time` SHALL ser un número con como máximo un decimal. `flat_text` SHALL ser el texto extraído del PDF, sin un modelo.

#### Scenario: CV con habilidades, idiomas y títulos
- **WHEN** el texto del CV menciona habilidades técnicas, habilidades blandas, idiomas y títulos
- **THEN** el `profile` guardado lista esas habilidades, cada idioma con su nivel y esos títulos

#### Scenario: Texto plano guardado
- **WHEN** una carga válida extrajo texto del PDF
- **THEN** `flat_text` es ese texto, tal cual se extrajo

#### Scenario: Falla la extracción estructurada
- **WHEN** el modelo no devuelve el estado utilizable
- **THEN** el sistema aborta toda la carga, muestra un error claro y no guarda `profile` de esa carga

#### Scenario: Falla el guardado del estado
- **WHEN** el estado se obtuvo y su escritura en la base falla
- **THEN** el sistema aborta toda la carga, muestra un error claro y no deja `profile` de esa carga guardado

#### Scenario: Carga sin API key
- **WHEN** no hay una API key de Gemini y el usuario carga un PDF
- **THEN** el sistema no guarda `profile` e indica que falta la API key

### Requirement: Conservar un solo perfil
El sistema SHALL guardar exactamente un `profile` activo en el navegador y SHALL reutilizarlo, incluido `flat_text`, al volver a abrir la página. El `profile` SHALL NOT incluir chunks ni vectores.

#### Scenario: Visita posterior
- **WHEN** ya existe un `profile` y el usuario vuelve a abrir la página
- **THEN** el sistema sigue usando ese `profile`, con su `flat_text`, y no hay chunks ni vectores guardados

### Requirement: Reemplazar el perfil
El sistema SHALL reemplazar el `profile` completo, incluido `flat_text`, cuando una carga nueva termina con éxito, y SHALL usar solo el perfil nuevo después. SHALL NOT dejar chunks ni vectores del perfil anterior ni del nuevo.

#### Scenario: Segundo PDF válido
- **WHEN** ya existe un `profile` y el usuario carga otro PDF válido
- **THEN** el sistema descarta el perfil anterior y conserva solo el `profile` nuevo, con el `flat_text` de ese PDF

### Requirement: Rechazar un PDF sin texto
El sistema SHALL rechazar un PDF sin texto extraíble y SHALL dejar intacto el `profile` anterior. SHALL NOT escribir chunks ni vectores.

#### Scenario: PDF escaneado sin texto
- **WHEN** el PDF no contiene texto extraíble
- **THEN** el sistema aborta antes de llamar al modelo, muestra un error claro y conserva el perfil que ya existía, si había uno

## ADDED Requirements

### Requirement: Informar éxito solo con el estado guardado
El sistema SHALL informar que la carga salió bien solo cuando el `profile`, incluido `flat_text`, quedó guardado. Si ese guardado no termina, SHALL conservar el perfil anterior y SHALL NOT informar éxito.

#### Scenario: El estado queda guardado
- **WHEN** el `profile` de la carga, incluido `flat_text`, se guardó
- **THEN** el sistema informa al usuario que la carga salió bien

#### Scenario: El estado no queda guardado
- **WHEN** la carga no logra guardar el `profile`
- **THEN** el sistema conserva el perfil anterior y no informa éxito

### Requirement: No indexar ni consultar el CV por vectores
El sistema SHALL NOT generar chunks del CV, SHALL NOT pedir ni guardar vectores y SHALL NOT consultar un índice de chunks o de vectores.

#### Scenario: Carga que termina bien
- **WHEN** una carga de PDF termina bien
- **THEN** el `profile` guardado no contiene chunks ni vectores

#### Scenario: Perfil ya guardado
- **WHEN** hay un `profile` activo
- **THEN** el sistema no recupera contexto del CV mediante vectores

## REMOVED Requirements

### Requirement: Generar chunks por aspecto del CV
**Reason**: El proyecto ya no parte el CV en chunks para recuperarlos después.
**Migration**: La carga guarda el `profile`, incluido `flat_text`. No hay chunks que distinguir por aspecto.

### Requirement: Guardar chunks con vectores
**Reason**: Sin chunks no hay vectores que guardar ni una consulta posterior.
**Migration**: No se llama a un modelo de vectores. Si falta la API key, la carga se aborta porque no puede pedirse el `profile`.

### Requirement: Terminar solo si las dos ramas quedan guardadas
**Reason**: Ya no hay una rama de chunks en paralelo con la del estado.
**Migration**: El aviso de éxito depende solo de que el `profile` quede guardado. Si ese guardado falla, se conserva el perfil anterior.
