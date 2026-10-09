# PLAN — Migración a 3 paneles: Odontólogo · Asistente · Administrador

> Documento de trabajo para las IAs (OpenCode / Copilot de VS Code). Leer junto a `AGENTS.md`.
> Rama: `feature/3-paneles`. Verificación obligatoria por fase: `npm run lint` (baseline **616**)
> + `npm run build`. Reglas de `AGENTS.md` (no renombrar claves `panda_*`, identidad Dientes Sanos).

## Decisiones del cliente (2026-10-09)

| Decisión | Respuesta |
|---|---|
| Mapeo de roles | `Barbero/Tatuador → Odontologo`, `Recepcionista/Caja/Barista/Asistente de Lavado → Asistente`, `Admin → Administrador` |
| Panel del Odontólogo | Su panel (BarberPanel) + Agenda + Clientes + Historial |
| Panel del Asistente | Recepción + Agenda + Clientes (+ Mi Perfil) |
| Caja/Finanzas/Inventario | Solo Administrador (el Asistente NO cobra) |
| Datos | Proyecto Supabase nuevo, **se empieza de cero** (sin migración de datos) |

## Roles canónicos

Valor interno en `staff.role` (sin tildes) + módulos tras el `|`:

| Valor interno | Etiqueta visible | Preset de módulos |
|---|---|---|
| `Administrador` | Administrador | todos los de `availableModules` |
| `Odontologo` | Odontólogo | `my-profile, barber, scheduling, clients, history` |
| `Asistente` | Asistente | `my-profile, reception, scheduling, clients, history` |

La detección en código es **por palabras clave** sobre el nombre del rol (antes del `|`) para
tolerar valores heredados (`Barbero`, `Tatuador`, `Asistente de Lavado`, `Recepcionista`, `Caja`,
`Barista`) sin romper.

## Fases

### ✅ Fase 0 — Preparación
- `git init` + commit inicial en `main` (`cb955ea`).
- Rama `feature/3-paneles`.
- Baseline: `npm run lint` = 616 problemas, `npm run build` ✓ 19 s.

### ✅ Fase 1 — Núcleo de detección (`src/utils/staffRoles.js`)
- Helpers nuevos: `isOdontologoRole`, `isAsistenteRole`.
- `isBookableStaff` ya **no** exige `isAdminStaff` (bug: devolvía `false` para todo el equipo →
  el portal público no mostraba a nadie).
- `isOperationalReceptionStaff` = administrador **u** odontólogo **u** asistente (antes: solo admin).
- `SERVICE_OR_OPS_KEYWORDS` += `odontolog` (si no, `isSupportStaff` metía a los odontólogos en
  "personal de apoyo" y su menú era solo *Mi Perfil*).
- `isBarberRole` += `odontolog` (lo usan el filtro "Odontólogos" del portal y recepción).
- `isServiceProf` en `Sidebar.jsx` y `MobileBottomNav.jsx` += `odontolog`.
- `ReceptionModule.getReceptionRoleGroup` += `odontolog` (aparece en el grupo de sillas).

### ⬜ Fase 2 — Navegación (3 sitios)
- `Sidebar.jsx:64-79` arrays `roles` y lógica 82-125 (ramas `Admin`, `Asistente de Lavado`, `isBarista`).
- `MobileBottomNav.jsx:43-60` y 62-105.
- `App.jsx`: menú 338-347, home por rol 215-235, bloqueo de `handleTabChange` 751-757
  (hoy contradice al Sidebar), notificaciones por rol 244-262.
- Retirar ítem `barista` de ambos menús.

### ⬜ Fase 3 — Altas y etiquetas
- `PersonnelModule.jsx:692-700` → 3 presets; `roleLabel` 703-707; iconos 1647-1650;
  agrupación de asistencia 3771-3784.
- `RoleManagerModal.jsx:24-37`, `ReportsModule.jsx:26-28`, `FinanceModule.jsx:69-73`,
  `StaffProfileModal.jsx:33-35`. NO renombrar la clave `panda_custom_roles`.

### ⬜ Fase 4 — Comparaciones exactas de rol (~40 sitios)
`BarberPanel:1193`, `DashboardModule:1265`, `SchedulingModule:3258,4295`,
`InventoryModule:240`, `HistoryModule:227,342,499`, `MobileDashboard:191`,
`CheckoutPOS:1247,1276,1297,1374`, `SaleServiceModal:46,69`,
`FinanceModule:364,1555-1582,2133-2139,2322,2462`, `ReportsModule:636`,
`PersonnelModule:1297,1365-1374,2316,2760-2766,3067,4365`, `UserProfilePage:313,547-550`.
Sustituir por helpers de `staffRoles.js`.

### ⬜ Fase 5 — Push
- `pushService.roleCategory` (20-29) → 3 categorías.
- Emisores: `dataService.js:1538-1563,1724`, `App.jsx:244-262`, `BarberPanel:519,550`,
  `CheckoutPOS:1532`, `BookAppointment:2430`.
- El edge function (`edge-functions/send-push/index.ts:47`) filtra `push_subscriptions.role`,
  así que emisor y `roleCategory` deben coincidir.

### ⬜ Fase 6 — Portal público
`BookAppointment:46,90-92,1868,4731`, `QuickBookingModal:86,326`, `publicService:109`,
`api/public/staff:17`, `BarberProfileOverlay:125`.

### ⬜ Fase 7 — Hub de paneles
`PanelsModule.jsx`: `ROLE_META` 14-20, filtros 72-95, dispatch 103-119 → 3 categorías
(`BaristaPanel`/`SupportProfilePage` fuera del dispatch; archivos se conservan).

### ⬜ Fase 8 — DB y backend
- `db/setup_dientes_sanos.sql:87` default `'Barbero'` → `'Odontologo'`.
- `is_admin()` usa `ilike '%admin%'` → casa con `Administrador` ✓.
- `server/auth/admin.js:3` acepta `administrador` ✓ (verificar).

## Criterio de aceptación
1. `npm run lint` ≤ 616 y `npm run build` ✓ tras cada fase.
2. Login de los 3 roles muestra exactamente sus módulos (desktop y móvil).
3. Portal público lista odontólogos en "Odontólogos" y permite reservar.
4. Recepción muestra los grupos Odontólogos y Asistentes.
5. Alta de personal solo ofrece los 3 presets.
