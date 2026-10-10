# Spec Delta

## MODIFIED Requirements

### Requirement: No guardar el PDF
El sistema SHALL NOT guardar el archivo PDF. Tras una carga válida, SHALL conservar solo el estado estructurado y SHALL NOT conservar chunks ni embeddings.

#### Scenario: Carga válida
- **WHEN** el usuario carga un PDF válido
- **THEN** el archivo PDF no queda almacenado y no se guardan chunks ni embeddings

### Requirement: Guardar el estado estructurado
El sistema SHALL guardar un único estado local con `tech_skills`, `soft_skills`, `languages`, `experience_time` y `education`. `languages` SHALL incluir cada idioma humano y su nivel. `education` SHALL incluir los títulos de graduación. `experience_time` SHALL ser un número con como máximo un decimal.

#### Scenario: CV con habilidades, idiomas y títulos
- **WHEN** el texto del CV menciona habilidades técnicas, habilidades blandas, idiomas y títulos
- **THEN** el estado guardado lista esas habilidades, cada idioma con su nivel y esos títulos

#### Scenario: Falla la extracción estructurada
- **WHEN** el modelo no devuelve el estado utilizable
- **THEN** el sistema aborta toda la carga, muestra un error claro y no guarda estado de esa carga

#### Scenario: Falla el guardado del estado
- **WHEN** el estado se obtuvo y su escritura en la base falla
- **THEN** el sistema aborta toda la carga, muestra un error claro y no deja estado de esa carga guardado

#### Scenario: Carga sin API key
- **WHEN** no hay una API key de Gemini y el usuario carga un PDF
- **THEN** el sistema no guarda estado e indica que falta la API key

### Requirement: Conservar un solo perfil
El sistema SHALL guardar exactamente un perfil activo en el navegador y SHALL reutilizar su estado estructurado al volver a abrir la página. El perfil SHALL NOT incluir chunks ni embeddings.

#### Scenario: Visita posterior
- **WHEN** ya existe un perfil y el usuario vuelve a abrir la página
- **THEN** el sistema sigue usando ese estado y no hay chunks ni embeddings guardados

### Requirement: Reemplazar el perfil
El sistema SHALL reemplazar el estado estructurado cuando una carga nueva termina con éxito, y SHALL usar solo el perfil nuevo después. SHALL NOT dejar chunks ni embeddings del perfil anterior ni del nuevo.

#### Scenario: Segundo PDF válido
- **WHEN** ya existe un perfil y el usuario carga otro PDF válido
- **THEN** el sistema descarta el perfil anterior y conserva solo el estado nuevo

### Requirement: Rechazar un PDF sin texto
El sistema SHALL rechazar un PDF sin texto extraíble y SHALL dejar intacto el estado anterior. SHALL NOT escribir chunks ni embeddings.

#### Scenario: PDF escaneado sin texto
- **WHEN** el PDF no contiene texto extraíble
- **THEN** el sistema aborta antes de llamar al modelo, muestra un error claro y conserva el perfil que ya existía, si había uno

## ADDED Requirements

### Requirement: Informar éxito solo con el estado guardado
El sistema SHALL informar que la carga salió bien solo cuando el estado estructurado quedó guardado. Si ese guardado no termina, SHALL conservar el perfil anterior y SHALL NOT informar éxito.

#### Scenario: El estado queda guardado
- **WHEN** el estado estructurado de la carga se guardó
- **THEN** el sistema informa al usuario que la carga salió bien

#### Scenario: El estado no queda guardado
- **WHEN** la carga no logra guardar el estado estructurado
- **THEN** el sistema conserva el perfil anterior y no informa éxito

### Requirement: No indexar ni consultar el CV por embeddings
El sistema SHALL NOT generar chunks del CV, SHALL NOT pedir ni guardar embeddings y SHALL NOT consultar un índice de chunks o de embeddings.

#### Scenario: Carga que termina bien
- **WHEN** una carga de PDF termina bien
- **THEN** el perfil guardado no contiene chunks ni embeddings

#### Scenario: Perfil ya guardado
- **WHEN** hay un perfil activo
- **THEN** el sistema no recupera contexto del CV mediante embeddings

## REMOVED Requirements

### Requirement: Generar chunks por aspecto del CV
**Reason**: El proyecto ya no parte el CV en chunks para recuperarlos después.
**Migration**: La carga guarda solo el estado estructurado. No hay chunks que distinguir por aspecto ni un corte del texto que sustituya a ese índice.

### Requirement: Guardar chunks con embeddings
**Reason**: Sin chunks no hay embeddings que guardar ni una consulta vectorial posterior.
**Migration**: No se llama a un modelo de embeddings. Si falta la API key, la carga se aborta porque no puede pedirse el estado estructurado.

### Requirement: Terminar solo si las dos ramas quedan guardadas
**Reason**: Ya no hay una rama de chunks en paralelo con la del estado.
**Migration**: El aviso de éxito depende solo de que el estado estructurado quede guardado. Si ese guardado falla, se conserva el perfil anterior.
