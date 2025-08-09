const puppeteer = require("puppeteer");
const preguntarElemento = require("./preguntaElementoAlBuscar");
const exportarExcel = require("./exportarExcel");

(async () => {
  const elementoABuscar = await preguntarElemento();
  const URL = `https://mx.computrabajo.com/trabajo-de-${encodeURIComponent(
    elementoABuscar
  )}`;

  console.log(
    `:::::: Iniciando búsqueda para scrapear: ${elementoABuscar} ::::::`
  );

  const navegador = await puppeteer.launch({
    headless: false,
    slowMo: 400,
    defaultViewport: null,
    args: ["--start-maximized"],
  });

  const pagina = await navegador.newPage();
  await pagina.goto(URL, { waitUntil: "networkidle2" });

  let trabajos = [];
  let paginaActual = 1;
  let btnSiguientePaginaActivo = true;
  let linksGlobales = [];

  while (btnSiguientePaginaActivo) {
    console.log(
      `:::::::::Página ${paginaActual} cargada. Buscando enlaces::::::`
    );

    const linksDeTrabajos = await pagina.evaluate(() => {
      return Array.from(
        document.querySelectorAll("article.box_offer h2.fs18.fwB a")
      ).map((a) => a.href);
    });

    console.log(
      `:::::Se encontraron ${linksDeTrabajos.length} enlaces::::::::`
    );
    linksGlobales.push(...linksDeTrabajos);

    btnSiguientePaginaActivo = await pagina.evaluate(() => {
      const btnSiguiente = Array.from(
        document.querySelectorAll("span.b_primary.w48.buildLink.cp")
      ).find((btn) => btn.getAttribute("title") === "Siguiente");
      if (
        btnSiguiente &&
        !btnSiguiente.classList.contains("s-pagination-disabled")
      ) {
        btnSiguiente.click();
        return true;
      }
      return false;
    });

    if (btnSiguientePaginaActivo) {
      paginaActual++;
      await pagina.waitForNavigation({ waitUntil: "networkidle2" });
    }
  }

  for (const [ofertaA, link] of linksGlobales.entries()) {
    try {
      console.log(
        `::::::Abriendo oferta ${ofertaA + 1} de ${linksGlobales.length}:::::`
      );
      await pagina.goto(link, { waitUntil: "networkidle2" });

      const datosTrabajo = await pagina.evaluate(() => {
        const getText = (selector) =>
          document.querySelector(selector)?.innerText.trim() || "No disponible";

        const titulo = getText(
          "body>main.detail_fs>div.container>h1.fwB.fs24.mb5.box_detail.w100_m"
        );
        const empresa = getText(
          "body>main.detail_fs>div.box_border.menu_top.dFlex>div.container>div.fr.pt10.box_resume.hide_m>div.box_border>div.info_company.dFlex.vm_fx.mb10>div.w100>a.dIB.fs16.js-o-link"
        );
        const ubicacion = getText("body>main.detail_fs>div.container>p.fs16");
        const modalidad = getText(
          "body>main.detail_fs>div.box_border.menu_top.dFlex>div.container>div.box_detail.fl.w100_m>div.mb40.pb40.bb1>div.mbB>:last-of-type"
        );
        const salario = getText(
          "body>main.detail_fs>div.box_border.menu_top.dFlex>div.container>div.box_detail.fl.w100_m>div.mb40.pb40.bb1>div.mbB>:first-of-type"
        );
        const fechaPublicacion = getText(
          "body>main.detail_fs>div.box_border.menu_top.dFlex>div.container>div.box_detail.fl.w100_m>div.mb40.pb40.bb1>p.fc_aux.fs13:last-of-type"
        );
        const descripcion = getText(
          "body>main.detail_fs>div.box_border.menu_top.dFlex>div.container>div.box_detail.fl.w100_m>div.mb40.pb40.bb1>p.mbB"
        );

        return {
          titulo,
          empresa,
          ubicacion,
          modalidad,
          salario,
          fechaPublicacion,
          descripcion,
        };
      });

      trabajos.push(datosTrabajo);
      await new Promise((resolve) => setTimeout(resolve, 500));
    } catch (err) {
      console.error(
        ":::::::Error accediendo al trabajo::::::::::",
        link,
        err.message
      );
    }
  }

  await navegador.close();

  console.log(
    ":::::::::Creando archivo resultadosCompuTrabajo.xlsx...::::::::::::"
  );
  exportarExcel(
    trabajos,
    "resultadosCompuTrabajo.xlsx",
    "./output",
    "trabajos"
  );

  const fs = require("fs");
  const path = require("path");
  const outputDir = "./output";
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir);
  }
  fs.writeFileSync(
    path.join(outputDir, "resultadosCompuTrabajo.json"),
    JSON.stringify(trabajos, null, 2),
    "utf-8"
  );

  console.log(
    "::::::::::::::::.Proceso terminado. Total de trabajos:.::::::::::::",
    trabajos.length
  );
})();
