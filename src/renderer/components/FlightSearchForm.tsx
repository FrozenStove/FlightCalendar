import React, { useState, FormEvent } from "react";
import {
  Box,
  TextField,
  Button,
  FormControlLabel,
  Checkbox,
} from "@mui/material";
import { Flight as FlightIcon } from "@mui/icons-material";

interface FlightSearchFormProps {
  onSearch: (
    flightCode: string,
    flightDate: string,
    bypassCache: boolean
  ) => void;
  loading: boolean;
}

/**
 * Flight Search Form component
 */
export const FlightSearchForm: React.FC<FlightSearchFormProps> = ({
  onSearch,
  loading,
}) => {
  const [flightCode, setFlightCode] = useState<string>("");
  const [flightDate, setFlightDate] = useState<string>("");
  const [bypassCache, setBypassCache] = useState<boolean>(false);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (flightCode && flightDate) {
      onSearch(flightCode, flightDate, bypassCache);
    }
  };

  return (
    <Box component="form" onSubmit={handleSubmit} sx={{ mb: 3 }}>
      <Box sx={{ display: "flex", gap: 2, alignItems: "center", mb: 1 }}>
        <TextField
          label="Flight Number"
          value={flightCode}
          onChange={(e) => setFlightCode(e.target.value.toUpperCase())}
          required
          variant="outlined"
          placeholder="e.g., AA123"
          sx={{ flex: 1 }}
          disabled={loading}
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
          disabled={loading}
        />
        <Button
          type="submit"
          variant="contained"
          startIcon={<FlightIcon />}
          disabled={loading || !flightCode || !flightDate}
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
            disabled={loading}
          />
        }
        label="Force refresh (bypass cache)"
      />
    </Box>
  );
};
