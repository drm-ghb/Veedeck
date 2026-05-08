import type { CSSProperties, ReactElement } from "react";

export interface IconProps {
  size?: number | string;
  className?: string;
  /** No-op — kept for API compatibility with lucide-react */
  strokeWidth?: number;
  color?: string;
  style?: CSSProperties;
}

/** Drop-in replacement for the `LucideIcon` type */
export type LucideIcon = (props: IconProps) => ReactElement;

function icon(symbolName: string): LucideIcon {
  function Icon({ size, className, color, style }: IconProps): ReactElement {
    const computedStyle: CSSProperties = {
      ...(size ? { fontSize: typeof size === "number" ? `${size}px` : size } : {}),
      ...(color ? { color } : {}),
      ...style,
    };
    return (
      <span
        className={`material-symbols-rounded${className ? ` ${className}` : ""}`}
        style={Object.keys(computedStyle).length > 0 ? computedStyle : undefined}
        aria-hidden="true"
      >
        {symbolName}
      </span>
    );
  }
  Icon.displayName = symbolName;
  return Icon;
}

// ── Navigation / Layout ────────────────────────────────────────────────────
export const LayoutDashboard  = icon("space_dashboard");
export const LayoutGrid       = icon("grid_view");
export const List             = icon("format_list_bulleted");
export const PanelLeftClose   = icon("left_panel_close");
export const PanelLeftOpen    = icon("left_panel_open");
export const Menu             = icon("menu");
export const Grid2x2          = icon("apps");
export const SplitSquareHorizontal = icon("flip");
export const Maximize2        = icon("open_in_full");

// ── Modules (user-specified) ───────────────────────────────────────────────
export const Users            = icon("group");

export function PictureInPicture({ size = 20, className, color, style }: IconProps): ReactElement {
  const px = typeof size === "number" ? size : parseInt(size as string, 10) || 20;
  return (
    <span
      className={className}
      aria-hidden="true"
      style={{
        display: "inline-block",
        flexShrink: 0,
        width: px,
        height: px,
        backgroundColor: color ?? "currentColor",
        WebkitMaskImage: "url('/renderflow-icon.png')",
        maskImage: "url('/renderflow-icon.png')",
        WebkitMaskSize: "contain",
        maskSize: "contain",
        WebkitMaskRepeat: "no-repeat",
        maskRepeat: "no-repeat",
        WebkitMaskPosition: "center",
        maskPosition: "center",
        ...style,
      }}
    />
  );
}
export const ScrollText       = icon("list_alt");
export const Package          = icon("package_2");
export const CalendarDays     = icon("calendar_month");
export const NotebookText     = icon("note_stack");
export const NotebookPen      = icon("note_stack_add");
export const MessageSquare    = icon("forum");

// ── Pins ───────────────────────────────────────────────────────────────────
export const Pin              = icon("keep");
export const PinOff           = icon("keep_off");
export const MapPin           = icon("location_on");

// ── Actions ───────────────────────────────────────────────────────────────
export const Plus             = icon("add");
export const Minus            = icon("remove");
export const X                = icon("close");
export const Check            = icon("check");
export const Search           = icon("search");
export const Trash2           = icon("delete");
export const Edit2            = icon("edit");
export const Pencil           = icon("edit");
export const PenLine          = icon("edit");
export const Pen              = icon("draw");
export const Eraser           = icon("ink_eraser");
export const Archive          = icon("archive");
export const ArchiveRestore   = icon("unarchive");
export const Copy             = icon("content_copy");
export const CopyCheck        = icon("content_paste_go");
export const Link2            = icon("link");
export const Share2           = icon("share");
export const ExternalLink     = icon("open_in_new");
export const Download         = icon("download");
export const Upload           = icon("upload");
export const Send             = icon("send");
export const RefreshCw        = icon("refresh");
export const RotateCcw        = icon("undo");
export const History          = icon("history");

// ── Visibility / Access ────────────────────────────────────────────────────
export const Eye              = icon("visibility");
export const EyeOff           = icon("visibility_off");
export const Lock             = icon("lock");
export const LockOpen         = icon("lock_open");
export const ShieldCheck      = icon("verified_user");
export const KeyRound         = icon("key");

// ── Chevrons / Arrows ─────────────────────────────────────────────────────
export const ChevronLeft      = icon("chevron_left");
export const ChevronRight     = icon("chevron_right");
export const ChevronDown      = icon("expand_more");
export const ChevronUp        = icon("expand_less");
export const ChevronsLeftRight= icon("swap_horiz");
export const ArrowLeft        = icon("arrow_back");
export const ArrowUpDown      = icon("swap_vert");
export const ArrowDownUp      = icon("swap_vert");
export const CornerDownLeft   = icon("subdirectory_arrow_left");

// ── Status / Alerts ───────────────────────────────────────────────────────
export const Check2           = icon("check");
export const CheckCircle      = icon("check_circle");
export const CheckCircle2     = icon("check_circle");
export const AlertTriangle    = icon("warning");
export const AlertCircle      = icon("error");
export const Info             = icon("info");
export const Circle           = icon("circle");
export const Bell             = icon("notifications");

// ── Files / Folders ───────────────────────────────────────────────────────
export const Folder           = icon("folder");
export const FolderOpen       = icon("folder_open");
export const FolderPlus       = icon("create_new_folder");
export const FolderInput      = icon("drive_folder_upload");
export const FileText         = icon("description");
export const File             = icon("insert_drive_file");
export const FileSpreadsheet  = icon("table_chart");
export const FileDown         = icon("file_download");
export const Paperclip        = icon("attach_file");

// ── Media ─────────────────────────────────────────────────────────────────
export const Image            = icon("image");
export const ImagePlus        = icon("add_photo_alternate");
export const Mic              = icon("mic");
export const StopCircle       = icon("stop_circle");
export const Square           = icon("stop");
export const Sparkles         = icon("auto_awesome");

// ── User / Auth ───────────────────────────────────────────────────────────
export const User             = icon("person");
export const UserRound        = icon("person");
export const UserCircle       = icon("account_circle");
export const UserPlus         = icon("person_add");
export const LogOut           = icon("logout");
export const Mail             = icon("mail");
export const Phone            = icon("phone");
export const DoorOpen         = icon("door_open");

// ── Theme / Settings ──────────────────────────────────────────────────────
export const Sun              = icon("light_mode");
export const Moon             = icon("dark_mode");
export const Monitor          = icon("desktop_windows");
export const Settings         = icon("settings");
export const Palette          = icon("palette");
export const Globe            = icon("language");
export const HelpCircle       = icon("help");
export const Puzzle           = icon("extension");
export const Activity         = icon("monitoring");
export const SlidersHorizontal= icon("tune");
export const Layers           = icon("layers");

// ── Layout / Grid ─────────────────────────────────────────────────────────
export const GripVertical     = icon("drag_indicator");
export const MoreHorizontal   = icon("more_horiz");
export const MoreVertical     = icon("more_vert");

// ── Zoom / View ───────────────────────────────────────────────────────────
export const ZoomIn           = icon("zoom_in");
export const ZoomOut          = icon("zoom_out");

// ── Text Formatting (NoteEditor) ──────────────────────────────────────────
export const Bold             = icon("format_bold");
export const Italic           = icon("format_italic");
export const Underline        = icon("format_underlined");
export const Strikethrough    = icon("strikethrough_s");
export const ListOrdered      = icon("format_list_numbered");
export const ListChecks       = icon("checklist");

// ── Finance ───────────────────────────────────────────────────────────────
export const Wallet           = icon("account_balance_wallet");
export const DollarSign       = icon("attach_money");
export const Sheet            = icon("table_chart");

// ── Misc ──────────────────────────────────────────────────────────────────
export const Home             = icon("home");
export const Loader2          = icon("progress_activity");
export const Clock            = icon("schedule");
export const ScrollText2      = icon("receipt_long");
export const XCircle          = icon("cancel");
export const Armchair         = icon("chair");
export const ImagePlus2       = icon("add_photo_alternate");

// ── Room icons (roomIcons.tsx) ─────────────────────────────────────────────
export const Sofa             = icon("weekend");
export const Flame            = icon("local_fire_department");
export const Bed              = icon("bed");
export const Bath             = icon("bathtub");
export const Toilet           = icon("toilet");
export const Lamp             = icon("lamp");
export const Utensils         = icon("restaurant");
export const Baby             = icon("child_care");
export const Dumbbell         = icon("fitness_center");
export const Shirt            = icon("checkroom");
export const Car              = icon("directions_car");
export const TreePine         = icon("park");
export const BookOpen         = icon("menu_book");
export const Tv               = icon("tv");
export const ShowerHead       = icon("shower");

// ── Aliases with *Icon suffix (UI primitives) ──────────────────────────────
export const XIcon            = X;
export const ChevronRightIcon = ChevronRight;
export const CheckIcon        = Check;
export const CircleCheckIcon  = CheckCircle;
export const InfoIcon         = Info;
export const TriangleAlertIcon= AlertTriangle;
export const OctagonXIcon     = XCircle;
export const Loader2Icon      = Loader2;
