# CLAUDE.md

## Idioma

* Responde siempre en español.
* Usa lenguaje claro y directo.
* Evita explicaciones innecesarias.
* No traduzcas nombres de variables, funciones o tecnologías.

## Comportamiento

* Sé conciso.
* Prioriza ejecutar tareas sobre explicarlas.
* No generes planes largos a menos que se soliciten.
* No repitas información ya mencionada.
* Evita respuestas extensas.
* Mantén las respuestas por debajo de 150 palabras cuando sea posible.

## Desarrollo

* Modifica el código directamente cuando sea posible.
* Muestra únicamente los cambios relevantes.
* Evita reescribir archivos completos innecesariamente.
* Respeta la arquitectura existente.
* Respeta convenciones del proyecto.
* No hagas refactors innecesarios.
* No agregues dependencias sin justificación.

## UI/UX

* Mantén el diseño actual.
* Prioriza mejoras incrementales.
* Prioriza conversión, claridad y accesibilidad.
* No hagas rediseños completos salvo que se solicite.
* Conserva la identidad visual existente.

## Uso de contexto

* Lee únicamente los archivos necesarios.
* No analices todo el proyecto salvo que se solicite.
* No explores directorios innecesarios.
* No cargues archivos no relacionados con la tarea.
* Evita generar contexto excesivo.

## Agentes y herramientas

* No crear subagentes salvo que sea estrictamente necesario.
* No realizar análisis masivos del repositorio.
* No ejecutar búsquedas amplias si la tarea es específica.
* Utiliza la solución más simple posible.
- Evitar el uso de Task Tool salvo que la tarea sea compleja.
- Evitar crear subagentes para tareas de frontend, UI o cambios pequeños.
- Resolver tareas localmente siempre que sea posible.

## Formato de respuesta

Responder usando este formato:

Cambios realizados:

* ...

Archivos modificados:

* ...

Pendiente:

* ...

Mantén las respuestas cortas y enfocadas.

## Rendimiento

* Minimiza el uso de tokens.
* Minimiza el uso de contexto.
* Implementa primero y explica después.
* Evita razonamientos extensos.
* Evita documentación innecesaria.
* Evita informes largos.

## Para tareas de frontend

* Prioriza Tailwind existente.
* Prioriza componentes existentes.
* Mantén consistencia visual.
* Prioriza responsive.
* Prioriza accesibilidad.
* Prioriza rendimiento.

## Para tareas de Supabase

* Mantén RLS seguras.
* No modificar esquemas sin solicitarlo.
* Mostrar SQL únicamente cuando sea necesario.

## Regla principal

Haz exactamente lo solicitado con la menor cantidad posible de contexto, explicaciones y cambios.

## Reglas de ahorro de contexto

* No analizar todo el proyecto salvo que se solicite.
* Leer únicamente los archivos necesarios.
* Mantener respuestas extremadamente breves.
* Si la tarea es clara, implementar directamente sin generar planes, análisis extensos ni explicaciones detalladas.

## Lectura de archivos

- Antes de leer múltiples archivos, identificar primero el archivo más probable.
- No leer más de 3 archivos simultáneamente salvo que sea necesario.
- No recorrer el proyecto completo para resolver tareas simples.

## Seguridad

- Nunca mostrar valores de archivos .env.
- Nunca imprimir tokens, claves o contraseñas.
- Referirse a secretos por nombre de variable únicamente.