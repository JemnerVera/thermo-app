-- Función para verificar tablas en el schema public
CREATE OR REPLACE FUNCTION public.get_public_tables()
RETURNS TABLE(table_name text)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT table_name::text 
  FROM information_schema.tables 
  WHERE table_schema = 'public'
  ORDER BY table_name;
$$;

-- Función para verificar si existe la tabla temperatura - zona
CREATE OR REPLACE FUNCTION public.check_temperatura_zona_table()
RETURNS TABLE(exists boolean, table_name text, column_count bigint)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT 
    CASE WHEN COUNT(*) > 0 THEN true ELSE false END as exists,
    'temperatura - zona'::text as table_name,
    COUNT(*) as column_count
  FROM information_schema.columns 
  WHERE table_schema = 'public' 
  AND table_name = 'temperatura - zona';
$$;

-- Función para obtener datos de temperatura - zona
CREATE OR REPLACE FUNCTION public.get_temperatura_zona_data(limit_count integer DEFAULT 10)
RETURNS TABLE(
  id bigint,
  fundo_id bigint,
  zona_id bigint,
  valor numeric,
  fecha timestamp with time zone
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT 
    t.id,
    t.fundo_id,
    t.zona_id,
    t.valor,
    t.fecha
  FROM public."temperatura - zona" t
  ORDER BY t.fecha DESC
  LIMIT limit_count;
$$;
