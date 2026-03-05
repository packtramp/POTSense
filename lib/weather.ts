import * as Location from 'expo-location';

export type WeatherData = {
  latitude: number;
  longitude: number;
  surfacePressure: number;      // hPa
  surfacePressureInHg: number;  // inHg (converted)
  temperature: number;           // °C from API
  temperatureF: number;          // °F (converted)
  humidity: number;              // %
  windSpeed: number;             // km/h
  weatherCode: number;
  pressureChange3h: number;      // hPa change over 3 hours
  pressureTrend: 'rising' | 'falling' | 'steady';
  fetchedAt: string;             // ISO timestamp
};

const HPA_TO_INHG = 0.02953;
const C_TO_F = (c: number) => Math.round(c * 9 / 5 + 32);

export async function requestLocationPermission(): Promise<boolean> {
  const { status } = await Location.requestForegroundPermissionsAsync();
  return status === 'granted';
}

export async function getCurrentLocation(): Promise<{ latitude: number; longitude: number } | null> {
  try {
    const hasPermission = await requestLocationPermission();
    if (!hasPermission) return null;

    const location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });
    return {
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
    };
  } catch {
    return null;
  }
}

export async function fetchWeather(lat: number, lon: number): Promise<WeatherData | null> {
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,surface_pressure,relative_humidity_2m,wind_speed_10m,weather_code&hourly=surface_pressure&past_hours=6&forecast_hours=1&timezone=auto`;

    const res = await fetch(url);
    if (!res.ok) return null;

    const data = await res.json();
    const current = data.current;
    const hourlyPressures: number[] = data.hourly?.surface_pressure || [];

    // Calculate 3h pressure change
    const currentPressure = current.surface_pressure;
    let pressureChange3h = 0;
    if (hourlyPressures.length >= 4) {
      // hourly data goes back 6h, so index 0 = 6h ago, last = now
      const threeHoursAgo = hourlyPressures[hourlyPressures.length - 4];
      pressureChange3h = Math.round((currentPressure - threeHoursAgo) * 100) / 100;
    }

    const pressureTrend: WeatherData['pressureTrend'] =
      pressureChange3h < -1 ? 'falling' : pressureChange3h > 1 ? 'rising' : 'steady';

    return {
      latitude: lat,
      longitude: lon,
      surfacePressure: currentPressure,
      surfacePressureInHg: Math.round(currentPressure * HPA_TO_INHG * 100) / 100,
      temperature: current.temperature_2m,
      temperatureF: C_TO_F(current.temperature_2m),
      humidity: current.relative_humidity_2m,
      windSpeed: current.wind_speed_10m,
      weatherCode: current.weather_code,
      pressureChange3h,
      pressureTrend,
      fetchedAt: new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

export async function getWeatherForCurrentLocation(): Promise<WeatherData | null> {
  const coords = await getCurrentLocation();
  if (!coords) return null;
  return fetchWeather(coords.latitude, coords.longitude);
}

// Weather code to description
export function weatherDescription(code: number): string {
  if (code === 0) return 'Clear';
  if (code <= 3) return 'Partly Cloudy';
  if (code <= 48) return 'Foggy';
  if (code <= 57) return 'Drizzle';
  if (code <= 65) return 'Rain';
  if (code <= 67) return 'Freezing Rain';
  if (code <= 77) return 'Snow';
  if (code <= 82) return 'Showers';
  if (code <= 86) return 'Snow Showers';
  if (code <= 99) return 'Thunderstorm';
  return 'Unknown';
}

export function trendArrow(trend: WeatherData['pressureTrend']): string {
  return trend === 'falling' ? '↓' : trend === 'rising' ? '↑' : '→';
}
