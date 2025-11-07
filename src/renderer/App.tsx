import React, { useState } from "react";
import {
  Container,
  Box,
  Typography,
  CircularProgress,
  Alert,
} from "@mui/material";
import {
  ApiKeySettings,
  FlightSearchForm,
  FlightResults,
  QuotaInfo,
} from "./components";
import { useFlightSearch } from "./hooks/useFlightSearch";
import { Flight } from "./types";

/**
 * Main App component
 */
const App: React.FC = () => {
  console.log("[APP] App component rendering...");

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const {
    results,
    loading,
    error: searchError,
    quotaInfo,
    searchFlights,
    setError: setSearchError,
    setQuotaInfo,
  } = useFlightSearch();

  // Sync search error with local error state
  React.useEffect(() => {
    setError(searchError);
  }, [searchError]);

  // Handle flight search
  const handleSearch = async (
    flightCode: string,
    flightDate: string,
    bypassCache: boolean
  ) => {
    setError(null);
    setSuccess(null);
    await searchFlights(flightCode, flightDate, bypassCache);
    if (!searchError && results.length > 0) {
      setSuccess("Flights found successfully!");
      setTimeout(() => setSuccess(null), 3000);
    }
  };

  // Handle adding flight to calendar
  const handleAddToCalendar = async (flight: Flight) => {
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

      {/* API Key Settings */}
      <ApiKeySettings />

      {/* Flight Search Form */}
      <FlightSearchForm onSearch={handleSearch} loading={loading} />

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

      {/* API Quota Information */}
      <QuotaInfo quotaInfo={quotaInfo} onClose={() => setQuotaInfo(null)} />

      {/* Loading Indicator */}
      {loading && (
        <Box sx={{ display: "flex", justifyContent: "center", my: 4 }}>
          <CircularProgress />
        </Box>
      )}

      {/* Results List */}
      {!loading && (
        <FlightResults
          flights={results}
          onAddToCalendar={handleAddToCalendar}
        />
      )}

      {/* No Results Message */}
      {!loading && results.length === 0 && !error && (
        <Typography
          variant="body1"
          color="text.secondary"
          align="center"
          sx={{ mt: 4 }}
        >
          Enter a flight number and date to search for flights.
        </Typography>
      )}
    </Container>
  );
};

export default App;
