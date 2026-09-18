/**
 * A small custom-HTML map marker built on google.maps.OverlayView, used
 * instead of google.maps.marker.AdvancedMarkerElement so the app's existing
 * Tailwind-styled pins (pulsing dots, hover tooltips, etc.) work without
 * requiring a Map ID to be configured in the Cloud Console.
 *
 * Must only be constructed after loadGoogleMaps() has resolved, since it
 * subclasses google.maps.OverlayView which doesn't exist until the Maps JS
 * API script has loaded.
 */
export class HtmlOverlay extends google.maps.OverlayView {
  private div: HTMLDivElement | null = null;
  private position: google.maps.LatLngLiteral;
  private html: string;
  private zIndex: number;
  private onClickHandler?: () => void;

  constructor(
    position: google.maps.LatLngLiteral,
    html: string,
    options: { zIndex?: number; onClick?: () => void } = {}
  ) {
    super();
    this.position = position;
    this.html = html;
    this.zIndex = options.zIndex ?? 0;
    this.onClickHandler = options.onClick;
  }

  onAdd() {
    this.div = document.createElement('div');
    this.div.style.position = 'absolute';
    this.div.style.zIndex = String(this.zIndex);
    this.div.innerHTML = this.html;

    if (this.onClickHandler) {
      this.div.addEventListener('click', (e) => {
        e.stopPropagation();
        this.onClickHandler!();
      });
    }

    const panes = this.getPanes();
    panes?.overlayMouseTarget.appendChild(this.div);
  }

  draw() {
    if (!this.div) return;
    const projection = this.getProjection();
    if (!projection) return;
    const point = projection.fromLatLngToDivPixel(
      new google.maps.LatLng(this.position.lat, this.position.lng)
    );
    if (point) {
      this.div.style.left = `${point.x}px`;
      this.div.style.top = `${point.y}px`;
    }
  }

  onRemove() {
    if (this.div) {
      this.div.parentNode?.removeChild(this.div);
      this.div = null;
    }
  }

  setPosition(position: google.maps.LatLngLiteral) {
    this.position = position;
    this.draw();
  }

  getPosition(): google.maps.LatLngLiteral {
    return this.position;
  }

  setHtml(html: string) {
    this.html = html;
    if (this.div) {
      this.div.innerHTML = html;
    }
  }
}
