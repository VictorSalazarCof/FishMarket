/**
 * BOLETÍN DE ALERTAS — GeoConexión (versión Gmail)
 * --------------------------------------------------
 * Alternativa al feed RSS de Google Alerts (que no está devolviendo
 * resultados). En vez de leer un feed, este script busca directamente
 * los correos de Google Alerts en tu Gmail de las últimas 24 horas,
 * los agrupa por tema y arma el documento del día — igual que la
 * versión anterior, pero por una vía que sí es confiable.
 *
 * CONFIGURACIÓN (hacer una sola vez):
 * 1. En Google Alerts, vuelve a poner "Entregar en" en tu correo
 *    electrónico para las 6 alertas (en vez de Feed RSS).
 * 2. Revisa REMITENTE_ALERTAS más abajo: debe ser la dirección desde la
 *    que te llegan los correos de Alerts (ábrelo uno y confírmalo).
 * 3. Ejecuta manualmente "generarDocumentoDelDia" para probar.
 * 4. Ejecuta una vez "crearDisparadorDiario" para automatizarlo.
 */

const REMITENTE_ALERTAS = "googlealerts-noreply@google.com";

// Palabras clave para reconocer a qué tema pertenece cada correo,
// según lo que aparezca en su asunto. Ajusta si hace falta.
const ETIQUETAS_TEMA = [
  { contiene: "sutran", tema: "Vías y bloqueos" },
  { contiene: "bloqueo", tema: "Vías y bloqueos" },
  { contiene: "carretera", tema: "Vías y bloqueos" },
  { contiene: "sismo", tema: "Sismos" },
  { contiene: "igp", tema: "Sismos" },
  { contiene: "senamhi", tema: "Clima / UV" },
  { contiene: "meteorológico", tema: "Clima / UV" },
  { contiene: "sedapal", tema: "Agua" },
  { contiene: "corte de agua", tema: "Agua" },
  { contiene: "luz del sur", tema: "Energía" },
  { contiene: "pluz", tema: "Energía" },
  { contiene: "corte de luz", tema: "Energía" },
  { contiene: "extorsi", tema: "Seguridad vial" },
  { contiene: "asalto", tema: "Seguridad vial" },
];

const TEMAS_EN_ORDEN = [
  "Vías y bloqueos",
  "Sismos",
  "Clima / UV",
  "Agua",
  "Energía",
  "Seguridad vial",
];

// Déjalo vacío ("") si no quieres recibir aviso por correo.
const CORREO_NOTIFICACION = "";

/**
 * Función principal: busca los correos de Alerts del día, los agrupa
 * por tema y arma el documento.
 */
function generarDocumentoDelDia() {
  const hoy = Utilities.formatDate(new Date(), "GMT-5", "dd/MM/yyyy");
  const porTema = leerCorreosDeAlertas();

  const doc = DocumentApp.create("Alertas GeoConexión - " + hoy);
  const body = doc.getBody();
  body
    .appendParagraph("Alertas del día - " + hoy)
    .setHeading(DocumentApp.ParagraphHeading.TITLE);

  TEMAS_EN_ORDEN.forEach(function (tema) {
    body
      .appendParagraph(tema)
      .setHeading(DocumentApp.ParagraphHeading.HEADING2);
    const items = porTema[tema] || [];
    delete porTema[tema];

    if (items.length === 0) {
      body
        .appendParagraph("Sin correos de esta alerta en las últimas 24 horas.")
        .setItalic(true);
    } else {
      items.forEach(function (item) {
        const p = body.appendParagraph("• " + item.titulo);
        if (item.link) p.editAsText().setLinkUrl(item.link);
      });
    }
  });

  // Cualquier correo de Alerts que no se haya reconocido en los 6 temas
  // (por ejemplo si el asunto no calza con las palabras clave) se
  // muestra igual, para no perder información.
  const temasSobrantes = Object.keys(porTema);
  if (temasSobrantes.length > 0) {
    body
      .appendParagraph("Otras alertas detectadas")
      .setHeading(DocumentApp.ParagraphHeading.HEADING2);
    temasSobrantes.forEach(function (tema) {
      body.appendParagraph(tema).setBold(true);
      porTema[tema].forEach(function (item) {
        const p = body.appendParagraph("• " + item.titulo);
        if (item.link) p.editAsText().setLinkUrl(item.link);
      });
    });
  }

  doc.saveAndClose();
  const url = doc.getUrl();
  Logger.log("Documento del día: " + url);

  if (CORREO_NOTIFICACION) {
    MailApp.sendEmail(
      CORREO_NOTIFICACION,
      "Alertas del día listas - " + hoy,
      "El documento del día está listo, ábrelo y pégalo en el prompt de Gemini:\n" +
        url,
    );
  }

  return url;
}

/**
 * Busca en Gmail los correos de Google Alerts de las últimas 24 horas
 * y los agrupa por tema. Devuelve { "Vías y bloqueos": [items], ... }
 */
function leerCorreosDeAlertas() {
  const porTema = {};
  const hilos = GmailApp.search("from:" + REMITENTE_ALERTAS + " newer_than:1d");

  hilos.forEach(function (hilo) {
    hilo.getMessages().forEach(function (mensaje) {
      const asunto = mensaje.getSubject();
      const tema = etiquetarTema(asunto);
      const items = extraerResultadosDeCorreo(mensaje.getBody());

      if (!porTema[tema]) porTema[tema] = [];
      porTema[tema] = porTema[tema].concat(items);
    });
  });

  // Quita duplicados dentro de cada tema (mismo link).
  Object.keys(porTema).forEach(function (tema) {
    const vistos = {};
    porTema[tema] = porTema[tema].filter(function (item) {
      if (vistos[item.link]) return false;
      vistos[item.link] = true;
      return true;
    });
  });

  return porTema;
}

/** Decide a qué tema pertenece un correo según su asunto. */
function etiquetarTema(asunto) {
  const asuntoMin = asunto.toLowerCase();
  for (let i = 0; i < ETIQUETAS_TEMA.length; i++) {
    if (asuntoMin.indexOf(ETIQUETAS_TEMA[i].contiene.toLowerCase()) !== -1) {
      return ETIQUETAS_TEMA[i].tema;
    }
  }
  return asunto; // no reconocido: usa el asunto tal cual
}

// Textos de botones/links de interfaz que Google Alerts mete en cada
// correo (marcar irrelevante, ver más, editar, etc.) y que NO son
// resultados reales — hay que descartarlos siempre.
const TEXTOS_DE_INTERFAZ = [
  "marcar como no importante",
  "ver más resultados",
  "editar esta alerta",
  "anular la suscripción",
  "ver todas las alertas",
  "enviar comentarios",
  "eliminar esta alerta",
  "administrar alertas",
  "cancelar esta alerta",
];

function esTextoDeInterfaz(titulo) {
  const t = titulo.toLowerCase().trim();
  return TEXTOS_DE_INTERFAZ.some(function (frase) {
    return t === frase || t.indexOf(frase) !== -1;
  });
}

/**
 * Extrae { titulo, link } de cada resultado dentro del HTML de un
 * correo de Google Alerts, descartando links de administración de la
 * alerta (editar, cancelar, ver todos los resultados, etc).
 */
function extraerResultadosDeCorreo(html) {
  const resultados = [];
  const regexAnchor = /<a[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g;
  let match;

  while ((match = regexAnchor.exec(html)) !== null) {
    const hrefCrudo = match[1].replace(/&amp;/g, "&");
    const link = extraerUrlReal(hrefCrudo);
    const titulo = limpiarHtml(match[2]);

    if (!link || !titulo) continue;
    if (titulo.length < 12) continue; // descarta botones/textos cortos
    if (esTextoDeInterfaz(titulo)) continue; // descarta botones conocidos (aunque el link "parezca" válido)
    if (link.indexOf("google.com") !== -1) continue; // descarta links de administración

    resultados.push({ titulo: titulo, link: link });
  }

  return resultados;
}

/** Quita etiquetas HTML y entidades del texto de un resultado. */
function limpiarHtml(texto) {
  return texto
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&")
    .trim();
}

/** Los links de Google Alerts vienen envueltos en una redirección; esto extrae la URL real. */
function extraerUrlReal(googleUrl) {
  const match = googleUrl.match(/[?&]url=([^&]+)/);
  return match ? decodeURIComponent(match[1]) : googleUrl;
}

/**
 * Revisa los correos de las últimas 24h y muestra en el Registro cuántos
 * resultados se detectaron por tema, sin crear un documento. Útil para
 * probar rápido antes de generar el doc real.
 */
function diagnosticarCorreos() {
  const porTema = leerCorreosDeAlertas();
  const temas = Object.keys(porTema);

  if (temas.length === 0) {
    Logger.log(
      "No se encontró ningún correo de " +
        REMITENTE_ALERTAS +
        " en las últimas 24 horas.",
    );
    return;
  }

  temas.forEach(function (tema) {
    Logger.log(tema + ": " + porTema[tema].length + " resultado(s).");
  });
}

/**
 * Ejecutar UNA sola vez (manualmente, desde el editor) para programar
 * la generación automática todos los días a las 7:00 am.
 */
function crearDisparadorDiario() {
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === "generarDocumentoDelDia") {
      ScriptApp.deleteTrigger(t);
    }
  });

  ScriptApp.newTrigger("generarDocumentoDelDia")
    .timeBased()
    .everyDays(1)
    .atHour(11)
    .create();

  Logger.log("Disparador diario creado: todos los días a las 11:00 am.");
}
