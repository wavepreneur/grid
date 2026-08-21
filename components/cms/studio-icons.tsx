import type { ComponentType } from "react";
import type { LucideProps } from "lucide-react";
import {
  ArrowRight,
  Building2,
  Check,
  ChevronDown,
  Code2,
  Copy,
  Gamepad2,
  GripVertical,
  Home,
  Info,
  KeyRound,
  Layers,
  LayoutGrid,
  MapPin,
  MonitorSmartphone,
  Pencil,
  Play,
  Plus,
  Puzzle,
  RefreshCw,
  Route,
  Save,
  Search,
  Ticket,
  Trash2,
  Upload,
  Users,
  X,
} from "lucide-react";

/** Studio icons — lucide wrappers. Default h-5 w-5 (size 20), strokeWidth 2. */
export type IconProps = LucideProps & { size?: number };

function wrap(
  Icon: ComponentType<LucideProps>,
  { size = 20, strokeWidth = 2, className = "", ...props }: IconProps,
) {
  return (
    <Icon
      size={size}
      strokeWidth={strokeWidth}
      className={`shrink-0 ${className}`}
      aria-hidden
      {...props}
    />
  );
}

export function IconHome(props: IconProps) {
  return wrap(Home, props);
}
export function IconGamepad(props: IconProps) {
  return wrap(Gamepad2, props);
}
export function IconTemplate(props: IconProps) {
  return wrap(LayoutGrid, props);
}
export function IconPuzzle(props: IconProps) {
  return wrap(Puzzle, props);
}
export function IconTicket(props: IconProps) {
  return wrap(Ticket, props);
}
export function IconCode(props: IconProps) {
  return wrap(Code2, props);
}
export function IconPlus(props: IconProps) {
  return wrap(Plus, props);
}
export function IconSave(props: IconProps) {
  return wrap(Save, props);
}
export function IconUpload(props: IconProps) {
  return wrap(Upload, props);
}
export function IconPlay(props: IconProps) {
  return wrap(Play, props);
}
export function IconRefresh(props: IconProps) {
  return wrap(RefreshCw, props);
}
export function IconCopy(props: IconProps) {
  return wrap(Copy, props);
}
export function IconSearch(props: IconProps) {
  return wrap(Search, props);
}
export function IconEdit(props: IconProps) {
  return wrap(Pencil, props);
}
export function IconTrash(props: IconProps) {
  return wrap(Trash2, props);
}
export function IconMapPin(props: IconProps) {
  return wrap(MapPin, props);
}
export function IconGrip(props: IconProps) {
  return wrap(GripVertical, props);
}
export function IconArrowRight(props: IconProps) {
  return wrap(ArrowRight, props);
}
export function IconChevronDown(props: IconProps) {
  return wrap(ChevronDown, props);
}
export function IconBuilding(props: IconProps) {
  return wrap(Building2, props);
}
export function IconKeyRound(props: IconProps) {
  return wrap(KeyRound, props);
}
export function IconDevices(props: IconProps) {
  return wrap(MonitorSmartphone, props);
}
export function IconUsers(props: IconProps) {
  return wrap(Users, props);
}
export function IconInfo(props: IconProps) {
  return wrap(Info, props);
}
export function IconCheck(props: IconProps) {
  return wrap(Check, props);
}
export function IconClose(props: IconProps) {
  return wrap(X, props);
}
export function IconRoute(props: IconProps) {
  return wrap(Route, props);
}
export function IconLayers(props: IconProps) {
  return wrap(Layers, props);
}
