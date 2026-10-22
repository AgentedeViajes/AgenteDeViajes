# Panel administrativo de Modo Rumbo — etapa 1

Esta carpeta contiene una primera versión aislada del panel de carga de programas. No modifica ni alimenta todavía la web pública.

## Incluye

- Alta, edición, duplicación y eliminación de programas.
- Estados de borrador, publicado y pausado.
- Región, países, destinos, duración y código de operador.
- Clasificación por tipos de viaje.
- Identificación de programas con o sin aéreo.
- Tarifa, moneda, modalidad y base de precio.
- Múltiples fechas, precios especiales y cupos.
- Servicios incluidos, uno por línea.
- Itinerario completo día por día, con ordenamiento.
- Descripción, notas e imagen principal.
- Carga de imagen con optimización automática a WebP (máximo 1800 px de ancho, calidad 86%).
- Buscador y filtros de administración.
- Diseño responsive.

## Persistencia actual

Si `config.js` no contiene las credenciales públicas de Supabase, los datos se guardan en `localStorage` bajo la clave `modoRumboAdminProgramsV1`. Esto permite probar el flujo sin tocar la información pública.

Antes de conectar la web, este almacenamiento será reemplazado por:

- una base de datos persistente;
- autenticación real;
- almacenamiento de imágenes;
- API privada para el panel;
- API de lectura para la web pública;
- migración de los programas existentes.

## Conexión con Supabase

1. Crear un proyecto en Supabase.
2. Ejecutar `../supabase/schema.sql` desde el SQL Editor.
3. Crear el usuario administrador desde Authentication > Users.
4. Agregar su UUID a `public.admin_users` usando la consulta incluida al final del esquema.
5. Copiar `config.example.js` sobre `config.js` y completar la URL y clave publicable.

La clave publicable puede ser utilizada por el navegador porque las escrituras están protegidas por autenticación y Row Level Security. Nunca debe colocarse una clave `service_role` en estos archivos.
