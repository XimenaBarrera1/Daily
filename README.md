# DAILY — Digital Student Workspace & Intentional Planner

> **Haz tiempo para lo que importa.** / **Make time for what matters.**
> 
> Un espacio de trabajo armónico, sereno y bilingüe (Español/Inglés) diseñado para estudiantes universitarios. Organiza materias, entregas de talleres, exámenes, apuntes de clase, horarios semanales, planificación diaria y sesiones Pomodoro en un solo lugar.

[![CI](https://github.com/TU_USUARIO/TU_REPOSITORIO/actions/workflows/ci.yml/badge.svg)](https://github.com/TU_USUARIO/TU_REPOSITORIO/actions/workflows/ci.yml)
[![Next.js](https://img.shields.io/badge/Next.js-16_App_Router-black?logo=next.js)](https://nextjs.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4-38B2AC?logo=tailwind-css)](https://tailwindcss.com/)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL_%26_Auth-3ECF8E?logo=supabase)](https://supabase.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript)](https://www.typescriptlang.org/)

---

## 🚀 Guía de Inicio Rápido para el Equipo

Para instrucciones detalladas de clonación, configuración de base de datos en Supabase, variables de entorno y flujo de ramas de Git, consulta:
👉 **[GUIA_INSTALACION_Y_EQUIPO.md](./GUIA_INSTALACION_Y_EQUIPO.md)**

```bash
# 1. Clonar el repositorio
git clone <URL_DEL_REPOSITORIO>
cd Tempo

# 2. Instalar dependencias
npm install

# 3. Configurar variables de entorno (desde la plantilla)
cp .env.example .env.local    # En Windows: Copy-Item .env.example .env.local

# 4. Iniciar servidor local
npm run dev
```

Visita `http://localhost:3000` en tu navegador.

---

## 🎨 Sistema de 5 Paletas de Colores Dinámicas

La aplicación cuenta con un motor de diseño reactivo implementado mediante variables CSS en `src/app/globals.css`. Cada tema transforma automáticamente el 100% de la interfaz (botones, tarjetas, inputs, tablas, modales y barras de navegación):

1. **Sage (Serenidad Verde):** Tono bosque nórdico (`#2d5a43`) con fondos suaves y acentos menta.
2. **Warm (Calidez Minimalista):** Tono terracota y ámbar tostado (`#9c5221`) con fondos marfil tipo papel artesanal.
3. **Slate (Precisión Nórdica):** Azul petróleo arquitectónico (`#1e4258`) y superficies platino de alta concentración.
4. **Lavender (Calma Creativa):** Índigo y lavanda moderno (`#4f46e5`) con fondos violeta claro y gran energía visual.
5. **Forest (Profundidad Esmeralda):** Esmeralda profundo (`#134e4a`) con salvia natural y contraste orgánico.

---

## ✨ Funcionalidades Principales

- 📚 **Gestor de Materias y Entregas (`/tasks`):** Registro de talleres, proyectos y parciales con fechas límites, prioridades, estados y asignación por asignatura.
- 📅 **Calendario Interactivo (`/calendar`):** Vistas mensual y diaria unificadas para entregas académicas y compromisos personales.
- 📝 **Cuaderno de Apuntes (`/notes`):** Notas rápidas por materia con fijado de apuntes prioritarios y previsualización de lectura.
- 🧭 **Planificador Inteligente de Día (`/planner`):** Algoritmo determinista que cruza compromisos fijos y tareas pendientes para calcular bloques realistas de estudio.
- ⏱️ **Cronómetro de Estudio Pomodoro (`/focus`):** Sesiones de concentración activa vinculadas a tareas específicas con seguimiento de tiempos completados.
- 📊 **Progreso y Estadísticas (`/progress`):** Métricas de cumplimiento semanal y resumen de hábitos de estudio.
- 🔔 **Recordatorios y Web Push (`/notifications`):** Notificaciones en el navegador (PWA con Service Worker) y correos transaccionales vía Resend.
- 🌐 **Experiencia 100% Bilingüe:** Interfaz traducible al instante entre Español e Inglés (`messages/es.json` y `messages/en.json`).
- 📱 **Progressive Web App (PWA):** Instalable en teléfonos móviles y ordenadores con soporte offline.

---

## 🏗️ Stack Tecnológico

| Capa | Tecnología |
| :--- | :--- |
| **Framework** | Next.js 16 (Turbopack, App Router, React Server Components) |
| **Lenguaje** | TypeScript 5 (Strict Mode) |
| **Estilos** | Tailwind CSS v4 con CSS Variables |
| **Iconografía** | Lucide React |
| **Base de Datos & Auth** | Supabase (PostgreSQL con RLS - Row Level Security) |
| **Integración Continua** | GitHub Actions (`.github/workflows/ci.yml`) |
| **Notificaciones** | Web Push API (VAPID) & Resend Email API |

---

## 🔄 Integración Continua (CI)

El repositorio incluye un flujo de trabajo automatizado en `.github/workflows/ci.yml` que valida en cada `push` o `Pull Request`:
- Chequeo estricto de tipos con TypeScript (`npx tsc --noEmit`).
- Compilación de producción con Next.js (`npm run build`).

---

## 📄 Licencia

Desarrollado para fines académicos y de productividad estudiantil.
