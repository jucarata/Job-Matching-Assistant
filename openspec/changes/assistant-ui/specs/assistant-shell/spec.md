# Spec Delta

## Purpose

Define la pantalla del asistente: la conversación permanece cerrada hasta que existe un perfil y se vacía cuando un PDF nuevo lo reemplaza con éxito.

## ADDED Requirements

### Requirement: Mostrar conversación, perfil y ajustes
El sistema SHALL mostrar en la misma pantalla la zona de conversación, la zona de perfil y la entrada a los ajustes.

#### Scenario: Pantalla inicial
- **WHEN** el usuario abre la aplicación
- **THEN** ve la zona de conversación, la zona de perfil y la entrada a los ajustes en la misma pantalla

### Requirement: Conversación visible e inactiva sin perfil
El sistema SHALL mostrar la zona de conversación cuando no hay perfil, sin aceptar texto ni envío.

#### Scenario: Sin perfil
- **WHEN** no hay un perfil
- **THEN** la zona de conversación se ve y no acepta texto ni envío

### Requirement: Explicar la conversación inactiva
El sistema SHALL mostrar, en español, que la conversación se abre cuando haya un perfil.

#### Scenario: Aviso de conversación cerrada
- **WHEN** no hay un perfil
- **THEN** la zona de conversación muestra el texto «La conversación se abre cuando hay un perfil.»

### Requirement: Cargar el CV como acción primaria sin perfil
El sistema SHALL presentar «Cargar CV» como la única acción primaria cuando no hay perfil.

#### Scenario: Sin perfil
- **WHEN** no hay un perfil
- **THEN** la única acción primaria es «Cargar CV»

### Requirement: Habilitar la conversación con perfil
El sistema SHALL permitir escribir y SHALL presentar «Enviar» como la única acción primaria cuando hay un perfil y no hay una carga de PDF en curso.

#### Scenario: Perfil listo
- **WHEN** hay un perfil y no hay una carga de PDF en curso
- **THEN** el usuario puede escribir y la única acción primaria es «Enviar»

#### Scenario: Primera carga válida
- **WHEN** no había perfil y una carga de PDF termina bien
- **THEN** la conversación acepta texto y la única acción primaria pasa a ser «Enviar»

### Requirement: Conservar el borrador al pulsar Enviar
El sistema SHALL conservar el texto en el compositor cuando el usuario pulsa «Enviar». SHALL NOT llamar a un modelo ni mostrar una respuesta del asistente.

#### Scenario: Envío sin respuesta
- **WHEN** hay un perfil, el usuario escribió un texto y pulsa «Enviar»
- **THEN** el texto sigue en el compositor y no aparece una respuesta del asistente

### Requirement: Inactivar Enviar durante la carga
El sistema SHALL inactivar «Enviar» mientras una carga de PDF está en curso y SHALL seguir mostrando el perfil anterior hasta que la carga termine bien.

#### Scenario: Reemplazo en curso
- **WHEN** hay un perfil y una carga de PDF aún no termina
- **THEN** «Enviar» está inactivo y el perfil visible sigue siendo el anterior

### Requirement: Ofrecer reemplazar el CV como acción secundaria
El sistema SHALL ofrecer «Reemplazar CV» cuando hay un perfil. Ese control SHALL iniciar la misma carga de PDF y SHALL NOT ser la acción primaria.

#### Scenario: Perfil existente
- **WHEN** hay un perfil
- **THEN** «Reemplazar CV» está disponible y no es la acción primaria

### Requirement: Vaciar la conversación si el reemplazo tiene éxito
El sistema SHALL vaciar el borrador y SHALL mostrar solo el perfil nuevo cuando una carga de reemplazo termina bien. La conversación SHALL quedar habilitada.

#### Scenario: Reemplazo válido
- **WHEN** hay un borrador y una carga de reemplazo termina bien
- **THEN** el borrador queda vacío, el perfil visible es el nuevo y la conversación acepta texto

### Requirement: Conservar la conversación si el reemplazo falla
El sistema SHALL conservar el perfil y el borrador cuando una carga de reemplazo se rechaza, y SHALL mostrar el error junto a «Reemplazar CV».

#### Scenario: Reemplazo rechazado
- **WHEN** hay un perfil y un borrador, y la carga de reemplazo se rechaza
- **THEN** el perfil y el borrador siguen igual y el error aparece junto a «Reemplazar CV»

### Requirement: Mostrar el perfil en su zona
El sistema SHALL dejar vacía la zona de perfil cuando no hay perfil, y SHALL mostrar ahí el estado del perfil activo cuando sí hay uno.

#### Scenario: Zona vacía
- **WHEN** no hay un perfil
- **THEN** la zona de perfil no muestra un estado

#### Scenario: Perfil activo
- **WHEN** hay un perfil activo
- **THEN** la zona de perfil muestra el estado de ese perfil

### Requirement: Separar los ajustes de la conversación
El sistema SHALL abrir los ajustes fuera de la zona de conversación.

#### Scenario: Abrir ajustes
- **WHEN** el usuario abre los ajustes
- **THEN** los ajustes se muestran fuera de la zona de conversación

### Requirement: Apilar la conversación sobre el perfil
El sistema SHALL colocar la zona de conversación encima de la zona de perfil cuando el ancho de la ventana es menor que 768 px.

#### Scenario: Ventana estrecha
- **WHEN** el ancho de la ventana es menor que 768 px
- **THEN** la zona de conversación queda encima de la zona de perfil

### Requirement: Etiquetar los controles en español
El sistema SHALL mostrar cada control con una etiqueta visible en español y SHALL hacer visible el foco al recorrerlo con teclado.

#### Scenario: Control enfocado
- **WHEN** el usuario llega a un control con el teclado
- **THEN** el control tiene una etiqueta visible en español y el foco se ve
