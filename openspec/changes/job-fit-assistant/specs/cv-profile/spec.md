# Spec Delta

## Purpose

Valida un PDF, extrae su texto sin un modelo y lo guarda como `flat_text` dentro de un `profile`. El resto de los campos lo pide una cadena lineal de LangChain. Cada carga es una ejecución nueva, sin memoria de mensajes.

## ADDED Requirements

### Requirement: Aceptar solo un PDF
El sistema SHALL aceptar el CV únicamente como archivo PDF y SHALL extraer su texto en el navegador, sin llamar a un modelo para esa extracción.

#### Scenario: PDF con texto
- **WHEN** el usuario carga un PDF con texto extraíble
- **THEN** el sistema obtiene el texto del documento sin usar un modelo

#### Scenario: Archivo que no es PDF
- **WHEN** el usuario carga un archivo que no es PDF
- **THEN** el sistema aborta antes de extraer texto, muestra un error claro y no modifica el perfil ya guardado

### Requirement: Tratar cada carga como una ejecución nueva
El sistema SHALL ejecutar cada carga con su propio contexto. SHALL NOT guardar mensajes ni reutilizar el texto de una carga anterior como memoria de chat.

#### Scenario: Segunda carga
- **WHEN** el usuario carga un PDF después de haber cargado otro
- **THEN** la ejecución nueva no recibe los mensajes ni el texto de la carga anterior

### Requirement: No guardar el PDF
El sistema SHALL NOT guardar el archivo PDF. Tras una carga válida, SHALL conservar el `profile`, incluido `flat_text`, y SHALL NOT conservar chunks ni vectores.

#### Scenario: Carga válida
- **WHEN** el usuario carga un PDF válido
- **THEN** el archivo PDF no queda almacenado y `flat_text` queda guardado

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

### Requirement: Redondear los años de experiencia
`experience_time` SHALL expresar años de experiencia en el sector. Si el CV indica años y meses, menos de 6 meses sobrantes SHALL dejar el entero de años, y 6 meses o más SHALL subir al año siguiente.

#### Scenario: Tres meses no suman un año
- **WHEN** la experiencia indicada es de 2 años y 3 meses
- **THEN** `experience_time` guardado es 2

#### Scenario: Seis meses suben al año siguiente
- **WHEN** la experiencia indicada es de 2 años y 6 meses
- **THEN** `experience_time` guardado es 3

#### Scenario: Un valor ya expresado con un decimal
- **WHEN** la experiencia indicada es de 1.5 años
- **THEN** `experience_time` guardado es 1.5

### Requirement: Conservar un solo perfil
El sistema SHALL guardar exactamente un `profile` activo en el navegador y SHALL reutilizarlo, incluido `flat_text`, al volver a abrir la página. El `profile` SHALL NOT incluir chunks ni vectores.

#### Scenario: Visita posterior
- **WHEN** ya existe un `profile` y el usuario vuelve a abrir la página
- **THEN** el sistema sigue usando ese `profile`, con su `flat_text`

### Requirement: Reemplazar el perfil
El sistema SHALL reemplazar el `profile` completo, incluido `flat_text`, cuando una carga nueva termina con éxito, y SHALL usar solo el perfil nuevo después.

#### Scenario: Segundo PDF válido
- **WHEN** ya existe un `profile` y el usuario carga otro PDF válido
- **THEN** el sistema descarta el perfil anterior y conserva solo el `profile` nuevo

### Requirement: Rechazar un PDF sin texto
El sistema SHALL rechazar un PDF sin texto extraíble y SHALL dejar intacto el `profile` anterior.

#### Scenario: PDF escaneado sin texto
- **WHEN** el PDF no contiene texto extraíble
- **THEN** el sistema aborta antes de llamar al modelo, muestra un error claro y conserva el perfil que ya existía, si había uno

### Requirement: Informar éxito solo con el estado guardado
El sistema SHALL informar que la carga salió bien solo cuando el `profile`, incluido `flat_text`, quedó guardado. Si ese guardado no termina, SHALL conservar el perfil anterior y SHALL NOT informar éxito.

#### Scenario: El estado queda guardado
- **WHEN** el `profile` de la carga, incluido `flat_text`, se guardó
- **THEN** el sistema informa al usuario que la carga salió bien

#### Scenario: El estado no queda guardado
- **WHEN** la carga no logra guardar el `profile`
- **THEN** el sistema conserva el perfil anterior y no informa éxito

### Requirement: Conservar la API key en el navegador
El sistema SHALL guardar la API key de Gemini en el navegador de quien la escribió y reutilizarla en cargas posteriores. El sistema SHALL NOT pedir un project id ni incluir una API key en el sitio publicado. El campo de la clave SHALL estar en la fila de carga del CV y SHALL NOT estar en los ajustes.

#### Scenario: Visita posterior con clave guardada
- **WHEN** el usuario escribió una API key y vuelve a abrir la página en el mismo navegador
- **THEN** el sistema reutiliza esa clave sin volver a pedirla

#### Scenario: Fila de carga
- **WHEN** el usuario ve la carga del CV
- **THEN** el campo de la clave está en esa fila y los ajustes no piden la clave ni un project id

#### Scenario: Sitio publicado sin clave
- **WHEN** se publica el sitio
- **THEN** los archivos publicados no contienen una API key

### Requirement: Informar si hay un perfil
El sistema SHALL indicar si hay un `profile` activo y SHALL mostrar su estado, sin exigir el PDF original.

#### Scenario: Consulta del perfil
- **WHEN** el usuario abre el perfil y hay un estado guardado
- **THEN** el sistema muestra las habilidades, los idiomas con nivel, los años de experiencia y los títulos
