import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
}

export function formatDate(date: string | Date): string {
  return new Date(date).toLocaleDateString('es-SV', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}

// Configuración de formatos de teléfono por país
const PHONE_FORMATS: Record<string, { 
  pattern: string; 
  example: string;
  length: number;
}> = {
  'SV': { pattern: 'XXXX-XXXX', example: '7123-4567', length: 8 },
  'GT': { pattern: 'XXXX-XXXX', example: '5123-4567', length: 8 },
  'HN': { pattern: 'XXXX-XXXX', example: '9123-4567', length: 8 },
  'NI': { pattern: 'XXXX-XXXX', example: '8123-4567', length: 8 },
  'CR': { pattern: 'XXXX-XXXX', example: '8123-4567', length: 8 },
  'PA': { pattern: 'XXXX-XXXX', example: '6123-4567', length: 8 },
  'MX': { pattern: 'XXX-XXX-XXXX', example: '555-123-4567', length: 10 },
  'US': { pattern: '(XXX) XXX-XXXX', example: '(555) 123-4567', length: 10 },
};

export function formatPhone(phone: string | null | undefined, countryCode: string = 'SV'): string {
  if (!phone) return 'No disponible';
  
  // Limpiar teléfono (quitar todo lo que no sea número)
  const cleaned = phone.replace(/\D/g, '');
  
  // Obtener configuración del país
  const config = PHONE_FORMATS[countryCode] || PHONE_FORMATS['SV'];
  
  // Si la longitud no coincide, devolver sin formato
  if (cleaned.length !== config.length) {
    return phone;
  }
  
  // Aplicar formato según el país
  if (['SV', 'GT', 'HN', 'NI', 'CR', 'PA'].includes(countryCode)) {
    // Formato XXXX-XXXX
    return `${cleaned.slice(0, 4)}-${cleaned.slice(4)}`;
  } else if (['MX', 'US'].includes(countryCode)) {
    // Formato XXX-XXX-XXXX
    return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
  }
  
  // Por defecto, sin formato
  return cleaned;
}

export function cleanPhone(phone: string): string {
  return phone.replace(/\D/g, '');
}

export function getPhoneExample(countryCode: string): string {
  return PHONE_FORMATS[countryCode]?.example || '7123-4567';
}

export function getPhoneLength(countryCode: string): number {
  return PHONE_FORMATS[countryCode]?.length || 8;
}