# Análisis de Infraestructura Docker — Fase 1

**Autor:** Germán Altamirano 
**Actividad:** TP Integrador - Actividad 4 - Fase 1: Analizar y proponer

---

## 1.1 Problemas y Vulnerabilidades Docker

| Problema | ¿Dónde ocurre? | Impacto | Solución propuesta |
|----------|---|---|---|
| Versión desactualizada de Node | `packages/api/Dockerfile:1` y `packages/web/Dockerfile:1` | Medio | Actualizar a `node:22-alpine` para recibir parches de seguridad |
| Sin usuario no-root | `packages/api/Dockerfile` y `packages/web/Dockerfile` (ninguno lo implementa) | Alto | Agregar `USER node` o crear `appuser` antes del `CMD` |
| Variables sensibles hardcodeadas | `docker-compose.yml:6-8` y línea 30 | Alto | Usar archivo `.env` con variables referenciadas via `${VARIABLE}` |
| Sin límites de recursos ni healthchecks completos | `docker-compose.yml:19-41` (servicios `api` y `web`) | Medio | Agregar `mem_limit`, `cpus` y `healthcheck` con `curl` para API |
| Single-stage, dependencias dev en producción | `packages/api/Dockerfile:12` y `packages/web/Dockerfile:8` | Alto | Implementar multi-stage build: etapa de compilación + etapa de runtime |

---

## 1.2 Investigación OpenTelemetry

### ¿Qué es OpenTelemetry y cómo se diferencia de Prometheus?

OpenTelemetry. conocido también como OTel, se trata de un framework de observabilidad open source y neutral con respecto al proveedor, lo que implica que utilizarlo no genera ninguna dependencia hacia ninguna empresa o tecnologia en particular. 
Cuando se habla de proveedor, se refiere a cualquier producto de software que recibe, almacena y visualiza datos de observabilidad en la aplicación.

OTel es entonces una colección de herramientas, APIs y SDKs que se utiliza para instrumentar, generar, recolectar y exportar datos de telemetría como métricas, logs y trazas, todo con el objetivo de analizar el rendimiento y comportamiento del software.

Su diferencia con respecto a Prometheus, se da a partir de las responsabilidades que cubre cada uno de los mencionados. OpenTelemetry por un lado, como se mencionó anteriormente, provee todo lo necesario para unicamente la especificación e instrumentación, sin abarcar la cuestión de almacenamiento ni visualización. Es en este ultimo punto es donde Prometheus termina cubriendo esa necesidad, siendo este un sistema de recolección y almacenamiento de metricas.

### Los 3 pilares de la observabilidad

Los tres tipos de datos de telemetría que OTel maneja son: trazas (traces), métricas (metrics) y logs, mencionado de que se trata cada uno:

- Trazas:
    - Permiten seguir el recorrido de una petición a través de multiples servicios, identificando dónde ocurren las fallas o cuellos de botella.

- Métricas:
    - Se tratan de datos numéricos agregados en el tiempo (ya sea contadores o histogramas) que permiten describir el estado del sistema.

- Logs
    - Son registros de eventos individuales discretos identificados junto a un tiempo y contexto especifico, siendo utiles para el diagnostico detallado.

### Métricas RED: Rate, Errors, Duration

El método RED fue creado por Tom Wilkie en 2015 como una filosofia de monitoreo orientada a microservicios, en respuesta a que el metodo llamado USE (Utilization, Saturation, Errors) aplica bien a hardware pero no tanto a servicios.

Las tres metricas que componen RED son:

- Rate
    - Representa la cantidad de peticiones por segundo, permitiendo notificar cuánto trafico está recibiendo el servicio. 
    - Un Rate inesperadamente bajo puede indicar un problema upstream (es decir, en la capa superior la cual envia los datos) que está bloqueando peticiones antes que lleguen.
    - Caso contrario, un Rate inesperadamenter alto puede señalar un ataque.

- Errors
    - Indica la cantidad de las peticiones previamente mencionadas que se encuentran fallando. Permite medir la salud funcional del servicio desde la perspectiva del usuario.
    - Un error rate alto implica que los usuarios están recibiendo respuestas fallidas.

- Duration
    - Es el tiempo que toma en completarse las peticiones realizadas, permitiendo medir la experiencia percibida de latencia.


### ¿Qué es OTLP y su ventaja frente a Prometheus directo?

El OpenTelemetry Protocol (OTLP) describe el encoding (formato o estructura para enviar los datos por la red), transporte y mecanismo de entrega de los datos de telemetria entre las fuentes de telemetria (aplicaciones que generan datos), nodos intermedios (servicios que reciben, procesan y redirigen los datos) y los backends de telemetria (sistemas finales que almacenan y visualizan los datos).

Se trata de un protocolo de entrega de telemetria, con caracter de proposito general, diseñado en el ambito del proyecto OpenTelemetry y preparado para ser utilizado dentro del entorno de producción de la aplicación.

Exportar de manera directa a Prometheus tiene sus complicaciones, ya que cuando se envian los datos en el formato que entiende manera nativa, sin que OTLP se encuentre de por medio, existe la limitación de que las metricas se encuentren en un formato especifico como lo es texto-HTTP, donde la forma de acceder a dicho es extrayendo información Pull-based (es decir, la aplicación no envia datos, sino que es el propio Prometheus quien va a buscarlos).

Ante esto, OTLP ofrece la siguiente mecanica:

1. OTLP tiene la capacidad de poder enviar datos de manera activa al servicio encargado de recibir, procesar y redirigir los datos, sin esperar a que sea el backend quien va a buscarlos.

2. Posee soporte multi-señal, lo que implica que dentro de un mismo mensaje se puede transportar trazas, metricas y logs. Prometheus unicamente puede comprender métricas.

3. OTLP permite exportar el trafico de telemetria a cualquier backend compatible  (ya sea Grafana, Jaeger, Datadog, etc.) simplemente cambiando la configuración del nodo intermedio, sin tocar el codigo propio de la aplicación.
4. OTLP se integra naturalmente con OpenTelemetry Collector, pudiendo asi agregar información extra a los datos que ya se disponen, descartar aquellos que no se necesitan, cambiar el formato o estructura de dichos, y dividir el flujo hacia multiples destinos de manera simultanea.

### ¿Cómo se relaciona OpenTelemetry con Grafana?

OpenTelemetry como framework y Grafana como plataforma poseen la misma visión de comportarse de manera neutral en cuanto a lo que es la observabilidad, ya que como se mencionó al comienzo, OpenTelemetry se comporta de modo que permite exportar datos a cualquier plataforma compatible sin dependender de ningun proovedor concreto.
Por su lado, Grafana ofrece soporte a multiples estandares y herramientas, sin forzar a los usuarios a utilizar las suyas, permitiendo soportar multiples formas de datos, fuentes, tipos de datos, y pudiendo integrarse con herramientas open-source.

Sumado a lo ultimo mencionado, Grafana Labs se encuentra activamente apoyando el desarrollo de OpenTelemetry, integrandolo admeas dentro de su espacio de trabajo, permitiendo que datos generados con OTel sean almacenados y visualizados en Grafana sin necesidad de conversiones complejas.

---

## Conclusión

Esta primera fase permitió mostrar que preparar una aplicación para producción implica de un ejercicio de razonamiento sobre riesgo, vulnerabilidad y control.

En el analisis de la infraestructura Docker, se dejó en evidencia que las vulnerabilidades más comunes son decisiones de conveniencia que se pueden arrastrar desde la etapa de desarrollo hacia la etapa de producción. Las configuraciones pueden estar funcionando, pero cuando el servicio se encuentra en una instancia la cual los usuarios se encuentran utilizandola, no corregir los errores puede representar riesgos concretos de seguridad y estabilidad.

La investigación sobre OpenTelemetry mostró la importancia de conocer que es lo que sucede mientras el sistema se encuentra en funcionamiento, donde a partir de las métricas RED, se obtiene de manera simple y directa el saber si el servicio está respondiendo bien, cuantos errores está generando y con que lentitud se encuentra operando.