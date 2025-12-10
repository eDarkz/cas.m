const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

export const getMonthName = (month: number): string => {
  if (month < 1 || month > 12) {
    return 'Mes inválido';
  }
  return MONTH_NAMES[month - 1];
};

export const formatDate = (dateString: string): string => {
  const [year, month, day] = dateString.split('T')[0].split('-');
  return `${day}/${month}/${year}`;
};
