const HOTEL_CODE = 'SPLC';
const API_BASE_URL = 'https://bsupers.fly.dev';

export const getApiUrl = (hotelCode: string, endpoint: string): string => {
  return `${API_BASE_URL}/v1/energy/${endpoint}`;
};

export const getHotelCode = (): string => {
  return HOTEL_CODE;
};
