import type { SchoolEvent } from "./eventTypes";

export interface EventImages {
  banner: string;
  costumes: string[];
  activities: string[];
}

/** Curated Unsplash URLs (no API key). Lazy-loaded on clients. */
const EVENT_IMAGE_MAP: Record<string, EventImages> = {
  "in-republic-day": {
    banner: "https://images.unsplash.com/photo-1587474260584-136574528ed5?w=800&h=400&fit=crop&q=80",
    costumes: [
      "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=400&h=300&fit=crop&q=80",
      "https://images.unsplash.com/photo-1503454537849-8342774dda4c?w=400&h=300&fit=crop&q=80",
    ],
    activities: [
      "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=400&h=300&fit=crop&q=80",
    ],
  },
  "in-holi": {
    banner: "https://images.unsplash.com/photo-1524492412937-280c955d48d7?w=800&h=400&fit=crop&q=80",
    costumes: [
      "https://images.unsplash.com/photo-1511895426328-dc8714191300?w=400&h=300&fit=crop&q=80",
      "https://images.unsplash.com/photo-1503454537849-8342774dda4c?w=400&h=300&fit=crop&q=80",
    ],
    activities: [
      "https://images.unsplash.com/photo-1587654780291-39c9404d746b?w=400&h=300&fit=crop&q=80",
    ],
  },
  "in-independence-day": {
    banner: "https://images.unsplash.com/photo-1592432678017-eaac65eeafab?w=800&h=400&fit=crop&q=80",
    costumes: [
      "https://images.unsplash.com/photo-1503454537849-8342774dda4c?w=400&h=300&fit=crop&q=80",
      "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=400&h=300&fit=crop&q=80",
    ],
    activities: [
      "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=400&h=300&fit=crop&q=80",
    ],
  },
  "in-teachers-day": {
    banner: "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=800&h=400&fit=crop&q=80",
    costumes: [
      "https://images.unsplash.com/photo-1580582932707-520aedcedb21?w=400&h=300&fit=crop&q=80",
    ],
    activities: [
      "https://images.unsplash.com/photo-1516627145497-ae6968895b74?w=400&h=300&fit=crop&q=80",
    ],
  },
  "in-gandhi-jayanti": {
    banner: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&h=400&fit=crop&q=80",
    costumes: [
      "https://images.unsplash.com/photo-1503454537849-8342774dda4c?w=400&h=300&fit=crop&q=80",
    ],
    activities: [
      "https://images.unsplash.com/photo-1532629345422-7515f3d4bb56?w=400&h=300&fit=crop&q=80",
    ],
  },
  "in-diwali": {
    banner: "https://images.unsplash.com/photo-1604421377898-966257785c2a?w=800&h=400&fit=crop&q=80",
    costumes: [
      "https://images.unsplash.com/photo-1605649487212-47bdab064df7?w=400&h=300&fit=crop&q=80",
      "https://images.unsplash.com/photo-1511895426328-dc8714191300?w=400&h=300&fit=crop&q=80",
    ],
    activities: [
      "https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400&h=300&fit=crop&q=80",
    ],
  },
  "in-childrens-day": {
    banner: "https://images.unsplash.com/photo-1503454537849-8342774dda4c?w=800&h=400&fit=crop&q=80",
    costumes: [
      "https://images.unsplash.com/photo-1503454537849-8342774dda4c?w=400&h=300&fit=crop&q=80",
    ],
    activities: [
      "https://images.unsplash.com/photo-1516627145497-ae6968895b74?w=400&h=300&fit=crop&q=80",
    ],
  },
  "in-sports-day": {
    banner: "https://images.unsplash.com/photo-1461896836933-ffe607ba8211?w=800&h=400&fit=crop&q=80",
    costumes: [
      "https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=400&h=300&fit=crop&q=80",
    ],
    activities: [
      "https://images.unsplash.com/photo-1461896836933-ffe607ba8211?w=400&h=300&fit=crop&q=80",
    ],
  },
  "in-annual-day": {
    banner: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800&h=400&fit=crop&q=80",
    costumes: [
      "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=400&h=300&fit=crop&q=80",
    ],
    activities: [
      "https://images.unsplash.com/photo-1503454537849-8342774dda4c?w=400&h=300&fit=crop&q=80",
    ],
  },
  "in-fancy-dress": {
    banner: "https://images.unsplash.com/photo-1503454537849-8342774dda4c?w=800&h=400&fit=crop&q=80",
    costumes: [
      "https://images.unsplash.com/photo-1503454537849-8342774dda4c?w=400&h=300&fit=crop&q=80",
      "https://images.unsplash.com/photo-1516627145497-ae6968895b74?w=400&h=300&fit=crop&q=80",
    ],
    activities: [
      "https://images.unsplash.com/photo-1587654780291-39c9404d746b?w=400&h=300&fit=crop&q=80",
    ],
  },
  "us-back-to-school": {
    banner: "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=800&h=400&fit=crop&q=80",
    costumes: [
      "https://images.unsplash.com/photo-1580582932707-520aedcedb21?w=400&h=300&fit=crop&q=80",
    ],
    activities: [
      "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=400&h=300&fit=crop&q=80",
    ],
  },
  "us-halloween": {
    banner: "https://images.unsplash.com/photo-1509557964383-64253a29f769?w=800&h=400&fit=crop&q=80",
    costumes: [
      "https://images.unsplash.com/photo-1509557964383-64253a29f769?w=400&h=300&fit=crop&q=80",
      "https://images.unsplash.com/photo-1503454537849-8342774dda4c?w=400&h=300&fit=crop&q=80",
    ],
    activities: [
      "https://images.unsplash.com/photo-1543286386-713bdd548da4?w=400&h=300&fit=crop&q=80",
    ],
  },
  "us-thanksgiving": {
    banner: "https://images.unsplash.com/photo-1478146896986-befeb06489f9?w=800&h=400&fit=crop&q=80",
    costumes: [
      "https://images.unsplash.com/photo-1503454537849-8342774dda4c?w=400&h=300&fit=crop&q=80",
    ],
    activities: [
      "https://images.unsplash.com/photo-1516627145497-ae6968895b74?w=400&h=300&fit=crop&q=80",
    ],
  },
  "us-independence-day": {
    banner: "https://images.unsplash.com/photo-1464207687429-750564106dae?w=800&h=400&fit=crop&q=80",
    costumes: [
      "https://images.unsplash.com/photo-1503454537849-8342774dda4c?w=400&h=300&fit=crop&q=80",
    ],
    activities: [
      "https://images.unsplash.com/photo-1464207687429-750564106dae?w=400&h=300&fit=crop&q=80",
    ],
  },
  "us-easter": {
    banner: "https://images.unsplash.com/photo-1520523839897-bd055432ad95?w=800&h=400&fit=crop&q=80",
    costumes: [
      "https://images.unsplash.com/photo-1520523839897-bd055432ad95?w=400&h=300&fit=crop&q=80",
    ],
    activities: [
      "https://images.unsplash.com/photo-1516627145497-ae6968895b74?w=400&h=300&fit=crop&q=80",
    ],
  },
  "us-christmas": {
    banner: "https://images.unsplash.com/photo-1512389148640-fc5814bf2f08?w=800&h=400&fit=crop&q=80",
    costumes: [
      "https://images.unsplash.com/photo-1512389148640-fc5814bf2f08?w=400&h=300&fit=crop&q=80",
    ],
    activities: [
      "https://images.unsplash.com/photo-1543286386-713bdd548da4?w=400&h=300&fit=crop&q=80",
    ],
  },
  "us-field-day": {
    banner: "https://images.unsplash.com/photo-1461896836933-ffe607ba8211?w=800&h=400&fit=crop&q=80",
    costumes: [
      "https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=400&h=300&fit=crop&q=80",
    ],
    activities: [
      "https://images.unsplash.com/photo-1461896836933-ffe607ba8211?w=400&h=300&fit=crop&q=80",
    ],
  },
  "us-talent-show": {
    banner: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800&h=400&fit=crop&q=80",
    costumes: [
      "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=400&h=300&fit=crop&q=80",
    ],
    activities: [
      "https://images.unsplash.com/photo-1503454537849-8342774dda4c?w=400&h=300&fit=crop&q=80",
    ],
  },
  "us-graduation": {
    banner: "https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=800&h=400&fit=crop&q=80",
    costumes: [
      "https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=400&h=300&fit=crop&q=80",
    ],
    activities: [
      "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=400&h=300&fit=crop&q=80",
    ],
  },
  "us-spring-festival": {
    banner: "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=800&h=400&fit=crop&q=80",
    costumes: [
      "https://images.unsplash.com/photo-1503454537849-8342774dda4c?w=400&h=300&fit=crop&q=80",
    ],
    activities: [
      "https://images.unsplash.com/photo-1516627145497-ae6968895b74?w=400&h=300&fit=crop&q=80",
    ],
  },
};

export function getEventImages(eventId: string): EventImages | undefined {
  return EVENT_IMAGE_MAP[eventId];
}

export function withEventImages(event: SchoolEvent): SchoolEvent & { images?: EventImages } {
  const images = getEventImages(event.id);
  return images ? { ...event, images } : event;
}
