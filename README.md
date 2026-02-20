# Projecte de plaques solars (Angular + Supabase)

Aplicacion web para gestion de plantas solares con autenticacion, permisos por rol, storage de imagenes y datos en tiempo real.

## 1. Resumen del proyecto

El sistema permite:

- Alta y gestion de plantas solares con nombre, descripcion, ubicacion y foto.
- Consulta de registros de consumo/generacion por planta en tiempo real.
- Gestion diferenciada por roles (`client` y `admin`).
- Mapa con plantas (vista cliente o vista global admin).

Backend y servicios se apoyan en Supabase:

- Auth
- PostgreSQL
- Storage
- Realtime (websockets)
- RLS
- `pg_cron` para insercion periodica de registros

## 2. Cumplimiento del enunciado

Estado general: completado.

| Requisito del enunciado | Estado | Implementacion |
| --- | --- | --- |
| Base de datos Supabase | OK | Supabase como backend principal |
| SDK Supabase (auth/datos/imagenes/websockets) | OK | `@supabase/supabase-js` |
| RLS para permisos de clientes | OK | RLS activo en `profiles`, `plants`, `records`, `favorites` |
| Plantas con ubicacion + foto | OK | Geolocalizacion navegador + Storage bucket `plant-photos` |
| Emision periodica de registros | OK | Funcion `emit_solar_records()` + job `pg_cron` cada minuto |
| Usuario administrador con CRUD total | OK | Panel `/admin` |
| Cliente ve sus plantas y sus registros | OK | Vista `/plants` filtrada por propietario + detalle |
| Detalle planta con foto, datos y grafica realtime | OK | `plant-detail.page.ts` + Chart.js + Realtime |
| Buscador reactivo de plantas | OK | Filtro por termino + favoritos en `plants.page.ts` |
| Formularios reactivos (registro/login/perfil) | OK | Reactive Forms en pages de auth/perfil |
| Signal Form para alta/edicion de plantas | OK | `plant-form.component.ts` |
| Validacion en formularios + personalizada | OK | Validators + `noSpaces` |
| Servicios con Observables/Subjects + pipe | OK | Servicios principales con `BehaviorSubject`, `Observable`, `pipe` |
| Componentes con `input()` y `output()` | OK | Componentes hijos desacoplados por Inputs/Outputs |
| Mapa opcional | OK | `map.page.ts` con Leaflet |
| Estado global con Redux pattern | OK | `core/store` (actions, reducer, state, store service) |
| Angular Material | OK | Componentes Material en varias vistas |

## 3. Stack tecnologico

- Angular 21 (standalone components)
- TypeScript
- Signals + Reactive Forms + RxJS
- Angular Material + Bootstrap
- Supabase (`@supabase/supabase-js`)
- Chart.js
- Leaflet

## 4. Arquitectura (frontend)

```text
src/app/
  components/
    plant-form.component.ts
    plant-card.component.ts
    records-chart.component.ts
    records-list.component.ts
  core/
    auth.service.ts
    plants.service.ts
    records.service.ts
    profiles.service.ts
    favorites.service.ts
    geolocation.service.ts
    guards/
      auth.guard.ts
      admin.guard.ts
    store/
      app.actions.ts
      app.reducer.ts
      app-state.ts
      app-store.service.ts
  pages/
    login.page.ts
    register.page.ts
    profile.page.ts
    plants.page.ts
    plant-detail.page.ts
    map.page.ts
    admin.page.ts
```

## 5. Rutas y control de acceso

Rutas principales (`src/app/app.routes.ts`):

- `/login`, `/register` (publicas)
- `/profile`, `/plants`, `/plants/:id`, `/map` (requieren `authGuard`)
- `/admin` (requiere `adminGuard`)

Guards:

- `authGuard`: exige sesion valida.
- `adminGuard`: exige sesion y rol `admin`.

## 6. Modelo funcional de datos

Entidades usadas:

- `profiles`: perfil, nombre, email, rol.
- `plants`: datos de planta, propietario, foto, lat/lng.
- `records`: consumo/generacion por planta y fecha.
- `favorites`: favoritos por usuario.
- Storage bucket `plant-photos`: imagenes de plantas.

Permisos esperados:

- Cliente: acceso a sus datos propios.
- Admin: gestion global.

## 7. Realtime, cron y retencion

Generacion automatica:

- Funcion SQL: `public.emit_solar_records()`.
- Programacion: `pg_cron` cada minuto (`* * * * *`).

Realtime:

- Suscripcion a `postgres_changes` sobre `public.records`.
- Vista detalle de planta y panel admin actualizan datos en vivo.

Retencion maxima opcional de registros:

- Script: `supabase/records_retention_20.sql`.
- Efecto: maximo 20 registros por planta.
- En el registro 21, se elimina el mas antiguo de esa planta.

Nota de UI:

- El frontend tambien limita a 20 en la carga/listado de detalle para evitar listas largas.

## 8. Formularios y validaciones

Formularios implementados:

- Login (reactivo)
- Registro (reactivo)
- Perfil (reactivo)
- Alta/edicion de planta (Signal Form)
- Buscador reactivo en listado de plantas

Validaciones:

- Requeridos, longitudes minimas, email, rangos de lat/lng.
- Validador personalizado `noSpaces` (`src/app/validators/no-spaces.validator.ts`).

## 9. Reactividad aplicada

Servicios:

- Estado con `BehaviorSubject`.
- Exposicion con `Observable`.
- Operadores en `pipe` (`map`, `distinctUntilChanged`, `shareReplay`).

Componentes:

- Uso mayoritario de Signals para estado local.
- Comunicacion padre-hijo con `input()` y `output()`.
- Componentes principales conectados a servicios por Observables.

## 10. Funcionalidades por rol

Cliente:

- Gestion de sus plantas.
- Ver detalle de planta, grafica y registros en vivo.
- Marcar favoritos.
- Ver mapa de sus plantas.

Admin:

- CRUD de plantas global.
- Gestion de roles de usuarios.
- Gestion de registros.
- Vista global de registros en tiempo real.
- Mapa global de plantas.

## 11. Mejoras aplicadas durante desarrollo

- Corregida previsualizacion de foto al seleccionar archivo.
- Corregido guardado de foto para que no se pierda en alta/edicion.
- En admin, columna de propietario muestra usuario legible (nombre/email) en lugar de UUID cuando existe.
- En admin, etiqueta de columna cambiada a `Usuario`.
- Retencion opcional de registros a 20 por planta (script + limite en detalle).

## 12. Puesta en marcha

### Requisitos

- Node.js + npm
- Proyecto Supabase configurado (URL y anon key en `src/environments`)

### Comandos

```bash
npm install
npm run build
npm test -- --watch=false
npm start
```

## 13. SQL util para profesor

Promocionar usuario a admin:

```sql
update public.profiles
set role = 'admin'
where email = 'tu-email@dominio.com';
```

Comprobar job cron:

```sql
select jobid, jobname, schedule, active
from cron.job
where command ilike '%emit_solar_records%';
```

Comprobar RLS activo:

```sql
select c.relname as table_name, c.relrowsecurity as rls_enabled
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relkind = 'r'
  and c.relname in ('profiles', 'plants', 'records', 'favorites')
order by c.relname;
```

## 14. Checklist de demostracion (evaluacion)

1. Registrar usuario cliente e iniciar sesion.
2. Crear planta con foto y ubicacion usando "Usar mi ubicacion".
3. Ver planta en listado y en detalle con grafica/registros.
4. Ver mapa en modo cliente.
5. Entrar con admin y abrir `/admin`.
6. Confirmar CRUD de plantas y gestion de usuarios/roles.
7. Confirmar registros en tiempo real y frecuencia de cron.
8. (Opcional) aplicar `supabase/records_retention_20.sql` y validar maximo 20 por planta.

## 15. Observaciones

- En algunos PCs sin GPS, la geolocalizacion puede aproximarse por IP/Wi-Fi y ser menos precisa que en movil.
- Leaflet en build muestra warning de CommonJS (no bloquea funcionamiento).
