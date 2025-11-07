/**
 * Type definitions for the renderer process
 */

export interface QuotaInfo {
  remaining: string | number;
  limit: string | number;
  reset: string | number;
}

export interface Flight {
  number?: string;
  departure: {
    airport?: {
      iata?: string;
      icao?: string;
      name?: string;
    };
    scheduledTime?: {
      utc?: string;
      local?: string;
    };
    time?: {
      utc?: string;
      local?: string;
    };
    terminal?: string;
  };
  arrival: {
    airport?: {
      iata?: string;
      icao?: string;
      name?: string;
    };
    scheduledTime?: {
      utc?: string;
      local?: string;
    };
    time?: {
      utc?: string;
      local?: string;
    };
    terminal?: string;
  };
  airline?: {
    name?: string;
    iata?: string;
    icao?: string;
  };
  greatCircleDistance?: {
    km?: number;
    mile?: number;
  };
}

export interface FlightSearchResponse {
  _quotaInfo?: QuotaInfo;
  _data?: Flight[];
  error?: string;
  outbound?: Flight[];
  flights?: Flight[];
}
