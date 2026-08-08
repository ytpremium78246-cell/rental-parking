export const DRIVER_FREE_CANCELLATION_MINS = 2;
export const OWNER_GRACE_PERIOD_MINS = 2;
export const PENALTY_AMOUNT_INR = 10.0;
export const LATE_CANCEL_TRUST_PENALTY = -2;
export const NO_SHOW_TRUST_PENALTY = -5;

export const APP_CONFIG = {
  appName: "Parking India",
  tagline: "P2P Parking Marketplace (India)",
  currency: "₹",
  penaltyAmount: PENALTY_AMOUNT_INR,
  driverGracePeriodMinutes: DRIVER_FREE_CANCELLATION_MINS,
  ownerGracePeriodMinutes: OWNER_GRACE_PERIOD_MINS,
  initialTrustScore: 100,
};

export const VALID_BOOKING_TRANSITIONS: Record<string, string[]> = {
  Pending: ["Accepted", "Rejected", "Expired", "CancelledByDriver", "CancelledByOwner", "MutualCancel"],
  Accepted: ["CancelledByDriver", "CancelledByOwner", "MutualCancel", "Completed", "NoShow", "Disputed"],
  Rejected: [],
  Expired: [],
  CancelledByDriver: [],
  CancelledByOwner: [],
  MutualCancel: [],
  Completed: ["Disputed"],
  NoShow: [],
  Disputed: ["Completed", "MutualCancel"],
};

export const VEHICLE_TYPES = {
  CAR_4W: { label: "🚗 Car (4-Wheeler)", code: "CAR_4W" },
  BIKE_2W: { label: "🏍️ Bike (2-Wheeler)", code: "BIKE_2W" },
  EV_4W: { label: "⚡ EV Car", code: "EV_4W" },
  EV_2W: { label: "⚡ EV Scooter/Bike", code: "EV_2W" },
};

export const BOOKING_STATUSES = [
  "Pending",
  "Accepted",
  "Rejected",
  "Expired",
  "CancelledByDriver",
  "CancelledByOwner",
  "MutualCancel",
  "Completed",
  "NoShow",
  "Disputed",
] as const;

export const PAYMENT_MODES = ["UPI", "CASH", "QR"] as const;

export const TRUST_SCORE_RULES = {
  INITIAL: 100,
  LATE_CANCELLATION: LATE_CANCEL_TRUST_PENALTY,
  NO_SHOW: NO_SHOW_TRUST_PENALTY,
  SUCCESSFUL_COMPLETED: +1,
  DISPUTE_LOST: -10,
};
