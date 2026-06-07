# Analisis de infraestructura del proyecto

**Autor:** Benjamin Briones

## Infraestructura Docker actual

### Problemas identificados

#### 1. Uso de servidores de desarrollo en produccion

Tanto el Dockerfile del frontend como el del backend ejecutan servidores de desarrollo. En produccion, esta practica no es recomendable porque esos servidores no estan pensados para exponerse en entornos productivos.

**Impacto:** Alto

**Ocurre en:**

- `/packages/api/Dockerfile`: linea 22
- `/packages/web/Dockerfile`: linea 16

**Solucion propuesta:**

En produccion, el frontend deberia compilarse con:

```bash
npm run build -w packages/web
```

El backend deberia compilarse y ejecutarse con comandos equivalentes a:

```bash
npm run build -w packages/api
npm run start -w packages/api
```

#### 2. Ejecucion de contenedores como root

Ambos Dockerfile se ejecutan como root. No se especifica ninguna instruccion de usuario y las imagenes de Node suelen ejecutar los procesos como root si no se indica lo contrario. Si una aplicacion fuera comprometida, el atacante podria obtener permisos elevados dentro del contenedor.

**Impacto:** Alto

**Ocurre en:**

- `/packages/api/Dockerfile`: linea 18
- `/packages/web/Dockerfile`: linea 12

**Solucion propuesta:**

Definir el usuario `node` y ejecutar los contenedores con dicho usuario.

#### 3. Copia completa del repositorio dentro de la imagen

Ambos Dockerfile copian todo el repositorio dentro de la imagen. Esto no es necesariamente un problema, pero si no se define correctamente el archivo `.dockerignore`, se podrian copiar archivos de entorno o configuraciones sensibles que luego podrian ser inspeccionadas dentro de la imagen.

**Impacto:** Alto

**Ocurre en:**

- `/packages/api/Dockerfile`: linea 17
- `/packages/web/Dockerfile`: linea 11

**Solucion propuesta:**

Configurar correctamente el archivo `.dockerignore` para evitar copiar archivos sensibles en la imagen generada.

#### 4. Uso de `npm install` en imagenes productivas

En ambos Dockerfile se utiliza `npm install`. Para desarrollo es suficiente, pero en produccion es preferible usar `npm ci`, ya que instala exactamente lo definido en `package-lock.json`.

**Impacto:** Medio

**Ocurre en:**

- `/packages/api/Dockerfile`: linea 12
- `/packages/web/Dockerfile`: linea 8

**Solucion propuesta:**

Utilizar `npm ci` para entornos productivos.

#### 5. Falta de separacion entre imagenes de desarrollo y produccion

No existe una separacion clara entre imagen de desarrollo e imagen de produccion.

**Impacto:** Medio

**Ocurre en:**

- Toda la estructura de los Dockerfile.

**Solucion propuesta:**

Utilizar `multi-stage builds` para separar la construccion de desarrollo y produccion. Esto permite que la imagen final no incluya herramientas ni codigo innecesario para la ejecucion productiva.

## OpenTelemetry

OpenTelemetry es un framework que permite instrumentar, generar y exportar datos como logs, metricas y trazas. En otras palabras, es un proyecto de codigo abierto que permite registrar metricas de una o muchas aplicaciones.

Su principal diferencia con Prometheus es que Prometheus es un software de almacenamiento y monitoreo completo. OpenTelemetry ofrece herramientas para monitorear y registrar datos, mientras que Prometheus es un sistema completo con almacenamiento incluido.

### Pilares de observabilidad

Los tres pilares de la observabilidad son:

- Metricas
- Logs
- Trazas emitidas por el codigo de la aplicacion

OpenTelemetry aborda los tres. Su objetivo es estandarizar como una aplicacion genera, recolecta y exporta telemetria hacia herramientas como Prometheus, Grafana, Jaeger o Datadog.

### Metodo RED

El concepto de metricas RED fue desarrollado debido a la dificultad de aplicar el metodo USE en arquitecturas de microservicios, principalmente por su nivel de abstraccion.

Para monitorear mejor este tipo de arquitecturas, Tom Wilkie desarrollo el metodo RED:

- **Rate:** numero de solicitudes por segundo.
- **Errors:** cantidad de solicitudes que fallan.
- **Duration:** tiempo que requieren las solicitudes para ser procesadas.

Estas tasas se modelan por cada servicio de la arquitectura y permiten obtener una vista del funcionamiento general del sistema.

### OTLP

OTLP define el protocolo utilizado por OpenTelemetry para enviar telemetria. Es decir, establece la forma en que se envian los datos de observabilidad, su formato, transporte y entrega al cliente.

Esto ofrece la ventaja de no acoplar la aplicacion directamente con Prometheus. Ademas, Prometheus solo permite exportar metricas, mientras que OTLP permite exportar metricas, trazas y logs.

### Relacion entre OpenTelemetry y Grafana

OpenTelemetry se encarga de producir los datos relacionados con metricas, logs y trazas. Grafana se encarga de visualizar, alertar y correlacionar los datos producidos.

En resumen, OpenTelemetry genera, recolecta y envia a Grafana la informacion necesaria para producir salidas de valor.
