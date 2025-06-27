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
    slowMo: 400,
    defaultViewport: null,
    args: ["--start-maximized"],
  });

  const pagina = await navegador.newPage();
  await pagina.goto(URL, { waitUntil: "networkidle2" });

  const titulo = await pagina.title();
  console.log(`Título de la página: ${titulo}`);

  let trabajos = [];
  let paginaActual = 1;
  let btnSiguientePaginaActivo = true;

  while (btnSiguientePaginaActivo) {
    const trabajosObtenidos = await pagina.evaluate(() => {
      const resultados = Array.from(
        document.querySelectorAll("article.box_offer")
      );

      return resultados.map((trabajo) => {
        const titulo =
          trabajo.querySelector("h2.fs18.fwB a")?.innerText || "No disponible";
        const empresa =
          trabajo.querySelector("a.fc_base.t_ellipsis")?.innerText ||
          "No disponible";

        const ubicacionSpan = Array.from(
          trabajo.querySelectorAll("p.fs16 span")
        ).find(
          (span) => span.innerText && !span.innerText.match(/^\d+(\.\d+)?$/)
        );
        const ubicacion = ubicacionSpan?.innerText || "No disponible";

        const icono = trabajo.querySelector(
          "div.fs13.mt15 > span.dIB.mr10 > span.icon.i_home_office"
        );
        const modalidad = icono
          ? icono.parentElement?.innerText.trim()
          : "No disponible";

        const salarioSpan = Array.from(
          trabajo.querySelectorAll("div.fs13.mt15 > span.dIB.mr10")
        ).find((span) => span.innerText?.includes("$"));
        const salario = salarioSpan?.innerText.trim() || "No especificado";

        const fechaPublicacion =
          trabajo.querySelector("p.fs13.fc_aux.mt15")?.innerText;

        const descripcion =
          trabajo
            .querySelector(
              "div.box_detail > div > div  > div > div.fs16.t_word_wrap"
            )
            ?.innerText.trim() || "No disponible";

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
    });

    console.log(
      `Obtenidos ${trabajosObtenidos.length} trabajos de la página ${paginaActual}`
    );
    trabajos = [...trabajos, ...trabajosObtenidos];
    paginaActual++;

    // Verificar si hay botón "Siguiente"
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
      } else {
        return false;
      }
    });

    // Esperar que cargue nueva página si hay más
    if (btnSiguientePaginaActivo) {
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
  }

  await navegador.close();

  // Exportar a Excel
  console.log("::: creando el archivo resultadosCompuTrabajo.xlsx :::");
  exportarExcel(
    trabajos,
    "resultadosCompuTrabajo.xlsx",
    "./output",
    "trabajos"
  );

  console.log(":::::: Proceso terminado ::::::");
})();
