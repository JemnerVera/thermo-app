# 🌡️ Thermos Dashboard - Sistema de Monitoreo Térmico

## 📋 Descripción

Thermos Dashboard es una aplicación web moderna para el monitoreo y análisis de sensores térmicos. Proporciona una interfaz intuitiva para visualizar datos de temperatura, humedad y otros parámetros térmicos en tiempo real, con filtros jerárquicos y gráficos interactivos.

## 🚀 Características Principales

### ✅ **Funcionalidades Implementadas**
- **Autenticación de usuarios** - Sistema de login con Supabase Auth
- **Filtros jerárquicos** - Navegación: País → Empresa → Fundo → Sector
- **Filtros avanzados** - Por fecha, entidad y ubicación
- **Gráficos interactivos** - Visualización de datos de sensores térmicos
- **Sistema de alertas** - Configuración de umbrales y notificaciones
- **CRUD completo** - Gestión de parámetros del sistema
- **Diagnóstico de conexión** - Verificación de conectividad con base de datos
- **Interfaz responsive** - Funciona en desktop, tablet y móvil

### 🎯 **Tecnologías Utilizadas**
- **Frontend:** React.js, TypeScript, Tailwind CSS, Chart.js, Recharts
- **Backend:** Node.js, Express.js
- **Base de datos:** Supabase (PostgreSQL) - Schema `thermo`
- **Autenticación:** Supabase Auth
- **Despliegue:** Vercel

## 📁 Estructura del Proyecto

```
Thermos/
├── frontend/                 # Aplicación React
│   ├── src/
│   │   ├── components/       # Componentes React
│   │   ├── services/         # Servicios API
│   │   ├── contexts/         # Contextos React
│   │   ├── hooks/           # Custom hooks (53 hooks)
│   │   ├── types/           # TypeScript types
│   │   └── App.tsx          # Componente principal
│   ├── public/              # Assets públicos
│   └── package.json
├── backend/                  # Servidor Node.js
│   ├── server.js            # Servidor Express
│   └── package.json
├── deployment/              # Scripts de deployment
│   ├── iniciar-local.bat   # Iniciar aplicación local
│   └── README-DEPLOYMENT.md
├── sql/                     # Scripts SQL
│   ├── thermos.sql         # Schema principal
│   ├── joysense.sql        # Schema de referencia
│   └── archive/            # Scripts de migración
├── docs/                    # Documentación
│   ├── DESPLIEGUE_WEB.md
│   ├── AUTHENTICATION_README.md
│   └── SCHEMA_DOCUMENTATION.txt
└── vercel.json             # Configuración Vercel
```

## 🛠️ Instalación y Configuración

### **Requisitos Previos**
- Node.js (v16 o superior)
- npm o yarn
- Cuenta en Supabase

### **Instalación Local**

1. **Clonar el repositorio:**
   ```bash
   git clone https://github.com/tu-usuario/thermos-dashboard.git
   cd thermos-dashboard
   ```

2. **Instalar dependencias:**
   ```bash
   # Frontend
   cd frontend
   npm install
   
   # Backend
   cd ../backend
   npm install
   ```

3. **Configurar variables de entorno:**
   
   **Backend:** Crear `backend/.env`
   ```bash
   SUPABASE_URL=https://tnlbuupmkvqbqcdanldh.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=tu-service-role-key
   DB_SCHEMA=thermo
   PORT=3001
   ```
   
   **Frontend:** Crear `frontend/.env` (opcional para desarrollo local)
   ```bash
   REACT_APP_SUPABASE_URL=https://tnlbuupmkvqbqcdanldh.supabase.co
   REACT_APP_SUPABASE_ANON_KEY=tu-anon-key
   REACT_APP_BACKEND_URL=http://localhost:3001
   ```

4. **Iniciar la aplicación:**
   ```bash
   # En Windows, ejecutar desde la raíz del proyecto:
   .\deployment\iniciar-local.bat
   ```

## 🚀 Despliegue

### **Despliegue en Vercel (Recomendado)**

1. **Conectar repositorio con Vercel**
2. **Configurar variables de entorno en Vercel**
3. **Deploy automático**

Ver `docs/DESPLIEGUE_WEB.md` para instrucciones detalladas.

## 🔐 Seguridad

### **Claves Seguras de Publicar:**
- ✅ Supabase URL
- ✅ Supabase Anon Key

### **Claves Privadas (NUNCA publicar):**
- ❌ Supabase Service Role Key

## 📱 Uso de la Aplicación

### **Acceso:**
- **URL:** [Tu URL de despliegue]
- **Usuario:** usuario administrador
- **Contraseña:** Cualquier contraseña (temporal)

### **Navegación:**
1. **Seleccionar ubicación:** País → Empresa → Fundo → Sector
2. **Aplicar filtros:** Fecha, entidad
3. **Ver gráficos:** Humedad, Temperatura, Electroconductividad
4. **Diagnóstico:** Verificar conectividad

## 🔧 Desarrollo

### **Scripts Disponibles**

```bash
# Desarrollo local
.\deployment\iniciar-local.bat   # Iniciar backend + frontend

# Frontend (en carpeta frontend/)
npm start                        # Iniciar en modo desarrollo
npm run build                    # Construir para producción
npm test                        # Ejecutar tests

# Backend (en carpeta backend/)
node server.js                   # Iniciar servidor
```

### **Estructura de Componentes Principales**

- **App.tsx** - Componente raíz con navegación
- **SystemParameters/** - Sistema CRUD completo (16 componentes)
- **Dashboard/** - Visualización de datos (6 componentes)
- **Reportes/** - Alertas y mensajes (4 componentes)
- **Umbrales/** - Configuración de umbrales (11 componentes)
- **LoginForm.tsx** - Formulario de autenticación
- **Contextos:** Auth, Filters, Theme, Language, Toast, Modal

## 📊 Base de Datos

### **Esquema Supabase (thermo)**

**Jerarquía Geográfica:**
- `pais`, `empresa`, `fundo`, `ubicacion`, `localizacion`

**Dispositivos y Métricas:**
- `sensor`, `metrica`, `tipo`, `metricasensor`, `localizacionsensor`

**Datos:**
- `medicion` - Lecturas de sensores
- `sensor_valor`, `sensor_valor_error`

**Sistema de Alertas:**
- `umbral`, `alerta`, `criticidad`, `perfilumbral`, `audit_log_umbral`

**Usuarios y Notificaciones:**
- `usuario`, `perfil`, `usuarioperfil`, `contacto`, `correo`, `mensaje`

Ver `docs/SCHEMA_DOCUMENTATION.txt` para detalles completos.

## 🤝 Contribución

1. Fork el proyecto
2. Crear rama de feature (`git checkout -b feature/AmazingFeature`)
3. Commit cambios (`git commit -m 'Add AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abrir Pull Request

## 📄 Licencia

Este proyecto está bajo la Licencia MIT. Ver `LICENSE` para más detalles.

## 📞 Soporte

Para soporte técnico o preguntas:
- Revisar documentación en `/docs`
- Abrir issue en GitHub
- Contactar al equipo de desarrollo

---

**¡Disfruta monitoreando tus sensores térmicos!** 🌡️📊
