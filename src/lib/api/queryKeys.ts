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
  INSPECTION_GET_BY_ID: ["inspections", "getById"],
} as const;