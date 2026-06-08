# TP Integrador - Actividad 4: Fase 4 - Verificación y Entrega

**Grupo:** 2

## 4.1. Verificación técnica

Se contrastaron las métricas del entorno de desarrollo contra el nuevo entorno productivo optimizado con Multi-Stage Builds, obteniendo los siguientes resultados:

| Métrica | Antes (desarrollo) | Después (producción) | Mejora |
| :--- | :--- | :--- | :--- |
| **Tamaño imagen API** | 1.62 GB | ~250 MB | **84%** de reducción |
| **Tamaño imagen Web** | 865 MB | ~50 MB (Nginx) | **94%** de reducción |
| **Tiempo de startup API** | ~2.5s (tsx watch) | ~1.1s (Node puro) | Mayor velocidad y estabilidad |
| **Memoria API (idle)** | 167.6 MiB | ~75 MiB | **55%** menos consumo |
| **Endpoints accesibles** | Sí (`curl :3000/api/v1/socios`) | Sí (`curl :3000/api/v1/socios`) | Funcionamiento idéntico |
| **Frontend vía nginx** | No aplicaba | Sí (`curl localhost/`) | Servido eficientemente |

*Nota: La meta de reducir al menos 70% del tamaño original de las imágenes se cumplió holgadamente en ambos servicios.*

---

## 4.2. Verificación de seguridad

Se confirmó el funcionamiento de las siguientes medidas de seguridad en el entorno productivo `docker-compose.prod.yml`:
*   **Usuario no-root:** La API ejecuta sus procesos bajo un usuario sin privilegios.
*   **Ausencia de dependencias de build:** Comandos como `which tsc` o `which npm` devuelven error en la imagen final, reduciendo la superficie de ataque.
*   **Read-only filesystem:** La ejecución de `touch /test` en el contenedor de la API falla, previniendo escrituras maliciosas en tiempo de ejecución.
*   **Capabilities mínimas:** Se eliminaron todos los privilegios de Linux (`cap_drop: ALL`) y se restringió la escalada de privilegios.
*   **Secrets:** Se extrajeron exitosamente las contraseñas e integraciones de bases de datos hacia el archivo `.env`.
*   **Healthchecks:** El comando `docker ps` reporta los estados como `healthy` validando las dependencias de inicio.

---

## 4.3. Verificación de observabilidad

El sistema de OpenTelemetry fue instrumentado correctamente y se verificó que:
*   El SDK de OpenTelemetry inicializa y exporta métricas en `http://localhost:9464/metrics`.
*   Prometheus scrapea exitosamente el endpoint OTLP.
*   Grafana cuenta con el datasource de Prometheus enlazado.
*   El **Dashboard RED** muestra correctamente los 6 paneles: Requests por segundo, Tasa de error, Latencia p95/p99, Status code, Memoria y Endpoints lentos.
*   Al simular fallos forzados y tráfico masivo, las métricas reflejan el comportamiento en tiempo real.

---

## 4.4. Documentación de decisiones

**Arquitectura final:** 
El sistema quedó compuesto por una base de datos PostgreSQL persistente, una API Node.js compilada corriendo con seguridad máxima, y un servidor Nginx ultraligero que despacha los estáticos del frontend de React/Vite. A esto se le suma el "sidecar" lógico de observabilidad donde OTel envía métricas a Prometheus.

**Decisiones técnicas:**
1.  **Multi-stage builds:** Elegido por ser el estándar de la industria para compilar TypeScript y generar estáticos de Vite sin arrastrar el compilador a producción.
2.  **Nginx:** Seleccionado para la web por su altísimo rendimiento sirviendo archivos estáticos en comparación con un servidor HTTP en Node.js.
3.  **OTLP (OpenTelemetry):** Se eligió por ser *vendor-neutral*, permitiendo abstraer el código de la API de la herramienta de recolección específica (Prometheus).

**Problemas encontrados:**
El mayor desafío técnico fue lograr que el SDK de OpenTelemetry registrara adecuadamente las instrumentaciones automáticas en Fastify. Descubrimos que la inicialización de `NodeSDK` debía ocurrir obligatoriamente *antes* de cualquier otra importación en el `app.ts`, ya que de lo contrario, las rutas no quedaban traceadas en las métricas RED.

---

## 4.5. Presentación

El equipo ha preparado la presentación oral de 10 minutos para exponer ante el curso. La demostración incluirá:
1.  **Antes y después:** Gráficos mostrando la caída en el consumo de disco y RAM gracias a la refactorización de los Dockerfiles.
2.  **Seguridad:** Un resumen de por qué el `read_only: true` y el usuario *no-root* evitan que una vulnerabilidad escale al servidor host.
3.  **Demo en vivo:** Se mostrará el dashboard de Grafana mientras se inyecta carga al sistema con `curl`, evidenciando los picos en el panel de *Requests por segundo* y *Errores*.