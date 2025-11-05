# ⚠️ VERIFICAR CONEXIÓN DE AZURE A GITHUB

## 🔍 PROBLEMA IDENTIFICADO

Si Azure App Service está conectado al repositorio de **JoySense** en lugar del repositorio de **Thermos**, entonces estaría desplegando código de JoySense, no de Thermos.

---

## 📋 PASOS PARA VERIFICAR Y CORREGIR

### **PASO 1: Verificar qué repositorio está conectado**

**Ir a Azure Portal:**
1. Ve a: `Azure Portal → App Services → agromigiva-joysense-dev`
2. Click en **"Deployment Center"** (o "Centro de implementación")
3. Verifica la sección **"Source"** (Fuente)

**Debería mostrar:**
- **Source:** GitHub
- **Organization:** Tu organización de GitHub
- **Repository:** `thermo-app` o `Thermos` (NO `lorawan-sense-app` o `joysense`)
- **Branch:** `main`

---

### **PASO 2: Si está conectado al repositorio incorrecto**

**Opción A: Desconectar y usar GitHub Actions (RECOMENDADO)**

Si Azure está usando "Deployment Center" con conexión directa a GitHub, **desconéctalo** porque estamos usando GitHub Actions:

1. Ve a: `Deployment Center`
2. Click en **"Disconnect"** (Desconectar)
3. Esto permitirá que GitHub Actions controle el deploy

**Opción B: Cambiar al repositorio correcto**

Si necesitas mantener la conexión directa:
1. Ve a: `Deployment Center → Settings`
2. Click en **"Edit"**
3. Selecciona:
   - **Source:** GitHub
   - **Organization:** Tu organización
   - **Repository:** `thermo-app` (o el nombre correcto de tu repo)
   - **Branch:** `main`
4. Click en **"Save"**

---

### **PASO 3: Verificar que GitHub Actions esté funcionando**

1. Ve a: `https://github.com/JemnerVera/thermo-app/actions`
2. Verifica que el workflow **"Build and deploy Node.js app to Azure Web App - Thermos Development"** se haya ejecutado
3. Verifica que el último deploy sea reciente (después de tus cambios)

---

### **PASO 4: Desactivar deploy automático desde Azure**

Si Azure está haciendo deploy automático desde GitHub directamente, puede estar conflictuando con GitHub Actions:

1. Ve a: `Deployment Center`
2. Si hay un botón de **"Sync"** o **"Redeploy"**, NO lo uses
3. Deja que GitHub Actions maneje el deploy

---

## ✅ VERIFICACIÓN FINAL

Después de corregir la conexión:

1. **Haz un nuevo push** para forzar un deploy desde GitHub Actions
2. **Espera 5-7 minutos** para que el deploy termine
3. **Verifica los logs de Azure:**
   - Debe mostrar: `🚀 Thermos Backend API running`
   - NO debe mostrar: `JoySense Backend API running`

---

## 🎯 CONCLUSIÓN

**Si Azure está conectado al repositorio de JoySense:**
- Estará desplegando código de JoySense
- Necesitas cambiarlo al repositorio de Thermos o desconectarlo y usar solo GitHub Actions

**Si Azure está conectado al repositorio correcto pero sigue mostrando JoySense:**
- El problema es caché del navegador o build antiguo
- Limpia el caché del navegador (Ctrl + Shift + R)

