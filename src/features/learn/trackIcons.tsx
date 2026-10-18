import {
  BookOpen,
  Briefcase,
  CalendarCheck,
  Factory,
  Gauge,
  Landmark,
  Network,
  Scale,
  ShieldCheck,
  ShoppingCart,
  Sparkles,
  Sprout,
  Wallet,
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
  factory: Factory,
  'shield-check': ShieldCheck,
  wallet: Wallet,
  sparkles: Sparkles,
};

export function TrackIcon({ name, className }: { name?: string; className?: string }) {
  const Icon = (name && ICONS[name]) || BookOpen;
  return <Icon className={className} />;
}
