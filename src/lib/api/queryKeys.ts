export const QUERY_ACTIONS = {
  USERS_GET_ALL: ["users", "getAll"],
  APARTMENTS_GET_ALL: ["apartments", "getAll"],
  APARTMENTS_GET_HOST: ["apartments", "host"],
  APARTMENTS_GET_ID: ["apartments", "getId"],
  ASSETS_GET_BY_APARTMENT: ["assets", "getByApartment"],
  APARTMENT_SHOTS_GET_BY_APARTMENT: ["apartmentShots", "getByApartment"],
  ASSET_TYPES_GET_ALL: ["assets", "types"],
  LOCATIONS_GET_ALL: ["locations", "getAll"],
  RESERVATIONS_GET_BY_APARTMENT: ["reservations", "getByApartment"],
  RESERVATIONS_GET_ID: ["reservations", "getId"],
  RESERVATIONS_GET_PHOTOS: ["reservations", "getPhotos"],
  INSPECTION_GET_BY_ID: ["inspections", "getById"],
  // D8: the incident list and its detail, mirroring the reservations pair. There is
  // deliberately no INCIDENTS_GET_BY_RESERVATION — the API has no such filter
  // (`GetIncidentsData.query` requires `apartmentId` and offers no `reservationId`),
  // so the match happens in `findIncidentForReservation` (phase 1) over the
  // apartment's list.
  INCIDENTS_GET_BY_APARTMENT: ["incidents", "getByApartment"],
  INCIDENTS_GET_ID: ["incidents", "getId"],
  // D12: the field read is anonymous and keyed by the token itself, not by an id —
  // the token IS the credential, and there is nothing else to key it by.
  FIELD_INGEST_GET_BY_TOKEN: ["fieldIngest", "getByToken"],
} as const;