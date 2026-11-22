# Experiencias de viajeros — etapa 3A local

No ejecutar la migración hasta verificar con acceso remoto de solo lectura la firma/grants de `public.is_modo_rumbo_admin(uuid)`, RLS y las políticas de `storage.objects`.

## Servidor

`SUPABASE_SERVICE_ROLE_KEY` se requiere solo en Vercel/server local; nunca se publica. La API valida la sesión Supabase vía Auth y vuelve a comprobar administrador mediante la función existente. Los endpoints viven bajo `/api/traveler-experiences` y usan acciones POST para crear, revocar, validar y enviar.

## Fotografía

El navegador limita el original a 10 MB, lo reduce a 1200 px y WebP de hasta 500 KB. El servidor valida WebP por firma y decodificación, dimensión y peso, recodifica con Sharp y sube únicamente el resultado al bucket privado. El límite de 10 MB del original solo puede imponerse en navegador porque el original no se envía; la API sí hace cumplir todas las restricciones del archivo optimizado.

Las fotos no se sirven con URL directa de Storage: la futura ruta pública consulta aprobación y consentimiento en cada solicitud. Rechazo/ocultamiento bloquea primero la entrega, luego elimina mediante API de Storage; los errores se registran con códigos genéricos para reintento.

## Antes de activar

1. Verificar remotamente función admin, grants, RLS y Storage con rol autorizado de solo lectura.
2. Revisar SQL y ejecutar únicamente después de aprobación.
3. Configurar `SUPABASE_SERVICE_ROLE_KEY` como variable server-only.
4. Ejecutar Preview para probar API, Sharp, Storage privado y seguridad.

El limitador IP local es por instancia y no sustituye un control distribuido de producción.
