const MAZATLAN_TZ = 'America/Mazatlan';
const HOURS_OFFSET = 14;

export const adjustDateFromDB = (date: string | Date): Date => {
  const d = typeof date === 'string' ? new Date(date) : date;
  const adjusted = new Date(d.getTime() - (HOURS_OFFSET * 60 * 60 * 1000));
  return adjusted;
};

export const formatDate = (date: string | Date): string => {
  const adjusted = adjustDateFromDB(date);
  return adjusted.toLocaleDateString('es-MX', {
    timeZone: MAZATLAN_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).split('/').reverse().join('-');
};

export const formatTime = (date: string | Date): string => {
  const adjusted = adjustDateFromDB(date);
  return adjusted.toLocaleTimeString('es-MX', {
    timeZone: MAZATLAN_TZ,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
};

export const formatDateTime = (date: string | Date): string => {
  const adjusted = adjustDateFromDB(date);
  return adjusted.toLocaleString('es-MX', {
    timeZone: MAZATLAN_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
};

export const formatDateTimeLong = (date: string | Date): string => {
  const adjusted = adjustDateFromDB(date);
  return adjusted.toLocaleString('es-MX', {
    timeZone: MAZATLAN_TZ,
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
};

export const getToday = (): string => {
  return formatDate(new Date());
};

export const cn = (...classes: (string | undefined | null | false)[]): string => {
  return classes.filter(Boolean).join(' ');
};
