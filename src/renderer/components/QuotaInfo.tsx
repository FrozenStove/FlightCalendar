import React from "react";
import { Alert, Typography } from "@mui/material";
import { QuotaInfo as QuotaInfoType } from "../types";

interface QuotaInfoProps {
  quotaInfo: QuotaInfoType | null;
  onClose: () => void;
}

/**
 * API Quota Information component
 */
export const QuotaInfo: React.FC<QuotaInfoProps> = ({ quotaInfo, onClose }) => {
  if (
    !quotaInfo ||
    quotaInfo.remaining === "Unknown" ||
    quotaInfo.remaining === "N/A (cached)"
  ) {
    return null;
  }

  return (
    <Alert severity="info" sx={{ mb: 2 }} onClose={onClose}>
      <Typography variant="body2" component="div">
        <strong>API Quota:</strong> {quotaInfo.remaining} / {quotaInfo.limit}{" "}
        requests remaining
        {quotaInfo.reset !== "Unknown" &&
          quotaInfo.reset !== "N/A (cached)" && (
            <span>
              {" "}
              • Resets:{" "}
              {new Date(
                parseInt(quotaInfo.reset as string) * 1000
              ).toLocaleString()}
            </span>
          )}
        <br />
        <Typography variant="caption" color="text.secondary">
          Estimated: 1-2 units consumed per request (Tier 1-2 endpoint)
        </Typography>
      </Typography>
    </Alert>
  );
};
