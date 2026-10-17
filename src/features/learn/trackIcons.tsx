import {
  BookOpen,
  Briefcase,
  CalendarCheck,
  Landmark,
  Scale,
  ShoppingCart,
  Sprout,
  type LucideIcon,
} from 'lucide-react';

/** content/tracks.yaml の icon で使える名前 */
const ICONS: Record<string, LucideIcon> = {
  sprout: Sprout,
  'shopping-cart': ShoppingCart,
  'calendar-check': CalendarCheck,
  landmark: Landmark,
  briefcase: Briefcase,
  scale: Scale,
};

export function TrackIcon({ name, className }: { name?: string; className?: string }) {
  const Icon = (name && ICONS[name]) || BookOpen;
  return <Icon className={className} />;
}
