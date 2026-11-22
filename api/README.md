# Solicitudes de contratación

`POST /api/reservations` envía una solicitud a la agencia por Resend. La ruta no reserva, cobra ni persiste la solicitud.

## Entorno requerido

Configurar en el entorno de Vercel correspondiente (`Preview` o `Production`):

- `RESEND_API_KEY`
- `RESERVATION_EMAIL` (destinatario fijado por servidor)
- `RESEND_FROM_EMAIL`

No configurar estas variables en archivos públicos ni incluirlas en el repositorio. El remitente debe estar autorizado por Resend. La clave se utiliza únicamente desde esta función.

## Solicitud

Enviar `Content-Type: application/json` y estos campos:

```json
{
  "passenger": {
    "fullName": "Nombre y apellido",
    "email": "pasajero@example.com",
    "phone": "+54 11 5555-1212",
    "locality": "Buenos Aires",
    "adults": 2,
    "minors": 1,
    "minorAges": [8],
    "comments": "",
    "contactConsent": true
  },
  "program": {
    "id": "supabase:123e4567-e89b-12d3-a456-426614174000",
    "departureDate": "2027-03-14",
    "fareAmount": 3500
  },
  "formStartedAt": 1795262395000,
  "website": "",
  "testMode": true
}
```

El navegador solo envía el identificador estable, la salida elegida y el importe que vio. Antes de enviar el correo, el servidor consulta con `GET` el programa publicado de ese ID usando la misma clave publicable de solo lectura que ya utiliza la web, y compara la fecha e importe con la fila y sus salidas. El título, código, fecha y tarifa del correo se construyen desde la respuesta canónica; los valores descriptivos que mande el navegador se ignoran. El correo incluye el código de operador cuando está en el catálogo y omite esa línea si no hay código. `departureDate` acepta una fecha real `YYYY-MM-DD` o `null` si el programa no tiene salidas fechadas. `fareAmount` debe ser un número publicado o `null` si la tarifa está a consultar. `formStartedAt` es la marca de tiempo en milisegundos al abrir el formulario. `website` es el honeypot, debe permanecer vacío y oculto visualmente. `testMode: true` solo se acepta en Preview y antepone `PRUEBA DE CONTRATACIÓN` al asunto y al cuerpo.
La página de contratación envía solo esos campos y los datos del pasajero validados. El asunto es `Nueva solicitud de contratación - [programa]`. El correo contiene el código del operador si existe y responde al pasajero mediante `Reply-To`; no se envía una confirmación automática al pasajero. Si hay varias salidas, el servidor exige una y valida su tarifa vigente. Para rangos de viaje se informa el período almacenado y no se inventa una salida puntual. No se calculan totales por cantidad de pasajeros.

El servidor valida el formato y límites de los campos, restringe el origen al sitio de producción o al Preview de Vercel asignado, limita el cuerpo a 12 KB, exige un tiempo mínimo de llenado y aplica un honeypot y un límite temporal por IP en memoria de la instancia. Ese límite es una defensa básica y best-effort: Vercel puede usar varias instancias, por lo que no reemplaza un control global si el volumen de abuso lo justificara.

La respuesta exitosa es genérica (`{ "ok": true }`). Los fallos no devuelven detalles internos del proveedor. Los datos personales no se escriben en una base ni se incluyen en logs.

## Prueba segura en Preview

1. Confirmar que las tres variables estén cargadas en el entorno `Preview` de Vercel y que `RESERVATION_EMAIL` sea el correo autorizado por la cuenta de Resend para el remitente provisional.
2. Publicar la rama únicamente como Preview, nunca promoverla a producción para esta prueba.
3. Usar un programa publicado y datos de prueba propios, sin datos de pasajeros reales.
4. Enviar una sola solicitud desde el origen exacto de ese Preview y comprobar la recepción en el buzón configurado.
5. Confirmar que la respuesta de navegador no contiene la clave ni detalles del proveedor y que no se creó ningún registro en Supabase.

No se realiza un envío real durante las pruebas automatizadas: Resend se sustituye por una función simulada.
