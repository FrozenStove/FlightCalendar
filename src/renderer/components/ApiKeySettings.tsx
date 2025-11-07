import React, { useState } from "react";
import {
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Box,
  TextField,
  Button,
  Typography,
} from "@mui/material";
import { Save, ExpandMore } from "@mui/icons-material";
import { useApiKey } from "../hooks/useApiKey";

/**
 * API Key Settings component
 */
export const ApiKeySettings: React.FC = () => {
  const { apiKey, setApiKey, saveApiKey } = useApiKey();
  const [localKey, setLocalKey] = useState<string>(apiKey);
  const [saving, setSaving] = useState<boolean>(false);
  const [success, setSuccess] = useState<boolean>(false);

  // Sync local state when apiKey changes
  React.useEffect(() => {
    setLocalKey(apiKey);
  }, [apiKey]);

  const handleSave = async () => {
    setSaving(true);
    setSuccess(false);
    try {
      await saveApiKey(localKey);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      // Error is handled by the hook
    } finally {
      setSaving(false);
    }
  };

  return (
    <Accordion sx={{ mb: 3 }}>
      <AccordionSummary expandIcon={<ExpandMore />}>
        <Typography>API Key Settings</Typography>
      </AccordionSummary>
      <AccordionDetails>
        <Box
          component="form"
          sx={{ display: "flex", gap: 2, alignItems: "center" }}
          onSubmit={(e) => {
            e.preventDefault();
            handleSave();
          }}
        >
          <TextField
            label="RapidAPI Key"
            type="password"
            value={localKey}
            onChange={(e) => setLocalKey(e.target.value)}
            fullWidth
            variant="outlined"
            placeholder="Enter your RapidAPI key"
          />
          <Button
            variant="contained"
            startIcon={<Save />}
            onClick={handleSave}
            disabled={saving}
            sx={{ minWidth: 120 }}
          >
            {saving ? "Saving..." : success ? "Saved!" : "Save"}
          </Button>
        </Box>
      </AccordionDetails>
    </Accordion>
  );
};
