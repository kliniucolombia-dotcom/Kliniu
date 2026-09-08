# Sprint Operaciones Fase 1 Integridad

## Objetivo

Corregir los riesgos de autorización, integridad y validación detectados en los módulos existentes de Operaciones sin añadir procesos nuevos del manual de funciones.

## Alcance aprobado

1. Aislar los informes por módulo y por permiso efectivo.
2. Generar en servidor los KPI almacenados en cada informe.
3. Validar fechas, enumeraciones, identificadores, números y cuerpos JSON en los endpoints afectados.
4. Hacer atómicas las transiciones de órdenes de producción y mantenimiento.
5. Evitar números de mantenimiento duplicados bajo concurrencia.
6. Mantener sincronizados el estado de moldes y sus montajes abiertos.
7. Calcular el stock bajo usando la cantidad de cada bodega.
8. Cubrir permisos y flujos críticos con pruebas automatizadas y Playwright.
9. Dejar sin errores ESLint las pantallas de Operaciones afectadas.

## Fuera de alcance

- Consumo de materia prima o ingreso automático de producto terminado.
- Inventarios cíclicos, conciliaciones físicas y procesos nuevos de bodega.
- Funciones nuevas de ensamble o inyección.
- Automatización de periodicidad, vencimientos o aprobaciones de informes.
- Optimización automática de rutas.
- Cambios de usuarios reales, contraseñas, aprovisionamiento o datos productivos.

## Reglas funcionales

- Un usuario solo puede leer informes de módulos donde tenga `canView`.
- El tablero solo devuelve informes de los módulos visibles para ese usuario.
- El cliente elige período y notas; los KPI se recalculan desde la base de datos.
- Fechas civiles usan Bogotá y deben existir realmente; fechas-hora deben ser válidas.
- Una transición solo se aplica si el estado persistido coincide con el estado origen permitido.
- Una orden de producción no se completa si no tiene corrida asociada o si la suma producida neta no cubre lo solicitado.
- Una máquina no puede tener más de un montaje abierto y un molde no puede estar montado en más de una máquina.
- El estado del molde solo cambia mediante montaje, desmontaje o mantenimiento explícito compatible.
- El indicador de bajo stock por bodega compara `cantidad local <= mínimo del producto`; cero también cuenta como bajo stock.

## Criterio de terminado

- Pruebas unitarias/de integración nuevas en verde.
- `npx tsc --noEmit` en verde.
- ESLint focalizado en verde.
- Flujos Playwright de permisos, informes, producción, moldes, mantenimiento y bodegas verificados en navegador real.
- Ninguna modificación a datos o credenciales de cuentas reales.

