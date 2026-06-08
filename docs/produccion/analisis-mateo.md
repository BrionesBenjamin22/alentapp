# Análisis de Infraestructura Docker — Fase 1

**Autor:** Mateo Geffroy
**Actividad:** TP Integrador - Actividad 4 - Fase 1: Analizar y proponer

---

## 1.1 Problemas y Vulnerabilidades Docker

A continuación se identifican 5 problemas críticos en la configuración Docker actual del proyecto, evaluando seguridad, performance y buenas prácticas de producción.

| Problema | ¿Dónde ocurre? | Impacto | Solución propuesta |
|----------|----------------|---------|-------------------|
| **Variables sensibles hardcodeadas** | `docker-compose.yml` | Alto | Usar un archivo `.env` separado e inyectar credenciales como `POSTGRES_PASSWORD` a través de variables de entorno. El `.env` debe estar en `.gitignore` y nunca commiteado al repositorio. |
| **Imágenes pesadas con herramientas de build incluidas** | `packages/api/Dockerfile` y `packages/web/Dockerfile` | Alto | Implementar *multi-stage builds*: compilar TypeScript en una etapa intermedia y copiar solo el artefacto final (JS compilado) a la etapa de runtime. Esto elimina compiladores, devDependencies y fuentes de código del contenedor final. |
| **Uso de servidores de desarrollo en producción** | `docker-compose.yml` (comandos `npm run dev` en servicios API y Web) | Alto | Reemplazar el comando de desarrollo por `node dist/app.js` en el backend. Para el frontend, compilar con Vite (`vite build`) y servir los archivos estáticos con Nginx, que es significativamente más eficiente que Vite's preview server. |
| **Ejecución como usuario root dentro del contenedor** | `packages/api/Dockerfile` y `packages/web/Dockerfile` (ausencia de instrucción `USER`) | Alto | Crear un usuario sin privilegios con `RUN addgroup -S appgroup && adduser -S appuser -G appgroup` y agregar `USER appuser` antes del `CMD`. Alternativamente, usar el usuario `node` que ya viene en las imágenes oficiales de Node. Si el proceso comprometido escala privilegios, un atacante tendría acceso root al host. |
| **Falta de límites de recursos (CPU y memoria)** | `docker-compose.yml` (ausencia de sección `deploy.resources`) | Medio | Definir `mem_limit` y `cpus` en cada servicio del compose. Por ejemplo, limitar la API a 512MB de RAM y 0.5 CPUs. Sin esto, un contenedor con un memory leak o bajo ataque puede consumir todos los recursos del host y derribar los demás servicios. |

### Análisis adicional de cada área evaluada

**Tamaño de imagen:** Las imágenes actuales incluyen el compilador de TypeScript (`tsc`), todas las `devDependencies` de npm y el código fuente `.ts` original. En una imagen de producción, ninguno de estos debería estar presente. El resultado es una imagen que puede superar 1GB cuando debería rondar los 200-300MB.

**Seguridad — Filesystem:** En producción, el filesystem del contenedor debería montarse como de solo lectura (`read_only: true` en docker-compose). Esto previene que un atacante que logre ejecutar código arbitrario pueda escribir archivos persistentes o modificar el binario de la aplicación.

**Caché de capas:** El orden de las instrucciones en los Dockerfiles actuales no está optimizado para maximizar cache hits. Las instrucciones que cambian frecuentemente (como `COPY . .`) deberían ir al final, y las estables (como `RUN npm ci`) al principio, para que Docker pueda reutilizar capas entre builds y reducir drásticamente los tiempos de compilación en CI/CD.

**Resource management — Healthchecks:** Actualmente no hay healthchecks definidos, lo que significa que Docker marca los contenedores como "running" apenas arrancan, sin verificar que la aplicación esté lista para recibir tráfico. Esto puede provocar que requests lleguen a un contenedor que aún está inicializando su conexión a la base de datos.

---

## 1.2 Investigación OpenTelemetry

### ¿Qué es OpenTelemetry y cómo se diferencia de Prometheus?

OpenTelemetry (OTel) es un framework de observabilidad de código abierto, respaldado por la CNCF (Cloud Native Computing Foundation), que provee un conjunto estandarizado de APIs, SDKs y herramientas para **instrumentar, generar, recolectar y exportar** datos de telemetría: métricas, logs y trazas distribuidas.

La diferencia fundamental con Prometheus es que **OTel no almacena ni visualiza datos**. Es el mensajero, no el destino. Prometheus, en cambio, es una base de datos de series de tiempo (TSDB) que almacena métricas para su posterior consulta con PromQL. 

En términos prácticos:
- **OpenTelemetry** se encarga de instrumentar el código (agregar los "sensores") y transportar los datos.
- **Prometheus** se encarga de almacenar esas métricas y ponerlas disponibles para consulta.
- **Grafana** se conecta a Prometheus para construir dashboards y alertas visuales.

Otra diferencia clave es que OTel es **vendor-neutral**: el mismo código de instrumentación puede enviar datos a Prometheus, Datadog, Jaeger, Zipkin o cualquier otro backend sin modificaciones. Prometheus, al exportar directamente, te acopla a su formato y ecosistema.

### Los 3 pilares de la observabilidad

Los tres pilares de la observabilidad son:

1. **Métricas:** Datos numéricos agregados en el tiempo. Responden a la pregunta *"¿cuánto?"*. Por ejemplo: requests por segundo, uso de CPU, cantidad de errores. Son eficientes en almacenamiento y permiten alertas y dashboards.

2. **Trazas (Traces):** Registro del recorrido completo de una solicitud a través de todos los servicios involucrados. Responden a *"¿dónde tardó?"*. Son fundamentales en arquitecturas de microservicios para entender la cadena de llamadas.

3. **Logs:** Registros textuales de eventos discretos. Responden a *"¿qué pasó exactamente?"*. Aportan contexto detallado cuando algo falla.

**OpenTelemetry aborda los tres pilares** de forma unificada, lo que lo diferencia de herramientas anteriores que solo cubrían uno o dos de ellos. Antes de OTel, una organización podía tener Prometheus para métricas, Jaeger para trazas y Elasticsearch para logs, cada uno con su propio agente y formato incompatible.

### Métricas RED: Rate, Errors, Duration

El método RED, creado por Tom Wilkie (Grafana Labs), define las tres métricas fundamentales para monitorear cualquier servicio orientado a requests:

- **Rate (Tasa):** Mide la cantidad de requests que recibe el servicio por unidad de tiempo (generalmente por segundo). Sirve para entender la carga de tráfico actual y detectar picos o caídas inesperadas de demanda. Es la métrica de "¿cuánto trabajo estoy haciendo?".

- **Errors (Errores):** Mide la tasa o porcentaje de requests que resultan en una respuesta de error (típicamente HTTP 4xx y 5xx). Sirve para detectar regresiones, bugs en producción o degradación del servicio. Es la métrica de "¿cuánto trabajo estoy haciendo *mal*?".

- **Duration (Duración / Latencia):** Mide el tiempo que tarda el servicio en procesar cada request. Generalmente se expresa como percentiles (p50, p95, p99) en lugar de promedios, porque los percentiles revelan la experiencia real de los usuarios en el peor caso. Es la métrica de "¿cuánto tiempo tarda cada unidad de trabajo?".

Juntas, las métricas RED proveen una visión completa del estado de salud de un servicio desde la perspectiva del usuario final: ¿está recibiendo tráfico? ¿Está fallando? ¿Está respondiendo rápido?

### ¿Qué es OTLP y qué ventaja tiene frente a exportar directamente a Prometheus?

OTLP (OpenTelemetry Protocol) es el protocolo nativo y estándar de OpenTelemetry para transmitir datos de telemetría entre componentes. Puede operar sobre gRPC o HTTP/Protobuf.

Sus ventajas frente a exportar directamente a Prometheus son:

- **Vendor-neutrality:** OTLP es agnóstico al backend de destino. Con el mismo código de instrumentación y simplemente cambiando la configuración del exportador, podés enviar métricas a Prometheus, Datadog, New Relic, Honeycomb, o cualquier plataforma compatible. Si exportás directamente a Prometheus, tu código queda acoplado a ese ecosistema.

- **Soporte para los 3 pilares:** OTLP transporta métricas, trazas y logs bajo el mismo protocolo. Prometheus solo maneja métricas. Si en el futuro querés agregar trazas distribuidas, con OTLP no tenés que cambiar la instrumentación.

- **Modelo push vs pull:** Prometheus utiliza un modelo pull (va a buscar las métricas). OTLP admite el modelo push, lo que es más flexible en entornos donde los servicios no tienen IPs fijas o están detrás de firewalls.

- **OpenTelemetry Collector:** OTLP permite interponer un Collector entre la aplicación y los backends. El Collector puede filtrar, transformar y enrutar métricas a múltiples destinos simultáneamente, sin modificar el código de la aplicación.

### ¿Cómo se relaciona OpenTelemetry con Grafana?

OpenTelemetry y Grafana no se conectan directamente entre sí; la relación es a través de Prometheus como intermediario:

1. **Instrumentación:** El SDK de OpenTelemetry en la aplicación Node.js captura métricas (Rate, Errors, Duration) y las expone en un endpoint HTTP (`/metrics`) en formato compatible con Prometheus, gracias al `PrometheusExporter`.

2. **Scraping:** Prometheus está configurado para hacer scraping (consulta periódica) de ese endpoint cada 15 segundos y almacena las métricas en su base de datos de series de tiempo (TSDB).

3. **Visualización:** Grafana se conecta a Prometheus como datasource usando su API de consultas PromQL. Los dashboards de Grafana ejecutan queries PromQL contra Prometheus para obtener los datos y los renderiza en paneles visuales (time series, gauges, bar charts, etc.).

Esta arquitectura en capas permite que cada componente sea reemplazable de forma independiente: se puede cambiar el backend de métricas de Prometheus a otro sistema compatible sin tocar la instrumentación, o cambiar la herramienta de visualización de Grafana a otra que hable con Prometheus.