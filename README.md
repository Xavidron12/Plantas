# Proyecto Plantas Solares (Angular + Supabase)

Aplicacion web para la gestion de plantas solares con autenticacion, permisos por rol, almacenamiento de imagenes y datos en tiempo real.

## Enlaces de entrega

- GitHub: `https://github.com/Xavidron12/Plantas.git`
- Despliegue: `https://xavi-plantas.vercel.app/`

## Resumen funcional

La aplicacion permite:

- Registro e inicio de sesion con Supabase Auth.
- Perfil de usuario con subida y eliminacion de avatar.
- CRUD de plantas solares con foto, descripcion y coordenadas.
- Marcado de plantas favoritas.
- Vista detalle de planta con grafica y lista de registros en tiempo real.
- Panel de administracion con gestion global de plantas, usuarios y registros.
- Mapa interactivo con marcadores y navegacion al detalle.
- Demo de CRUD HTTP con `HttpClient` e interceptor.

## Stack tecnologico

- Angular 21 (standalone components)
- TypeScript
- Signals + RxJS
- Formularios reactivos y de plantilla
- Angular Material + Bootstrap
- Supabase (`@supabase/supabase-js`)
- Chart.js
- Leaflet

## Arquitectura principal

```text
src/app/
  components/
    plant-card.component.ts
    plant-form.component.ts
    records-chart.component.ts
    records-list.component.ts
  core/
    auth.service.ts
    plants.service.ts
    records.service.ts
    profiles.service.ts
    favorites.service.ts
    geolocation.service.ts
    rest-posts.service.ts
    guards/
      auth.guard.ts
      admin.guard.ts
    interceptors/
      api-demo.interceptor.ts
    store/
      app.actions.ts
      app.reducer.ts
      app-state.ts
      app-store.service.ts
  pages/
    home.page.ts
    login.page.ts
    register.page.ts
    profile.page.ts
    plants.page.ts
    plant-detail.page.ts
    map.page.ts
    admin.page.ts
    rest-crud.page.ts
    not-found.page.ts
  pipes/
    watts-format.pipe.ts
  validators/
    no-spaces.validator.ts
```

## Rutas de la aplicacion

Definidas en `src/app/app.routes.ts`:

- `/home`
- `/login`
- `/register`
- `/profile` (con `authGuard`)
- `/plants` (con `authGuard`)
- `/plants/:id` (con `authGuard`)
- `/map` (con `authGuard`)
- `/admin` (con `adminGuard`)
- `/rest-demo` (con `adminGuard`)
- `**` -> 404

## Criterios tecnicos cubiertos

- Estructura de componentes separada por responsabilidad.
- Uso de `@if` y `@for`.
- Uso de `input()` y `output()`.
- Uso de `ngClass` y `ngStyle`.
- Interfaces de dominio y tipos auxiliares.
- Servicios no HTTP (geolocalizacion, store, auth, favoritos).
- Servicio HTTP con `HttpClient`.
- Interceptor HTTP registrado en `app.config.ts`.
- Servicio SDK de Supabase.
- CRUD REST completo (GET/GET by ID/POST/PUT/DELETE).
- Pipes por defecto (`date`, `json`) y pipe personalizado (`wattsFormat`).
- Formularios de plantilla y reactivos.
- Validaciones de inputs y validador personalizado (`noSpaces`).
- Programacion reactiva en servicios y signals en componentes.
- Router completo con guards, ruta por defecto, redirecciones, 404 y parametro `:id`.
- Graficas en tiempo real con websocket (Supabase Realtime + Chart.js).

## Criterios funcionales cubiertos

- Registro, login y perfil con avatar.
- Imagenes en Storage (plantas y avatar).
- Permisos por rol (cliente/admin) con RLS en Supabase.
- Pagina principal.
- Listado CRUD.
- Vista detalle.
- README y repositorio en GitHub.
- Despliegue en Internet.

## Configuracion local

## 1) Requisitos

- Node.js
- npm
- Proyecto de Supabase operativo

## 2) Instalar dependencias

```bash
npm install
```

## 3) Variables de entorno

Configurar las claves en:

- `src/environments/environment.ts`
- `src/environments/environment.development.ts`

Campos necesarios:

- `supabaseUrl`
- `supabaseAnonKey`

## 4) Ejecutar en desarrollo

```bash
npm start
```

## 5) Compilar

```bash
npm run build
```

## 6) Tests

```bash
npm run test -- --watch=false
```

## Scripts SQL incluidos

Carpeta `supabase/`:

- `eval_permissions_avatar_setup.sql`
  - Activa y refuerza RLS en tablas principales.
  - Crea helper `is_admin()`.
  - Configura bucket de avatar y policies de storage.
- `eval_verification_queries.sql`
  - Consultas de comprobacion para evaluacion.
- `records_retention_20.sql`
  - Limite opcional de 20 registros por planta.

## Comprobaciones tecnicas recientes

- `npm run build`: OK
- `npm run test -- --watch=false`: OK

## Guion breve de demostracion

1. Abrir `/home`.
2. Registrar usuario en `/register`.
3. Iniciar sesion en `/login`.
4. Crear planta en `/plants`.
5. Abrir `/plants/:id` y mostrar grafica/lista en realtime.
6. Abrir `/map` y navegar desde marcador al detalle.
7. Abrir `/profile` y subir avatar.
8. Entrar como admin y mostrar `/admin`.
9. Mostrar `/rest-demo` para CRUD HTTP.
10. Probar una ruta invalida para mostrar `404`.

## Estado del proyecto

Proyecto funcional y preparado para evaluacion, con interfaz unificada, rutas protegidas, servicios reactivos y cobertura de los criterios solicitados.
