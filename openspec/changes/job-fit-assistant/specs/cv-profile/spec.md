# Spec Delta

## Purpose

Valida un PDF, extrae su texto sin un modelo y, en paralelo, guarda chunks embedados y un estado estructurado. Cada carga es una ejecución nueva, sin memoria de mensajes.

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
El sistema SHALL NOT guardar el archivo PDF. Tras una carga válida, SHALL conservar solo los chunks, sus embeddings y el estado estructurado.

#### Scenario: Carga válida
- **WHEN** el usuario carga un PDF válido
- **THEN** el archivo PDF no queda almacenado

### Requirement: Generar chunks por aspecto del CV
Con el texto ya extraído, el sistema SHALL pedir a Gemini chunks según aspectos del CV, entre ellos experiencia, educación y perfil. El sistema SHALL NOT partir ese texto por un tamaño fijo de caracteres.

#### Scenario: CV con varias secciones
- **WHEN** el texto contiene experiencia, educación y perfil
- **THEN** los chunks distinguen esos aspectos y cada uno guarda su texto

#### Scenario: El modelo no genera chunks
- **WHEN** Gemini no devuelve chunks utilizables
- **THEN** el sistema aborta toda la carga, muestra un error claro y no guarda embeddings ni estado

### Requirement: Guardar chunks con embeddings
El sistema SHALL obtener un embedding por chunk con la API key de Gemini y SHALL guardar en la base local el texto de cada chunk, su aspecto y su embedding.

#### Scenario: Chunks generados
- **WHEN** existen chunks generados y los embeddings se guardan
- **THEN** la base local contiene cada chunk con su texto, su aspecto y su embedding

#### Scenario: Falla el embedding o su guardado
- **WHEN** falla el embedding de un chunk o su escritura en la base
- **THEN** el sistema aborta toda la carga, muestra un error claro y no deja guardado el estado de esa carga

#### Scenario: Carga sin API key
- **WHEN** no hay una API key de Gemini y el usuario carga un PDF
- **THEN** el sistema no guarda chunks ni estado e indica que falta la API key

### Requirement: Conservar la API key en el navegador
El sistema SHALL guardar la API key de Gemini en el navegador de quien la escribió y reutilizarla en cargas posteriores. El sistema SHALL NOT pedir un project id ni incluir una API key en el sitio publicado.

#### Scenario: Visita posterior con clave guardada
- **WHEN** el usuario escribió una API key y vuelve a abrir la página en el mismo navegador
- **THEN** el sistema reutiliza esa clave sin volver a pedirla

#### Scenario: Ajustes del modelo
- **WHEN** el usuario abre los ajustes del modelo
- **THEN** el sistema pide la API key de Gemini y no pide un project id

#### Scenario: Sitio publicado sin clave
- **WHEN** se publica el sitio
- **THEN** los archivos publicados no contienen una API key

### Requirement: Guardar el estado estructurado
El sistema SHALL guardar un único estado local con `tech_skills`, `soft_skills`, `languages`, `experience_time` y `education`. `languages` SHALL incluir cada idioma humano y su nivel. `education` SHALL incluir los títulos de graduación. `experience_time` SHALL ser un número con como máximo un decimal.

#### Scenario: CV con habilidades, idiomas y títulos
- **WHEN** el texto del CV menciona habilidades técnicas, habilidades blandas, idiomas y títulos
- **THEN** el estado guardado lista esas habilidades, cada idioma con su nivel y esos títulos

#### Scenario: Falla la extracción estructurada
- **WHEN** el modelo no devuelve el estado utilizable
- **THEN** el sistema aborta toda la carga, muestra un error claro y no guarda chunks ni estado de esa carga

#### Scenario: Falla el guardado del estado
- **WHEN** el estado se obtuvo y su escritura en la base falla
- **THEN** el sistema aborta toda la carga, muestra un error claro y no deja los chunks de esa carga guardados

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
El sistema SHALL guardar exactamente un perfil activo en el navegador y SHALL reutilizar sus chunks, embeddings y estado al volver a abrir la página.

#### Scenario: Visita posterior
- **WHEN** ya existe un perfil y el usuario vuelve a abrir la página
- **THEN** el sistema sigue usando esos chunks, embeddings y ese estado

### Requirement: Reemplazar el perfil
El sistema SHALL reemplazar chunks, embeddings y estado cuando una carga nueva termina con éxito, y SHALL usar solo el perfil nuevo después.

#### Scenario: Segundo PDF válido
- **WHEN** ya existe un perfil y el usuario carga otro PDF válido
- **THEN** el sistema descarta el perfil anterior y conserva solo el nuevo

### Requirement: Rechazar un PDF sin texto
El sistema SHALL rechazar un PDF sin texto extraíble y SHALL dejar intactos los chunks, embeddings y estado anteriores.

#### Scenario: PDF escaneado sin texto
- **WHEN** el PDF no contiene texto extraíble
- **THEN** el sistema aborta antes de llamar al modelo, muestra un error claro y conserva el perfil que ya existía, si había uno

### Requirement: Terminar solo si las dos ramas quedan guardadas
El sistema SHALL extraer el estado y generar los chunks en paralelo después de obtener el texto. SHALL informar que la carga salió bien solo cuando ambos quedaron guardados. Si una rama falla, SHALL descartar lo que la otra haya escrito en esa carga.

#### Scenario: Las dos ramas terminan
- **WHEN** los chunks embedados y el estado estructurado se guardaron
- **THEN** el sistema informa al usuario que la carga salió bien

#### Scenario: Una rama falla después de que la otra guardó
- **WHEN** una rama ya escribió en la base y la otra falla
- **THEN** el sistema quita lo escrito en esa carga, conserva el perfil anterior y no informa éxito

### Requirement: Informar si hay un perfil
El sistema SHALL indicar si hay un perfil activo y SHALL mostrar el estado estructurado, sin exigir el PDF original.

#### Scenario: Consulta del perfil
- **WHEN** el usuario abre el perfil y hay un estado guardado
- **THEN** el sistema muestra las habilidades, los idiomas con nivel, los años de experiencia y los títulos
