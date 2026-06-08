# Análisis de Infraestructura Docker — Fase 1

**Autor:** Mateo Geffroy
**Actividad:** TP Integrador - Actividad 4 - Fase 1: Analizar y proponer

---

## 1.1 Problemas y Vulnerabilidades Docker

| Problema | ¿Dónde ocurre? | Impacto | Solución propuesta |
|----------|---|---|---|
| **Variables sensibles hardcodeadas** | `docker-compose.yml` | Alto | Usar un archivo `.env` para inyectar credenciales como `POSTGRES_PASSWORD` de forma segura. |
| **Imágenes pesadas y con herramientas de build** | `packages/api/Dockerfile` y `packages/web/Dockerfile` | Alto | Usar *multi-stage builds* para compilar en una etapa y llevar solo el código final a la etapa de runtime. |
| **Uso de servidores de desarrollo** | `docker-compose.yml` (comandos de API y Web) | Alto | Reemplazar los comandos de desarrollo por Node puro en el backend y usar Nginx para servir el frontend estático. |
| **Ejecución como usuario root** | En ambos Dockerfiles | Alto | Crear un usuario `appuser` o usar `USER node` en la etapa de runtime para evitar escalada de privilegios. |
| **Falta de control de recursos** | `docker-compose.yml` | Medio | Definir `mem_limit` y `cpus` en los servicios para prevenir que un contenedor agote la memoria del host. |

---

## 1.2 Investigación OpenTelemetry

### ¿Qué es OpenTelemetry y cómo se diferencia de Prometheus?
OpenTelemetry (OTel) es un framework estandarizado para instrumentar, generar y exportar datos de telemetría (métricas, logs y trazas). Se diferencia de Prometheus en que OTel no almacena ni visualiza los datos, es solo el mensajero. Prometheus es la base de datos (TSDB) que almacena esas métricas para su posterior consulta.

### Los 3 pilares de la observabilidad
Los tres pilares son **Métricas, Trazas y Logs**. OpenTelemetry aborda los tres, proporcionando un estándar unificado para recolectar toda esta información sin depender de múltiples agentes incompatibles.

### Métricas RED: Rate, Errors, Duration
*   **Rate (Tasa):** Mide la cantidad de peticiones por segundo. Sirve para entender la carga de tráfico actual.
*   **Errors (Errores):** Mide la tasa de respuestas fallidas (4xx y 5xx). Sirve para detectar caídas o bugs.
*   **Duration (Duración):** Mide la latencia de las respuestas. Sirve para evaluar la performance percibida por el usuario.

### ¿Qué es OTLP y su ventaja frente a Prometheus directo?
OTLP (OpenTelemetry Protocol) es el protocolo estándar de OTel. Su gran ventaja frente a exportar directo a Prometheus es que es *vendor-neutral*: podés cambiar de Prometheus a otra herramienta de monitoreo (como Datadog o Jaeger) sin tener que reescribir ni tocar el código de tu aplicación.

### ¿Cómo se relaciona OpenTelemetry con Grafana?
OpenTelemetry extrae las métricas de la aplicación y las envía a Prometheus para su almacenamiento. Luego, Grafana se conecta a Prometheus para leer esos datos y construir los dashboards y alertas visuales.