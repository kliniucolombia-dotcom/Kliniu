# Deuda técnica / mejoras futuras

## Edición inline de ProductionOrderItem

**Prioridad:** Media

**Descripción:** La UI de `app/panel/produccion/ordenes/[id]/page.tsx` no permite editar cantidad, destino o notas de un ítem ya agregado — solo eliminar y volver a crear. El backend (`PATCH /api/panel/production-orders/items/[id]`, `updateProductionOrderItem` en `lib/panel.ts`) ya soporta la edición completa; falta exponerla en el frontend.

**Motivo:**
- Mejora de experiencia de usuario.
- No afecta la lógica de negocio.
- No afecta la integridad de los datos.
- No afecta la arquitectura.
