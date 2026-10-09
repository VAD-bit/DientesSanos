# Panda Barber CRM — Project Handoff & Context Document

> **Última actualización: 08 de Julio 2026**

Este documento es la **"Biblia"** del proyecto Panda Barber CRM. Cualquier IA o desarrollador debe leerlo COMPLETAMENTE antes de proponer cambios.

---

> [!IMPORTANT]
> **REGLA DE ORO:** Nunca trabajes directamente sobre `main`. Crea siempre una rama nueva (`git checkout -b fix/nombre-del-fix` o `feature/nombre`). Pide confirmación antes de hacer merge.

---

## 📖 Contexto del Negocio

**Panda Barber Studio** es una barbería/estudio premium. El software debe reflejar esa exclusividad:

- **Estética:** Dark Mode por defecto, acentos dorados (`#D4AF37`) y blancos
- **Componentes:** Glassmorphism (fondos semitransparentes + blur), bordes redondeados, micro-animaciones
- **UX:** Todo fluido como app móvil — **PROHIBIDO** hacer diseños planos o aburridos

---

## 🛠️ Stack Tecnológico

| Capa | Tecnología |
|------|-----------|
| Frontend | React 19, Vite 8, React Router DOM 7 |
| Iconos | Lucide React |
| Estilos | CSS Vanilla puro (NO Tailwind). Variables en `index.css` |
| Backend/DB | Supabase (PostgreSQL) **self-hosted en VPS propio** |
| URL VPS | `https://supabase.somosdostudio.com` |
| Esquema DB | `odontosonrisa` (multi-tenant) |
| Bot WhatsApp | Node.js + whatsapp-web.js + node-cron (microservicio separado) |

---

## 🗄️ Configuración Crítica de Base de Datos

### Esquema
Todos los datos del CRM están en el esquema **`odontosonrisa`**, NO en `public`.

El cliente de Supabase siempre debe inicializarse con:
```js
createClient(url, key, { db: { schema: 'odontosonrisa' } })
```

### Archivo `src/lib/supabase.js`
Exporta DOS clientes:
- `supabase` — clave anon, esquema `odontosonrisa`. Para operaciones de usuario normal
- `publicSupabase` — clave anon, esquema `odontosonrisa`. Para el portal público con su propia sesión

> [!NOTE]
> **Resolución de RLS (Ago 2026):** Las tablas del esquema `odontosonrisa` ahora tienen políticas RLS correctas para el rol `authenticated`. Ya no se necesita `authClient` (service role) en el browser. Todos los queries usan la clave anon con la sesión del empleado autenticado.

### Variables de entorno (`.env`)
```
VITE_SUPABASE_URL=https://supabase.somosdostudio.com
VITE_SUPABASE_ANON_KEY=eyJ...
VITE_SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

> [!CAUTION]
> La `SERVICE_ROLE_KEY` ya está expuesta en el bundle del cliente (prefijo `VITE_`). Esto es aceptable para un CRM interno, pero nunca debe usarse en un producto público.

---

## 🏗️ Arquitectura — 3 Bloques Principales

```
odontosonrisa/
├── src/
│   ├── App.jsx                    # Router principal, auth guard, cumpleaños
│   ├── main.jsx                   # Entry point admin/CRM
│   ├── main-public.jsx            # Entry point portal público
│   ├── PublicRouter.jsx           # Rutas del portal público
│   ├── context/
│   │   └── AuthContext.jsx        # Auth state, login, logout, roles
│   ├── lib/
│   │   └── supabase.js            # Clientes Supabase (supabase + publicSupabase)
│   ├── services/
│   │   ├── dataService.js         # API principal del CRM (CRUD completo)
│   │   └── notificationService.js # Sistema de notificaciones in-app
│   ├── components/                # Módulos del CRM (ver tabla abajo)
│   └── public-site/               # Portal de reservas público
│       ├── pages/
│       │   └── BookAppointment.jsx
│       ├── services/
│       │   └── publicService.js   # API pública (anon, sin auth)
│       └── public.css
```

### Módulos del CRM (`src/components/`)

| Archivo | Descripción |
|---------|-------------|
| `Login.jsx` | Pantalla de login con animaciones premium |
| `Sidebar.jsx` | Navegación lateral, control de acceso por rol |
| `DashboardModule.jsx` | Resumen del negocio, métricas |
| `SchedulingModule.jsx` | Calendario y agenda de citas |
| `ReceptionModule.jsx` | Vista de recepción, check-in de clientes |
| `CheckoutPOS.jsx` | **Punto de venta** — pagos, comisiones, ticket |
| `ClientModule.jsx` | CRUD clientes, historial, galería |
| `PersonnelModule.jsx` | CRUD staff, roles, comisiones |
| `ServicesModule.jsx` | CRUD servicios, tatuajes, precios |
| `InventoryModule.jsx` | Inventario de productos |
| `FinanceModule.jsx` | Dashboard financiero, cierres de caja |
| `ReportsModule.jsx` | Reportes por barbero y período |
| `SettingsModule.jsx` | WhatsApp, cupones, ruleta, negocio |
| `BarberPanel.jsx` | Vista del barbero: su agenda personal |
| `HistoryModule.jsx` | Historial de transacciones |

---

## 👥 Sistema de Roles y Permisos

El campo `role` en la tabla `staff` tiene el formato: `Posición|módulo1,módulo2,...`

### Roles actuales del sistema

| Posición | Módulos por defecto | Notas |
|---------|---------------------|-------|
| `Admin` | `my-profile,dashboard,scheduling,reception,checkout,barber,clients,personnel,services,inventory,finance,history` | Acceso total |
| `Barbero` | `my-profile,scheduling,barber,clients,history` | No puede agendar ni modificar citas |
| `Tatuador` | `my-profile,scheduling,barber,clients,history` | Igual que Barbero, pero ve tatuajes |
| `Asistente de Lavado` | `my-profile,dashboard,history,inventory,clients,reception,barber,services` | Tarifa plana por servicio de lavado |
| `Barista` | `my-profile,history` | Acceso mínimo |

> Roles con prefijo `ARCHIVED|` están deshabilitados. El login los filtra automáticamente.

### Regla de acceso en el login (`AuthContext.jsx`)
1. `supabase.auth.signInWithPassword()` valida email/password
2. `dataService.getStaffByAuthUserId()` busca el perfil del empleado autenticado
3. Si no hay perfil activo → error "usuario no vinculado al equipo"
4. Si el `role` empieza con `ARCHIVED|` → mismo error

---

## 👤 Usuarios Actuales del Sistema

### Administrador
| Email | Contraseña | Rol |
|-------|-----------|-----|
| `administrador@odontosonrisa.com` | `Panda2024!` | Admin completo |

### Staff (todos con contraseña `123456`)

| Nombre | Email | Rol | Comisión | Nacimiento |
|--------|-------|-----|----------|-----------|
| Angel Serrano | angel@odontosonrisa.com | Barbero | 60% | 11/07/1998 |
| Moret Serrano | moret@odontosonrisa.com | Barbero | 70% | 14/09/2000 |
| Jeff Carrero | jeff@odontosonrisa.com | Barbero | 60% | 14/07/1999 |
| Abraham Díaz | abraham@odontosonrisa.com | Barbero | 60% | 13/04/2004 |
| Juan Herrera | juan@odontosonrisa.com | Barbero | 60% | 24/09/2007 |
| Alejandro Ramírez | alejandro@odontosonrisa.com | Barbero | 60% | 14/01/2000 |
| Marko Cardozo | marko@odontosonrisa.com | Tatuador | 70% | 28/03/2004 |
| José Cordero | jose@odontosonrisa.com | Tatuador | 70% | 05/09/1997 |
| Cesia Zuleta | cesia@odontosonrisa.com | Asistente de Lavado | 60% | 16/01/2002 |
| Yarlin Herrera | yarlin@odontosonrisa.com | Barista | — | 07/07/1983 |

---

## 💰 Sistema de Comisiones

- **Barbero:** `commission_pct` % sobre el precio del servicio (ej. 60% de $20 = $12)
- **Asistente de Lavado:** Tarifa plana (`washing_rate`) por cada cliente que pasa por lavacabezas. El costo del lavado se descuenta del pago del barbero antes de calcular su comisión
- **Tatuador:** `commission_pct` % igual que Barbero
- **Venta de productos de inventario:** 10% para quien realizó la venta

---

## ✅ Características Implementadas

### POS / Caja (`CheckoutPOS.jsx`)
- Pagos bi-moneda simultáneos: **USD (efectivo/Zelle)** y **VES (Pago Móvil/Punto)**
- Tasa de cambio manual fijada por el cajero
- Servicios + productos de inventario + extras en la misma factura
- Impresión térmica en impresoras de 80mm (`@media print`)
- Cupones de descuento aplicables en caja (se detectan automáticamente)

### Gamificación
- **Ruleta de cumpleaños:** Clientes que reservan el día de su cumpleaños la ven girar al entrar
- **Cliente del Mes:** El top #1 del mes recibe notificación + puede girar la ruleta
- **Cupones:** Se generan en `client_coupons` y aparecen automáticamente en el POS
- Premios configurables desde `SettingsModule.jsx` (pestaña Ruleta)

### Tatuajes (Flujo Especial)
- Detección automática: categoría que contiene `"tatuaj"` (NO campo `is_tattoo`)
- Precio mostrado como `"A cotizar"` (se guarda `price: 0` en DB)
- Labels de comisión cambian: "Comisión Tatuador", "Pago Real Tatuador"
- En el portal público → paso de "Referencia" en vez de "Bebida"
- Al confirmar → redirige a `wa.me/{numero}` con mensaje preformateado

### WhatsApp Automation
- Plantillas configurables en `system_settings`: cumpleaños, seguimiento
- El bot (microservicio externo) las lee y envía automáticamente
- Campo `whatsapp_business_number` configurable en SettingsModule

### Portal Público de Reservas (`/agendar`)
- Selección de servicio → staff → fecha → hora → confirmación
- Filtra Odontologos/ según el tipo de servicio seleccionado
- Número de WhatsApp del negocio dinámico desde la DB

---

## 🌿 Ramas de Desarrollo

| Rama | Descripción | Estado |
|------|-------------|--------|
| `main` | Producción estable | Solo merge desde `rama-funciones` |
| `rama-funciones` | Funcionalidades core del CRM | ✅ Activa |
| `rama-diseno` | Diseño UI/UX externo | ✅ Mergeada en `rama-funciones` |

---

## 🐛 Bugs Resueltos (Historial Reciente)

| Fecha | Bug | Solución |
|-------|-----|---------|
| Jul 8 2026 | Login mostraba "usuario no vinculado" aunque las credenciales eran correctas | Había un registro duplicado con `role: ARCHIVED\|...` y mismo `auth_user_id`. Se eliminó el duplicado. |
| Jul 8 2026 | `getStaffByAuthUserId()` devolvía `null` con clave anon aunque el auth pasaba | RLS activo sin políticas para `authenticated`. Fix: aplicar políticas RLS en Supabase VPS para que `authenticated` pueda leer `staff` |
| Jul 8 2026 | Página en blanco al abrir — error: `supabase.js does not provide export 'authClient'` | Cache de Vite corrupta. Fix: reiniciar Vite con `--force` (`npm run dev -- --force`). NOTA: `authClient` fue eliminado del código; ya no se necesita. |

---

## 🚧 Pendientes / Próximos Pasos

### Alta Prioridad
- [x] **Aplicar políticas RLS correctas** en el panel de Supabase VPS para el esquema `odontosonrisa` — RESUELTO (Ago 2026)
- [ ] **Verificar que todos los nuevos Odontologos pueden iniciar sesión** correctamente (email: `nombre@odontosonrisa.com`, pass: `123456`)
- [ ] **Probar el flujo completo de caja** con los nuevos Odontologos asignados a citas

### Media Prioridad
- [ ] **Bot de WhatsApp:** Crear microservicio `panda-whatsapp-bot` (Node.js + whatsapp-web.js + node-cron). Leer plantillas de `system_settings`, enviar por cumpleaños y seguimiento post-visita
- [ ] **Prueba de impresora física:** Imprimir recibo real en impresora térmica de 80mm y ajustar márgenes si es necesario
- [ ] **Actualizar `whatsapp_business_number`** en `system_settings` con el número real del negocio

### Baja Prioridad
- [ ] **Pulido UX del portal público:** Mejorar animaciones en `/agendar`
- [ ] **`washing_rate`** para Cesia Zuleta — definir cuánto cobra por servicio de lavado y actualizarlo en su perfil de staff

---

## 🔧 Cómo Arrancar el Proyecto Localmente

```bash
# Clonar el repo
git clone <repo-url>
cd odontosonrisa

# Instalar dependencias
npm install

# Crear .env con las variables de Supabase VPS
# (ver sección de variables de entorno arriba)

# Arrancar el servidor de desarrollo
npm run dev

# Si la página sale en blanco por cache corrupta, usar:
npm run dev -- --force
```

El servidor levanta en `http://localhost:5173` (o el siguiente puerto disponible si está ocupado).

> [!TIP]
> Si el puerto 5173 ya está ocupado, Vite usa el siguiente disponible (5174, 5175...). Revisa la terminal para ver en qué puerto quedó.

---

## 📁 Archivos Clave por Responsabilidad

| Archivo | Responsabilidad |
|---------|----------------|
| `src/lib/supabase.js` | Inicialización de clientes Supabase |
| `src/context/AuthContext.jsx` | Estado de autenticación, login, logout, carga de perfil |
| `src/services/dataService.js` | Todo el CRUD de la DB (staff, citas, clientes, servicios, etc.) |
| `src/services/notificationService.js` | Notificaciones in-app |
| `src/App.jsx` | Rutas principales, guard de auth, lógica de cumpleaños |
| `src/components/CheckoutPOS.jsx` | POS completo con comisiones y pagos |
| `src/components/PersonnelModule.jsx` | Gestión de staff + creación de usuarios |
| `src/components/SettingsModule.jsx` | Config: WhatsApp, cupones, ruleta |
| `src/public-site/pages/BookAppointment.jsx` | Portal público de reservas |
| `src/public-site/services/publicService.js` | API pública (sin auth requerida) |
| `scratch/` | Scripts utilitarios de mantenimiento/diagnóstico (no son parte del app) |

---

*Este documento debe ser leído en su totalidad antes de proponer cambios arquitectónicos, tocar la DB, o modificar el sistema de roles.*
