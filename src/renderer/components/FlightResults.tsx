import React from "react";
import {
  Box,
  List,
  ListItem,
  ListItemText,
  IconButton,
  Typography,
} from "@mui/material";
import { AddCircleOutline } from "@mui/icons-material";
import { Flight } from "../types";
import { formatFlightTime, getAirportCode } from "../utils/flightUtils";

interface FlightResultsProps {
  flights: Flight[];
  onAddToCalendar: (flight: Flight) => void;
}

/**
 * Flight Results List component
 */
export const FlightResults: React.FC<FlightResultsProps> = ({
  flights,
  onAddToCalendar,
}) => {
  if (flights.length === 0) {
    return null;
  }

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Flight Results
      </Typography>
      <List>
        {flights.map((flight, index) => {
          const departure = flight.departure;
          const arrival = flight.arrival;

          // Get departure time (try scheduledTime first, then time)
          const departureTime =
            departure?.scheduledTime?.local ||
            departure?.scheduledTime?.utc ||
            departure?.time?.local ||
            departure?.time?.utc;

          // Get arrival time (try scheduledTime first, then time)
          const arrivalTime =
            arrival?.scheduledTime?.local ||
            arrival?.scheduledTime?.utc ||
            arrival?.time?.local ||
            arrival?.time?.utc;

          // Get airport codes
          const departureAirport = getAirportCode(departure?.airport);
          const arrivalAirport = getAirportCode(arrival?.airport);

          // Format times
          const departureTimeStr = formatFlightTime(departureTime);
          const arrivalTimeStr = formatFlightTime(arrivalTime);

          return (
            <ListItem
              key={index}
              secondaryAction={
                <IconButton
                  edge="end"
                  aria-label="add to calendar"
                  onClick={() => onAddToCalendar(flight)}
                  color="primary"
                >
                  <AddCircleOutline />
                </IconButton>
              }
            >
              <ListItemText
                primary={`${flight.number || "Unknown"} - ${departureAirport} → ${arrivalAirport}`}
                secondary={
                  <>
                    <Typography
                      component="span"
                      variant="body2"
                      display="block"
                    >
                      <strong>Departure:</strong> {departureAirport} at{" "}
                      {departureTimeStr}
                    </Typography>
                    <Typography
                      component="span"
                      variant="body2"
                      display="block"
                    >
                      <strong>Arrival:</strong> {arrivalAirport} at{" "}
                      {arrivalTimeStr}
                    </Typography>
                    {flight.airline?.name && (
                      <Typography
                        component="span"
                        variant="body2"
                        display="block"
                        color="text.secondary"
                      >
                        {flight.airline.name}
                      </Typography>
                    )}
                  </>
                }
              />
            </ListItem>
          );
        })}
      </List>
    </Box>
  );
};
