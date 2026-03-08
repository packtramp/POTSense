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
  pressureChange1h: number;      // hPa change over 1 hour
  pressureChange3h: number;      // hPa change over 3 hours
  pressureChange6h: number;      // hPa change over 6 hours
  pressureChange24h: number;     // hPa change over 24 hours
  pressureRatePerHour: number;   // avg hPa/hour over 3h (for rate classification)
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
    // Fetch 25 hours of history to calculate 1h, 3h, 6h, and 24h pressure changes
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,surface_pressure,relative_humidity_2m,wind_speed_10m,weather_code&hourly=surface_pressure&past_hours=25&forecast_hours=1&timezone=auto`;

    const res = await fetch(url);
    if (!res.ok) return null;

    const data = await res.json();
    const current = data.current;
    const hourlyPressures: number[] = data.hourly?.surface_pressure || [];
    const currentPressure = current.surface_pressure;
    const len = hourlyPressures.length;

    // Calculate pressure changes over multiple windows
    // Array: index 0 = 25h ago, last = current hour
    const calcChange = (hoursBack: number) => {
      const idx = len - 1 - hoursBack;
      if (idx >= 0 && hourlyPressures[idx] != null) {
        return Math.round((currentPressure - hourlyPressures[idx]) * 100) / 100;
      }
      return 0;
    };

    const pressureChange1h = calcChange(1);
    const pressureChange3h = calcChange(3);
    const pressureChange6h = calcChange(6);
    const pressureChange24h = calcChange(24);
    const pressureRatePerHour = pressureChange3h !== 0 ? Math.round((pressureChange3h / 3) * 100) / 100 : 0;

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
      pressureChange1h,
      pressureChange3h,
      pressureChange6h,
      pressureChange24h,
      pressureRatePerHour,
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

// Fetch full weather data for a specific historical date/time (up to 92 days back)
export async function fetchWeatherForDate(
  lat: number,
  lon: number,
  targetDate: Date,
): Promise<WeatherData | null> {
  try {
    const now = new Date();
    const diffMs = now.getTime() - targetDate.getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays < 0 || diffDays > 92) return null; // Future or too far back

    // If within the last hour, just fetch current weather
    if (diffMs < 60 * 60 * 1000) {
      return fetchWeather(lat, lon);
    }

    // Fetch enough hourly data to cover the target time + 25h before it for pressure changes
    const pastDays = Math.min(diffDays + 2, 92);
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&hourly=surface_pressure,temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code&past_days=${pastDays}&forecast_days=1&timezone=auto`;

    const res = await fetch(url);
    if (!res.ok) return null;

    const data = await res.json();
    const times: string[] = data.hourly?.time || [];
    const pressures: (number | null)[] = data.hourly?.surface_pressure || [];
    const temps: (number | null)[] = data.hourly?.temperature_2m || [];
    const humidities: (number | null)[] = data.hourly?.relative_humidity_2m || [];
    const winds: (number | null)[] = data.hourly?.wind_speed_10m || [];
    const codes: (number | null)[] = data.hourly?.weather_code || [];

    // Find the closest hourly index to the target date
    const targetMs = targetDate.getTime();
    let closestIdx = 0;
    let closestDiff = Infinity;
    for (let i = 0; i < times.length; i++) {
      const diff = Math.abs(new Date(times[i]).getTime() - targetMs);
      if (diff < closestDiff) {
        closestDiff = diff;
        closestIdx = i;
      }
    }

    const pressure = pressures[closestIdx];
    if (pressure == null) return null;

    const getBack = (hoursBack: number) => {
      const idx = closestIdx - hoursBack;
      return idx >= 0 && pressures[idx] != null ? pressures[idx]! : null;
    };

    const change = (hoursBack: number) => {
      const past = getBack(hoursBack);
      return past != null ? Math.round((pressure - past) * 100) / 100 : 0;
    };

    const pressureChange1h = change(1);
    const pressureChange3h = change(3);
    const pressureChange6h = change(6);
    const pressureChange24h = change(24);
    const pressureRatePerHour = pressureChange3h !== 0 ? Math.round((pressureChange3h / 3) * 100) / 100 : 0;
    const pressureTrend: WeatherData['pressureTrend'] =
      pressureChange3h < -1 ? 'falling' : pressureChange3h > 1 ? 'rising' : 'steady';

    return {
      latitude: lat,
      longitude: lon,
      surfacePressure: pressure,
      surfacePressureInHg: Math.round(pressure * HPA_TO_INHG * 100) / 100,
      temperature: temps[closestIdx] ?? 0,
      temperatureF: C_TO_F(temps[closestIdx] ?? 0),
      humidity: humidities[closestIdx] ?? 0,
      windSpeed: winds[closestIdx] ?? 0,
      weatherCode: codes[closestIdx] ?? 0,
      pressureChange1h,
      pressureChange3h,
      pressureChange6h,
      pressureChange24h,
      pressureRatePerHour,
      pressureTrend,
      fetchedAt: new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

// Historical hourly pressure for trends chart
export type HourlyPressure = {
  timestamp: Date;
  pressure: number; // hPa
};

export async function fetchHistoricalPressure(
  lat: number,
  lon: number,
  days: number = 30,
): Promise<HourlyPressure[]> {
  try {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - days);

    const fmt = (d: Date) => d.toISOString().split('T')[0];

    // Open-Meteo archive API for dates older than 5 days, forecast API for recent
    // Use forecast API with past_days for simplicity (supports up to 92 days back)
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&hourly=surface_pressure&past_days=${Math.min(days, 92)}&forecast_days=1&timezone=auto`;

    const res = await fetch(url);
    if (!res.ok) return [];

    const data = await res.json();
    const times: string[] = data.hourly?.time || [];
    const pressures: (number | null)[] = data.hourly?.surface_pressure || [];

    const result: HourlyPressure[] = [];
    for (let i = 0; i < times.length; i++) {
      if (pressures[i] != null) {
        result.push({
          timestamp: new Date(times[i]),
          pressure: pressures[i]!,
        });
      }
    }
    return result;
  } catch {
    return [];
  }
}
