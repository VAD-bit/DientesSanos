# AGENTS.md — Dientes Sanos (CrmPandaBarberStudio)

Guía de agentes de OpenCode para este proyecto. Misma configuración que el proyecto
"SEGURO LOS ANDES". Todos los agentes listados son **gratuitos e incorporados** en OpenCode
(sin plugins ni licencias); solo consumen el modelo que tengas configurado.

## Stack del proyecto

- **Vite + React 19 + JavaScript (JSX) + Tailwind CSS v4** (CSS-first, sin tailwind.config)
- **React Router v7** (CRM en `admin.html`) + **HashRouter** (portal público en `index.html`)
- Datos: **Supabase** (esquema `odontosonrisa`, fachada `src/services/dataService.js`)
- Extras: framer-motion, chart.js, dexie (pagos offline), lucide-react
- Calidad: **ESLint** (`npm run lint`, baseline ~620 preexistente) + **build** (`npm run build`)
- Dos apps en un repo: **portal público + área cliente** (`src/public-site/`, entry `src/main-public.jsx`)
  y **CRM admin** (`src/components/`, entry `src/main.jsx`)

## Agentes incorporados

### Agentes primarios (alternar con Tab)

| Agente | Modo | Qué hace | Uso en este proyecto |
|---|---|---|---|
| **build** | primary | Agente por defecto, todas las herramientas habilitadas | Implementar fases, crear archivos, ejecutar comandos |
| **plan** | primary | Análisis sin cambios (edit/bash en "ask") | Definir fases, diseñar módulos, revisar resultados |

### Subagentes (invocar con @ o vía task)

| Agente | Modo | Qué hace | Uso en este proyecto |
|---|---|---|---|
| **explore** | subagent · solo lectura | Rápido: encuentra archivos, patrones y respuestas del código | Mapear código existente, localizar componentes |
| **general** | subagent · herramientas completas | Ejecuta varias unidades de trabajo en paralelo | Implementar módulos/páginas independientes en paralelo (p. ej. copy de varias páginas a la vez) |

### Agentes de sistema (ocultos, automáticos)

- **compaction** — compacta contextos largos
- **title** — genera títulos de sesión
- **summary** — genera resúmenes de sesión

## Flujo estándar por fase

1. `plan` → analiza la fase y propone pasos (sin tocar código).
2. `@explore` → mapea el código existente.
3. `build` → implementa con permisos completos.
4. `@general` → corre subtareas independientes en paralelo.
5. `plan` → revisa el resultado antes de pasar a la siguiente fase.

## Reglas

- No saltarse la revisión con `plan` entre fases.
- Un módulo = verificación antes de cerrar fase: `npm run build` + `npm run lint` (comparar contra baseline).
- `explore` es solo lectura: nunca pedirle editar archivos.
- **Identidad:** marca visible = "Centro Odontológico **Dientes Sanos**" (paleta blanco/negro/gris +
  acento arena `#E8D4B0`). No reintroducir colores teal/púrpura ni strings "Panda" visibles.
- **No renombrar** claves `panda_*` de localStorage, eventos de ventana (`panda_hide_chrome`,
  `panda_navigate`, `panda_new_notification`), nombres de canal Supabase ni clases CSS
  (rompen datos persistidos y son internos). Solo cambia strings visibles al usuario.
- En botones con fondo arena `#E8D4B0`/`#D9C08F`, el texto debe ser oscuro (`#111111`) — contraste WCAG.

## Agentes personalizados (opcionales, añadir luego en `.opencode/agents/`)

Se crean con `opencode agent create` o como archivos `.md`:

- `code-reviewer.md` — revisión de calidad (`edit: deny`)
- `security-auditor.md` — seguridad: auth, roles, passkeys (`edit: deny`)
- `docs-writer.md` — documentación (`bash: deny`)
