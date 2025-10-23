# 📂 Scripts de Migración - Archive

Esta carpeta contiene scripts SQL que fueron utilizados durante el proceso de migración inicial de JoySense a Thermos.

## 📝 Scripts Archivados

### Scripts de Migración de Datos
- `migrate_pais.sql` - Migración de países de JoySense (schema `sense`) a Thermos (schema `thermo`)
- `migrate_empresa.sql` - Migración de empresas de JoySense a Thermos

### Scripts de Verificación
- `check_existing_pais.sql` - Verificación de países existentes en thermo.pais
- `check_public_tables.sql` - Verificación de tablas en schema public

### Scripts de Mantenimiento
- `reset_pais_clean.sql` - Reset del contador IDENTITY y limpieza de tabla pais

## ⚠️ Importante

Estos scripts fueron diseñados para la migración inicial y **NO deben ejecutarse** en un ambiente de producción activo sin una revisión cuidadosa.

## 📊 Estado de la Migración

- ✅ **País:** Migrado exitosamente
- ✅ **Empresa:** Migrado exitosamente
- ⚠️ **Otros datos:** Pendiente de migración según necesidad

## 🔧 Uso

Estos scripts se mantienen como referencia histórica. Si necesitas ejecutar una migración similar:

1. Revisa el script cuidadosamente
2. Adapta los IDs y valores según tu caso
3. Ejecuta en un ambiente de prueba primero
4. Verifica los resultados antes de aplicar en producción

---

**Fecha de archivo:** Octubre 2025
**Razón:** Migración inicial completada

