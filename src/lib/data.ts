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
    timestamp: "2026-04-05T15:00",
    photoUrl:
      "https://a0.muscache.com/im/pictures/miso/Hosting-687575486557684652/original/fed09d3c-deb2-4335-977e-c5918a7afe75.jpeg?im_w=720",
    location: "In the living room",
  },
  {
    name: "White closet/cabinet",
    timestamp: "2026-04-05T15:00",
    photoUrl:
      "https://a0.muscache.com/im/pictures/miso/Hosting-687575486557684652/original/fed09d3c-deb2-4335-977e-c5918a7afe75.jpeg?im_w=720",
    location: "In the living room",
  },
  {
    name: "Bed",
    timestamp: "2026-04-05T15:00",
    photoUrl:
      "https://a0.muscache.com/im/pictures/miso/Hosting-687575486557684652/original/fb19e7d6-e335-4c47-ab62-8e1d9df4cdcc.jpeg?im_w=720",
    location: "In the living room",
  },
  {
    name: "Washing machine",
    timestamp: "2026-04-05T15:00",
    photoUrl:
      "https://a0.muscache.com/im/pictures/miso/Hosting-687575486557684652/original/3c0cb6df-be9b-4743-93b0-a62edc54f3ea.jpeg?im_w=720",
    location: "In the bathroom",
  },
  {
    name: "Shower cabin",
    timestamp: "2026-04-05T15:00",
    photoUrl:
      "https://a0.muscache.com/im/pictures/miso/Hosting-687575486557684652/original/30db820f-aa48-4b5d-af77-0d7efdb22e82.jpeg?im_w=720",
    location: "In the bathroom",
  },
  {
    name: "Dishwasher",
    timestamp: "2026-04-05T15:00",
    photoUrl:
      "https://a0.muscache.com/im/pictures/miso/Hosting-687575486557684652/original/d84b6e0b-a27d-46f1-b859-e84e72d970f3.jpeg?im_w=720",
    location: "In the kitchen",
  },
  {
    name: "Microwave",
    timestamp: "2026-04-05T15:00",
    photoUrl:
      "https://a0.muscache.com/im/pictures/miso/Hosting-687575486557684652/original/d84b6e0b-a27d-46f1-b859-e84e72d970f3.jpeg?im_w=720",
    location: "In the kitchen",
  },
];
