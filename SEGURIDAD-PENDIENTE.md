# Seguridad — dos problemas pendientes en odontosonrisa

Hallazgos verificados el 2026-08-05. **Ninguno rompe la app** — funciona correctamente hoy.
Son riesgos de seguridad, no fallas.

Este documento existe para que se pueda retomar el trabajo sin volver a investigar.

---

## Contexto: qué ya está arreglado (no tocar)

El 2026-08-05 se resolvió un problema **distinto**: Panda y Jana no dejaban iniciar sesión.
La causa estaba en el VPS, no en el código:

1. PostgREST no exponía los schemas `odontosonrisa` / `janastudio` (`PGRST_DB_SCHEMAS`)
2. Los roles `anon` / `authenticated` / `service_role` no tenían GRANTs sobre esos schemas

Ambos corregidos y verificados con login real → HTTP 200. Ver `C:\Users\Waiha\supabase\RUNBOOK-VPS.md`.

**No se perdió ningún dato.** El código de odontosonrisa no se modificó para arreglar eso.

---

## Problema 2 (FÁCIL) — el sitio público expone la tabla de clientes  ✅ RESUELTO 2026-08-05

> Se numera "2" porque es el segundo en gravedad conceptual, pero es el que conviene atacar
> primero: es acotado, de bajo riesgo, y la fuga está activa hoy.

### ✅ Resolución (2026-08-05)

Se aplicó la **Opción B**. La normalización (quitar no-dígitos) y el desempate ahora viven
en SQL, del lado del servidor. El navegador ya no recibe la tabla de clientes.

- **Base de datos** (VPS, schema `odontosonrisa`, aplicado como `supabase_admin`): dos funciones
  `SECURITY DEFINER` con `set search_path = odontosonrisa, public`, `grant execute` a
  `anon, authenticated, service_role`:
  - `odontosonrisa.find_existing_client(p_id_card, p_email, p_phone)` → devuelve 0 o 1 fila.
    Replica el desempate exacto: `auth_user_id is not null` desc → nº de citas desc → `created_at` asc.
  - `odontosonrisa.find_related_clients(p_client_id)` → devuelve los registros con la misma cédula
    normalizada (para sumar puntos/citas).
- **Frontend** (`src/public-site/services/publicService.js`): `findExistingClientRecord` y
  `findRelatedClientRecords` ahora hacen `authClient.rpc(...)`. Se eliminaron los helpers
  `normalizeIdCard`/`normalizePhone` (su lógica está en SQL).

**Verificado:** los datos tenían 1 cédula con `V-` y 2 teléfonos con `+`, justo los casos que un
`.eq()` ingenuo habría duplicado — por eso se descartó la Opción A. Pruebas SQL y en navegador
(pestaña Red): `find_existing_client` devuelve 0/1 fila, `find_related_clients` devuelve solo el
grupo de la persona (2), nunca 86. Reconoce al cliente existente sin duplicar. Sin datos escritos
en la verificación (86 filas antes y después).

**Nota aparte (no bloqueante):** el `.env` **local** tiene una `anon key` desincronizada — las
peticiones con `publicSupabase` dan 401 en desarrollo (la `service_role` sí es válida). No afecta
producción ni este fix, pero conviene refrescar la anon key local. Relacionado con el "Detalle
suelto" de más abajo (`.env` vs `.env.vercel`).

---

<details><summary>Diagnóstico original (histórico)</summary>

### Qué pasa

`src/public-site/services/publicService.js`, función `findExistingClientRecord` (línea 11):

```javascript
const { data: clients, error } = await authClient
  .from('clients')
  .select('*, appointments(id)');     // ← SIN filtro
```

No hay `.eq()` ni `.filter()`. Trae **la tabla `clients` completa** (86 filas, todas las columnas:
nombre, teléfono, `id_card`, email, puntos) al navegador, y recién ahí filtra en JavaScript
comparando cédula / email / teléfono normalizados.

Se invoca desde las líneas **182** y **281**, ambas dentro del objeto exportado `publicService`,
que usa la página pública de reservas.

**Consecuencia:** cualquier visitante anónimo que inicie una reserva recibe en su navegador los
datos personales de los 86 clientes. Visible en la pestaña Red de las DevTools. No requiere
extraer ninguna llave ni conocimiento técnico especial.

Hay un caso análogo en la línea **56**, `findRelatedClientRecords`:

```javascript
.from('clients')
.select('id, id_card, points, auth_user_id');   // ← también sin filtro
```

Menos columnas, pero igual trae la tabla entera.

### Cómo se arregla

Mover el filtrado al servidor. Dos caminos:

- **Opción A (más simple):** aplicar los filtros en la propia consulta con `.or()` sobre
  `id_card` / `email` / `phone` ya normalizados, para que Postgres devuelva 0-N filas en vez de todas.
- **Opción B (más robusta):** un RPC `SECURITY DEFINER` en el schema `odontosonrisa` que reciba los
  tres datos, haga la normalización y el desempate en SQL, y devuelva solo el cliente elegido.
  Replica exactamente la lógica de desempate actual (prioriza `auth_user_id` no nulo, luego
  cantidad de citas) y no expone nada más.

**Ojo:** la lógica actual normaliza antes de comparar — `normalizeIdCard` quita todo lo que no sea
dígito, `normalizePhone` igual. Un filtro ingenuo con `.eq('id_card', valor)` **no** replica ese
comportamiento y provocaría clientes duplicados. Hay que preservar la normalización.

### Cómo verificar que quedó bien

1. Abrir la página pública de reservas con DevTools → Red
2. Iniciar una reserva con una cédula existente y con una nueva
3. La respuesta de `clients` debe traer **0 o 1 filas**, nunca 86
4. Confirmar que sigue reconociendo al cliente existente y no crea duplicados

</details>

---

## Problema 1 (DIFÍCIL) — la service_role key viaja en el navegador

### Qué pasa

`.env` define `VITE_SUPABASE_SERVICE_ROLE_KEY`. Las variables `VITE_*` **se compilan literalmente
dentro del JavaScript** que se sirve al navegador.

Verificado: se decodificaron los JWT presentes en `dist/assets/*.js` y hay dos, con
`"role":"anon"` y `"role":"service_role"`. Los archivos son `dataService-*.js` y `public-*.js`.

La `service_role` **ignora RLS por completo**. Como los seis proyectos comparten el mismo motor
PostgreSQL en el VPS, esa llave da acceso total a `astrobarber`, `odontosonrisa`, `janastudio`,
`lavuelta`, `flexpro` y `fullchinavzla` — más `auth.users`. Es la llave más privilegiada de la
instancia, publicada en una web.

### Por qué no es un cambio de una línea

`src/services/dataService.js` línea 2:

```javascript
const supabase = authClient || anonClient;
```

Toda la capa de datos del CRM corre como `service_role`, no solo el login. Alcance medido:

| Archivo | Call sites `.from(` / `.rpc(` |
|---|---|
| `src/services/dataService.js` | **144** |
| `src/public-site/services/publicService.js` | **23** |

Además hay **5 llamadas `auth.admin.*`** que *no pueden* funcionar desde el navegador sin la
service_role — requieren sí o sí código de servidor:

| Línea | Llamada |
|---|---|
| 271 | `listUsers` |
| 287 | `createUser` |
| 316 | `updateUserById` |
| 334 | `deleteUser` |
| 466 | `deleteUser` |

Quitar `authClient` implica que las 144 consultas pasen a ejecutarse bajo RLS. El schema
`odontosonrisa` tiene **17 políticas** y **9 de sus 20 tablas tienen RLS activado** (11 no).
Es decir: las políticas actuales **no cubren todo**, porque hasta ahora no hacían falta.

### Orden sugerido

1. **Edge Function para `auth.admin`** — mover las 5 llamadas a una función de servidor.
   Probar el módulo de Personal (alta, edición y baja de empleados).
2. **Auditar RLS** — tabla por tabla, definir qué debe poder ver/hacer cada rol
   (`Admin`, `Barbero`, recepción). Completar las políticas que falten y activar RLS donde esté apagado.
3. **Cambiar la línea 2** a `anonClient` y probar los 11 módulos del CRM uno por uno.
4. **Rotar la llave.** Cambiar `JWT_SECRET` en el VPS invalida **todas** las llaves de la instancia
   → hay que actualizar las 6 apps y reiniciar los servicios de forma coordinada. Hacerlo fuera de
   horario de atención.

No intentar los pasos 2 y 3 sin poder probar la app en funcionamiento — es un CRM en producción
que usan 17 personas.

---

## Detalle suelto que conviene revisar

`.env` y `.env.vercel` apuntan a **instancias de Supabase distintas**:

| Archivo | `ref` dentro del JWT |
|---|---|
| `.env` | `xhkeaguamyziampjvwce` |
| `.env.vercel` | `uehwuiarxmbyijnbtlmu` |

Probablemente `.env.vercel` quedó de un proyecto anterior en Supabase Cloud. Verificar cuál usa
realmente el despliegue de Vercel antes de tocar variables de entorno, y borrar el que no sirva
para que no confunda.

---

## Estado de RLS en `odontosonrisa` (referencia)

| | Cantidad |
|---|---|
| Tablas | 20 |
| Tablas con RLS activado | 9 |
| Tablas con RLS apagado | 11 |
| Políticas definidas | 17 |
