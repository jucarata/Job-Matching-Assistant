# Spec Delta

## MODIFIED Requirements

### Requirement: No guardar el PDF
El sistema SHALL NOT guardar el archivo PDF. Tras una carga válida, SHALL conservar el `profile`, incluido `flat_text`, y SHALL NOT conservar chunks ni embeddings.

#### Scenario: Carga válida
- **WHEN** el usuario carga un PDF válido
- **THEN** el archivo PDF no queda almacenado, `flat_text` queda guardado y no se guardan chunks ni embeddings

### Requirement: Guardar el estado estructurado
El sistema SHALL guardar un único `profile` con campos en inglés: `tech_skills`, `soft_skills`, `languages`, `experience_time`, `education` y `flat_text`. `languages` SHALL incluir cada idioma humano y su nivel. `education` SHALL incluir los títulos de graduación. `experience_time` SHALL ser un número con como máximo un decimal. `flat_text` SHALL ser el texto extraído del PDF, sin un modelo.

#### Scenario: CV con habilidades, idiomas y títulos
- **WHEN** el texto del CV menciona habilidades técnicas, habilidades blandas, idiomas y títulos
- **THEN** el `profile` guardado lista esas habilidades, cada idioma con su nivel y esos títulos, bajo esos nombres en inglés

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
El sistema SHALL guardar exactamente un `profile` activo en el navegador y SHALL reutilizarlo, incluido `flat_text`, al volver a abrir la página. El `profile` SHALL NOT incluir chunks ni embeddings.

#### Scenario: Visita posterior
- **WHEN** ya existe un `profile` y el usuario vuelve a abrir la página
- **THEN** el sistema sigue usando ese `profile`, con su `flat_text`, y no hay chunks ni embeddings guardados

### Requirement: Reemplazar el perfil
El sistema SHALL reemplazar el `profile` completo, incluido `flat_text`, cuando una carga nueva termina con éxito, y SHALL usar solo el perfil nuevo después. SHALL NOT dejar chunks ni embeddings del perfil anterior ni del nuevo.

#### Scenario: Segundo PDF válido
- **WHEN** ya existe un `profile` y el usuario carga otro PDF válido
- **THEN** el sistema descarta el perfil anterior y conserva solo el `profile` nuevo, con el `flat_text` de ese PDF

### Requirement: Informar éxito solo con el estado guardado
El sistema SHALL informar que la carga salió bien solo cuando el `profile`, incluido `flat_text`, quedó guardado. Si ese guardado no termina, SHALL conservar el perfil anterior y SHALL NOT informar éxito.

#### Scenario: El estado queda guardado
- **WHEN** el `profile` de la carga, incluido `flat_text`, se guardó
- **THEN** el sistema informa al usuario que la carga salió bien

#### Scenario: El estado no queda guardado
- **WHEN** la carga no logra guardar el `profile`
- **THEN** el sistema conserva el perfil anterior y no informa éxito

### Requirement: Conservar la API key en el navegador
El sistema SHALL guardar la API key de Gemini en el navegador de quien la escribió y reutilizarla en cargas y veredictos posteriores. El sistema SHALL NOT pedir un project id ni incluir una API key en el sitio publicado. El campo de la clave SHALL estar en la fila de carga del CV y SHALL NOT estar en los ajustes.

#### Scenario: Visita posterior con clave guardada
- **WHEN** el usuario escribió una API key y vuelve a abrir la página en el mismo navegador
- **THEN** el sistema reutiliza esa clave sin volver a pedirla

#### Scenario: Fila de carga
- **WHEN** el usuario ve la carga del CV
- **THEN** el campo de la clave está en esa fila y los ajustes no piden la clave ni un project id

#### Scenario: Sitio publicado sin clave
- **WHEN** se publica el sitio
- **THEN** los archivos publicados no contienen una API key
