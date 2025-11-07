import { ipcMain, BrowserWindow, shell } from "electron";
import { createEvent } from "ics";
import { getMainWindow } from "./window";

/**
 * Calendar generation utilities for creating Google Calendar events
 */

interface FlightData {
  number?: string;
  departure: any;
  arrival: any;
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

/**
 * Extract time from departure/arrival object
 */
function extractTime(obj: any): string | null {
  return (
    obj.scheduledTime?.utc ||
    obj.scheduledTime?.local ||
    obj.time?.utc ||
    obj.time?.local ||
    obj.time ||
    null
  );
}

/**
 * Format time for display (local time)
 */
function formatTimeForDisplay(timeStr: string | undefined): string {
  if (!timeStr) return "Time not available";
  try {
    const date = new Date(timeStr);
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const ampm = hours >= 12 ? "pm" : "am";
    const displayHours = hours % 12 || 12;
    const displayMinutes = String(minutes).padStart(2, "0");
    return `${displayHours}:${displayMinutes}${ampm}`;
  } catch {
    return "Time not available";
  }
}

/**
 * Format date for Google Calendar (YYYYMMDDTHHmmssZ format)
 */
function formatDateForGoogleCalendar(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  const hours = String(date.getUTCHours()).padStart(2, "0");
  const minutes = String(date.getUTCMinutes()).padStart(2, "0");
  const seconds = String(date.getUTCSeconds()).padStart(2, "0");
  return `${year}${month}${day}T${hours}${minutes}${seconds}Z`;
}

/**
 * Check if flight is delayed
 */
function isFlightDelayed(
  scheduledDeparture: string,
  scheduledArrival: string,
  predictedDeparture?: string,
  predictedArrival?: string
): boolean {
  return !!(
    (predictedDeparture &&
      new Date(predictedDeparture).getTime() >
        new Date(scheduledDeparture).getTime()) ||
    (predictedArrival &&
      new Date(predictedArrival).getTime() >
        new Date(scheduledArrival).getTime())
  );
}

/**
 * Build Google Calendar event description
 */
function buildEventDescription(
  flight: FlightData,
  isDelayed: boolean,
  scheduledDepartureTimeLocal: string,
  scheduledArrivalTimeLocal: string,
  predictedDepartureTimeLocal: string,
  predictedArrivalTimeLocal: string,
  departureTimeLocal: string,
  arrivalTimeLocal: string,
  departureAirportName: string,
  departureAirportCode: string,
  arrivalAirportName: string,
  arrivalAirportCode: string,
  departureTerminal: string,
  arrivalTerminal: string,
  flightDurationStr: string,
  distanceStr: string,
  airlineCode: string,
  flightAwareUrl: string
): string {
  const flightNumber = flight.number || "Unknown";
  const airlineName = flight.airline?.name || "Unknown Airline";
  const descriptionParts: string[] = [];

  // Main flight info line
  descriptionParts.push(`${airlineName} flight ${flightNumber}`);
  descriptionParts.push(""); // Empty line

  // Departure info
  let departureLine = `${departureAirportName} ${departureAirportCode}`;
  if (departureTerminal) {
    departureLine += ` Terminal ${departureTerminal}`;
  }
  departureLine += ` ${departureTimeLocal} (local time)`;
  descriptionParts.push(departureLine);

  // Arrival info
  let arrivalLine = `- ${arrivalAirportName} ${arrivalAirportCode}`;
  if (arrivalTerminal) {
    arrivalLine += ` Terminal ${arrivalTerminal}`;
  }
  arrivalLine += ` ${arrivalTimeLocal} (local time)`;
  descriptionParts.push(arrivalLine);

  // Delay information if delayed
  if (isDelayed) {
    descriptionParts.push(""); // Empty line
    descriptionParts.push("⚠️ FLIGHT DELAYED");
    descriptionParts.push(""); // Empty line
    descriptionParts.push("Original Scheduled Times:");
    descriptionParts.push(
      `  Departure: ${scheduledDepartureTimeLocal} (local time)`
    );
    descriptionParts.push(
      `  Arrival: ${scheduledArrivalTimeLocal} (local time)`
    );
    descriptionParts.push(""); // Empty line
    descriptionParts.push("Updated Times:");
    if (predictedDepartureTimeLocal !== "Time not available") {
      descriptionParts.push(
        `  Departure: ${predictedDepartureTimeLocal} (local time) - Predicted/Estimated`
      );
    }
    if (predictedArrivalTimeLocal !== "Time not available") {
      descriptionParts.push(
        `  Arrival: ${predictedArrivalTimeLocal} (local time) - Predicted/Estimated`
      );
    }
  }

  // Additional details
  descriptionParts.push(""); // Empty line
  descriptionParts.push("Flight Details:");
  if (flightDurationStr) {
    descriptionParts.push(`Duration: ${flightDurationStr}`);
  }
  if (distanceStr) {
    descriptionParts.push(`Distance: ${distanceStr}`);
  }
  if (departureTerminal) {
    descriptionParts.push(`Departure Terminal: ${departureTerminal}`);
  }
  if (arrivalTerminal) {
    descriptionParts.push(`Arrival Terminal: ${arrivalTerminal}`);
  }
  if (airlineCode) {
    descriptionParts.push(`Airline Code: ${airlineCode}`);
  }

  // Add FlightAware tracking link
  if (flightAwareUrl) {
    descriptionParts.push(""); // Empty line
    descriptionParts.push("Live Flight Tracking:");
    descriptionParts.push(flightAwareUrl);
  }

  return descriptionParts.join("\n");
}

/**
 * Generate Google Calendar URL and open it
 */
async function generateGoogleCalendarEvent(flight: FlightData): Promise<{
  success: boolean;
  error?: string;
}> {
  console.log("[CALENDAR] 📅 Starting calendar event generation process...");
  try {
    console.log(
      "[CALENDAR] 📦 Received flight data:",
      JSON.stringify(flight, null, 2)
    );

    const mainWindow = getMainWindow();
    if (!mainWindow) {
      console.error(
        "[CALENDAR] ❌ No window available for calendar generation"
      );
      return { success: false, error: "No window available" };
    }
    console.log(
      "[CALENDAR] ✅ Main window found, proceeding with calendar generation"
    );

    // Parse flight data
    console.log("[CALENDAR] 🔍 Step 1: Parsing flight data...");
    const flightNumber = flight.number || "Unknown";
    console.log("[CALENDAR]   Flight number extracted:", flightNumber);

    const departure = flight.departure;
    const arrival = flight.arrival;

    console.log(
      "[CALENDAR]   Departure data:",
      JSON.stringify(departure, null, 2)
    );
    console.log("[CALENDAR]   Arrival data:", JSON.stringify(arrival, null, 2));

    if (!departure || !arrival) {
      console.error("[CALENDAR] ❌ Missing departure or arrival data");
      return {
        success: false,
        error: "Invalid flight data: missing departure or arrival information",
      };
    }
    console.log("[CALENDAR] ✅ Departure and arrival data validated");

    // Parse times
    console.log("[CALENDAR] 🔍 Step 2: Parsing time data...");
    const departureTime = extractTime(departure);
    const arrivalTime = extractTime(arrival);

    if (!departureTime || !arrivalTime) {
      console.error("[CALENDAR] Missing time data in departure or arrival");
      return {
        success: false,
        error: `Invalid flight data: missing time information. Departure time: ${departureTime ? "found" : "missing"}, Arrival time: ${arrivalTime ? "found" : "missing"}`,
      };
    }

    // Check for delays
    console.log(
      "[CALENDAR] 🔍 Step 3: Checking for delays and converting time strings to Date objects..."
    );

    const scheduledDepartureTime = departureTime;
    const scheduledArrivalTime = arrivalTime;

    const predictedDepartureTime =
      departure.predictedTime?.utc ||
      departure.predictedTime?.local ||
      departure.estimatedTime?.utc ||
      departure.estimatedTime?.local;

    const predictedArrivalTime =
      arrival.predictedTime?.utc ||
      arrival.predictedTime?.local ||
      arrival.estimatedTime?.utc ||
      arrival.estimatedTime?.local;

    const isDelayed = isFlightDelayed(
      scheduledDepartureTime,
      scheduledArrivalTime,
      predictedDepartureTime,
      predictedArrivalTime
    );

    console.log("[CALENDAR]   Flight delayed:", isDelayed);

    // Use predicted times if available and different, otherwise use scheduled
    const actualDepartureTime =
      isDelayed && predictedDepartureTime
        ? predictedDepartureTime
        : scheduledDepartureTime;
    const actualArrivalTime =
      isDelayed && predictedArrivalTime
        ? predictedArrivalTime
        : scheduledArrivalTime;

    const departureDate = new Date(actualDepartureTime);
    const arrivalDate = new Date(actualArrivalTime);

    if (isNaN(departureDate.getTime()) || isNaN(arrivalDate.getTime())) {
      console.error("[CALENDAR] ❌ Invalid date parsing");
      return {
        success: false,
        error: "Invalid flight data: could not parse dates",
      };
    }
    console.log("[CALENDAR] ✅ Date objects validated successfully");

    // Format dates for Google Calendar
    console.log(
      "[CALENDAR] 🔍 Step 4: Formatting dates for Google Calendar..."
    );
    const startDateStr = formatDateForGoogleCalendar(departureDate);
    const endDateStr = formatDateForGoogleCalendar(arrivalDate);

    // Get airline information
    const airlineName = flight.airline?.name || "Unknown Airline";
    const airlineIata = flight.airline?.iata || "";
    const airlineIcao = flight.airline?.icao || "";
    const airlineCode = airlineIata || airlineIcao || "";

    // Get full airport names and codes
    const departureAirportName = departure.airport?.name || "Unknown";
    const departureAirportCode =
      departure.airport?.iata || departure.airport?.icao || "";
    const departureTerminal = departure.terminal || "";

    const arrivalAirportName = arrival.airport?.name || "Unknown";
    const arrivalAirportCode =
      arrival.airport?.iata || arrival.airport?.icao || "";
    const arrivalTerminal = arrival.terminal || "";

    // Format times for display
    const scheduledDepartureTimeLocal = formatTimeForDisplay(
      departure.scheduledTime?.local || departure.time?.local
    );
    const scheduledArrivalTimeLocal = formatTimeForDisplay(
      arrival.scheduledTime?.local || arrival.time?.local
    );

    const predictedDepartureTimeLocal = formatTimeForDisplay(
      departure.predictedTime?.local || departure.estimatedTime?.local
    );
    const predictedArrivalTimeLocal = formatTimeForDisplay(
      arrival.predictedTime?.local || arrival.estimatedTime?.local
    );

    const departureTimeLocal =
      isDelayed && predictedDepartureTimeLocal !== "Time not available"
        ? predictedDepartureTimeLocal
        : scheduledDepartureTimeLocal;
    const arrivalTimeLocal =
      isDelayed && predictedArrivalTimeLocal !== "Time not available"
        ? predictedArrivalTimeLocal
        : scheduledArrivalTimeLocal;

    // Calculate flight duration
    const flightDurationMs = arrivalDate.getTime() - departureDate.getTime();
    const flightDurationHours = Math.floor(flightDurationMs / (1000 * 60 * 60));
    const flightDurationMinutes = Math.floor(
      (flightDurationMs % (1000 * 60 * 60)) / (1000 * 60)
    );
    const flightDurationStr =
      flightDurationHours > 0
        ? `${flightDurationHours}h ${flightDurationMinutes}m`
        : `${flightDurationMinutes}m`;

    // Get flight distance if available
    const distance = flight.greatCircleDistance;
    const distanceStr = distance?.km
      ? `${distance.km} km (${distance.mile} miles)`
      : distance?.mile
        ? `${distance.mile} miles`
        : "";

    // Build event title with airline name (add [DELAYED] if delayed)
    const eventTitle = isDelayed
      ? `[DELAYED] ${airlineName} flight ${flightNumber}`
      : `${airlineName} flight ${flightNumber}`;

    // Build FlightAware URL using ICAO code (preferred) or IATA code
    const flightAwareCode = airlineIcao || airlineIata || "";
    const flightAwareUrl = flightAwareCode
      ? `https://www.flightaware.com/live/flight/${flightAwareCode}${flightNumber.replace(/\s+/g, "")}`
      : "";

    // Build rich description
    const description = buildEventDescription(
      flight,
      isDelayed,
      scheduledDepartureTimeLocal,
      scheduledArrivalTimeLocal,
      predictedDepartureTimeLocal,
      predictedArrivalTimeLocal,
      departureTimeLocal,
      arrivalTimeLocal,
      departureAirportName,
      departureAirportCode,
      arrivalAirportName,
      arrivalAirportCode,
      departureTerminal,
      arrivalTerminal,
      flightDurationStr,
      distanceStr,
      airlineCode,
      flightAwareUrl
    );

    // Location should be just the departure airport
    const location = `${departureAirportName} ${departureAirportCode}`;

    // Create Google Calendar URL
    console.log("[CALENDAR] 🔍 Step 5: Creating Google Calendar URL...");
    const googleCalendarUrl = new URL(
      "https://calendar.google.com/calendar/render"
    );
    googleCalendarUrl.searchParams.set("action", "TEMPLATE");
    googleCalendarUrl.searchParams.set("text", eventTitle);
    googleCalendarUrl.searchParams.set(
      "dates",
      `${startDateStr}/${endDateStr}`
    );
    googleCalendarUrl.searchParams.set("details", description);
    googleCalendarUrl.searchParams.set("location", location);

    const calendarUrl = googleCalendarUrl.toString();
    console.log("[CALENDAR]   Google Calendar URL created");
    console.log("[CALENDAR]   URL:", calendarUrl);

    // Open Google Calendar URL in the default browser
    console.log("[CALENDAR] 🔍 Step 6: Opening Google Calendar in browser...");
    try {
      await shell.openExternal(calendarUrl);
      console.log(
        "[CALENDAR] ✅ Google Calendar opened in browser successfully"
      );
      console.log(
        "[CALENDAR]   The event should be pre-filled and ready to save to your calendar"
      );
    } catch (openError: any) {
      console.error("[CALENDAR] ❌ Error opening Google Calendar:", openError);
      return {
        success: false,
        error: `Failed to open Google Calendar: ${openError.message}`,
      };
    }

    console.log(
      "[CALENDAR] ✅ Calendar event generation process completed successfully!"
    );
    return { success: true };
  } catch (error: any) {
    console.error(
      "[CALENDAR] ❌ Unexpected error during calendar generation:",
      error
    );
    return { success: false, error: error.message || "Unknown error occurred" };
  }
}

/**
 * Setup IPC handler for generating calendar events
 */
export function setupGenerateCalendarHandler(): void {
  ipcMain.handle("generate-ics", async (_event, flight: any) => {
    return generateGoogleCalendarEvent(flight);
  });
}
