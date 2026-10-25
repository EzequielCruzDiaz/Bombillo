/**
 * Propuesta para inversión privada y pública. Las cifras con fuente son reales;
 * los precios y proyecciones están marcados como hipótesis a validar.
 */
export function Pitch() {
  return (
    <article className="pitch">
      <section>
        <span className="eyebrow">El problema</span>
        <h3>Nadie sabe con certeza si va a haber luz, ni cuándo vuelve.</h3>
        <ul className="stats">
          <li>
            <b>2</b>
            <span>
              apagones masivos en poco más de tres meses: el general del 11 de noviembre de 2025 y
              el del 23 de febrero de 2026, después de una década sin apagones generales.
            </span>
          </li>
          <li>
            <b>3</b>
            <span>
              distribuidoras, tres formatos distintos: Excel semanal (Edenorte), página web sin
              códigos de circuito (Edesur) y avisos de prensa (Edeeste).
            </span>
          </li>
          <li>
            <b>9.1 h</b>
            <span>
              de corte diario en circuitos clase D, frente a 0.6 h en los clase A (datos CDEEE
              citados por El Día).
            </span>
          </li>
        </ul>
      </section>

      <section>
        <span className="eyebrow">La solución</span>
        <h3>Un solo mapa, en el celular, con lo programado y lo que realmente pasa.</h3>
        <p>
          Bombillo une los avisos oficiales de las tres EDE con reportes ciudadanos validados por
          consenso. Cada dato muestra su procedencia: oficial, prensa o reporte. Así el ciudadano
          planifica su día, la empresa protege su operación y la distribuidora comunica mejor.
        </p>
      </section>

      <section>
        <span className="eyebrow">Modelo de negocio</span>
        <h3>Gratis para la gente. Pagan quienes ganan dinero o eficiencia con el dato.</h3>
        <div className="tiers">
          <div className="tier">
            <h4>Ciudadanos</h4>
            <p className="price">Gratis</p>
            <ul>
              <li>Mapa y avisos de su sector</li>
              <li>Alerta cuando se va y cuando vuelve</li>
              <li>Reportar con un toque</li>
            </ul>
          </div>
          <div className="tier">
            <h4>Empresas</h4>
            <p className="price">
              desde RD$1,500 <small>por sede al mes · hipótesis</small>
            </p>
            <ul>
              <li>Alertas por sucursal (bancos, farmacias, supermercados, hoteles, torres)</li>
              <li>Horas sin luz por local para dimensionar plantas e inversores</li>
              <li>API de estado por zona</li>
            </ul>
          </div>
          <div className="tier">
            <h4>Distribuidoras y Gobierno</h4>
            <p className="price">
              Licencia anual <small>piloto sin costo · hipótesis</small>
            </p>
            <ul>
              <li>Panel programado vs. reportado</li>
              <li>Canal oficial que llega al celular en crisis</li>
              <li>Menos llamadas al call center; datos abiertos (NORTIC A3)</li>
            </ul>
          </div>
          <div className="tier">
            <h4>Energía solar y respaldo</h4>
            <p className="price">
              Por contacto calificado <small>hipótesis</small>
            </p>
            <ul>
              <li>
                Instaladores y vendedores de inversores llegan a las zonas con más horas de corte
              </li>
              <li>Siempre marcado como patrocinado; sin vender datos personales</li>
            </ul>
          </div>
        </div>
      </section>

      <section>
        <span className="eyebrow">Hoja de ruta</span>
        <ol className="roadmap">
          <li>
            <b>Meses 1–3 · MVP</b>
            <span>Ingesta de las tres EDE, mapa web y móvil, reportes con consenso.</span>
          </li>
          <li>
            <b>Meses 4–6 · Alertas y empresas</b>
            <span>
              Push por sector, panel para empresas con varias sedes, primeros clientes pagos.
            </span>
          </li>
          <li>
            <b>Meses 7–12 · Alianza institucional</b>
            <span>Piloto con una distribuidora o el CUED, datos directos y API pública.</span>
          </li>
        </ol>
      </section>

      <section className="ask">
        <span className="eyebrow">Lo que buscamos</span>
        <div className="ask-grid">
          <div>
            <h4>Sector privado</h4>
            <p>
              Capital semilla para 12 meses de operación (equipo de tres e infraestructura),
              estimado en US$60,000–90,000. Cifra a validar con el plan financiero.
            </p>
          </div>
          <div>
            <h4>Sector público</h4>
            <p>
              Acceso a la programación de interrupciones en formato abierto y un piloto con una
              distribuidora. Sin costo de licencia durante el piloto.
            </p>
          </div>
        </div>
      </section>

      <p className="disclaimer">
        Demo con datos reales de octubre de 2026 y eventos históricos, combinados con escenarios
        simulados. Bombillo es un nombre provisional y no está afiliado a ninguna distribuidora.
      </p>
    </article>
  );
}
