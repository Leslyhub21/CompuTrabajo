const puppeteer = require("puppeteer");
const preguntarElemento = require("./src/js/preguntaElementoAlBuscar");
const exportarExcel = require("./src/js/exportarExcel");

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
    slowMo: 100,
    defaultViewport: null,
    args: ["--start-maximized"],
  });

  const pagina = await navegador.newPage();
  await pagina.goto(URL, { waitUntil: "networkidle2" });

  let trabajos = [];
  let paginaActual = 1;
  let btnSiguientePaginaActivo = true;

  while (btnSiguientePaginaActivo) {
    console.log(`Página ${paginaActual} cargada. Buscando ofertas...`);

    // Obtener los enlaces de todas las ofertas en la página actual
    const linksDeTrabajos = await pagina.evaluate(() => {
      return Array.from(
        document.querySelectorAll("article.box_offer h2.fs18.fwB a")
      ).map((a) => a.href);
    });

    console.log(`Encontrados ${linksDeTrabajos.length} enlaces de trabajos.`);

    // Recorrer cada enlace individualmente en una nueva pestaña
    for (const link of linksDeTrabajos) {
      try {
        const nuevaPestana = await navegador.newPage();
        await nuevaPestana.goto(link, { waitUntil: "networkidle2" });
        const datosTrabajo = await nuevaPestana.evaluate(() => {
          const getText = (selector) =>
            document.querySelector(selector)?.innerText.trim() ||
            "No disponible";

          const titulo =
            getText(
              "body>main.detail_fs>div.container>h1.fwB.fs24.mb5.box_detail.w100_m"
            ) || "No disponible";
          const empresa = getText(
            "body>main.detail_fs>div.box_border.menu_top.dFlex>div.container>div.fr.pt10.box_resume.hide_m>div.box_border>div.info_company.dFlex.vm_fx.mb10>div.w100>a.dIB.fs16.js-o-link"
          );
          const ubicacion =
            document
              .querySelector("body>main.detail_fs>div.container>p.fs16")
              ?.innerText.trim() || "No disponible";

          const modalidad =
            document.querySelector(
              "body>main.detail_fs>div.box_border.menu_top.dFlex>div.container>div.box_detail.fl.w100_m>div.mb40.pb40.bb1>div.mbB>:last-of-type"
            )?.innerText || "No disponible";

          const salario =
            document
              .querySelector(
                "body>main.detail_fs>div.box_border.menu_top.dFlex>div.container>div.box_detail.fl.w100_m>div.mb40.pb40.bb1>div.mbB>:first-of-type"
              )
              ?.innerText.trim() || "No especificado";

          const fechaPublicacion =
            getText(
              "body>main.detail_fs>div.box_border.menu_top.dFlex>div.container>div.box_detail.fl.w100_m>div.mb40.pb40.bb1>p.fc_aux.fs13:last-of-type"
            ) || "No disponible";
          const descripcion =
            getText(
              "body>main.detail_fs>div.box_border.menu_top.dFlex>div.container>div.box_detail.fl.w100_m>div.mb40.pb40.bb1>p.mbB"
            ) || "No disponible";

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
        await nuevaPestana.close();
        await new Promise((resolve) => setTimeout(resolve, 100));
      } catch (err) {
        console.error("Error accediendo al trabajo:", link, err.message);
      }
    }

    // Verificar si hay más páginas y hacer clic en el botón Siguiente si existe
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
      // Esperar a que la página cambie de contenido
      await pagina.waitForNavigation({ waitUntil: "networkidle2" });
    }
  }

  await navegador.close();

  // Exportar a Excel
  console.log("Creando archivo resultadosCompuTrabajo.xlsx...");
  exportarExcel(
    trabajos,
    "resultadosCompuTrabajo.xlsx",
    "./output",
    "trabajos"
  );

  console.log(
    "::::::::::::::::.Proceso terminado. Total de trabajos:",
    trabajos.length
  );
})();
