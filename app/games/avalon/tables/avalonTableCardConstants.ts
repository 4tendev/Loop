import type { AvalonWsPhase } from "./types";

export const sideLabels = {
  good: "خیر",
  evil: "شر",
} as const;

export const roleLabels = {
  assassin: "اساسین",
  merlin: "مرلین",
  mordred: "موردرد",
  morgana: "مورگانا",
  oberon: "اوبرون",
  percival: "پرسیوال",
  servant: "خدمتگزار وفادار",
} as const;

export const phaseLabels: Record<AvalonWsPhase["type"], string> = {
  night: "شب",
  quest: "انتخاب تیم",
  mission: "ماموریت",
  ladyCheck: "بانوی دریاچه",
  assassination: "ترور",
  unknown: "مرحله",
};

export const roleImageByName = {
  assassin: "/avalon/avalon_characters/Assassin.png",
  merlin: "/avalon/avalon_characters/Merlin.png",
  mordred: "/avalon/avalon_characters/Mordred.png",
  morgana: "/avalon/avalon_characters/Morgana.png",
  oberon: "/avalon/avalon_characters/Oberon.png",
  percival: "/avalon/avalon_characters/Percival.png",
  servant: "/avalon/avalon_characters/LoyalServantOfArthur.png",
} as const;

export const evilRoleNames = new Set<keyof typeof roleImageByName>([
  "assassin",
  "morgana",
  "mordred",
  "oberon",
]);
