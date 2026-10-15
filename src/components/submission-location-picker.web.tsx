import {
  Map as MapLibreMap,
  Marker,
  setWorkerUrl,
} from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useEffect, useRef } from 'react';

import type {
  SubmissionCoordinates,
  SubmissionLocationPickerProps,
} from './submission-location-picker.types';

const STORYBOOK_MAP_STYLE =
  'https://tiles.openfreemap.org/styles/liberty';

function createPinElement() {
  const wrapper = document.createElement('div');
  wrapper.setAttribute('aria-label', 'Selected proposed location');
  wrapper.style.cssText = [
    'width:44px',
    'height:54px',
    'position:relative',
    'display:flex',
    'align-items:center',
    'justify-content:flex-start',
    'flex-direction:column',
  ].join(';');

  const circle = document.createElement('div');
  circle.textContent = '★';
  circle.style.cssText = [
    'width:44px',
    'height:44px',
    'border-radius:22px',
    'box-sizing:border-box',
    'border:3px solid #FFFDF2',
    'background:#A43C32',
    'color:#FFFDF2',
    'display:flex',
    'align-items:center',
    'justify-content:center',
    'font-size:20px',
    'font-weight:800',
    'box-shadow:0 2px 6px rgba(0,0,0,.3)',
  ].join(';');
  const point = document.createElement('div');
  point.style.cssText = [
    'width:0',
    'height:0',
    'margin-top:-3px',
    'border-left:8px solid transparent',
    'border-right:8px solid transparent',
    'border-top:13px solid #A43C32',
  ].join(';');
  wrapper.append(circle, point);
  return wrapper;
}

export function SubmissionLocationPicker({
  center,
  selectedCoordinates,
  onSelect,
}: SubmissionLocationPickerProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const markerRef = useRef<Marker | null>(null);
  const onSelectRef = useRef(onSelect);
  const initialCenterRef = useRef(center);

  useEffect(() => {
    onSelectRef.current = onSelect;
  }, [onSelect]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) {
      return;
    }

    setWorkerUrl(
      new URL('/maplibre-gl-worker.mjs', window.location.origin).toString(),
    );
    const map = new MapLibreMap({
      container: containerRef.current,
      style: STORYBOOK_MAP_STYLE,
      center: initialCenterRef.current,
      zoom: 16,
      pitch: 0,
      bearing: 0,
      minZoom: 11,
      maxZoom: 20,
      attributionControl: { compact: true },
      dragRotate: false,
      pitchWithRotate: false,
    });
    mapRef.current = map;
    map.on('click', (event) => {
      onSelectRef.current([event.lngLat.lng, event.lngLat.lat]);
    });

    return () => {
      markerRef.current?.remove();
      markerRef.current = null;
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    mapRef.current?.easeTo({
      center,
      zoom: 16,
      duration: 650,
    });
  }, [center]);

  useEffect(() => {
    if (!selectedCoordinates) {
      markerRef.current?.remove();
      markerRef.current = null;
      return;
    }

    const map = mapRef.current;
    if (!map) {
      return;
    }

    if (!markerRef.current) {
      markerRef.current = new Marker({
        anchor: 'bottom',
        element: createPinElement(),
      })
        .setLngLat(selectedCoordinates)
        .addTo(map);
      return;
    }
    markerRef.current.setLngLat(selectedCoordinates);
  }, [selectedCoordinates]);

  return (
    <div
      ref={containerRef}
      aria-label="Location pin map. Click the map to place the proposed location pin."
      role="application"
      style={{
        border: '1px solid #C8BF9A',
        borderRadius: 16,
        height: 320,
        overflow: 'hidden',
        position: 'relative',
        width: '100%',
      }}
    >
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          zIndex: 2,
          bottom: 8,
          left: '50%',
          transform: 'translateX(-50%)',
          pointerEvents: 'none',
          whiteSpace: 'nowrap',
          background: 'rgba(255,253,242,.94)',
          border: '1px solid #C8BF9A',
          borderRadius: 999,
          color: '#2E2D25',
          fontSize: 13,
          fontWeight: 700,
          padding: '4px 16px',
        }}
      >
        Click to place the pin
      </div>
    </div>
  );
}

export type { SubmissionCoordinates };
