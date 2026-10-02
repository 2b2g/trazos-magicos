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
import { iconEl, markEl } from "../ui/mark";

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
          el("div", { class: "avatar", children: [markEl(p.avatar)] }),
          el("div", { class: "name", text: p.name }),
          stars > 0
            ? el("div", {
                class: "stars-mini",
                children: [iconEl("starFilled", "icon icon--gold"), el("span", { text: " " + stars })],
              })
            : el("div", {
                class: "stars-mini",
                children: [iconEl("sparkles"), el("span", { text: " ¡Juega!" })],
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
        el("div", { class: "avatar", children: [iconEl("plus")] }),
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
        children: [markEl(a, "art art--avatar")],
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
          class: "btn btn--coral btn--only",
          attrs: { "aria-label": "Volver" },
          children: [iconEl("arrowLeft")],
          onClick: function () {
            audio.sfx.tap();
            formWrap.classList.add("hidden");
            cardsRow.classList.remove("hidden");
          },
        }),
        el("button", {
          class: "btn btn--green btn--big btn--only",
          attrs: { "aria-label": "Listo" },
          children: [iconEl("check")],
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

  /* El saludo "¿Quién quiere jugar?" NO se pide al arrancar: sin un
     toque previo el navegador rechaza el MP3 y la frase cae a la voz
     del sistema (en muchos equipos, una voz masculina: se oía la voz
     equivocada en la pantalla principal). Se pide en el **primer
     gesto**, ya con el audio desbloqueado, para que suene el clip de
     Paulina. Si ese primer toque ya es elegir jugador, el niño sabe
     qué hacer y el saludo sobra. */
  function isAction(ev?: any): boolean {
    var node: any = ev ? ev.target : null;
    while (node && node !== screen) {
      var tag = String(node.tagName || "").toLowerCase();
      if (tag === "button" || tag === "input" || tag === "select") return true;
      if (String(node.className || "").indexOf("profile-card") >= 0) return true;
      node = node.parentNode;
    }
    return false;
  }

  audio.sayOnFirstGesture(PHRASES.chooseProfile, function (ev?: any): boolean {
    // false = este toque ya elegía jugador: no se le pregunta nada
    return !isAction(ev);
  });

  return screen;
}
