/* Utilidades DOM en ES5: creación de nodos, cambio de pantalla, toast. */

export interface ElProps {
  class?: string;
  text?: string;
  html?: string;
  attrs?: Record<string, string>;
  style?: Record<string, string>;
  children?: HTMLElement[];
  onClick?: (e: Event) => void;
}

/**
 * Crea un nodo DOM con estilo compacto y ES5-safe.
 * @example el("button", { class: "btn-big", text: "✏️", onClick: fn })
 */
export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  props?: ElProps
): HTMLElementTagNameMap[K] {
  var node = document.createElement(tag);
  if (props) {
    if (props.class) node.className = props.class;
    if (props.text !== undefined) node.textContent = props.text;
    if (props.html !== undefined) node.innerHTML = props.html;
    if (props.attrs) {
      for (var k in props.attrs) {
        if (props.attrs.hasOwnProperty(k)) node.setAttribute(k, props.attrs[k]);
      }
    }
    if (props.style) {
      for (var s in props.style) {
        if (props.style.hasOwnProperty(s)) (node.style as any)[s] = props.style[s];
      }
    }
    if (props.children) {
      for (var i = 0; i < props.children.length; i++) node.appendChild(props.children[i]);
    }
    if (props.onClick) node.addEventListener("click", props.onClick);
  }
  return node;
}

export type ScreenHost = { root: HTMLElement };

/** Muestra una pantalla (oculta las demás). Las pantallas viven mientras duro. */
/** Muestra una pantalla y oculta el resto (excepto `keepOthers`). */
export function showScreen(host: ScreenHost, screen: HTMLElement, keepOthers?: HTMLElement[]): void {
  var root = host.root;
  var children = Array.prototype.slice.call(root.children);
  for (var i = 0; i < children.length; i++) {
    var c = children[i] as HTMLElement;
    if (c !== screen && (!keepOthers || keepOthers.indexOf(c) === -1)) {
      c.classList.add("hidden");
    }
  }
  screen.classList.remove("hidden");
}

export function removeScreen(host: ScreenHost, screen: HTMLElement | null): void {
  if (screen && screen.parentElement === host.root) {
    host.root.removeChild(screen);
  }
}

let toastTimer: any = null;

/** Mensaje efímero en la parte inferior (2.6 s) para el adulto. */
export function toast(host: ScreenHost, message: string): void {
  var old = host.root.querySelector(".toast");
  if (old) old.parentElement && old.parentElement.removeChild(old);
  var t = el("div", { class: "toast", text: message });
  host.root.appendChild(t);
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(function () {
    if (t.parentElement) t.parentElement.removeChild(t);
  }, 2600);
}

/**
 * Vibración corta como refuerzo al completar un trazo.
 * Silenciosa donde no exista la API (iOS Web viejos).
 */
export function buzz(ms?: number): void {
  try {
    if ((navigator as any).vibrate) (navigator as any).vibrate(ms || 30);
  } catch (e) {
    /* noop */
  }
}

/**
 * Puerta parental: reexport con tipos cómodos del hold del motor.
 * (La implementación real vive en engine/touch.ts.)
 */
export { attachHold as attachHoldSafe } from "../engine/touch";
