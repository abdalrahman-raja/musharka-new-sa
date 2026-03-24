// mobile menu

// resetting the bootstrap state of opening the
// document.addEventListener("DOMContentLoaded", () => {
//   console.log(document.querySelector("#primary-dropdown-desktop"));
//   document.querySelector("#primary-dropdown-desktop").click();
// });

const primary = document.getElementById("dropdown-mobile-menu-primary");
const secondary = document.getElementById("dropdown-mobile-menu-secondary");
const views = ["main-view", "first-level", "second-level", "third-level"];

let currentView = 0;

const mainMenuItems = document.querySelectorAll(
  "#mobile-menu .menu-items .main-menu"
);

const firstLevelItemsMenuItems = document.querySelectorAll(
  "#mobile-menu .menu-items .main-menu .first-level-mobile .mobile-menu-item "
);

const secondLevelItems = document.querySelectorAll(
  "#mobile-menu .menu-items .main-menu .first-level-mobile .second-level-mobile "
);
console.log(secondLevelItems);
const thirdLevelItems = document.querySelectorAll(
  "#mobile-menu .menu-items .main-menu .first-level-mobile .second-level-mobile  .third-level-mobile"
);
console.log(thirdLevelItems);
// const firstLevelItems= document.querySelectorAll('')

for (let i = 0; i < mainMenuItems.length; i++) {
  mainMenuItems[i].addEventListener("click", (e) => {
    if (
      mainMenuItems[i].querySelector(".mobile-menu-item").href !==
      "javascript:void(0)"
    ) {
      e.stopPropagation();

      return;
    }

    for (let j = 0; j < mainMenuItems.length; j++) {
      mainMenuItems[j]
        .querySelector(".mobile-menu-item")
        .classList.add("hidden");
    }
    mainMenuItems[i]
      .querySelector(".first-level-mobile")
      .classList.remove("hidden");
    mainMenuItems[i]
      .querySelector(".first-level-mobile")
      .classList.add("shown");
    // hide the toggle dropdowns
    if (currentView === 0) {
      primary.classList.add("hidden");
      secondary.classList.add("hidden");
    }
    if (currentView !== 3) {
      currentView++;
    }
    document.getElementById("mobile-menu-back").classList.remove("hidden");
    e.stopPropagation();
  });
}

for (let i = 0; i < firstLevelItemsMenuItems.length; i++) {
  firstLevelItemsMenuItems[i].addEventListener("click", function (e) {
    console.log(firstLevelItemsMenuItems[i]);
    if (firstLevelItemsMenuItems[i].href !== "javascript:void(0)") {
      console.log("I will return ");
      e.stopPropagation();
      return;
    }
    for (let j = 0; j < firstLevelItemsMenuItems.length; j++) {
      // console.log(firstLevelItemsMenuItems[j]);
      firstLevelItemsMenuItems[j].classList.add("hidden");
    }
    firstLevelItemsMenuItems[i].nextElementSibling.classList.remove("hidden");
    firstLevelItemsMenuItems[i].nextElementSibling.classList.add("shown");

    const menus =
      firstLevelItemsMenuItems[i].nextElementSibling.querySelectorAll(
        ".mobile-menu-item"
      );
    for (let k = 0; k < menus.length; k++) {
      menus[k].classList.remove("hidden");
      menus[k].classList.add("shown");
    }
    if (currentView !== 3) {
      console.log("I will increase it ");
      currentView++;
    }
    e.stopPropagation();
  });
}

document
  .getElementById("mobile-menu-back")
  .addEventListener("click", function () {
    if (currentView === 3) {
      const thirdLevelItem = document.querySelector(
        "#mobile-menu .menu-items .main-menu .first-level-mobile .second-level-mobile .third-level-mobile.shown"
      );
      thirdLevelItem.classList.remove("shown");
      thirdLevelItem.classList.add("hidden");

      const thirdLevelMenuItems =
        thirdLevelItem.querySelectorAll(".mobile-menu-item");
      for (let i = 0; i < thirdLevelMenuItems.length; i++) {
        thirdLevelMenuItems[i].classList.remove("shown");
        thirdLevelMenuItems[i].classList.add("hidden");
      }

      const parentItems =
        thirdLevelItem.parentElement.querySelectorAll(".mobile-menu-item");

      for (let i = 0; i < parentItems.length; i++) {
        parentItems[i].classList.remove("hidden");
        parentItems[i].classList.add("shown");
      }
      currentView--;
    } else if (currentView === 2) {
      const secondLevelItem = document.querySelector(
        "#mobile-menu .menu-items .main-menu .first-level-mobile .second-level-mobile.shown"
      );
      secondLevelItem.classList.remove("shown");
      secondLevelItem.classList.add("hidden");

      const secondLevelMenuItems =
        secondLevelItem.querySelectorAll(".mobile-menu-item");
      for (let i = 0; i < secondLevelMenuItems.length; i++) {
        secondLevelMenuItems[i].classList.remove("shown");
        secondLevelMenuItems[i].classList.add("hidden");
      }

      const parentItems =
        secondLevelItem.parentElement.querySelectorAll(".mobile-menu-item");

      for (let i = 0; i < parentItems.length; i++) {
        parentItems[i].classList.remove("hidden");
        parentItems[i].classList.add("shown");
      }
      currentView--;
    } else if (currentView === 1) {
      primary.classList.remove("hidden");
      secondary.classList.remove("hidden");
      const firstLevelItem = document.querySelector(
        "#mobile-menu .menu-items .main-menu .first-level-mobile.shown"
      );
      firstLevelItem.classList.remove("shown");
      firstLevelItem.classList.add("hidden");

      const firstLevelMenuItems =
        firstLevelItem.querySelectorAll(".mobile-menu-item");
      for (let i = 0; i < firstLevelMenuItems.length; i++) {
        firstLevelMenuItems[i].classList.remove("shown");
        firstLevelMenuItems[i].classList.add("hidden");
      }

      const parentItems =
        firstLevelItem.parentElement.querySelectorAll(".mobile-menu-item");

      for (let i = 0; i < parentItems.length; i++) {
        parentItems[i].classList.remove("hidden");
        parentItems[i].classList.add("shown");
      }
      document
        .querySelectorAll("#mobile-menu .main-menu .mobile-menu-item")
        .forEach((item) => {
          item.classList.remove("hidden");
          item.classList.add("shown");
        });
      currentView--;

      document.getElementById("mobile-menu-back").classList.add("hidden");
    }
  });

document
  .getElementById("mobile-menu-close")
  .addEventListener("click", function () {
    primary.classList.remove("hidden");
    secondary.classList.remove("hidden");
    primary.classList.add("hide-drop-items");
    secondary.classList.add("hide-drop-items");

    // reseting the menu
    for (let i = 0; i < 3; i++)
      document.getElementById("mobile-menu-back").click();
    document.getElementById("mobile-menu").classList.add("hidden");
  });

document.getElementById("burger-menu").addEventListener("click", function () {
  document.getElementById("mobile-menu").classList.remove("hidden");
});

primary.addEventListener("click", () => {
  primary.classList.toggle("hide-drop-items");
});

secondary.addEventListener("click", () => {
  secondary.classList.toggle("hide-drop-items");
});
