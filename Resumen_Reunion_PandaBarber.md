# Resumen Reunión 1 - Panda Barber Studio

**Fecha:** 2025
**Participantes:** Desarrollador (Somos Dos Estudios) + Panda Barber Studio

---

## Contexto

- **Cliente:** Panda Barber Studio (barbería + tatuajes)
- **Ubicación:** Centro Comercial Ciudad Jardín, Local 74, Planta Baja, Maracaibo
- **Equipo:** 6 Odontologos (+ 1 por incorporar), 1 tatuador, asistentes de lavado
- **Sedes:** 2 (solo la actual está activa por ahora)
- **Desarrollador:** Somos Dos Estudios (pareja que hace sistemas personalizados)

---

## Funcionalidades Acordadas

### Dashboard
- Panel de sillas ocupadas/libres sincronizado con la agenda
- Ingresos diarios/semanales/mensales

### Agenda y Citas
- Clientes nuevos se registran con: nombre, teléfono, cédula, fecha de nacimiento
- Sistema recuerda cumpleaños → descuento 10% + mensaje automático
- Selección de servicio y barbero/tatuador disponible
- Horas disponibles se actualizan en tiempo real
- Opción de "agendar después" si el barbero no está disponible

### Caja/Cobro
- Pagos en USD, BS o mixto
- Referencia de pago móvil y punto de venta
- Historial de transacciones completo
- Extras: productos (cera, laca), lavados, depilación, etc.

### Notificaciones
- Recordatorio automático de próxima visita (configurable: 7, 14, 30 días)
- Mensaje de cumpleaños automático el día del cumpleaños con descuento
- Notificación al barbero cuando le toca atender

### Turnos
- Control por orden de llegada (el barbero marca "llegué" desde su celular
- Cola de clientes visible en admin
- Si el barbero no está disponible, se salta al siguiente
- Responsabilidad: si no está, pierde el turno

### Fotos
- Foto antes/después del corte (barbero toma con su celular)
- Collage de comparativa para compartir con cliente

### Tatuajes
- Módulo separado de servicios de tatuaje
- Cotización manual (no tiene precio fijo)
- Selección de tatuador disponible

### Fidelización
- "Cliente del mes" con descuento
- Ruleta de premios para top 3 clientes (corte gratis, lavado premium, tatuaje)
- Cupones descargables con confeti
- El cliente ve su posición en el ranking desde su perfil

### Sedes
- Módulo para manejar las 2 sedes (separadas o juntas)
- Por ahora solo la sede actual está activa

### Administración
- Top Odontologos por ingresos, tiempo, clientes atendidos
- Finanzas, costos de servicios, rentabilidad, ocupación
- Permisos por rol (admin, barbero, asistente de lavado, tatuador)

### Página Web Pública
- Clientes pueden agendar citas desde la web
- Perfil de Google Maps optimizado (SEO)
- Recordatorios por WhatsApp (automático)

---

## Próximos Pasos

1. **Implementar cambios** en las próximas 1-2 semanas
2. **Traer contrato** con precio ($400, dos pagos: uno al inicio, uno al final)
3. **Primera semana:** desarrollo
4. **Segundo mes:** prueba en barbería, ajustes según feedback
5. **Grabar podcast/video testimonial** al terminar
6. **Google Maps:** optimizar perfil (nombre: Panda Barber Studio, dirección correcta, SEO)

---

## Notas Técnicas

- El sistema usa Next.js + JavaScript
- Base de datos en Supabase
- Cuenta de Google AI Pro/Ultra para el developer
- Cámara Kodak con problemas de lectura de SD (pendiente revisar)
