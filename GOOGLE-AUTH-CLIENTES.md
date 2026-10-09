# Google Auth para clientes — estado: FUNCIONANDO (con un bug de datos encontrado)

Verificado el 2026-08-05. Bug real encontrado y parcheado a mano el 2026-08-06 — **hace falta un
arreglo estructural**, ver sección al final.

Google auth es para los **clientes** del sitio público de reservas. El staff sigue entrando con
email y contraseña (sus correos son `@odontosonrisa.com`, dominio que no existe — nunca podrían usar
Google).

---

## Todo está implementado

El flujo completo ya existía en el código. Lo único que faltaba era **habilitar Google en el VPS**,
hecho el 2026-08-05.

### Servidor (VPS)

| | Estado |
|---|---|
| `GOOGLE_ENABLED`, `CLIENT_ID`, `SECRET` en `.env` | ✅ |
| Las 4 líneas `GOTRUE_EXTERNAL_GOOGLE_*` en `docker-compose.yml` | ✅ descomentadas |
| `API_EXTERNAL_URL` = `https://supabase.somosdostudio.com` | ✅ (antes era HTTP por IP) |
| `SITE_URL` = `https://odontosonrisa-crm.vercel.app` | ✅ (antes era localhost:3000) |
| `ADDITIONAL_REDIRECT_URLS` | ✅ producción + localhost 5173/5174 |
| `/auth/v1/settings` anuncia `google` | ✅ |
| `/auth/v1/authorize?provider=google` → 302 a Google | ✅ con client_id y callback correctos |

Detalle: las variables de Google venían **comentadas** en `docker-compose.yml`. Ponerlas solo en el
`.env` no hacía nada — hay que tocar los dos archivos y recrear el contenedor con
`docker compose up -d auth`. Ver `RUNBOOK-VPS.md` sección 4-ter.

### Código (ya existía)

```
Login.jsx / Register.jsx / BookAppointment.jsx
   └─ botón "Continuar con Google" → publicService.signInWithGoogle()

PublicLayout.jsx  (onAuthStateChange: SIGNED_IN / INITIAL_SESSION)
   └─ getClientByUserId(session.user.id)
        ├─ hay ficha  → guarda en localStorage → /perfil  (o /agendar si venía de reservar)
        └─ NO hay     → navigate('/completar-registro')

CompleteRegistration.jsx
   └─ nombre y email prellenados desde Google
      pide TELÉFONO y CÉDULA (ambos obligatorios)
        └─ publicService.completeGoogleRegistration()
             └─ findExistingClientRecord(id_card, email, phone)
                  ├─ encontró → linkClientRecord()  → enlaza, conserva puntos e historial ✅
                  └─ no       → insert nueva ficha con auth_user_id
```

La ruta `/completar-registro` está registrada en `PublicRouter.jsx:34`.

`findExistingClientRecord` usa la RPC `odontosonrisa.find_existing_client(id_card, email, phone)`
—`SECURITY DEFINER`, normaliza cédula y teléfono en SQL y desempata— creada en el arreglo del
Problema 2 de `SEGURIDAD-PENDIENTE.md`.

### La protección contra robo de ficha ya está

`linkClientRecord` en `publicService.js`:

```javascript
if (existing.auth_user_id && String(existing.auth_user_id) !== String(userId)) {
  throw new Error('Esta cédula ya está vinculada a otra cuenta. Contacta a la barbería.');
}
```

Nunca reasigna una ficha ya enlazada. Esto importa **por corrección**, no solo por seguridad: sin
esa guarda, enlazar una ficha ajena le rompería la cuenta al otro cliente.

> Decisión del owner (2026-08-05): no se agregan verificaciones extra (SMS, doble confirmación).
> El riesgo de que un cliente adivine cédulas ajenas se considera despreciable en este negocio.
> La guarda de arriba se mantiene por corrección.

---

## Por qué esto importaba

| | |
|---|---|
| Clientes totales | 87 |
| Con cuenta (`auth_user_id`) | 6 |
| **Con email registrado** | **8** |
| Sin email | **79** |

Google solo entrega el correo, pero 79 de 87 clientes están identificados por cédula y teléfono
—los cargó el staff desde el admin—. Sin la pantalla de completar registro, esas personas
recibirían una ficha nueva y **perderían puntos e historial**. Por eso el flujo pide la cédula.

---

## Qué falta comprobar

Lo verificado hasta ahora es del lado del servidor y por lectura del código. **Falta la prueba real
con una cuenta de Google**, que solo puede hacer una persona:

1. **Registrar el URI en Google Cloud.** En las credenciales OAuth debe estar exactamente:
   ```
   https://supabase.somosdostudio.com/auth/v1/callback
   ```
   Si falta, Google muestra `redirect_uri_mismatch`. No se puede verificar desde fuera.

2. **Desplegar a Vercel** si el arreglo del Problema 2 (la RPC) aún no está en producción.

3. **Probar:**

   | Prueba | Resultado esperado |
   |---|---|
   | Cliente nuevo con Google + cédula que no existe | Crea ficha, entra, puede reservar |
   | Cliente existente (de los 87 sin `auth_user_id`) + su cédula | Se enlaza a ESA ficha, conserva puntos. **Deben seguir siendo 87 fichas, no 88** |
   | Cédula ya enlazada a otra cuenta | Mensaje "ya está vinculada a otra cuenta" |
   | Cerrar sesión y volver a entrar | Entra directo, sin pedir cédula otra vez |

   Contar las filas de `odontosonrisa.clients` antes y después de cada prueba.

---

## 🔴 Bug real encontrado (2026-08-06) — referencias `auth_user_id` huérfanas

Probando el flujo con una cuenta real (`waikoloahb@gmail.com`, cédula `30102609`), el enlace
falló con *"Esta cédula ya está vinculada a otra cuenta"* — pero la cuenta a la que apuntaba
**ya no existía** en `auth.users` (usuario borrado en alguna prueba anterior).

Causa raíz: `odontosonrisa.clients.auth_user_id` **no tiene foreign key** hacia `auth.users`. Nada
impide que quede una referencia a un usuario borrado, y `linkClientRecord()` no distingue entre
"pertenece a otra persona" y "pertenece a un fantasma" — trata ambos casos igual y rechaza.

Se destrabó el caso puntual con:
```sql
UPDATE odontosonrisa.clients SET auth_user_id = NULL WHERE id = '...' AND auth_user_id = '<uuid_muerto>';
```
Pero eso fue un parche manual de un caso, no una corrección del sistema.

De paso apareció otra cosa: **existen dos fichas de cliente con la misma cédula** (`30102609`),
de pruebas anteriores — una con 21 citas asociadas, otra con 5, ambas con 0 puntos. El
`find_existing_client` desempata por citas cuando ninguna está enlazada, así que en este caso no
generó daño. Pero si algún día pasa con un cliente real que sí tiene puntos repartidos entre las
dos fichas, el enlace se queda con una y la otra queda huérfana con puntos inaccesibles.

### Qué falta arreglar

1. **Agregar la foreign key**, para que esto deje de poder pasar:
   ```sql
   ALTER TABLE odontosonrisa.clients
     ADD CONSTRAINT clients_auth_user_id_fkey
     FOREIGN KEY (auth_user_id) REFERENCES auth.users(id) ON DELETE SET NULL;
   ```
   Revisar antes que no haya más referencias huérfanas que bloqueen el `ALTER` (la de este caso ya
   se limpió). Si las hay, limpiarlas primero con la misma consulta usada arriba, adaptada.

2. **Detectar cédulas duplicadas** — una consulta de auditoría, y decidir si conviene fusionar
   fichas repetidas (`find_related_clients` ya sirve para encontrar el grupo) antes de que el
   negocio tenga más volumen de clientes reales.

3. Opcional: que `linkClientRecord()` distinga el mensaje de error entre "vinculada a otra persona
   real" y "referencia inválida, contactar soporte" — hoy ambos casos muestran el mismo texto y
   confunden al usuario.

---

## Nota sobre el dominio

Si algún día se le pone dominio propio al sitio, hay que agregarlo a `ADDITIONAL_REDIRECT_URLS` en
el `.env` del VPS y recrear el contenedor (`docker compose up -d auth`). Si no, el retorno de Google
falla y parece que se rompió sin motivo.
