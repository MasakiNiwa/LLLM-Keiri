import {
  BookOpen,
  Briefcase,
  CalendarCheck,
  Gauge,
  Landmark,
  Network,
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
  network: Network,
  briefcase: Briefcase,
  scale: Scale,
  gauge: Gauge,
};

export function TrackIcon({ name, className }: { name?: string; className?: string }) {
  const Icon = (name && ICONS[name]) || BookOpen;
  return <Icon className={className} />;
}
