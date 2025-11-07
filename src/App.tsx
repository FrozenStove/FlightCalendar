import React, { useState, useEffect } from "react";
import {
  Container,
  Box,
  TextField,
  Button,
  List,
  ListItem,
  ListItemText,
  IconButton,
  Typography,
  CircularProgress,
  Alert,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  FormControlLabel,
  Checkbox,
} from "@mui/material";
import {
  AddCircleOutline,
  Save,
  ExpandMore,
  Flight,
} from "@mui/icons-material";

const App: React.FC = () => {
  console.log("[APP] App component rendering...");
  const [apiKey, setApiKey] = useState<string>("");
  const [flightCode, setFlightCode] = useState<string>("");
  const [flightDate, setFlightDate] = useState<string>("");
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [bypassCache, setBypassCache] = useState<boolean>(false);

  // Load API key on component mount
  useEffect(() => {
    console.log("[APP] useEffect: Loading API key...");
    const loadApiKey = async () => {
      try {
        console.log(
          "[APP] Checking if electronAPI is available:",
          typeof window.electronAPI !== "undefined"
        );
        if (typeof window.electronAPI === "undefined") {
          console.error("[APP] window.electronAPI is not available!");
          setError(
            "Electron API not available. Please restart the application."
          );
          return;
        }
        const key = await window.electronAPI.getApiKey();
        console.log(
          "[APP] API key loaded:",
          key ? "Key found" : "No key found"
        );
        if (key) {
          setApiKey(key);
        }
      } catch (err) {
        console.error("[APP] Error loading API key:", err);
        setError(`Error loading API key: ${err}`);
      }
    };
    loadApiKey();
  }, []);

  // Handle saving API key
  const handleSaveKey = async () => {
    try {
      await window.electronAPI.setApiKey(apiKey);
      setSuccess("API key saved successfully!");
      setError(null);
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message || "Failed to save API key");
      setSuccess(null);
    }
  };

  // Handle flight search
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);
    setResults([]);

    try {
      console.log("[APP] 🔍 Starting flight search...", {
        flightCode,
        flightDate,
        bypassCache,
      });
      const response = await window.electronAPI.fetchFlights(
        flightCode,
        flightDate,
        bypassCache
      );

      console.log("[APP] 📥 Received response from API:", {
        hasError: !!response.error,
        responseType: typeof response,
        isArray: Array.isArray(response),
        responseKeys:
          response && typeof response === "object"
            ? Object.keys(response)
            : "N/A",
      });

      // Log the full response data
      console.log(
        "[APP] 📦 Full response data:",
        JSON.stringify(response, null, 2)
      );

      if (response.error) {
        console.error("[APP] ❌ API returned error:", response.error);
        setError(response.error);
        setResults([]);
      } else {
        // Handle different response structures
        let flights: any[] = [];

        if (response.outbound) {
          console.log(
            '[APP] Response has "outbound" property with',
            response.outbound.length,
            "flights"
          );
          flights = response.outbound;
        } else if (Array.isArray(response)) {
          console.log(
            "[APP] Response is an array with",
            response.length,
            "flights"
          );
          flights = response;
        } else if (response.flights) {
          console.log(
            '[APP] Response has "flights" property with',
            response.flights.length,
            "flights"
          );
          flights = response.flights;
        } else {
          console.log("[APP] Response is a single flight object");
          flights = [response];
        }

        console.log("[APP] ✅ Processed", flights.length, "flight(s)");
        console.log("[APP] Flight details:", JSON.stringify(flights, null, 2));

        setResults(flights);
        setSuccess("Flights found successfully!");
        setTimeout(() => setSuccess(null), 3000);
      }
    } catch (err: any) {
      console.error("[APP] ❌ Error during flight search:", err);
      setError(err.message || "An unexpected error occurred");
      setResults([]);
    } finally {
      setLoading(false);
      console.log("[APP] 🔚 Search completed");
    }
  };

  // Handle adding flight to calendar
  const handleAddToCalendar = async (flight: any) => {
    try {
      const result = await window.electronAPI.generateIcs(flight);
      if (result.success) {
        setSuccess("Flight added to calendar successfully!");
        setError(null);
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError(result.error || "Failed to add flight to calendar");
        setSuccess(null);
      }
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred");
      setSuccess(null);
    }
  };

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom align="center">
        Flight Calendar
      </Typography>

      {/* Settings Accordion */}
      <Accordion sx={{ mb: 3 }}>
        <AccordionSummary expandIcon={<ExpandMore />}>
          <Typography>API Key Settings</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Box
            component="form"
            sx={{ display: "flex", gap: 2, alignItems: "center" }}
          >
            <TextField
              label="RapidAPI Key"
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              fullWidth
              variant="outlined"
              placeholder="Enter your RapidAPI key"
            />
            <Button
              variant="contained"
              startIcon={<Save />}
              onClick={handleSaveKey}
              sx={{ minWidth: 120 }}
            >
              Save
            </Button>
          </Box>
        </AccordionDetails>
      </Accordion>

      {/* Flight Search Form */}
      <Box component="form" onSubmit={handleSearch} sx={{ mb: 3 }}>
        <Box sx={{ display: "flex", gap: 2, alignItems: "center", mb: 1 }}>
          <TextField
            label="Flight Number"
            value={flightCode}
            onChange={(e) => setFlightCode(e.target.value.toUpperCase())}
            required
            variant="outlined"
            placeholder="e.g., AA123"
            sx={{ flex: 1 }}
          />
          <TextField
            label="Departure Date"
            type="date"
            value={flightDate}
            onChange={(e) => setFlightDate(e.target.value)}
            required
            variant="outlined"
            InputLabelProps={{
              shrink: true,
            }}
            sx={{ flex: 1 }}
          />
          <Button
            type="submit"
            variant="contained"
            startIcon={<Flight />}
            disabled={loading}
            sx={{ minWidth: 120, height: 56 }}
          >
            Search
          </Button>
        </Box>
        <FormControlLabel
          control={
            <Checkbox
              checked={bypassCache}
              onChange={(e) => setBypassCache(e.target.checked)}
            />
          }
          label="Force refresh (bypass cache)"
        />
      </Box>

      {/* Alerts */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}
      {success && (
        <Alert
          severity="success"
          sx={{ mb: 2 }}
          onClose={() => setSuccess(null)}
        >
          {success}
        </Alert>
      )}

      {/* Loading Indicator */}
      {loading && (
        <Box sx={{ display: "flex", justifyContent: "center", my: 4 }}>
          <CircularProgress />
        </Box>
      )}

      {/* Results List */}
      {!loading && results.length > 0 && (
        <Box>
          <Typography variant="h6" gutterBottom>
            Flight Results
          </Typography>
          <List>
            {results.map((flight, index) => {
              // Get departure and arrival information
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
              const departureAirport =
                departure?.airport?.iata ||
                departure?.airport?.name ||
                "Unknown";
              const arrivalAirport =
                arrival?.airport?.iata || arrival?.airport?.name || "Unknown";

              // Format times
              const departureTimeStr = departureTime
                ? new Date(departureTime).toLocaleString()
                : "Time not available";
              const arrivalTimeStr = arrivalTime
                ? new Date(arrivalTime).toLocaleString()
                : "Time not available";

              return (
                <ListItem
                  key={index}
                  secondaryAction={
                    <IconButton
                      edge="end"
                      aria-label="add to calendar"
                      onClick={() => handleAddToCalendar(flight)}
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
      )}

      {/* No Results Message */}
      {!loading &&
        results.length === 0 &&
        flightCode &&
        flightDate &&
        !error && (
          <Typography
            variant="body1"
            color="text.secondary"
            align="center"
            sx={{ mt: 4 }}
          >
            No flights found. Try a different flight number or date.
          </Typography>
        )}
    </Container>
  );
};

export default App;
