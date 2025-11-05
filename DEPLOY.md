# 🚀 GUÍA DE DEPLOY DE THERMOS A AZURE

## ✅ INFORMACIÓN DEL APP SERVICE

- **Nombre del App Service:** `agromigiva-joysense-dev` (ambiente de prueba compartido)
- **URL:** `https://agromigiva-joysense-dev-cnc8evagdrbvbceb.eastus2-01.azurewebsites.net`
- **Schema:** `thermo` ✅ (ya configurado en el código)

---

## 📋 CHECKLIST DE CONFIGURACIÓN

### ✅ PASOS COMPLETADOS

- [x] Workflow creado (`.github/workflows/main_thermos-dev.yml`)
- [x] Configurado para usar App Service: `agromigiva-joysense-dev`
- [x] Configurado para usar secret existente: `AZUREAPPSERVICE_PUBLISHPROFILE_7AA786BA2F1447089D46719055F4FFA3`
- [x] Secrets de Supabase creados en GitHub:
  - [x] `REACT_APP_SUPABASE_URL_THERMOS`
  - [x] `REACT_APP_SUPABASE_PUBLISHABLE_KEY_THERMOS`
- [x] Variables de entorno configuradas en Azure App Service
- [x] Startup Command configurado: `cd backend && npm install --production && node server.js`

---

## 📝 PASOS PARA DEPLOY

### PASO 1: Verificar Variables de Entorno en Azure

**Ir a:** `Azure Portal → App Services → agromigiva-joysense-dev → Configuration → Application settings`

**Verificar que estas variables existan:**

```
SUPABASE_URL = [url-supabase-thermos]
SUPABASE_SERVICE_ROLE_KEY = [service-key-thermos]
DB_SCHEMA = thermo
NODE_ENV = production
PORT = 8080
WEBSITES_PORT = 8080
REACT_APP_SUPABASE_URL = [url-supabase-thermos]
REACT_APP_SUPABASE_PUBLISHABLE_KEY = [publishable-key-thermos]
REACT_APP_BACKEND_URL = /api
```

**⚠️ IMPORTANTE:** 
- Verificar que `DB_SCHEMA = thermo` (no `sense`)
- Las variables deben apuntar al proyecto Supabase de Thermos

---

### PASO 2: Commit y Push

```bash
git add .github/workflows/main_thermos-dev.yml
git add .gitignore
git commit -m "chore: Configurar deploy automático de Thermos a Azure"
git push origin main
```

⚠️ **IMPORTANTE:** El push iniciará el deploy automático a Azure.

---

### PASO 3: Monitorear el Deploy

**1. Ver GitHub Actions:**
```
https://github.com/JemnerVera/thermo-app/actions
```

**Verás:**
- ✅ Build job (2-4 min)
- ✅ Deploy job (2-3 min)

**2. Verificar en Azure Portal:**
```
App Services → agromigiva-joysense-dev → Deployment Center → Logs
```

Deberías ver:
- ✅ Deployment Status: Success
- ✅ Commit ID del último deploy
- ✅ Timestamp reciente

---

### PASO 4: Verificar que la App Funciona

**1. Abrir la aplicación:**
```
https://agromigiva-joysense-dev-cnc8evagdrbvbceb.eastus2-01.azurewebsites.net
```

⏳ **Primera carga puede tardar 30-60 segundos** (cold start)

**2. Checklist de verificación:**

- [ ] Página carga (no "Application Error")
- [ ] Login funciona
- [ ] Dashboard muestra datos
- [ ] Filtros funcionan (País → Empresa → Fundo → Sector)
- [ ] Tablas cargan correctamente
- [ ] Los datos provienen del schema `thermo` (verificar en Network tab del navegador)
- [ ] No hay errores en consola (F12)

**3. Si hay errores, ver logs:**

**Opción A - Azure Portal:**
```
App Services → agromigiva-joysense-dev → Monitoring → Log stream
```

**Opción B - Azure CLI:**
```bash
az webapp log tail --name agromigiva-joysense-dev --resource-group [RESOURCE_GROUP]
```

---

## 🔧 TROUBLESHOOTING

### Error: "Application Error"

**Solución:**
1. Verificar variables de entorno en Azure (especialmente `DB_SCHEMA=thermo`)
2. Verificar Startup Command configurado
3. Ver logs en: `App Services → agromigiva-joysense-dev → Monitoring → Log stream`

### Error: "Cannot find module"

**Solución:**
1. Verificar que el Startup Command esté configurado:
   ```bash
   cd backend && npm install --production && node server.js
   ```
2. Ver logs en GitHub Actions

### Error: "Schema thermo not found"

**Solución:**
1. Verificar en Supabase que el schema `thermo` existe
2. Verificar que `DB_SCHEMA=thermo` esté configurado en Azure

### Error: 500 en API calls

**Solución:**
1. Verificar `SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY`
2. Verificar que las variables apunten al proyecto Supabase de Thermos
3. Ver logs en Log stream

---

## 🔐 SEGURIDAD

### ✅ Verificación de Seguridad Completada

- ✅ No hay credenciales hardcodeadas en el código
- ✅ Todas las credenciales están en variables de entorno o secrets
- ✅ Archivos sensibles protegidos por `.gitignore`
- ✅ Archivos con credenciales eliminados del repositorio

---

## 📊 SECRETS DE GITHUB

### Secrets necesarios (Ya creados):

1. **`AZUREAPPSERVICE_PUBLISHPROFILE_7AA786BA2F1447089D46719055F4FFA3`**
   - Tipo: Publish Profile de Azure
   - ✅ Ya existe (reutilizado de JoySense)

2. **`REACT_APP_SUPABASE_URL_THERMOS`**
   - Tipo: URL de Supabase
   - ✅ Ya creado

3. **`REACT_APP_SUPABASE_PUBLISHABLE_KEY_THERMOS`**
   - Tipo: Publishable Key de Supabase
   - ✅ Ya creado

---

## 📝 NOTAS IMPORTANTES

- Este App Service (`agromigiva-joysense-dev`) es un ambiente de prueba compartido
- JoySense ya tiene su ambiente oficial diferente
- ⚠️ **MIGRACIÓN FUTURA:** En el futuro se migrará a un ambiente final designado por el DBA

---

## 🔄 MIGRACIÓN AL AMBIENTE FINAL

Cuando el DBA designe el ambiente final para producción:

1. **Crear nuevo App Service** (o usar el designado por el DBA)
2. **Actualizar workflow** (`.github/workflows/main_thermos-dev.yml`):
   - Cambiar `app-name` al nuevo App Service
   - Agregar nuevo `publish-profile` secret si es necesario
3. **Configurar variables de entorno** en el nuevo App Service
4. **Actualizar esta documentación** con la nueva URL y configuración

---

**Fecha:** Noviembre 2025  
**Status:** ✅ Deploy automático funcionando  
**Ambiente actual:** Desarrollo/Prueba (`agromigiva-joysense-dev`)

