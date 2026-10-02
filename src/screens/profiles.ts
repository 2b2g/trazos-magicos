/* Pantalla de inicio (Garabati): ¿quién quiere jugar?
   Solo emojis, nombres y voz; nada que haya que leer (guía UX §2).
   Jerarquía plana: aquí solo se elige jugador o se crea uno. */

import { el } from "../util/dom";
import { audio } from "../services/audio";
import { AVATARS, ProfileStore, Profile } from "../services/storage";
import { PHRASES } from "../content/phrases";
import { mascotEl } from "../ui/mascot";
import { skyDeco } from "../ui/decor";
import { confetti } from "../util/fx";
import { BRAND } from "../content/brand";

export interface ProfilesDeps {
  store: ProfileStore;
  onEnter: (profile: Profile) => void;
}

/** Reparte las letras del logo para pintarlas de colores (CSS nth-child). */
function logoSpan(): HTMLElement {
  var logo = el("div", { class: "logo" });
  for (var i = 0; i < BRAND.name.length; i++) {
    logo.appendChild(el("span", { text: BRAND.name.charAt(i) }));
  }
  return logo;
}

export function renderProfiles(
  host: { root: HTMLElement },
  deps: ProfilesDeps
): HTMLElement {
  var screen = el("div", { class: "screen screen--sky" });
  screen.appendChild(skyDeco());

  var title = logoSpan();
  var bubbleEl = el("div", { class: "bubble bubble--left", text: PHRASES.chooseProfile });
  var mascotLine = el("div", {
    class: "mascot-line",
    children: [
      mascotEl({ mood: "idle", stars: deps.store.totalStars() }),
      bubbleEl,
    ],
  });
  var cardsRow = el("div", { class: "row" });

  function starsOf(p: Profile): number {
    var total = 0;
    for (var k in p.progress) if (p.progress.hasOwnProperty(k)) total += p.progress[k].stars;
    return total;
  }

  function buildCards(): void {
    while (cardsRow.firstChild) cardsRow.removeChild(cardsRow.firstChild);
    var list = deps.store.listProfiles();

    list.forEach(function (p) {
      var stars = starsOf(p);
      var card = el("div", {
        class: "profile-card",
        attrs: { "aria-label": p.name },
        children: [
          el("div", { class: "avatar", text: p.avatar }),
          el("div", { class: "name", text: p.name }),
          el("div", {
            class: "stars-mini",
            text: stars > 0 ? "⭐ " + stars : "✨ ¡Juega!",
          }),
        ],
        onClick: function () {
          audio.sfx.unlock();
          audio.sfx.tap();
          deps.store.setCurrentProfile(p.id);
          deps.onEnter(p);
        },
      });
      cardsRow.appendChild(card);
    });

    var add = el("div", {
      class: "profile-card profile-card--add",
      attrs: { "aria-label": "Nuevo jugador" },
      children: [
        el("div", { class: "avatar", text: "➕" }),
        el("div", { class: "name", text: "Nuevo" }),
      ],
      onClick: function () {
        audio.sfx.unlock();
        audio.sfx.tap();
        buildCreateForm();
      },
    });
    cardsRow.appendChild(add);
  }

  var formWrap = el("div", { class: "col" });

  function buildCreateForm(): void {
    while (formWrap.firstChild) formWrap.removeChild(formWrap.firstChild);
    var chosen: string = AVATARS[Math.floor(Math.random() * AVATARS.length)];

    var avatarRow = el("div", { class: "row" });
    var avatarBtns: HTMLElement[] = [];
    AVATARS.forEach(function (a) {
      var b = el("button", {
        class: "btn btn--white btn--icon avatar-pick" + (a === chosen ? " avatar-pick--on" : ""),
        attrs: { "aria-label": "Avatar " + a },
        children: [el("span", { class: "btn__emoji", text: a })],
        onClick: function () {
          chosen = a;
          audio.sfx.tap();
          for (var i = 0; i < avatarBtns.length; i++) {
            avatarBtns[i].className =
              "btn btn--white btn--icon avatar-pick" + (avatarBtns[i] === b ? " avatar-pick--on" : "");
          }
        },
      });
      avatarBtns.push(b);
      avatarRow.appendChild(b);
    });

    var input = el("input", {
      class: "input-name",
      attrs: {
        type: "text",
        maxlength: "12",
        placeholder: "Tu nombre",
        autocomplete: "off",
        "aria-label": "Tu nombre",
      },
    });

    var rowBtns = el("div", {
      class: "row",
      children: [
        el("button", {
          class: "btn btn--coral",
          attrs: { "aria-label": "Volver" },
          children: [el("span", { class: "btn__emoji", text: "⬅️" }), el("span", { text: "Volver" })],
          onClick: function () {
            audio.sfx.tap();
            formWrap.classList.add("hidden");
            cardsRow.classList.remove("hidden");
          },
        }),
        el("button", {
          class: "btn btn--green btn--big",
          attrs: { "aria-label": "Listo" },
          children: [el("span", { class: "btn__emoji", text: "😊" }), el("span", { text: "¡Listo!" })],
          onClick: function () {
            var name = ((input as HTMLInputElement).value || "Amigo").slice(0, 12);
            var p = deps.store.createProfile(name, chosen);
            deps.store.setCurrentProfile(p.id);
            // mini celebración de bienvenida antes de entrar
            confetti(screen, 16);
            audio.sfx.unlockPrize();
            deps.onEnter(p);
          },
        }),
      ],
    });

    formWrap.appendChild(avatarRow);
    formWrap.appendChild(input);
    formWrap.appendChild(rowBtns);
    formWrap.classList.remove("hidden");
    cardsRow.classList.add("hidden");
    setTimeout(function () {
      try {
        (input as HTMLInputElement).focus();
      } catch (e) {
        /* sin foco: el niño puede tocar el campo */
      }
    }, 300);
  }

  formWrap.classList.add("hidden");
  buildCards();

  screen.appendChild(title);
  screen.appendChild(el("div", { class: "subtitle", text: "Dibujar es jugar" }));
  screen.appendChild(mascotLine);
  screen.appendChild(cardsRow);
  screen.appendChild(formWrap);
  host.root.appendChild(screen);

  setTimeout(function () {
    audio.say(PHRASES.chooseProfile);
  }, 400);

  return screen;
}
