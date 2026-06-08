# Diseno de produccion - Grupo 2

Este documento unifica las especificaciones de los archivos usados para levantar la aplicacion en produccion.

Los archivos de infraestructura a generar o usar son:

- `packages/api/Dockerfile.prod`
- `packages/web/Dockerfile.prod`
- `docker-compose.prod.yml`
- `.dockerignore`

El archivo de documentacion generado es:

- `docs/produccion/diseno-{Grupo-2}.md`

## Parte 1 Infraestructura de produccion

## .dockerignore

### Proposito

El archivo `.dockerignore` define que archivos y carpetas no se deben enviar al contexto de build de Docker.

Esto ayuda a que las imagenes se construyan mas rapido y evita copiar informacion que no corresponde dentro de la imagen.

### Contenido correcto

```dockerignore
node_modules
dist
.git
*.log
.env
```

### Explicacion

`node_modules` no se copia porque las dependencias se instalan dentro de cada Dockerfile con `npm ci`.

`dist` no se copia porque los archivos compilados se generan dentro de la etapa `build`.

`.git` no se copia porque el historial del repositorio no es necesario dentro de la imagen.

`*.log` no se copia porque los logs son archivos temporales y pueden crecer sin aportar al build.

`.env` no se copia porque puede contener variables sensibles. En produccion esas variables se leen desde Docker Compose, no se guardan dentro de la imagen.

## packages/api/Dockerfile.prod

### Proposito

El proposito de este Dockerfile es construir una imagen optimizada para el backend.

El proceso se divide en etapas para:

- aprovechar la cache de Docker
- reducir el tamano final de la imagen
- compilar el codigo TypeScript
- instalar solo las dependencias necesarias para produccion
- ejecutar la aplicacion con un usuario no-root

### Estructura

El archivo se organiza en 3 etapas.

### Etapa 1: deps

Base usada:

```dockerfile
node:22-alpine
```

Esta etapa instala las dependencias productivas.

Primero se copian los `package.json` del monorepo:

- `package.json` principal
- `packages/api/package.json`
- `packages/shared/package.json`
- `packages/web/package.json`

Esto permite que Docker reutilice cache cuando no cambian las dependencias.

Luego se ejecuta:

```dockerfile
npm ci --omit=dev
```

Con esto se instalan solo dependencias necesarias para ejecutar la API en produccion.

### Etapa 2: build

Base usada:

```dockerfile
node:22-alpine
```

Esta etapa compila el backend.

Aca se instalan todas las dependencias, incluyendo las de desarrollo, porque TypeScript necesita herramientas de build.

Luego se copia el codigo de:

- `packages/api`
- `packages/shared`
- archivos `tsconfig`

Finalmente se ejecuta:

```dockerfile
npm run build -w packages/api
```

Esto genera el codigo JavaScript compilado en `packages/api/dist`.

### Etapa 3: runtime

Base usada:

```dockerfile
node:22-alpine
```

Esta es la imagen final de produccion.

En esta etapa se define:

```dockerfile
NODE_ENV=production
PORT=3000
```

Tambien se crea un usuario no-root:

```dockerfile
appuser
```

Esto evita ejecutar la aplicacion como usuario administrador dentro del contenedor.

Luego se copian:

- manifests necesarios
- dependencias productivas desde la etapa `deps`
- codigo compilado desde la etapa `build`
- carpeta `shared`, porque la API puede depender de codigo compartido

La API expone el puerto:

```dockerfile
3000
```

### Requisitos no funcionales

- Tamaño máximo de imagen: < 300MB (meta: reducción ≥70% desde ~1GB)
- Tiempo de startup: < 5 segundos
- Consumo de memoria en idle: < 100MB
- Usuario no-root obligatorio en runtime

### Healthcheck

El healthcheck verifica si la API responde correctamente.

El comando usado es:

```dockerfile
node -e "fetch('http://localhost:3000/health').then(r => { if (!r.ok) process.exit(1) }).catch(() => process.exit(1))"
```

Esto hace una consulta interna a:

```text
http://localhost:3000/health
```

Si la respuesta es correcta, el contenedor se considera saludable.

Si la API no responde o responde con error, el comando termina con error y Docker marca el contenedor como no saludable.

## packages/web/Dockerfile.prod

### Proposito

El proposito de este Dockerfile es construir una imagen productiva del frontend.

En produccion no se usa Node.js para servir la aplicacion.

Primero se compila el frontend con Vite y luego nginx sirve los archivos estaticos generados.

### Estructura

El archivo se organiza en 3 etapas.

### Etapa 1: deps

Base usada:

```dockerfile
node:22-alpine
```

Esta etapa instala las dependencias del monorepo.

Se copian los `package.json` necesarios:

- `package.json` principal
- `packages/api/package.json`
- `packages/shared/package.json`
- `packages/web/package.json`

Luego se ejecuta:

```dockerfile
npm ci
```

En este caso se instalan tambien dependencias de desarrollo, porque Vite y TypeScript las necesitan para compilar el frontend.

### Etapa 2: build

Base usada:

```dockerfile
node:22-alpine
```

Esta etapa genera los archivos finales del frontend.

Primero se copian las dependencias instaladas desde la etapa `deps`.

Despues se copia el codigo necesario:

- manifests
- `tsconfig`
- `packages/shared`
- `packages/web`

Finalmente se ejecuta:

```dockerfile
npm run build -w packages/web
```

Este comando ejecuta el build de Vite y genera la carpeta:

```text
packages/web/dist
```

### Etapa 3: runtime

Base usada:

```dockerfile
nginx:stable-alpine
```

Esta es la imagen final de produccion.

En esta etapa se copia la configuracion de nginx:

```text
packages/web/nginx.prod.conf
```

Tambien se copian los archivos generados por Vite desde:

```text
packages/web/dist
```

hacia:

```text
/usr/share/nginx/html
```

nginx sirve la aplicacion en el puerto:

```dockerfile
80
```

### Requisitos no funcionales

- Tamaño máximo de imagen: < 170MB (meta: reducción ≥70% desde ~570MB)
- Tiempo de startup: < 3 segundos
- Cache de assets: mínimo 1 año para archivos con hash generado por Vite
- Compresión gzip obligatoria para archivos > 1KB

### Healthcheck

El healthcheck verifica si nginx esta respondiendo.

El comando usado es:

```dockerfile
wget --quiet --tries=1 --spider http://localhost:80/ || exit 1
```

Esto hace una consulta interna al puerto `80`.

`--spider` verifica la URL sin descargar el contenido.

Si nginx responde, el contenedor se considera saludable.

Si nginx no responde, el comando termina con error.

### Configuracion de nginx

nginx escucha en el puerto:

```nginx
80
```

Sirve los archivos desde:

```nginx
/usr/share/nginx/html
```

La configuracion incluye:

- compresion gzip
- cache para assets
- headers de seguridad
- soporte para rutas internas del frontend

La compresion gzip ayuda a reducir el peso de archivos como JavaScript, CSS, JSON y SVG.

La cache de assets se aplica sobre:

```nginx
/assets/
```

Estos archivos pueden cachearse por mas tiempo porque Vite genera nombres con hash.

Para el resto de rutas se usa:

```nginx
try_files $uri $uri/ /index.html;
```

Esto permite que rutas del frontend como `/socios` o `/disciplinas` funcionen aunque no existan como archivos reales en nginx.

## docker-compose.prod.yml

### Proposito

El proposito de este compose es levantar el stack productivo completo.

Incluye:

- base de datos
- API
- frontend

Tambien define red interna, limites de recursos, healthchecks, logs rotados y configuracion basica de seguridad.

### Servicios

El compose tiene 3 servicios.

### Servicio db

El servicio `db` usa:

```yaml
postgres:16-alpine
```

Representa la base de datos productiva.

Usa un volumen persistente:

```yaml
pgdata-prod:/var/lib/postgresql/data
```

Esto permite conservar los datos aunque el contenedor se elimine y se vuelva a crear.

### Variables de la base de datos

La base de datos recibe sus variables desde el archivo `.env`.

En el compose se usa:

```yaml
POSTGRES_USER: ${POSTGRES_USER}
POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
POSTGRES_DB: ${POSTGRES_DB}
```

Esto significa que Docker Compose toma esos valores desde el ambiente o desde un archivo `.env`.

Ejemplo:

```env
POSTGRES_USER=admin
POSTGRES_PASSWORD=change_me
POSTGRES_DB=alentapp_db
```

De esta forma las credenciales no quedan escritas directamente en el compose.

### Healthcheck de db

El healthcheck de la base de datos usa:

```yaml
pg_isready
```

Sirve para verificar si PostgreSQL ya esta listo para recibir conexiones.

La API depende de este healthcheck.

Esto evita que la API intente conectarse antes de que la base este lista.

### Servicio api

El servicio `api` se construye con:

```yaml
packages/api/Dockerfile.prod
```

Recibe estas variables:

```yaml
NODE_ENV: production
PORT: ${API_PORT:-3000}
DATABASE_URL: ${DATABASE_URL}
```

`DATABASE_URL` tambien se toma desde `.env`.

Ejemplo:

```env
DATABASE_URL=postgres://admin:change_me@db:5432/alentapp_db
```

El host usado es `db` porque dentro de Docker Compose los servicios pueden comunicarse usando el nombre del servicio.

La API expone:

```yaml
3000
```

El puerto externo se puede configurar con:

```env
API_PORT=3000
```

### Healthcheck de api

El healthcheck de la API consulta:

```text
http://localhost:3000/health
```

Si la API responde correctamente, el servicio queda como saludable.

El frontend depende de este healthcheck.

### Servicio web

El servicio `web` se construye con:

```yaml
packages/web/Dockerfile.prod
```

Este servicio usa nginx para servir el frontend ya compilado.

Expone el puerto:

```yaml
80
```

El puerto externo se puede configurar con:

```env
WEB_PORT=80
```

El frontend depende de que la API este saludable.

### Red interna

Los servicios usan una red propia:

```yaml
alentapp-prod-net
```

Esto evita usar la red default de Docker.

Tambien permite que los servicios se comuniquen entre si por nombre:

- `api` puede conectarse a `db`
- `web` puede esperar a `api`

### Seguridad

Los servicios usan configuracion basica de seguridad:

```yaml
read_only: true
cap_drop:
  - ALL
cap_add:
  - NET_BIND_SERVICE
security_opt:
  - no-new-privileges:true
```

`read_only: true` hace que el sistema de archivos del contenedor sea de solo lectura.

`cap_drop: ALL` quita permisos extra del contenedor.

`cap_add: NET_BIND_SERVICE` permite usar puertos de servicio cuando hace falta.

`no-new-privileges:true` evita que un proceso gane mas permisos dentro del contenedor.

Cuando algun servicio necesita escribir archivos temporales, se usa `tmpfs`.

Por ejemplo:

- `/tmp`
- `/var/run/postgresql`
- `/var/cache/nginx`
- `/var/run`

### Limites de recursos

Cada servicio tiene limite de CPU y memoria.

Base de datos:

```yaml
cpus: "0.75"
mem_limit: 512m
```

API:

```yaml
cpus: "0.75"
mem_limit: 512m
```

Frontend:

```yaml
cpus: "0.50"
mem_limit: 256m
```

Esto ayuda a evitar que un servicio consuma todos los recursos disponibles.

### Logs

Los servicios usan:

```yaml
driver: json-file
```

Y rotacion:

```yaml
max-size: "10m"
max-file: "3"
```

Esto significa que cada archivo de log puede llegar hasta 10 MB y se guardan hasta 3 archivos.

Asi se evita que los logs crezcan sin limite.

### Archivo .env

El archivo `.env` debe contener los valores reales de produccion.

El archivo `.env.prod.example` solo funciona como ejemplo.

Variables esperadas:

```env
POSTGRES_USER=admin
POSTGRES_PASSWORD=change_me
POSTGRES_DB=alentapp_db
DATABASE_URL=postgres://admin:change_me@db:5432/alentapp_db
API_PORT=3000
WEB_PORT=80
```

En produccion se deben reemplazar los valores de ejemplo por valores reales.

## Parte 2 Observabilidad de la API

### Proposito

El proposito de esta parte es definir como se puede integrar OpenTelemetry en la API.

La idea es poder observar el comportamiento del backend en produccion sin cambiar la logica principal del sistema.

Con esta configuracion se busca medir:

- cuantos requests recibe la API
- cuantos requests terminan con error
- cuanto tarda cada request
- cuanta memoria usa el proceso
- cuantos requests se estan atendiendo al mismo tiempo

### Metricas RED

Las metricas RED son las metricas principales para observar una API.

RED significa:

- Rate
- Errors
- Duration

En este proyecto se definen de la siguiente manera.

### Rate

Nombre propuesto:

```text
http.requests.total
```

Tipo en OpenTelemetry:

```text
Counter
```

Esta metrica cuenta la cantidad total de requests recibidos por la API.

Sirve para saber el volumen de uso del sistema y calcular requests por segundo.

Labels:

- `method`
- `route`
- `status`

Ejemplo de uso:

```text
GET /api/v1/members 200
```

### Errors

Nombre propuesto:

```text
http.requests.errors
```

Tipo en OpenTelemetry:

```text
Counter
```

Esta metrica cuenta los requests que terminaron con error.

Se consideran errores las respuestas `4xx` y `5xx`.

Sirve para ver la tasa de error de la API y detectar problemas en endpoints puntuales.

Labels:

- `method`
- `route`
- `status`

Ejemplo de uso:

```text
POST /api/v1/payments 500
```

### Duration

Nombre propuesto:

```text
http.requests.duration
```

Tipo en OpenTelemetry:

```text
Histogram
```

Esta metrica mide cuanto tarda cada request.

Sirve para detectar endpoints lentos y revisar la latencia de la API.

Labels:

- `method`
- `route`

Ejemplo de uso:

```text
GET /api/v1/sports
```

### Memoria del proceso

Nombre propuesto:

```text
process.memory.usage
```

Tipo en OpenTelemetry:

```text
Gauge
```

Esta metrica muestra cuanta memoria esta usando el proceso de Node.js.

Sirve para detectar aumentos de memoria o posibles problemas de consumo.

### Requests activos

Nombre propuesto:

```text
http.requests.active
```

Tipo en OpenTelemetry:

```text
Gauge
```

Esta metrica muestra cuantos requests se estan procesando al mismo tiempo.

Sirve para ver la carga actual de la API.

### Configuracion del SDK de OpenTelemetry

La API deberia configurar OpenTelemetry usando el SDK de Node.

La estructura conceptual seria:

```ts
import { NodeSDK } from '@opentelemetry/sdk-node';
import { PrometheusExporter } from '@opentelemetry/exporter-prometheus';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
```

La configuracion deberia incluir un `PrometheusExporter`.

El puerto elegido para exponer metricas es:

```text
9464
```

Ese puerto permitiria que Prometheus consulte las metricas de la API.

Tambien se deberian activar auto-instrumentaciones para:

- HTTP
- Fastify

Esto permite capturar informacion basica de requests sin tener que medir todo manualmente.

Ademas de las auto-instrumentaciones, se deben definir las metricas personalizadas RED:

- `http.requests.total`
- `http.requests.errors`
- `http.requests.duration`

Y tambien las metricas adicionales:

- `process.memory.usage`
- `http.requests.active`

### Flujo esperado

Cuando llega un request a la API, se deberia aumentar la metrica `http.requests.active`.

Cuando el request termina, se deberia bajar la metrica `http.requests.active`.

Tambien al finalizar el request se deberia registrar:

- un incremento en `http.requests.total`
- un incremento en `http.requests.errors` si el estado es `4xx` o `5xx`
- una medicion en `http.requests.duration`

La memoria del proceso se deberia medir de forma periodica.

### Dashboard RED en Grafana

El dashboard en Grafana debe mostrar el estado de la API usando las metricas expuestas por OpenTelemetry y leidas por Prometheus.

El dashboard debe tener al menos 6 paneles.

| Panel | Metrica | Tipo de grafico | Proposito |
| --- | --- | --- | --- |
| Requests por segundo | `rate(http.requests.total[1m])` | Time series | Ver el trafico actual de la API |
| Tasa de error | `rate(http.requests.errors[1m]) / rate(http.requests.total[1m])` | Time series | Ver el porcentaje de requests con error |
| Latencia p95 y p99 | `histogram_quantile(0.95, ...)` y `histogram_quantile(0.99, ...)` | Time series | Ver la performance percibida por el usuario |
| Por status code | `sum by (status) (rate(http.requests.total[1m]))` | Stacked area | Ver la distribucion de respuestas por codigo de estado |
| Memoria del proceso | `process.memory.usage` | Time series | Ver el consumo de memoria del proceso de Node.js |
| Endpoints mas lentos | `topk(5, ...)` | Bar chart horizontal | Ver los endpoints que mas tardan y pueden generar cuellos de botella |

El panel de requests por segundo permite ver si la API esta recibiendo poco o mucho trafico.

El panel de tasa de error permite detectar si aumentan las respuestas con error.

El panel de latencia p95 y p99 permite ver si algunos usuarios estan teniendo respuestas lentas, aunque el promedio parezca normal.

El panel por status code permite separar respuestas exitosas, errores del cliente y errores del servidor.

El panel de memoria del proceso permite controlar si la API esta usando cada vez mas memoria.

El panel de endpoints mas lentos ayuda a detectar que rutas conviene revisar primero.

Para que este dashboard funcione, Prometheus debe poder leer el endpoint de metricas de la API en el puerto `9464`.

### Relacion con produccion

Esta configuracion complementa el `docker-compose.prod.yml`.

La API seguiria exponiendo su puerto normal de servicio en `3000`.

Ademas, expondria el puerto de metricas en `9464` para que una herramienta como Prometheus pueda leerlas.

El endpoint de metricas no reemplaza el healthcheck.

El healthcheck sirve para saber si la API responde.

Las metricas sirven para entender como esta funcionando la API mientras responde.

### Resumen de consistencia

La observabilidad queda alineada con el diseno productivo porque:

- se aplica sobre la API, que es el servicio donde ocurren los requests
- usa metricas estandar para revisar uso, errores y tiempos de respuesta
- separa el puerto de la API del puerto de metricas
- mantiene el healthcheck como control de salud del contenedor
- permite construir un dashboard RED en Grafana con los 6 paneles definidos
- permite que en el futuro Prometheus consulte las metricas sin cambiar el flujo principal del sistema
