"use client";
import { useState } from "react";

interface LocationLinkProps {
  lat: number | null;
  lng: number | null;
  label: string;
}

// ~300m bounding box around the pin — tight enough to tell "same building"
// from "down the street" without the marker being lost in a wide view.
const MAP_DELTA = 0.003;

// Small pin icon next to a clock-in/out time that opens an inline map
// preview for that exact coordinate — renders nothing when no location was
// recorded (e.g. a shift closed by the stale-shift auto-close job).
export default function LocationLink({ lat, lng, label }: LocationLinkProps) {
  const [open, setOpen] = useState(false);
  if (lat == null || lng == null) return null;

  const embedSrc = `https://www.openstreetmap.org/export/embed.html?bbox=${lng - MAP_DELTA}%2C${lat - MAP_DELTA}%2C${lng + MAP_DELTA}%2C${lat + MAP_DELTA}&layer=mapnik&marker=${lat}%2C${lng}`;
  const googleMapsHref = `https://www.google.com/maps?q=${lat},${lng}`;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="location-link"
        title={`View ${label} location`}
      >
        <span
          className="icon-mask"
          style={{ WebkitMaskImage: "url(/icons/map-pin.svg)", maskImage: "url(/icons/map-pin.svg)" }}
        />
      </button>

      {open && (
        <div className="modal-overlay" onClick={() => setOpen(false)}>
          <div className="modal" style={{ maxWidth: 420 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{label} location</h2>
              <button type="button" className="modal-close" onClick={() => setOpen(false)}>×</button>
            </div>
            <iframe
              key={embedSrc}
              src={embedSrc}
              style={{ width: "100%", height: 260, border: 0, borderRadius: "var(--radius-md, 8px)" }}
              loading="lazy"
              title={`${label} location map`}
            />
            <div className="text-muted" style={{ fontSize: 12, marginTop: 8 }}>
              {lat.toFixed(6)}, {lng.toFixed(6)}
            </div>
            <a
              href={googleMapsHref}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-sm btn-secondary"
              style={{ marginTop: 12, display: "inline-block" }}
            >
              Open in Google Maps
            </a>
          </div>
        </div>
      )}
    </>
  );
}
