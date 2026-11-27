# Guía de Instalación, Configuración Local y Flujo de Trabajo en Equipo

Esta guía está diseñada para que cualquier integrante del equipo pueda clonar, configurar en local y colaborar en el desarrollo de **DAILY** utilizando **Git**, **GitHub**, **Next.js** y **Supabase**.

---

## 1. Prerrequisitos en la Computadora

Antes de comenzar, asegúrate de tener instalado:
1. **Node.js** (versión 18.18 o superior, recomendada 20.x):
   - Verifica en tu terminal con: `node -v` y `npm -v`
2. **Git**:
   - Verifica en tu terminal con: `git --version`
3. Un editor de código (como **VS Code** o Cursor).

---

## 2. Para la Creadora: Cómo subir este proyecto por primera vez a GitHub

Si aún no has subido el proyecto a GitHub, sigue estos pasos:

### Paso A: Crear el repositorio en GitHub
1. Ingresa a [github.com](https://github.com) e inicia sesión.
2. Haz clic en el botón verde **"New"** (Nuevo repositorio) en la esquina superior izquierda.
3. Asigna un nombre al repositorio (por ejemplo: `tempo-daily` o `daily-workspace`).
4. Selecciona si será **Público** o **Privado**.
5. **IMPORTANTE:** **NO** marques las casillas de *"Add a README file"*, *"Add .gitignore"* ni *"Choose a license"*, ya que este proyecto ya los tiene listos.
6. Haz clic en **"Create repository"**.

### Paso B: Comandos en tu terminal para inicializar y subir
Abre la terminal en la carpeta del proyecto (`c:\Users\Ximena\Documents\Tempo`) y ejecuta:

```bash
# 1. Inicializar git localmente (si no está inicializado)
git init

# 2. Asegurarse de que la rama principal se llame main
git branch -M main

# 3. Preparar los archivos para el commit inicial
git add .

# 4. Crear el primer commit
git commit -m "feat: initial commit of DAILY workspace with dynamic themes and CI"

# 5. Conectar tu repositorio local con el de GitHub (reemplaza con tu URL real de GitHub)
git remote add origin https://github.com/TU_USUARIO/TU_REPOSITORIO.git

# 6. Subir todo el código a GitHub
git push -u origin main
```

---

## 3. Para las Compañeras: Cómo clonar y levantar el proyecto en local

Una vez que el proyecto esté en GitHub, cada compañera del equipo debe seguir estos pasos en su computadora:

### Paso 1: Clonar el repositorio
Abre una terminal en la carpeta donde guardas tus proyectos y escribe:

```bash
git clone https://github.com/TU_USUARIO/TU_REPOSITORIO.git
cd TU_REPOSITORIO
```

### Paso 2: Instalar las dependencias
Instala todas las librerías necesarias del proyecto:

```bash
npm install
```

---

## 4. Configurar las Variables de Entorno (`.env.local`)

> [!IMPORTANT]
> El archivo `.env.local` contiene credenciales secretas (llaves de Supabase, API keys). Por seguridad, está bloqueado en el archivo `.gitignore` y **NUNCA se sube a GitHub**. Cada integrante debe crearlo localmente en su máquina.

### Paso 1: Crear el archivo `.env.local` a partir de la plantilla
En la terminal del proyecto, ejecuta el comando según tu sistema operativo:

- **En Windows (PowerShell / CMD):**
  ```powershell
  Copy-Item .env.example .env.local
  ```
- **En Mac o Linux:**
  ```bash
  cp .env.example .env.local
  ```

### Paso 2: Rellenar las variables en `.env.local`
Abre el nuevo archivo `.env.local` en tu editor y coloca los valores correspondientes:

```env
# 1. Supabase (Pídelos a la administradora del proyecto o cópialos de tu Supabase Dashboard)
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOi...

# 2. Resend (Opcional para desarrollo local de correos)
RESEND_API_KEY=re_123456789...
RESEND_FROM_EMAIL=DAILY <onboarding@resend.dev>

# 3. Web Push API (Para notificaciones push)
# Puedes usar los que comparta el equipo o generar tu propio par con: npx web-push generate-vapid-keys
NEXT_PUBLIC_VAPID_PUBLIC_KEY=BD5...
VAPID_PRIVATE_KEY=...
VAPID_SUBJECT=mailto:equipo@daily-app.com

# 4. Token secreto para tareas programadas
# Usa un valor aleatorio único en producción. El mismo token se guarda en Supabase Vault.
CRON_SECRET=daily_cron_secret_token_change_in_production

# 5. URL Local
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Recordatorios automáticos en producción

- Configura `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` y un `CRON_SECRET` aleatorio en las variables de entorno del hosting.
- En el SQL Editor de Supabase, abre [`supabase/schedule_reminders.sql`](supabase/schedule_reminders.sql), reemplaza el dominio público de la app y el mismo `CRON_SECRET`, y ejecútalo una sola vez. Supabase Cron llamará al endpoint cada minuto, así las alertas con la app cerrada no dependen del plan de Vercel.
- En local, abre DAILY e inicia sesión; mientras esté abierta, la app procesa recordatorios vencidos y puede mostrar el aviso del sistema.
- Cada computador y celular debe activar avisos desde su propio navegador. En iPhone/iPad con iOS 16.4 o posterior, primero agrega DAILY a la pantalla de inicio; iOS solo permite Web Push en esa app instalada.
- Push requiere una dirección segura HTTPS; `http://localhost` funciona en el computador de desarrollo, pero una IP local HTTP no habilita Push en el celular.

---

## 5. Configurar la Base de Datos en Supabase

Si estás conectando una cuenta de Supabase por primera vez o necesitas inicializar las tablas:

1. Ve a [supabase.com](https://supabase.com) y entra a tu proyecto.
2. En el menú lateral izquierdo, haz clic en el ícono de **SQL Editor**.
3. Abre el archivo local del repositorio: [`supabase/schema_full.sql`](file:///c:/Users/Ximena/Documents/Tempo/supabase/schema_full.sql).
4. Copia todo su contenido y pégalo en el editor SQL de Supabase.
5. Haz clic en el botón verde **"Run"**.
   - Esto creará automáticamente todas las tablas (`tasks`, `notes`, `events`, `schedules`, `focus_sessions`, `profiles`, `reminders`), las políticas de seguridad RLS y los disparadores.
6. *(Recomendado para pruebas de desarrollo)*:
   - Ve a **Authentication** > **Providers** > **Email**.
   - Desactiva temporalmente la opción **"Confirm email"** si quieres registrar usuarios de prueba sin tener que validar el correo en la bandeja de entrada.

---

## 6. Ejecución del Servidor Local y Comprobación

Una vez configurado `.env.local`, arranca el servidor de desarrollo:

```bash
npm run dev
```

Abre tu navegador en:
👉 **[http://localhost:3000](http://localhost:3000)**

### ¿Qué verificar en local?
- [x] **Página de Inicio (Landing):** Elige entre Minimal Studio, Rose & Plum y Focus Grid.
- [x] **Registro / Inicio de sesión:** Crea una cuenta de prueba (`/auth/register` o `/auth/login`).
- [x] **Tareas (`/tasks`):** Crea, edita, completa y filtra tareas por materia/prioridad.
- [x] **Calendario (`/calendar`):** Agrega eventos y navega entre vistas de mes y día.
- [x] **Apuntes (`/notes`):** Crea notas por materia y prueba el fijado de apuntes.
- [x] **Planificador Diario (`/planner`):** Revisa el cálculo de horas disponibles y bloques de tiempo.
- [x] **Pomodoro (`/focus`):** Inicia una sesión de estudio vinculada a una tarea.
- [x] **Configuración (`/settings`):** Cambia el tema global y la preferencia de idioma (Español/Inglés).

---

## 7. Flujo de Trabajo en Equipo con Ramas de Git

Para evitar conflictos y trabajar ordenadamente, sigan este flujo colaborativo:

### ⚠️ Regla de Oro
**NUNCA hagan cambios directamente sobre la rama `main`**. La rama `main` siempre debe ser estable y funcional.

### Paso a paso para trabajar en una tarea nueva:

1. **Asegurarse de tener la última versión de `main`:**
   ```bash
   git checkout main
   git pull origin main
   ```

2. **Crear una rama propia para tu cambio:**
   Usa un nombre descriptivo (ejemplo: `feature/vista-estadisticas`, `fix/calendario-responsive`):
   ```bash
   git checkout -b feature/nombre-de-tu-tarea
   ```

3. **Hacer tus cambios y probarlos:**
   Antes de guardar, verifica que no haya errores de compilación ni de TypeScript:
   ```bash
   # Valida tipos de TypeScript:
   npx tsc --noEmit

   # Valida compilación general:
   npm run build
   ```

4. **Guardar tus cambios (Commit):**
   ```bash
   git status
   git add .
   git commit -m "feat: agregada nueva funcionalidad de ..."
   ```

5. **Subir tu rama a GitHub:**
   ```bash
   git push -u origin feature/nombre-de-tu-tarea
   ```

6. **Crear un Pull Request (PR) en GitHub:**
   - Entra a GitHub en el repositorio. Verás un botón que dice **"Compare & pull request"**.
   - Escribe un resumen de lo que agregaste o corregiste.
   - Pide a una compañera que lo revise y lo apruebe antes de fusionarlo (*Merge*) a `main`.

---

## 8. Integración Continua (CI con GitHub Actions)

Este repositorio cuenta con un flujo automático de **Integración Continua** en el archivo [`.github/workflows/ci.yml`](file:///c:/Users/Ximena/Documents/Tempo/.github/workflows/ci.yml).

Cada vez que alguien:
- Sube cambios a `main`.
- Abre un **Pull Request** desde cualquier rama.

GitHub ejecutará automáticamente:
1. Instalación limpia de dependencias (`npm ci`).
2. Chequeo de sintaxis y tipos con TypeScript (`npx tsc --noEmit`).
3. Compilación de producción con Next.js (`npm run build`).

Si algo tiene errores o rompe la aplicación, GitHub mostrará una **cruz roja (❌)** advirtiendo al equipo para corregirlo antes de hacer el merge. Si todo está perfecto, mostrará un **check verde (✅)**.

---

## 9. Comandos Útiles de Referencia Rápida

| Comando | Para qué sirve |
| :--- | :--- |
| `npm run dev` | Inicia el servidor de desarrollo en `http://localhost:3000`. |
| `npx tsc --noEmit` | Verifica errores de TypeScript sin compilar archivos. |
| `npm run build` | Compila el proyecto para producción y detecta errores de páginas. |
| `git status` | Muestra qué archivos modificaste y cuáles están listos para commit. |
| `git checkout -b <rama>` | Crea y cambia a una nueva rama de trabajo. |
| `git pull origin main` | Descarga las últimas actualizaciones de la rama principal. |
| `git push -u origin <rama>` | Sube tu rama a GitHub para compartirla con el equipo. |
