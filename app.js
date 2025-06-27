const puppeteer = require("puppeteer");
const preguntarElemento = require("./src/js/preguntaElementoAlBuscar");
const exportarExcel = require("./src/js/exportarExcel");

(async () => {
  const elementoABuscar = await preguntarElemento();
  const URL = `https://mx.computrabajo.com/${encodeURIComponent(
    elementoABuscar
  )}`;

  console.log(
    `::::::iniciando busqueda para scrapear: ${elementoABuscar}:::::::`
  );

  const navegador = await puppeteer.launch({
    headless: false,
    slowMo: 400, // Cambia a true si no quieres ver el navegador
  });

  const pagina = await navegador.newPage();
  await pagina.goto(URL, { waitUntil: "networkidle2" });

  console.log(":::::: Obteniendo datos de compuTrabajo :::::::");
  const titulo = await pagina.title();
  console.log(`Título de la página: ${titulo}`);

  let trabajos = [];
  let paginaActual = 1;

  // Puedes agregar lógica para paginación si lo deseas
  const trabajosObtenidos = await pagina.evaluate(() => {
    const resultados = Array.from(
      document.querySelectorAll(
        "body>main>div.box_border.menu_top>div.container>div.dFlex.dIB_m.w100_m>div.box_grid.parrilla_oferta>article.box_offer"
      )
    );

    return resultados.map((trabajo) => {
      const titulo = trabajo.querySelector(
        "h2.fs18.fwB>a.js-o-link.fc_base"
      )?.innerText;
      const empresa = trabajo.querySelector("a.fc_base.t_ellipsis")?.innerText;
      const ubicacion = trabajo.querySelector(
        "p.fs16.fc_base.mt5>span.mr10"
      )?.innerText;
      const modalidad =
        trabajo.querySelector("div.fs13.mt15>span.dIB.mr10")?.innerText ||
        "No disponible";
      const fechaPublicacion =
        trabajo.querySelector("p.fs13.fc_aux.mt15")?.innerText;

      return {
        titulo: titulo || "No disponible",
        empresa: empresa || "No disponible",
        ubicacion: ubicacion || "No disponible",
        modalidad: modalidad,
        fechaPublicacion: fechaPublicacion || "No disponible",
      };
    });
  });

  console.log(
    `Obtenidos ${trabajosObtenidos.length} trabajos de la página ${paginaActual}`
  );
  trabajos = [...trabajos, ...trabajosObtenidos];

  await navegador.close();

  // Exportar a Excel
  exportarExcel(
    trabajos,
    "resultadosCompuTrabajo.xlsx",
    "./output",
    "trabajos"
  );

  console.log(":::::: Proceso terminado :::::::");
})();
