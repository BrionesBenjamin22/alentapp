# Análisis de Infraestructura Docker — Fase 1

**Autor:** Luciana Martino  
**Actividad:** TP Integrador - Actividad 4 - Fase 1

---

## 1.1 Problemas y vulnerabilidades Docker

| Problema                          | ¿Dónde ocurre?            | Impacto | Solución propuesta                                               |
|-----------------------------------|---------------------------|---------|------------------------------------------------------------------|
| La API usa imagen de desarrollo   | `packages/api/Dockerfile` | Alto    | Crear `packages/api/Dockerfile.prod` con multi-stage build       |
| El frontend usa Vite en producción| `packages/web/Dockerfile` | Alto    | Crear `packages/web/Dockerfile.prod` y servir con Nginx          |
| Variables sensibles hardcodeadas  | `docker-compose.yml`      | Alto    | Usar `.env.prod` y variables `${...}`                            |
| No hay límites de CPU/memoria     | `docker-compose.yml`      | Medio   | Definir `cpus` y `mem_limit` por servicio                        |
| No hay configuración de           | `docker-compose.yml`      | Alto    | Agregar `read_only`, `cap_drop`, `security_opt` y usuario no-root|
| seguridad productiva              |                           |         |                                                                  |
---

## 1.2 OpenTelemetry

OpenTelemetry es un estándar para obtener información de observabilidad de una aplicación.

Sirve para generar métricas, logs y trazas.

Prometheus, en cambio, se usa principalmente para recolectar y consultar métricas.

OpenTelemetry produce o exporta información, Prometheus la recolecta y Grafana la muestra en gráficos.

---

## 1.3 Tres pilares de observabilidad

Los tres pilares son:

- Métricas
- Logs
- Trazas

OpenTelemetry puede trabajar con los tres, aunque en esta actividad se usa principalmente para métricas.

---

## 1.4 Métricas RED

RED significa:

- Rate: cantidad de requests por segundo.
- Errors: cantidad de errores.
- Duration: duración o latencia de las requests.

Sirve para saber si la API recibe tráfico, si falla y cuánto tarda en responder.

---

## 1.5 OTLP

OTLP significa OpenTelemetry Protocol.

Es un protocolo estándar para enviar datos de observabilidad.

La ventaja es que la aplicación no queda atada directamente a una sola herramienta como Prometheus.

---

## 1.6 Relación con Grafana

OpenTelemetry genera métricas.

Prometheus las recolecta.

Grafana las visualiza en dashboards.