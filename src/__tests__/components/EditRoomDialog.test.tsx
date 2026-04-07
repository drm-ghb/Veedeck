/**
 * @vitest-environment jsdom
 */
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi, describe, it, expect, beforeEach } from "vitest";
import EditRoomDialog from "@/components/dashboard/EditRoomDialog";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock("@/lib/roomIcons", () => ({
  ROOM_TYPE_LABELS: { INNE: "Inne", SALON: "Salon", SYPIALNIA: "Sypialnia" },
  ICON_OPTIONS: [
    { key: "INNE", label: "Inne", icon: () => <svg data-testid="icon-inne" /> },
    { key: "SALON", label: "Salon", icon: () => <svg data-testid="icon-salon" /> },
  ],
  getRoomIcon: (_: unknown, key: string) => () => <svg data-testid={`room-icon-${key}`} />,
}));

const mockRoom = {
  id: "room-1",
  name: "Salon",
  type: "SALON",
  icon: null,
};

const defaultProps = {
  room: mockRoom,
  open: true,
  onOpenChange: vi.fn(),
};

global.fetch = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(global.fetch).mockResolvedValue({
    ok: true,
    json: async () => ({ id: "room-1", name: "Nowy Salon", type: "SALON" }),
  } as Response);
});

describe("EditRoomDialog", () => {
  it("renderuje dialog z tytułem", () => {
    render(<EditRoomDialog {...defaultProps} />);
    expect(screen.getByText("Edytuj pomieszczenie")).toBeInTheDocument();
  });

  it("wyświetla aktualną nazwę pomieszczenia w polu input", () => {
    render(<EditRoomDialog {...defaultProps} />);
    const input = screen.getByRole("textbox");
    expect(input).toHaveValue("Salon");
  });

  it("przycisk Zapisz jest disabled gdy pole nazwy jest puste", async () => {
    render(<EditRoomDialog {...defaultProps} />);
    const input = screen.getByRole("textbox");
    await userEvent.clear(input);
    const saveBtn = screen.getByText("Zapisz");
    expect(saveBtn).toBeDisabled();
  });

  it("kliknięcie Anuluj wywołuje onOpenChange(false)", () => {
    const onOpenChange = vi.fn();
    render(<EditRoomDialog {...defaultProps} onOpenChange={onOpenChange} />);
    fireEvent.click(screen.getByText("Anuluj"));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("kliknięcie Zapisz wywołuje PATCH na /api/rooms/[id]", async () => {
    render(<EditRoomDialog {...defaultProps} />);
    const input = screen.getByRole("textbox");
    await userEvent.clear(input);
    await userEvent.type(input, "Nowy Salon");

    fireEvent.click(screen.getByText("Zapisz"));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/rooms/room-1",
        expect.objectContaining({
          method: "PATCH",
          body: expect.stringContaining("Nowy Salon"),
        })
      );
    });
  });

  it("Enter w polu nazwy wywołuje zapis", async () => {
    render(<EditRoomDialog {...defaultProps} />);
    const input = screen.getByRole("textbox");
    await userEvent.clear(input);
    await userEvent.type(input, "Kuchnia{Enter}");

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/rooms/room-1",
        expect.objectContaining({ method: "PATCH" })
      );
    });
  });

  it("po błędzie API wyświetla toast error", async () => {
    vi.mocked(global.fetch).mockResolvedValue({ ok: false, json: async () => ({}) } as Response);
    const { toast } = await import("sonner");

    render(<EditRoomDialog {...defaultProps} />);
    fireEvent.click(screen.getByText("Zapisz"));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Błąd zapisu");
    });
  });

  it("po pomyślnym zapisie wyświetla toast success", async () => {
    const { toast } = await import("sonner");

    render(<EditRoomDialog {...defaultProps} />);
    fireEvent.click(screen.getByText("Zapisz"));

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith("Pomieszczenie zaktualizowane");
    });
  });

  it("resetuje formularz gdy dialog jest ponownie otwierany", async () => {
    const { rerender } = render(<EditRoomDialog {...defaultProps} open={false} />);
    rerender(
      <EditRoomDialog
        {...defaultProps}
        open={true}
        room={{ ...mockRoom, name: "Nowa Nazwa" }}
      />
    );
    const input = screen.getByRole("textbox");
    expect(input).toHaveValue("Nowa Nazwa");
  });
});
