interface FlyerPoint {
  x: number;
  y: number;
  transform(scale: number, anchor?: FlyerPoint): FlyerPoint;
}

interface FlyerPointConstructor {
  new (x: number, y: number): FlyerPoint;
  prototype: FlyerPoint;
}

interface FlyerViewerWindow extends Window {
  Chirashi?: {
    prototype: object;
  };
  Point?: FlyerPointConstructor;
}

const stepThreshold = 60;
const cooldownMilliseconds = 120;
const resetMilliseconds = 180;

const viewerWindow = window as FlyerViewerWindow;
const patchedPointPrototypes = new WeakSet<object>();

let accumulatedDelta = 0;
let cooldownUntil = 0;
let resetTimer: number | undefined;
let pointerTransformActive = false;
let pointerTransformTimer: number | undefined;

installViewerPatches();
window.addEventListener("load", installViewerPatches, {
  capture: true,
  once: true,
});
window.addEventListener("wheel", handleWheel, {
  capture: true,
  passive: false,
});

function installViewerPatches(): void {
  const chirashiPrototype = viewerWindow.Chirashi?.prototype;
  if (chirashiPrototype) {
    for (const property of ["transitionDuration", "transitionDurationEnd"]) {
      Object.defineProperty(chirashiPrototype, property, {
        configurable: true,
        get: () => 0,
        set: () => {},
      });
    }
  }

  const pointPrototype = viewerWindow.Point?.prototype;
  if (pointPrototype && !patchedPointPrototypes.has(pointPrototype)) {
    patchedPointPrototypes.add(pointPrototype);
    const originalTransform = pointPrototype.transform;

    pointPrototype.transform = function transformAroundPointer(
      scale,
      anchor,
    ): FlyerPoint {
      if (!pointerTransformActive || !anchor) {
        return originalTransform.call(this, scale, anchor);
      }

      this.x = this.x * scale + anchor.x * (scale - 1);
      this.y = this.y * scale + anchor.y * (scale - 1);
      return this;
    };
  }

  if (!document.querySelector("style[data-shufoo-wheel-zoom]")) {
    const style = document.createElement("style");
    style.dataset.shufooWheelZoom = "";
    style.textContent = ".ChirashiContainer { transition-duration: 0s !important; }";
    document.head?.appendChild(style);
  }
}

function handleWheel(event: WheelEvent): void {
  if (event.ctrlKey || event.metaKey || event.altKey || event.shiftKey) return;
  if (Math.abs(event.deltaY) < Math.abs(event.deltaX)) return;
  if (!(event.target instanceof Element)) return;

  const viewer = document.querySelector<HTMLElement>("#chirashi_area.flash")
    ?? document.querySelector<HTMLElement>("#chirashi_area");
  if (!viewer?.contains(event.target) || event.target.closest(".toolbar")) return;

  const delta = normaliseDelta(event);
  const direction = Math.sign(delta);
  if (direction === 0) return;

  const control = document.querySelector<HTMLElement>(
    direction < 0 ? ".zoomInButton" : ".zoomOutButton",
  );
  if (!control || control.classList.contains("btn_disabled")) return;

  event.preventDefault();

  const now = Date.now();
  if (now < cooldownUntil) {
    accumulatedDelta = 0;
    scheduleReset();
    return;
  }

  if (accumulatedDelta !== 0 && Math.sign(accumulatedDelta) !== direction) {
    accumulatedDelta = 0;
  }

  accumulatedDelta += delta;
  scheduleReset();
  if (Math.abs(accumulatedDelta) < stepThreshold) return;

  accumulatedDelta = 0;
  cooldownUntil = now + cooldownMilliseconds;
  clickNativeZoomAtPointer(control, viewer, event);
}

function clickNativeZoomAtPointer(
  control: HTMLElement,
  viewer: HTMLElement,
  event: WheelEvent,
): void {
  const OriginalPoint = viewerWindow.Point;
  if (!OriginalPoint) {
    control.click();
    return;
  }

  const viewerRect = viewer.getBoundingClientRect();
  const pointerX = event.clientX - viewerRect.left;
  const pointerY = event.clientY - viewerRect.top;
  const centreX = viewer.clientWidth / 2;
  const centreY = viewer.clientHeight / 2;
  let centreReplaced = false;

  viewerWindow.Point = new Proxy(OriginalPoint, {
    construct(target, argumentsList) {
      let pointArguments = argumentsList;
      if (
        !centreReplaced
        && Math.abs(Number(argumentsList[0]) - centreX) < 0.5
        && Math.abs(Number(argumentsList[1]) - centreY) < 0.5
      ) {
        centreReplaced = true;
        pointArguments = [pointerX, pointerY];
      }
      return Reflect.construct(target, pointArguments, target);
    },
  });

  pointerTransformActive = true;
  window.clearTimeout(pointerTransformTimer);
  try {
    control.click();
  } finally {
    viewerWindow.Point = OriginalPoint;
    pointerTransformTimer = window.setTimeout(() => {
      pointerTransformActive = false;
    }, 1_000);
  }
}

function normaliseDelta(event: WheelEvent): number {
  if (event.deltaMode === WheelEvent.DOM_DELTA_LINE) return event.deltaY * 16;
  if (event.deltaMode === WheelEvent.DOM_DELTA_PAGE) {
    return event.deltaY * window.innerHeight;
  }
  return event.deltaY;
}

function scheduleReset(): void {
  window.clearTimeout(resetTimer);
  resetTimer = window.setTimeout(() => {
    accumulatedDelta = 0;
  }, resetMilliseconds);
}
