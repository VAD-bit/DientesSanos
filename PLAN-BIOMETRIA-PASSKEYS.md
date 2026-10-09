# Plan de implementación: acceso biométrico seguro con Passkeys

Estado: implementación local completada; pendiente migración, variables de producción y pruebas en dispositivos reales
Proyecto: odontosonrisa
Fecha del plan: 12 de agosto de 2026
Objetivo: permitir que personal y clientes entren con Face ID, huella, Windows Hello o PIN seguro del dispositivo, sin guardar contraseñas ni sesiones de Supabase dentro de una bóveda local.

## 1. Decisión técnica

La biometría se implementará con **WebAuthn/Passkeys** y verificación obligatoria en servidor.

No se debe recuperar ni copiar el experimento anterior de biometría. Ese enfoque validaba WebAuthn solamente en el navegador y guardaba un `refresh_token` de Supabase en `localStorage`. Un atacante con acceso al navegador podía reutilizar la sesión sin superar una comprobación criptográfica del servidor.

Flujo correcto:

1. El servidor genera un reto aleatorio, breve y de un solo uso.
2. El teléfono o computadora firma el reto con la passkey protegida por huella, rostro o PIN del equipo.
3. El servidor valida firma, reto, origen, RP ID, presencia/verificación del usuario y contador del autenticador.
4. Solo después de una validación exitosa el servidor autoriza una sesión normal de Supabase.
5. El navegador conserva la sesión utilizando el mecanismo normal de `supabase-js`; nunca se almacena una copia paralela del `refresh_token`.

La contraseña y Google continúan disponibles como recuperación. Una passkey no se registra desde una sesión anónima: primero se debe entrar por un método ya confiable.

## 2. Bloqueo de seguridad previo (P0)

Antes de publicar passkeys hay que corregir un riesgo ya presente en el proyecto:

- `src/lib/supabase.js` lee `VITE_SUPABASE_SERVICE_ROLE_KEY`.
- `src/services/dataService.js` y `src/public-site/services/publicService.js` usan ese cliente administrativo desde el frontend.
- Las variables prefijadas con `VITE_` se incorporan al JavaScript enviado al navegador.
- Una clave `service_role` omite RLS y jamás debe existir en una aplicación cliente.

Trabajo obligatorio:

1. Eliminar `VITE_SUPABASE_SERVICE_ROLE_KEY` de todo código de frontend.
2. Eliminar esa variable de Vercel y de los archivos locales; no reemplazarla por otra clave secreta con prefijo `VITE_`.
3. Rotar la clave administrativa de Supabase si alguna vez estuvo configurada en una compilación publicada.
4. Conservar en el navegador únicamente `VITE_SUPABASE_URL` y la clave pública/anon.
5. Mover operaciones administrativas (`auth.admin.*` y lecturas que actualmente dependen de saltarse RLS) a endpoints de servidor autenticados, o reemplazarlas por políticas/RPC con permisos mínimos.
6. Auditar las políticas RLS de las tablas que utiliza el CRM antes de retirar el cliente administrativo.

Esta fase debe desplegarse y probarse antes de activar el inicio de sesión biométrico.

## 3. Arquitectura propuesta

### Cliente

Dependencia:

```text
@simplewebauthn/browser
```

Archivos propuestos:

- `src/services/passkeyService.js`: llamadas a los endpoints y a `startRegistration` / `startAuthentication`.
- `src/components/PasskeyLoginButton.jsx`: botón “Entrar con huella o Face ID”, estados de carga y mensajes claros.
- `src/components/PasskeySettings.jsx`: registrar, nombrar, listar y revocar dispositivos desde Mi Perfil.
- `src/components/Login.jsx`: acceso biométrico del personal.
- `src/public-site/pages/Login.jsx`: acceso biométrico de clientes, en una segunda fase controlada.
- `src/context/AuthContext.jsx`: método `loginWithPasskey()` que consume el token de un solo uso y deja que Supabase persista la sesión normal.

No se debe bloquear el arranque rápido de los Odontologos esperando información global. El botón puede cargar sus capacidades y opciones bajo demanda.

### Servidor

La aplicación ya se publica en Vercel, por lo que se propone usar funciones Node en `api/passkeys/`. Esto permite ejecutar `@simplewebauthn/server` y mantener la clave secreta exclusivamente del lado servidor.

Dependencia:

```text
@simplewebauthn/server
```

Endpoints:

```text
POST /api/passkeys/register/options
POST /api/passkeys/register/verify
POST /api/passkeys/authenticate/options
POST /api/passkeys/authenticate/verify
GET  /api/passkeys/credentials
POST /api/passkeys/credentials/revoke
```

Los endpoints de registro, listado y revocación exigen `Authorization: Bearer <access_token>` y validan ese token con Supabase. El endpoint de autenticación es público pero limitado por reto, origen, caducidad y rate limit.

Variables exclusivas del servidor:

```text
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
PASSKEY_RP_NAME=Panda Barber
PASSKEY_RP_ID=odontosonrisa-crm.vercel.app
PASSKEY_ORIGIN=https://odontosonrisa-crm.vercel.app
PASSKEY_RATE_LIMIT_SECRET=<secreto aleatorio>
CBOR_NATIVE_ACCELERATION_DISABLED=true
```

`PASSKEY_RP_ID` y `PASSKEY_ORIGIN` deben definirse con el dominio canónico definitivo antes de registrar credenciales. Las passkeys están ligadas al dominio. Para desarrollo se permite `RP_ID=localhost` y `ORIGIN=http://localhost:5174`; una passkey de localhost no funciona en producción y viceversa.

### Creación de la sesión Supabase

Después de verificar la firma WebAuthn, el servidor debe:

1. Resolver la cuenta `auth.users` asociada a la credencial.
2. Confirmar que el empleado siga activo en `staff` para audiencia `crm`, o que el cliente siga válido para audiencia `public`.
3. Generar del lado servidor un enlace de tipo `magiclink` con `supabase.auth.admin.generateLink()` sin enviar correo.
4. Entregar al navegador únicamente el `hashed_token` de un solo uso, nunca la clave administrativa ni un refresh token almacenado por la aplicación.
5. El navegador intercambia ese hash con `supabase.auth.verifyOtp({ token_hash, type: 'magiclink' })` y recibe una sesión estándar.

Antes de implementar este intercambio se debe agregar una prueba de integración contra el proyecto de Supabase de staging, porque el nombre exacto del campo devuelto por `generateLink` puede cambiar entre versiones.

## 4. Modelo de datos

Crear una migración versionada, por ejemplo:

```text
supabase/migrations/20260812_passkeys.sql
```

Nota: `.gitignore` ignora actualmente `supabase/`. Las migraciones antiguas ya están rastreadas, pero una migración nueva puede quedar fuera del commit. Hay que ajustar la regla para permitir `supabase/migrations/*.sql` o añadir esta migración de forma explícita y comprobarla con `git ls-files`.

Tablas:

### `passkey_credentials`

Campos mínimos:

- `id uuid primary key`
- `auth_user_id uuid not null`
- `audience text check (audience in ('crm','public'))`
- `credential_id text unique not null` (base64url)
- `public_key text not null` (base64url de la clave COSE)
- `counter bigint not null default 0`
- `transports text[]`
- `device_type text`
- `backed_up boolean`
- `friendly_name text`
- `created_at timestamptz`
- `last_used_at timestamptz`
- `revoked_at timestamptz`

### `passkey_challenges`

- `id uuid primary key`
- `challenge text unique not null`
- `ceremony text check (ceremony in ('registration','authentication'))`
- `auth_user_id uuid null`
- `audience text check (audience in ('crm','public'))`
- `expires_at timestamptz not null`
- `used_at timestamptz null`
- `attempts smallint default 0`
- `created_at timestamptz`

Reglas:

- Caducidad máxima recomendada: 5 minutos.
- El consumo se hace de forma atómica: un reto utilizado o vencido nunca se acepta otra vez.
- Limpieza periódica de retos vencidos.
- El cliente no tiene acceso directo a ninguna de las dos tablas.
- RLS activa con denegación por defecto; las operaciones pasan por el servidor.

Opcional recomendado: `passkey_audit_events` para registro, acceso exitoso/fallido, revocación, usuario, hora y huella HMAC de IP; no guardar IP cruda indefinidamente.

## 5. Contratos de los endpoints

### Registro

`POST /register/options`

- Requiere sesión Supabase válida.
- Comprueba miembro/cliente activo.
- Genera opciones con `attestationType: 'none'`, `residentKey: 'required'`, `userVerification: 'required'` y credenciales existentes en `excludeCredentials`.
- Guarda el reto antes de responder.

`POST /register/verify`

- Requiere la misma sesión y audiencia.
- Recupera el reto no vencido.
- Verifica `expectedChallenge`, `expectedOrigin`, `expectedRPID` y `requireUserVerification: true`.
- Guarda credencial, clave pública, contador, transports y estado de respaldo.
- Marca el reto como usado en la misma operación lógica.

### Autenticación

`POST /authenticate/options`

- Genera un reto de autenticación y opciones para credenciales descubribles (`allowCredentials` vacío).
- No revela si un correo o empleado existe.
- Aplica rate limit por IP HMAC y audiencia.

`POST /authenticate/verify`

- Busca la credencial por `credential_id` recibido.
- Comprueba que no esté revocada y que pertenezca a la audiencia pedida.
- Verifica reto, origen, RP ID, firma, user verification y contador.
- Actualiza contador y `last_used_at`.
- Revalida que el perfil siga activo.
- Emite el token hash de un solo uso para crear la sesión Supabase.
- Invalida el reto incluso ante ciertos fallos para impedir reintentos de replay.

### Gestión

`GET /credentials`

- Devuelve solamente nombre amigable, fecha de registro, último uso y tipo de dispositivo del usuario actual.
- Nunca devuelve la clave pública completa ni datos de otro usuario.

`POST /credentials/revoke`

- Requiere sesión y reautenticación reciente (contraseña, Google o una passkey activa).
- No permite que una sesión comprometida quite silenciosamente todos los métodos de recuperación.

## 6. Integración de interfaz

### Personal

En `src/components/Login.jsx`:

- Mostrar “Entrar con huella o Face ID” solo si `browserSupportsWebAuthn()` es verdadero.
- Mantener correo y contraseña debajo como alternativa.
- Bloquear el botón mientras la ceremonia está activa para evitar dobles solicitudes.
- Mensajes diferenciados: cancelado por el usuario, dispositivo no compatible, credencial no registrada, empleado archivado y error de red.

En Mi Perfil > Seguridad:

- Botón “Activar acceso biométrico en este dispositivo”.
- Lista “Mis dispositivos”: nombre, fecha, último uso, botón revocar.
- Advertencia de que la biometría permanece en el dispositivo/proveedor de passkeys; odontosonrisa guarda solamente clave pública y metadatos mínimos.

Primera liberación recomendada: personal interno únicamente. Después de una semana sin fallos, habilitar clientes públicos.

### Clientes

En una segunda fase:

- Añadir acceso con passkey a `src/public-site/pages/Login.jsx` y al diálogo de acceso en `BookAppointment.jsx`.
- Registrar la passkey solo después de contraseña o Google.
- Mantener recuperación por correo.
- Separar estrictamente la audiencia `public` de `crm` aunque ambas usen Supabase Auth.

## 7. Controles de seguridad obligatorios

- HTTPS obligatorio en producción; `localhost` es la única excepción de desarrollo.
- Comparación exacta de `Origin` y `PASSKEY_ORIGIN`; no usar CORS `*`.
- Retos aleatorios generados en servidor, almacenados temporalmente, de un solo uso y con suficiente entropía.
- `userVerification: 'required'` para que no baste la mera presencia del dispositivo.
- No guardar contraseñas, claves privadas, tokens de refresco ni resultados biométricos.
- Límite de tamaño del body y validación estricta de JSON.
- Rate limit para generación y verificación.
- Respuestas públicas que no permitan enumerar usuarios.
- Revocación inmediata al archivar/desactivar un empleado o eliminar la cuenta.
- Actualización atómica del contador para detectar credenciales clonadas o respuestas repetidas.
- Logs sin tokens, retos completos, claves o datos biométricos.
- Política de seguridad de contenido y cabeceras existentes revisadas para no romper WebAuthn.
- Botones con protección contra doble clic y estados visibles de espera.

## 8. Orden de implementación

### Fase 0 — retirar la clave administrativa del navegador

1. Inventariar cada uso de `authClient`.
2. Crear endpoints/RPC/RLS de reemplazo.
3. Cambiar `dataService` y `publicService` para usar el cliente público y sesión del usuario.
4. Rotar la clave y actualizar Vercel solo con `SUPABASE_SERVICE_ROLE_KEY` del lado servidor.
5. Build, pruebas de permisos por rol y prueba manual de todos los módulos principales.

### Fase 1 — backend passkeys

1. Instalar `@simplewebauthn/server` y `@simplewebauthn/browser` en versiones compatibles.
2. Crear migración y aplicar primero en staging.
3. Crear utilidades de servidor para Supabase, origen, respuestas y rate limit.
4. Implementar registro, verificación, login, listado y revocación.
5. Añadir pruebas automatizadas para retos vencidos/usados, origen incorrecto, contador y usuario inactivo.

### Fase 2 — personal interno

1. Añadir botón en login.
2. Añadir gestión en Mi Perfil.
3. Integrar sesión retornada con `AuthContext` sin duplicar listeners ni provocar doble carga.
4. Activar inicialmente para administrador y dos Odontologos piloto.

### Fase 3 — clientes

1. Reutilizar servicio con audiencia `public`.
2. Integrar login y reserva.
3. Probar Google/contraseña/recuperación y passkey en conjunto.

### Fase 4 — producción

1. Definir dominio canónico.
2. Configurar variables de servidor en Vercel.
3. Aplicar migración con respaldo previo.
4. Publicar con feature flag `VITE_PASSKEYS_ENABLED=false` inicialmente.
5. Habilitar personal piloto, monitorear y ampliar gradualmente.

## 9. Matriz mínima de pruebas

Dispositivos reales:

- Windows 11 + Chrome + Windows Hello.
- Windows 11 + Edge + Windows Hello.
- Android + Chrome + huella/PIN.
- iPhone + Safari + Face ID/código.
- Un dispositivo sin WebAuthn o con biometría cancelada.

Casos:

- Registro exitoso y segundo intento del mismo autenticador.
- Login, recarga, cierre de sesión y nuevo login.
- Cancelación por el usuario sin bloquear la pantalla.
- Reto vencido, repetido y de otro navegador.
- Origin/RP ID incorrecto rechazado.
- Empleado archivado después de registrar passkey.
- Revocación de un dispositivo y uso de otro.
- Pérdida del dispositivo con recuperación por contraseña/Google.
- Dos clics rápidos no crean retos/sesiones duplicados.
- Arranque del panel de barbero no se vuelve más lento cuando passkeys está desactivado o no se usa.
- Roles: barbero, asistente, barista, admin y cliente no obtienen permisos adicionales por entrar con passkey.

Pruebas de regresión:

```text
npm run build
npm run lint (separar deuda histórica de errores nuevos)
```

Además, pruebas enfocadas de endpoints y validación manual en navegador. Un build exitoso no prueba por sí solo la biometría.

## 10. Despliegue, rollback y observabilidad

Despliegue:

- Feature flag apagado por defecto.
- Backend y tablas pueden publicarse antes que el botón.
- Activación gradual por personal piloto.

Rollback:

- Apagar `VITE_PASSKEYS_ENABLED` elimina el acceso visible sin borrar credenciales.
- Mantener contraseña/Google durante todo el despliegue.
- No revertir la rotación de la clave administrativa.
- No borrar tablas durante rollback; conservarlas revocadas hasta investigar.

Métricas sin datos sensibles:

- Registros exitosos/fallidos por plataforma.
- Login exitoso, cancelado, expirado y rechazado.
- Latencia p50/p95 de options y verify.
- Tasa de fallback a contraseña.
- Número de credenciales revocadas.

## 11. Criterios de terminado

La función se considera terminada solamente cuando:

- No existe `VITE_SUPABASE_SERVICE_ROLE_KEY` en el bundle ni en Vercel.
- La clave administrativa fue rotada si estuvo expuesta.
- Todas las firmas se verifican en servidor con reto temporal de un solo uso.
- No se guarda refresh token en una bóveda propia/localStorage.
- Registro, login, revocación y recuperación funcionan en dispositivos reales.
- Un empleado desactivado no puede entrar con una passkey antigua.
- Los roles y RLS siguen limitando exactamente los mismos datos.
- La entrada rápida de los Odontologos no empeora.
- Migración, endpoints, variables y rollback están documentados.
- Build y pruebas enfocadas pasan; la prueba manual móvil y escritorio queda registrada.

## 12. Handoff para otra IA

Antes de modificar:

```powershell
Set-Location C:\Users\Waiha\odontosonrisa
git status --short
git log -5 --oneline
rg -n "VITE_SUPABASE_SERVICE_ROLE_KEY|authClient|auth.admin" src
git ls-files supabase
```

Reglas del handoff:

1. No recuperar ni hacer cherry-pick del experimento biométrico inseguro anterior.
2. No tocar datos de producción sin respaldo, SQL exacto revisado y autorización del usuario.
3. No imprimir secretos en terminal, diff, logs o respuestas.
4. Preservar `backups/` local y cualquier cambio ajeno.
5. Implementar P0 antes de WebAuthn.
6. Trabajar en commits pequeños: seguridad frontend, migración/backend, UI personal, UI clientes.
7. No hacer push hasta que el usuario lo solicite.
8. Validar el dominio canónico antes de registrar passkeys reales.

Referencias oficiales consultadas para este plan:

- WebAuthn Level 3 (W3C): retos del servidor, validación de origen y RP ID.
- SimpleWebAuthn: flujos `generate/verify` en servidor y `startRegistration/startAuthentication` en navegador.
- Supabase Auth: `admin.generateLink`, `verifyOtp` y prohibición de exponer `service_role` en el navegador.
