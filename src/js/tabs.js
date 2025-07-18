const tabsArray = Array.from(document.querySelectorAll(".select-tab"));
const contentArray = Array.from(document.querySelectorAll(".select-content"));

tabsArray.forEach((tab) => {
  tab.addEventListener("click", () => {
    let target = tab;

    tabsArray.forEach((t) => {
      t.classList.remove("bg-blue-200");
    });

    const currentTab = tabsArray.indexOf(target);

    contentArray.forEach((content) => {
      if (contentArray.indexOf(content) === currentTab) {
        content.classList.remove("hidden");
      } else if (contentArray.indexOf(content) !== currentTab) {
        content.classList.add("hidden");
      }
    });

    target.classList.add("bg-blue-200");
  });
});
