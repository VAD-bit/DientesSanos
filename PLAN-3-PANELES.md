# PLAN — Migración a 3 paneles: Odontólogo · Asistente · Administrador

> Documento de trabajo para las IAs (OpenCode / Copilot de VS Code). Leer junto a `AGENTS.md`.
> Rama: `feature/3-paneles`. Verificación obligatoria por fase: `npm run lint` (baseline **615**
> tras Fase 7) + `npm run build` + smoke tests `node <temp>/test-staffroles.mjs` (60 checks).
> Reglas de `AGENTS.md` (no renombrar claves `panda_*`, identidad Dientes Sanos).

## Decisiones del cliente (2026-10-09)

| Decisión | Respuesta |
|---|---|
| Mapeo de roles | `Barbero/Tatuador → Odontologo`, `Recepcionista/Caja/Barista/Asistente de Lavado → Asistente`, `Admin → Administrador` |
| Panel del Odontólogo | Su panel (BarberPanel) + Agenda + Clientes + Historial |
| Panel del Asistente | Recepción + Agenda + Clientes + Mi Perfil + Historial |
| Caja/Finanzas/Inventario | Solo Administrador (el Asistente NO cobra) |
| Datos | Proyecto Supabase nuevo, **se empieza de cero** (sin migración de datos) |

## Roles canónicos

Valor interno en `staff.role` (sin tildes) + módulos tras el `|`:

| Valor interno | Etiqueta visible | Preset de módulos |
|---|---|---|
| `Administrador` | Administrador | todos los de `availableModules` |
| `Odontologo` | Odontólogo | `my-profile, barber, scheduling, clients, history` |
| `Asistente` | Asistente | `my-profile, reception, scheduling, clients, history` |

## Fuente única de navegación (creada en Fase 2)

`src/utils/staffRoles.js` exporta `getAllowedMenuIds(userRole)` y `getRoleCategory(userRole)`:
son la única fuente de verdad. Los consumidores son **Sidebar**, **MobileBottomNav** y el
guardia de `handleTabChange` (App) + efecto home (App). Si cambia un preset, cambia en un
solo sitio. `ALL_MENU_IDS` lista los 15 ids de módulos (sin `barista`).

## Fases

### ✅ Fase 0 — Preparación
- `git init` + commit inicial en `main` (`cb955ea`), rama `feature/3-paneles`.
- Baseline: lint 616, build ✓.

### ✅ Fase 1 — Núcleo de detección (`src/utils/staffRoles.js`) — commit `c0274bd`
- Helpers `isOdontologoRole` / `isAsistenteRole` / `roleNameOf` (palabra clave antes del `|`).
- `isBookableStaff` ya **no** exige `isAdminStaff` (el portal no listaba a nadie).
- `isOperationalReceptionStaff` = admin u odontólogo u asistente.
- `SERVICE_OR_OPS_KEYWORDS` / `isBarberRole` += `odontolog`; `isServiceProf` (Sidebar y
  MobileBottomNav) += `odontolog`; `getReceptionRoleGroup` agrupa odontólogos en `barbers`
  (etiqueta "Odontólogos DISPONIBLES" ya existente).
- Fix condición invertida en `ReceptionModule.handleSubmit` (~460): hoy idéntica a la de
  "Enviar a sillón" (~399) y complemento del filtro del listado (~214).
- **Fix posterior**: `dataService.createAppointment` acepta asistentes en citas agendadas
  (`isBookableStaff || isAsistenteRole`); antes "Agendar para después" con un asistente fallaba.
- Revisión con subagente: 0 bloqueantes, deuda anotada abajo.

### ✅ Fase 2 — Navegación (3 sitios)
- **Sidebar**: `allMenuItems` sin arrays `roles`, sin ítem `barista`, + ítem `history`;
  filtro por `getAllowedMenuIds` (admin oculta `my-profile`/`barber`); se eliminaron las
  ramas `isServiceProf`/`isSupportStaff`/`isBarista`/`Custom:`/`Asistente de Lavado`.
- **MobileBottomNav**: ítems sin `roles` ni `barista`; `MAIN_IDS_BY_CATEGORY`
  (admin: Inicio/Clientes/Stock/Caja · odontólogo: sillón/Agenda/Mi Perfil/Clientes ·
  asistente: Recepción/Agenda/Mi Perfil/Clientes · apoyo: Mi Perfil) + seguro de menú vacío.
- **App**: home por rol con `getAllowedMenuIds`/`getRoleCategory` (odontólogo → `barber`,
  asistente → `reception`, apoyo → `my-profile`, admin → `dashboard`; corrige el home
  `barista` heredado y el aterrizaje en `dashboard` fuera de menú); guardia universal en
  `handleTabChange` (antes solo bloqueaba mal a `Asistente de Lavado`); carga ligera
  (`isServiceProfessionalOnly`) = categoría `odontologo` (BarberPanel autosuficiente).
- **BarberPanel**: botón "Salir" por id (`selectedBarber.id !== user.id`) en vez de
  `role === 'Barbero'` (el odontólogo ya no ve "Salir" en su propio panel).
- `App.menuItems` (líneas ~337-348) quedó como código muerto a propósito (borrarlo orfila
  imports de iconos): limpiar en Fase 7.

### ⬜ Fase 3 — Altas y etiquetas
- `PersonnelModule.jsx:692-700` → 3 presets; `roleLabel` 703-707; iconos 1647-1650;
  agrupación de asistencia 3771-3784.
- `RoleManagerModal.jsx:24-37`, `ReportsModule.jsx:26-28`, `FinanceModule.jsx:69-73`,
  `StaffProfileModal.jsx:33-35`. NO renombrar la clave `panda_custom_roles`.

### ⬜ Fase 4 — Comparaciones exactas de rol (~40 sitios)
`BarberPanel:1193` ya resuelto. Pendientes: `DashboardModule:1265`,
`SchedulingModule:3258,4295`, `InventoryModule:240`, `HistoryModule:227,342,499`
(`:499` etiqueta "Tu Comisión"), `MobileDashboard:191`,
`CheckoutPOS:1247,1276,1297,1374` y **`CheckoutPOS:1228` comisión (pct=0 si el rol no
casa: ahora el odontólogo no cobraría comisión en caja)**,
`SaleServiceModal:46,69`, `FinanceModule:364,1555-1582,2133-2139,2322,2462`,
`ReportsModule:636`, `PersonnelModule:1297,1365-1374,2316,2760-2766,3067,4365`,
`UserProfilePage:313,547-550`, `PanelsModule` filtros (Fase 7). Sustituir por helpers.

### ⬜ Fase 5 — Push
- `pushService.roleCategory` (20-29) → 3 categorías.
- Emisores: `dataService.js:1538-1563,1724`, `App.jsx:244-262` (`roleName === 'Admin'`
  no casa con `Administrador`; `recipientRole === 'Barbero'` no casa con `Odontologo`),
  `BarberPanel:519,550`, `CheckoutPOS:1532`, `BookAppointment:2430`.
- El edge function filtra `push_subscriptions.role`, así que emisor y `roleCategory` deben coincidir.

### ✅ Fase 6 — Portal público — incluida en commit `3900107`
- `BookAppointment` importa `roleLabel` (fallback de especialidad, línea ~3110).
- `Explore.jsx:34` / `ClientDashboard.jsx:1010` / `Home.jsx:36`: keyword `odontolog` añadida.
- Pestaña "Tatuajes" oculta para roles Odontologo (sin barberos reales con ese rol).
- Extras no planificados (pedido del cliente, mismo commit): config única
  `src/public-site/config/clinic.js` (WhatsApp/IG/Maps/ubicación), confirmación de cita
  con fallback a WhatsApp clínica, servicio `instagramFeed.js` + 4 imágenes placeholder
  del feed de Instagram (`src/assets/instagram/`), `scripts/fetch-instagram.mjs`.

### ✅ Fase 7 — Hub de paneles + limpieza — incluida en commit `3900107`
- `PanelsModule.jsx`: `ROLE_META` 3 categorías (odontologo/asistente/support), filtros
  por `getRoleCategory`, dispatch sin `BaristaPanel`.
- `App.jsx`: case `barista` + lazy import borrados; `menuItems` muerto eliminado.
- Lint cayó a **615** (se limpió import `Calendar` preexistente en ReportsModule).

### ✅ Fase 8 — DB y backend — commit `4bd0752`
- `db/setup_dientes_sanos.sql`: reset seguro de tablas vacías con esquema viejo
  (DO block solo borra si DB vacía Y `staff` sin `auth_user_id`), default de rol
  `'Odontologo'`, bootstrap del admin (`administrador@dientessanos.com` /
  `DientesSanos2026!`) idempotente al final del script.
- `Login.jsx`: shortcut de desarrollo (doble click en el título) usa la password nueva.
- `is_admin()` ya casa con `Administrador` por `ilike '%admin%'`.

## Deuda explícita de la revisión de Fase 1 (no bloquea)
1. ~~dataService cita agendada + asistente~~ — **RESUELTO en Fase 1**.
2. Portal `Explore`/`ClientDashboard`/`Home` → movido a Fase 6.
3. Home por rol desalineado → **RESUELTO en Fase 2**.
4. `SaleServiceModal:156` envía `scheduled_at` con cualquier staff: con el fix de dataService
   el asistente ya pasa; un admin como staff seguiría fallando (igual que antes).
5. Roles legacy con módulos propios (p. ej. `Caja|checkout,...`): categoría `asistente`
   manda sobre sus módulos en el orden del menú móvil (aceptado: se arranca de cero).

## Criterio de aceptación
1. `npm run lint` ≤ 615 y `npm run build` ✓ tras cada fase.
2. Login de los 3 roles muestra exactamente sus módulos (desktop y móvil).
3. Portal público lista odontólogos en "Odontólogos" y permite reservar.
4. Recepción muestra los grupos Odontólogos y Asistentes.
5. Alta de personal solo ofrece los 3 presets.

## ✅ ENTREGA FINAL (2026-10-10) — todas las fases completas

Commits en `feature/3-paneles`: `3c44592` (F3) → `9f27682` (F4) → `8a331dc` (F5)
→ `3900107` (F6+F7+contacto/IG) → `4bd0752` (F8 SQL+login+imágenes).
Lint **615** ✓, build ✓, tests 60/60 ✓.

**Acciones manuales del usuario (una sola vez, ~5 min):**
1. Supabase Dashboard → SQL Editor → pegar y ejecutar **todo** `db/setup_dientes_sanos.sql`
   (resetea tablas vacías con esquema viejo + crea tablas nuevas + crea el admin).
2. Project Settings → API → en "Exposed schemas" incluir el esquema `odontosonrisa`.
3. Entrar al CRM: usuario `administrador@dientessanos.com` / password `DientesSanos2026!`
   (o doble-click en el título de Login para el shortcut de desarrollo).
4. Opcional (fotos reales del IG): desde la red doméstica del cliente,
   `node scripts/fetch-instagram.mjs dientes_sanos 8` reemplaza los placeholders.
