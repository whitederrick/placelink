import type { PlaceSummary } from "../schema";

export function FallbackMap({ places }: Readonly<{ places: PlaceSummary[] }>) {
  if (places.length === 0) return <div className="fallback-map"><div className="map-grid" /><div className="map-river" /></div>;
  const latitudes = places.map((place) => place.lat);
  const longitudes = places.map((place) => place.lng);
  const latitudePadding = Math.max((Math.max(...latitudes) - Math.min(...latitudes)) * 0.25, 0.002);
  const longitudePadding = Math.max((Math.max(...longitudes) - Math.min(...longitudes)) * 0.25, 0.002);
  const south = Math.min(...latitudes) - latitudePadding;
  const north = Math.max(...latitudes) + latitudePadding;
  const west = Math.min(...longitudes) - longitudePadding;
  const east = Math.max(...longitudes) + longitudePadding;
  return (
    <div className="fallback-map" aria-hidden="true">
      <div className="map-grid" /><div className="map-river" />
      {places.slice(0, 12).map((place, index) => {
        const left = 8 + ((place.lng - west) / Math.max(east - west, 0.001)) * 84;
        const top = 8 + ((north - place.lat) / Math.max(north - south, 0.001)) * 70;
        return <span className="coordinate-marker" style={{ left: `${left}%`, top: `${top}%` }} title={place.name} key={place.id}>{index + 1}</span>;
      })}
    </div>
  );
}
