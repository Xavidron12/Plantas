# 🌞 Plantas Solares

Aplicación web desarrollada con **Angular** para la gestión de plantas solares, con autenticación y base de datos en **Supabase**.  
Permite a los usuarios crear, visualizar y gestionar sus propias plantas, y a los administradores supervisar todas las plantas del sistema mediante un mapa interactivo.

---

## 🚀 Tecnologías utilizadas

- **Angular (standalone + signals)**
- **TypeScript**
- **Angular Material**
- **Bootstrap**
- **Supabase**
  - Auth (login / registro)
  - Base de datos PostgreSQL
  - Storage (imágenes)
  - Realtime
  - Row Level Security (RLS)
- **Leaflet** (mapa interactivo)
- **Chart.js** (gráficas de registros)

---

## 🔐 Roles de usuario

### 👤 Usuario normal
- Registro e inicio de sesión
- Crear, editar y eliminar **sus propias plantas**
- Visualizar sus plantas en listado y en mapa
- Marcar plantas como favoritas
- Visualizar registros en tiempo real

### 🛠️ Administrador
- Acceso a todas las plantas del sistema
- Visualización global en el mapa
- CRUD completo de plantas
- Acceso al panel de administración

---

## 🧩 Funcionalidades principales

- Autenticación segura con Supabase
- Control de acceso mediante **RLS**
- CRUD completo de plantas
- Subida de imágenes a Supabase Storage
- Mapa interactivo con Leaflet
- Favoritos por usuario
- Registros en tiempo real (realtime)
- Gráficas con Chart.js
- Formularios reactivos y con signals
- Tema claro / oscuro
- Componentización reutilizable

---

## 📁 Estructura del proyecto

