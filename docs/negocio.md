# Modelo de negocio

> Documento de trabajo. Las cifras con fuente son reales; precios, costos y metas son
> **hipótesis a validar** con entrevistas y pilotos.

## 1. Problema

| Hecho                                                                                                                                                                                                            | Fuente                         |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------ |
| Apagón general el 11 nov 2025 (13:20), por la salida simultánea de CESPM y Quisqueya; servicio restablecido en menos de 14 h.                                                                                    | El Diario (EC), El Caribe      |
| Apagón masivo el 23 feb 2026 en el Gran Santo Domingo, San Cristóbal, Azua, San Juan y Ocoa, a 3 meses y 12 días del anterior.                                                                                   | El Día                         |
| Horas de corte diarias por clase de circuito: A 0.6 h · B 5 h · C 7.3 h · D 9.1 h. El 54 % de los clientes estaba en circuitos C o D.                                                                            | El Día (datos CDEEE, antiguos) |
| Ernesto (ago 2024): Edeeste restableció 22 circuitos, 84,207 usuarios afectados (10.23 %).                                                                                                                       | Presidencia                    |
| Cada EDE publica distinto: Edenorte (Excel semanal con código de circuito), Edesur (HTML sin código), Edeeste (avisos diarios por prensa; su control de abastecimiento en PDF dejó de actualizarse en feb 2025). | Investigación propia, oct 2026 |

**Dolor por segmento**

- **Ciudadano:** no sabe si va a haber luz, cuánto dura ni si el corte es programado o una avería. Busca en grupos de WhatsApp.
- **Empresa con sedes:** pierde ventas, mercancía refrigerada y horas de personal. No tiene un historial confiable para decidir si invertir en planta o solar.
- **Distribuidora / Gobierno:** saturación del call center en crisis, mala percepción pública, información dispersa que incumple el espíritu de la NORTIC A3 (datos abiertos).

## 2. Propuesta de valor

Un mapa único, en el celular, con **lo programado** (fuentes oficiales normalizadas) y **lo que realmente pasa** (reportes ciudadanos con consenso). Cada dato declara su procedencia: oficial, prensa o simulado/reportado.

## 3. Segmentos y monetización

| Segmento                          | Producto                                                                                     | Precio (hipótesis)                          | Métrica clave                                         |
| --------------------------------- | -------------------------------------------------------------------------------------------- | ------------------------------------------- | ----------------------------------------------------- |
| Ciudadanos (B2C)                  | App gratis: mapa, alertas de su sector, reportar                                             | Gratis                                      | Usuarios activos semanales, reportes/día              |
| Empresas multisede (B2B)          | Bombillo Pro: alertas por sucursal, reporte mensual de horas sin luz por local, API por zona | RD$1,500 por sede/mes; API desde US$300/mes | MRR, sedes activas, churn                             |
| Distribuidoras / CUED / SIE (B2G) | Panel programado vs. reportado, canal oficial de avisos, exportación en datos abiertos       | Licencia anual; piloto sin costo            | Llamadas evitadas, tiempo de restablecimiento visible |
| Energía solar y respaldo (B2B2C)  | Contactos calificados en zonas con más horas de corte                                        | Por contacto                                | Costo por contacto, conversión                        |
| Aseguradoras / inmobiliarias      | Índice de confiabilidad eléctrica por sector (agregado, anónimo)                             | Suscripción de datos                        | Contratos de datos                                    |

**Reglas no negociables:** no se venden datos personales; todo patrocinio se marca; los reportes se guardan con un hash del dispositivo, nunca con su identificador.

## 4. Ventaja competitiva

1. **Normalización de tres fuentes heterogéneas** con el código de circuito como llave común.
2. **Consenso ciudadano** (umbral de reportes + reputación) que convierte ruido en señal.
3. **Procedencia explícita** en cada dato: confianza para el público y defensa ante las EDE.
4. Competencia actual: una app iOS (Apagones RD, jul 2026) basada solo en datos oficiales, sin reportes ciudadanos, con menos de 1k descargas y sin Android.

## 5. Hoja de ruta

| Fase          | Plazo      | Entregable                                                | Hito de validación                     |
| ------------- | ---------- | --------------------------------------------------------- | -------------------------------------- |
| MVP           | Meses 1–3  | Ingesta automática de las 3 EDE, mapa web + PWA, reportes | 5,000 usuarios en una provincia piloto |
| Alertas y B2B | Meses 4–6  | Push por sector, panel multisede                          | 10 empresas pagando                    |
| Institucional | Meses 7–12 | Piloto con una EDE o el CUED, API pública                 | Convenio firmado                       |

## 6. Lo que se pide

- **Sector privado:** capital semilla para 12 meses (equipo de 3 + infraestructura), estimado en US$60,000–90,000. _Validar con plan financiero._
- **Sector público:** programación de interrupciones en formato abierto (JSON/CSV) con código de circuito, y un piloto con una distribuidora.

## 7. Riesgos

| Riesgo                                       | Mitigación                                                         |
| -------------------------------------------- | ------------------------------------------------------------------ |
| Cambios de formato en las webs de las EDE    | Adaptador por fuente, guardar el crudo, alertas si el parser falla |
| Reportes falsos o coordinados                | Consenso, límite por dispositivo, reputación                       |
| Dependencia de una sola fuente institucional | Diversificar: oficial + prensa + ciudadanos                        |
| Percepción de "competir" con las EDE         | Posicionarse como canal complementario; piloto gratuito            |

## 8. Lean Canvas

| Bloque              | Contenido                                                                                                                                                               |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Problema**        | 1) No se sabe si habrá luz ni cuándo vuelve. 2) Información dispersa en tres formatos y en WhatsApp. 3) Empresas sin historial para decidir inversiones en respaldo.    |
| **Segmentos**       | Ciudadanos con celular (usuarios), empresas multisede (pagadores), EDE y Gobierno (aliados y pagadores), instaladores solares (anunciantes).                            |
| **Propuesta única** | El único mapa que combina lo programado oficial con lo que realmente pasa, con la fuente de cada dato a la vista.                                                       |
| **Solución**        | Mapa web y móvil, alertas por sector, reportes con consenso, panel para empresas y para distribuidoras.                                                                 |
| **Canales**         | Tráfico orgánico en días de apagón (páginas "¿Hay luz en …?"), redes sociales, medios que ya publican los avisos, alianzas con juntas de vecinos y cámaras de comercio. |
| **Ingresos**        | Suscripción B2B por sede, licencia B2G, contactos calificados de energía solar, datos agregados.                                                                        |
| **Costos**          | Equipo (3 personas), infraestructura (base de datos, mapas, push), adquisición en redes, legal.                                                                         |
| **Métricas clave**  | Usuarios activos semanales, reportes por usuario, sedes B2B activas, % de cortes detectados antes del aviso oficial.                                                    |
| **Ventaja injusta** | Datos normalizados de las tres EDE + red de reportes que crece con cada apagón (efecto de red local).                                                                   |

## 9. Economía unitaria (hipótesis para validar)

| Supuesto                                             | Valor inicial        | Cómo validarlo                             |
| ---------------------------------------------------- | -------------------- | ------------------------------------------ |
| Costo de infraestructura por 10,000 usuarios activos | US$40–80/mes         | Medir en el piloto                         |
| Precio B2B por sede                                  | RD$1,500/mes         | 20 entrevistas con gerentes de operaciones |
| Sedes promedio por cliente B2B                       | 5                    | Mismas entrevistas                         |
| Churn mensual B2B                                    | 3 %                  | Primeros 6 meses de clientes               |
| Costo de adquisición B2B                             | 1 mes de suscripción | Venta directa en el piloto                 |

Con estos supuestos, un cliente B2B de 5 sedes paga RD$7,500/mes; 40 clientes cubren un equipo pequeño. Todo se recalcula con datos del piloto.

## 10. Salida al mercado

1. **Provincia piloto:** elegir una zona con muchos cortes y comunidad activa (por ejemplo, Santo Domingo Este o Santiago) y concentrar ahí la adquisición.
2. **Momento de crecimiento:** cada apagón masivo dispara búsquedas. Tener listas páginas por provincia y un mensaje para compartir en WhatsApp.
3. **Primeros clientes B2B:** farmacias, colmados grandes, panaderías y clínicas con varias sedes; el dolor (mercancía refrigerada, ventas perdidas) es inmediato.
4. **Institucional:** presentar a una distribuidora el dato de "averías detectadas antes del aviso oficial" con evidencia del piloto.

## 11. Preguntas abiertas

- ¿Las EDE o el CUED publican la programación en algún formato estructurado no público? (Consulta interna vía OGTIC.)
- ¿Qué tan dispuestas están las empresas a pagar por alertas, frente a usar grupos de WhatsApp gratis?
- ¿Licencia cerrada, AGPL o núcleo abierto? (Ver `docs/stack.md`.)

## 12. Guía de entrevista (negocios multisede)

Duración: 20 minutos. Objetivo: entender el dolor, no vender.

1. ¿Cuántas sedes tienen y en qué provincias?
2. Cuéntame el último apagón que les afectó. ¿Qué pasó, cuánto duró, cómo se enteraron?
3. ¿Qué pierden cuando se va la luz? (ventas, mercancía, horas de personal, equipos)
4. ¿Cómo saben hoy si una sede está sin luz? ¿Quién avisa?
5. ¿Tienen planta o inversor? ¿Cómo decidieron cuál comprar y dónde?
6. Si recibieran una alerta en el momento en que una sede se queda sin luz, ¿qué harían distinto?
7. ¿Quién decide una compra así y con qué presupuesto?
8. Mostrar la demo. ¿Qué es lo primero que mirarían? ¿Qué falta?
9. Si costara RD$1,500 por sede al mes, ¿lo pagarían? ¿Y a la mitad o al doble?

Registrar respuestas en una hoja común: segmento, sedes, dolor (1–5), precio aceptado.
