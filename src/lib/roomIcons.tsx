import {
  Sofa,
  Flame,
  Bed,
  Bath,
  Toilet,
  FolderOpen,
  Lamp,
  Utensils,
  Baby,
  Dumbbell,
  Shirt,
  Car,
  TreePine,
  BookOpen,
  Tv,
  ShowerHead,
  type LucideIcon,
} from "lucide-react";

export type RoomType = "TOALETA" | "WC" | "SALON" | "KUCHNIA" | "SYPIALNIA" | "INNE";

export const ROOM_TYPE_LABELS: Record<RoomType, string> = {
  TOALETA: "Toaleta",
  WC: "WC",
  SALON: "Salon",
  KUCHNIA: "Kuchnia",
  SYPIALNIA: "Sypialnia",
  INNE: "Inne",
};

export interface IconOption {
  key: string;
  label: string;
  icon: LucideIcon;
}

export const ICON_OPTIONS: IconOption[] = [
  { key: "SALON",    label: "Salon",      icon: Sofa },
  { key: "KUCHNIA",  label: "Kuchnia",    icon: Flame },
  { key: "SYPIALNIA",label: "Sypialnia",  icon: Bed },
  { key: "WC",       label: "Łazienka",   icon: Bath },
  { key: "TOALETA",  label: "Toaleta",    icon: Toilet },
  { key: "PRYSZNIC", label: "Prysznic",   icon: ShowerHead },
  { key: "JADALNIA", label: "Jadalnia",   icon: Utensils },
  { key: "POKOJ_DZIECIECY", label: "Pokój dziecięcy", icon: Baby },
  { key: "GARDEROBA",label: "Garderoba",  icon: Shirt },
  { key: "GABINET",  label: "Gabinet",    icon: BookOpen },
  { key: "SALON_TV", label: "Salon TV",   icon: Tv },
  { key: "OSWIETLENIE", label: "Oświetlenie", icon: Lamp },
  { key: "SILOWNIA", label: "Siłownia",   icon: Dumbbell },
  { key: "GARAZ",    label: "Garaż",      icon: Car },
  { key: "OGROD",    label: "Ogród",      icon: TreePine },
  { key: "INNE",     label: "Inne",       icon: FolderOpen },
];

const ICON_MAP: Record<string, LucideIcon> = Object.fromEntries(
  ICON_OPTIONS.map(({ key, icon }) => [key, icon])
);

export function getRoomIcon(type?: string | null, icon?: string | null): LucideIcon {
  const key = icon || type;
  if (key && key in ICON_MAP) return ICON_MAP[key];
  return FolderOpen;
}
