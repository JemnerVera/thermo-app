# ⚠️ SOLUCIÓN AL ERROR DE AUTENTICACIÓN EN AZURE

## Problema identificado

El error dice:
```
Error: No credentials found. Add an Azure login action before this action.
```

## Causa

El secret `AZUREAPPSERVICE_PUBLISHPROFILE_7AA786BA2F1447089D46719055F4FFA3` probablemente **NO existe** en el repositorio `thermo-app` de GitHub.

Este secret existe en el repositorio de JoySense (`lorawan-sense-app`), pero necesita ser creado también en el repositorio de Thermos.

---

## Solución: Crear el secret en GitHub

### PASO 1: Descargar el Publish Profile de Azure (si no lo tienes)

1. Ir a: `Azure Portal → App Services → agromigiva-joysense-dev`
2. Click en **"Get publish profile"**
3. Descargar el archivo `.publishsettings`

### PASO 2: Crear el secret en GitHub para Thermos

1. Ir a: `https://github.com/JemnerVera/thermo-app/settings/secrets/actions`

2. Click en **"New repository secret"**

3. Nombre del secret:
   ```
   AZUREAPPSERVICE_PUBLISHPROFILE_7AA786BA2F1447089D46719055F4FFA3
   ```
   ⚠️ **IMPORTANTE:** Usa EXACTAMENTE el mismo nombre que usa JoySense para poder reutilizar el mismo App Service

4. Valor: Pegar TODO el contenido del archivo `.publishsettings` que descargaste

5. Click en **"Add secret"**

---

## Alternativa: Verificar si el secret ya existe

Si ya creaste el secret antes, verifica:

1. Ir a: `https://github.com/JemnerVera/thermo-app/settings/secrets/actions`
2. Buscar: `AZUREAPPSERVICE_PUBLISHPROFILE_7AA786BA2F1447089D46719055F4FFA3`
3. Si existe, verificar que el contenido sea correcto (puede estar vacío o mal formateado)

---

## Después de crear el secret

1. El workflow se ejecutará automáticamente en el próximo push
2. O puedes ejecutarlo manualmente desde: `Actions → Workflow → Run workflow`

---

## Verificación

Después de crear el secret, verifica que el workflow funcione:
- Ve a: `https://github.com/JemnerVera/thermo-app/actions`
- El workflow debería ejecutarse correctamente sin errores de autenticación

