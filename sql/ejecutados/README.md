# 📦 Scripts SQL Ejecutados

Esta carpeta contiene scripts SQL que **ya fueron ejecutados** en la base de datos de Thermos durante la migración inicial desde JoySense y public.

**No es necesario ejecutarlos nuevamente**, pero se conservan para:
- ✅ Referencia histórica
- ✅ Documentación del proceso de migración
- ✅ Replicar la migración en otros ambientes (dev, staging, producción)

---

## 📋 **Scripts de Migración (Ejecutados)**

### **Estructura Base:**
1. `migrate_entidades.sql` - Migración de entidades funcionales (Túnel, PID, Ventilador, etc.)
2. `migrate_localizaciones.sql` - Migración de localizaciones físicas (Túnel 1-14, PID 1-14, etc.)
3. `migrate_tipos_metricas.sql` - Verificación de tipos de sensores y métricas

### **Sensores:**
4. `migrate_sensores.sql` - Migración de 88 sensores PT1000
5. `migrate_metricasensor.sql` - Relación sensor-métrica (88 registros)
6. `migrate_localizacionsensor.sql` - Relación localización-sensor-métrica (88 registros)

### **Sistema de Usuarios y Alertas:**
7. `migrate_criticidad.sql` - Niveles de criticidad (Amarilla, Roja, Morada, Negra)
8. `migrate_perfil.sql` - Perfiles de usuario (Administrador, Supervisor, Técnico, etc.)

---

## 🔍 **Scripts de Análisis (Temporal)**

- `analisis_localizaciones.sql` - Análisis de prefijos de localización desde public.zona
- `analisis_nomenclatura_supervisor.sql` - Análisis de nomenclatura del supervisor vs public

---

## ⚠️ **Importante**

Si necesitas **revertir** alguna migración, consulta con el DBA. Algunos scripts tienen dependencias de FK que requieren eliminar datos en orden inverso.

---

**Fecha de Ejecución:** 2025-10-27  
**Ambiente:** Supabase Production (Thermos)  
**Migrado desde:** JoySense (sense schema) y Public (public schema)

