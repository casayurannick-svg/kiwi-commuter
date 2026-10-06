import React, { useEffect, useState } from 'react';
import {
  Calendar,
  Clock,
  Sun,
  Cloud,
  CloudFog,
  CloudRain,
  CloudSnow,
  CloudLightning,
  LucideIcon,
} from 'lucide-react';

// Helper function mapping WMO weather codes to dynamic labels and icons
export function getWeatherInfo(code: number | null | undefined): {
  label: string;
  icon: LucideIcon;
} {
  if (code === null || code === undefined) {
    return { label: 'Clear', icon: Sun };
  }

  // WMO Weather interpretation codes (WW)
  // 0: Clear sky
  // 1, 2, 3: Mainly clear, partly cloudy, and overcast
  // 45, 48: Fog and depositing rime fog
  // 51, 53, 55: Drizzle: Light, moderate, and dense intensity
  // 56, 57: Freezing Drizzle
  // 61, 63, 65: Rain: Slight, moderate and heavy intensity
  // 66, 67: Freezing Rain
  // 71, 73, 75: Snow fall: Slight, moderate, and heavy intensity
  // 77: Snow grains
  // 80, 81, 82: Rain showers: Slight, moderate, and violent
  // 85, 86: Snow showers slight and heavy
  // 95: Thunderstorm: Slight or moderate
  // 96, 99: Thunderstorm with slight and heavy hail

  switch (code) {
    case 0:
      return { label: 'Clear', icon: Sun };
    case 1:
    case 2:
    case 3:
      return { label: 'Cloudy', icon: Cloud };
    case 45:
    case 48:
      return { label: 'Fog', icon: CloudFog };
    case 51:
    case 53:
    case 55:
    case 56:
    case 57:
    case 61:
    case 63:
    case 65:
    case 66:
    case 67:
    case 80:
    case 81:
    case 82:
      return { label: 'Rain', icon: CloudRain };
    case 71:
    case 73:
    case 75:
    case 77:
    case 85:
    case 86:
      return { label: 'Snow', icon: SnowIconWrapper };
    case 95:
    case 96:
    case 99:
      return { label: 'Thunderstorm', icon: CloudLightning };
    default:
      if (code >= 70 && code < 80) {
        return { label: 'Snow', icon: CloudSnow };
      }
      if ((code >= 50 && code < 70) || (code >= 80 && code < 85)) {
        return { label: 'Rain', icon: CloudRain };
      }
      return { label: 'Cloudy', icon: Cloud };
  }
}

const SnowIconWrapper: LucideIcon = CloudSnow;

export const DateTimeWeatherBadge = () => {
  const [dateStr, setDateStr] = useState('');
  const [timeStr, setTimeStr] = useState('');
  const [tempC, setTempC] = useState<number | null>(null);
  const [weatherCode, setWeatherCode] = useState<number | null>(null);

  // Helper to format the date as "Tue, 6 Oct"
  const formatDate = (date: Date) =>
    new Intl.DateTimeFormat('en-US', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    }).format(date);

  // Helper to format the time as "09:52 pm"
  const formatTime = (date: Date) =>
    date
      .toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      })
      .toLowerCase();

  // Update date and time every minute (or at start)
  useEffect(() => {
    const now = new Date();
    setDateStr(formatDate(now));
    setTimeStr(formatTime(now));

    const interval = setInterval(() => {
      const now = new Date();
      setDateStr(formatDate(now));
      setTimeStr(formatTime(now));
    }, 60_000); // 1 minute

    return () => clearInterval(interval);
  }, []);

  // Fetch current temperature and weather code for Auckland. Refresh every minute.
  useEffect(() => {
    const fetchWeather = async () => {
      try {
        const res = await fetch(
          'https://api.open-meteo.com/v1/forecast?latitude=-36.85&longitude=174.76&current=temperature_2m,weather_code&timezone=Pacific%2FAuckland'
        );
        if (!res.ok) throw new Error('Failed to fetch weather');
        const data = await res.json();
        const temp = data?.current?.temperature_2m;
        const code = data?.current?.weather_code;
        if (typeof temp === 'number') setTempC(Math.round(temp));
        if (typeof code === 'number') setWeatherCode(code);
      } catch (e) {
        console.error(e);
        setTempC(null);
        setWeatherCode(null);
      }
    };

    fetchWeather();
    const interval = setInterval(fetchWeather, 60_000); // refresh each minute
    return () => clearInterval(interval);
  }, []);

  const { label: weatherLabel, icon: WeatherIcon } = getWeatherInfo(weatherCode);

  return (
    <div className="flex items-center space-x-2 rounded-full bg-slate-900 bg-opacity-60 px-3 py-1 text-sm text-white backdrop-blur-sm">
      <Calendar size={16} className="stroke-current shrink-0" />
      <span>{dateStr}</span>
      <Clock size={16} className="stroke-current shrink-0" />
      <span>{timeStr}</span>
      <WeatherIcon size={16} className="stroke-current shrink-0" />
      <span>
        {tempC !== null ? `Auckland ${tempC}°C ${weatherLabel}` : 'Loading…'}
      </span>
    </div>
  );
};

export default DateTimeWeatherBadge;
