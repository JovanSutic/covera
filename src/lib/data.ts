interface HostData {
  apartmentName: string;
  propertyTypeLocation: string;
  guestsBedroomsBedsBaths: string;
  hostName: string;
}

interface PhotoCardItem {
  name: string;
  timestamp: string;
  photoUrl: string;
  location: string;
}

export const hostData: Record<string, HostData> = {
  1: {
    apartmentName: "Central Green Apartment",
    propertyTypeLocation: "Entire rental unit in Belgrade, Serbia",
    guestsBedroomsBedsBaths: "Up to 2 guests · 1 bedroom · 1 bed · 1 bath",
    hostName: "Dejan & Luka",
  },
};

export const itemsList: PhotoCardItem[] = [
  {
    name: "TV set",
    timestamp: "2026-04-09T12:00",
    photoUrl:
      "https://i.postimg.cc/gkRZ83kg/tv_komoda_i_ormar.jpg",
    location: "In the living room",
  },
  {
    name: "Window blinds",
    timestamp: "2026-04-09T12:00",
    photoUrl:
      "https://i.postimg.cc/sxJRCn4J/roletne.jpg",
    location: "In the living room",
  },
  {
    name: "White closet and cabinet",
    timestamp: "2026-04-09T12:00",
    photoUrl:
      "https://i.postimg.cc/gkRZ83kg/tv_komoda_i_ormar.jpg",
    location: "In the living room",
  },
  {
    name: "Bed",
    timestamp: "2026-04-09T12:00",
    photoUrl:
      "https://i.postimg.cc/Xqg062kL/krevet.jpg",
    location: "In the living room",
  },
  {
    name: "Terrace table and chairs",
    timestamp: "2026-04-09T12:00",
    photoUrl:
      "https://i.postimg.cc/6qhNxHfH/terasa.jpg",
    location: "In the terrace",
  },
  {
    name: "Shower cabin",
    timestamp: "2026-04-09T12:00",
    photoUrl:
      "https://i.postimg.cc/kGydPjv1/tus_kabina.jpg",
    location: "In the bathroom",
  },
  {
    name: "Kitchen counter top",
    timestamp: "2026-04-09T12:00",
    photoUrl:
      "https://i.postimg.cc/vTvdwPtz/kuhinjska_radna_povrsina_frizider_i_sporet.jpg",
    location: "In the kitchen",
  },
  {
    name: "Microwave",
    timestamp: "2026-04-09T12:000",
    photoUrl:
      "https://i.postimg.cc/0jCq1t0G/microwave.jpg",
    location: "In the kitchen",
  },
];
