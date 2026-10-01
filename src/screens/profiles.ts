/* Pantalla de perfiles: ¿quién quiere jugar?
   Solo emojis y nombres; sin lecturas obligadas (FDD UX §3). */

import { el } from "../util/dom";
import { audio } from "../services/audio";
import { AVATARS, ProfileStore, Profile } from "../services/storage";
import { PHRASES } from "../content/phrases";

export interface ProfilesDeps {
  store: ProfileStore;
  onEnter: (profile: Profile) => void;
}

export function renderProfiles(
  host: { root: HTMLElement },
  deps: ProfilesDeps
): HTMLElement {
  var screen = el("div", { class: "screen" });

  var title = el("div", { class: "logo", html: 'Trazos <span class="spark">Mágicos</span>' });
  var mascot = el("div", {
    class: "mascot-line",
    children: [
      el("div", { class: "mascot", text: "✏️" }),
      el("div", { class: "bubble", text: PHRASES.chooseProfile }),
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
      var card = el("div", {
        class: "profile-card",
        children: [
          el("div", { class: "avatar", text: p.avatar }),
          el("div", { class: "name", text: p.name }),
          el("div", { class: "node__stars", text: starsOf(p) > 0 ? "⭐ " + starsOf(p) : "✨" }),
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
        class: "btn-big btn-big--small",
        text: a,
        style: { fontSize: "7vmin" },
        onClick: function () {
          chosen = a;
          audio.sfx.tap();
          for (var i = 0; i < avatarBtns.length; i++) {
            avatarBtns[i].style.borderColor = avatarBtns[i] === b ? "#58d68d" : "rgba(0,0,0,0.12)";
            avatarBtns[i].style.borderWidth = avatarBtns[i] === b ? "6px" : "4px";
          }
        },
      });
      avatarBtns.push(b);
      avatarRow.appendChild(b);
    });

    var input = el("input", {
      class: "input-name",
      attrs: { type: "text", maxlength: "12", placeholder: "Tu nombre", autocomplete: "off" },
    });

    var rowBtns = el("div", {
      class: "row",
      children: [
        el("button", {
          class: "btn-big btn-big--ghost",
          html: '<span class="emoji">↩️</span>Volver',
          onClick: function () {
            audio.sfx.tap();
            formWrap.classList.add("hidden");
            cardsRow.classList.remove("hidden");
          },
        }),
        el("button", {
          class: "btn-big btn-big--green",
          html: '<span class="emoji">✅</span>¡Listo!',
          onClick: function () {
            var name = (input as HTMLInputElement).value || "Amigo";
            var p = deps.store.createProfile(name, chosen);
            deps.store.setCurrentProfile(p.id);
            audio.sfx.tap();
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
  }

  formWrap.classList.add("hidden");
  buildCards();

  screen.appendChild(title);
  screen.appendChild(mascot);
  screen.appendChild(cardsRow);
  screen.appendChild(formWrap);
  host.root.appendChild(screen);

  setTimeout(function () {
    audio.say(PHRASES.chooseProfile);
  }, 400);

  return screen;
}
