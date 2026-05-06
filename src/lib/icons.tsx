import { HugeiconsIcon, type HugeiconsProps, type IconSvgElement } from '@hugeicons/react-native';
import {
  ArrowDownRight01Icon,
  ArrowLeft02Icon,
  ArrowRight01Icon,
  ArrowUpRight01Icon,
  BarcodeScanIcon,
  Building03Icon,
  ChartBarLineIcon,
  Invoice01Icon,
  Logout02Icon,
  Mail01Icon,
  Moon02Icon,
  PackageReceiveIcon,
  Package02Icon,
  PaintBoardIcon,
  DeliveryTruck01Icon,
  UserGroup02Icon,
  PlusSignIcon,
  RadioIcon,
  Search01Icon,
  Settings02Icon,
  ShoppingCart01Icon,
  SquareLock02Icon,
  Sun02Icon,
  Home02Icon,
  User02Icon,
  ViewIcon,
  ViewOffIcon,
  Wallet02Icon,
  FilterHorizontalIcon,
} from '@hugeicons/core-free-icons';
import { iconDefaults } from '~/theme/tokens';

/**
 * Wrapper único de iconos para toda la app.
 * - Centralizamos la librería (Hugeicons) en un solo import
 * - Default strokeWidth fino (1.5) consistente con el ERP web (`--icon-stroke: 1`)
 * - Si mañana cambiamos de librería, se cambia un solo archivo
 */
type Props = Omit<HugeiconsProps, 'icon'>;

function makeIcon(svg: IconSvgElement) {
  return function Icon(props: Props) {
    return (
      <HugeiconsIcon
        icon={svg}
        size={props.size ?? iconDefaults.size}
        strokeWidth={props.strokeWidth ?? iconDefaults.strokeWidth}
        {...props}
      />
    );
  };
}

// Navigation / arrows
export const ArrowLeft = makeIcon(ArrowLeft02Icon);
export const ArrowRight = makeIcon(ArrowRight01Icon);
export const ChevronRight = makeIcon(ArrowRight01Icon);
export const ArrowUpRight = makeIcon(ArrowUpRight01Icon);
export const ArrowDownRight = makeIcon(ArrowDownRight01Icon);

// Actions
export const Search = makeIcon(Search01Icon);
export const Filter = makeIcon(FilterHorizontalIcon);
export const Plus = makeIcon(PlusSignIcon);

// Auth
export const Mail = makeIcon(Mail01Icon);
export const Lock = makeIcon(SquareLock02Icon);
export const Eye = makeIcon(ViewIcon);
export const EyeOff = makeIcon(ViewOffIcon);
export const Building = makeIcon(Building03Icon);

// Tabs / app
export const Home = makeIcon(Home02Icon);
export const Package = makeIcon(Package02Icon);
export const PackageReceive = makeIcon(PackageReceiveIcon);
export const ScanLine = makeIcon(BarcodeScanIcon);
export const Settings = makeIcon(Settings02Icon);
export const Truck = makeIcon(DeliveryTruck01Icon);

// Quick actions
export const ShoppingCart = makeIcon(ShoppingCart01Icon);
export const Receipt = makeIcon(Invoice01Icon);
export const Wallet = makeIcon(Wallet02Icon);
export const BarChart = makeIcon(ChartBarLineIcon);

// Profile / settings
export const User = makeIcon(User02Icon);
export const UserGroup = makeIcon(UserGroup02Icon);
export const LogOut = makeIcon(Logout02Icon);
export const Moon = makeIcon(Moon02Icon);
export const Sun = makeIcon(Sun02Icon);
export const Palette = makeIcon(PaintBoardIcon);

// Misc
export const Radio = makeIcon(RadioIcon);
