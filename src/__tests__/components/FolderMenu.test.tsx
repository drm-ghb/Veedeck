/**
 * @vitest-environment jsdom
 */
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";
import FolderMenu from "@/components/render/FolderMenu";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

// Mock Dropdown i Dialog aby uprościć testy
vi.mock("@/components/ui/dropdown-menu", () => ({
  DropdownMenu: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuTrigger: ({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) => (
    <button onClick={onClick} data-testid="dropdown-trigger">{children}</button>
  ),
  DropdownMenuContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="dropdown-content">{children}</div>
  ),
  DropdownMenuItem: ({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) => (
    <button onClick={onClick} data-testid="dropdown-item">{children}</button>
  ),
  DropdownMenuSeparator: () => <hr />,
}));

vi.mock("@/components/ui/dialog", () => ({
  Dialog: ({ children, open }: { children: React.ReactNode; open: boolean }) =>
    open ? <div data-testid="dialog">{children}</div> : null,
  DialogContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
}));

vi.mock("@/components/ui/input", () => ({
  Input: (props: React.InputHTMLAttributes<HTMLInputElement>) => <input {...props} />,
}));

vi.mock("@/components/ui/button", () => ({
  Button: ({ children, onClick, disabled }: { children: React.ReactNode; onClick?: () => void; disabled?: boolean }) => (
    <button onClick={onClick} disabled={disabled}>{children}</button>
  ),
}));

vi.mock("@/components/render/MoveFolderDialog", () => ({
  default: () => null,
}));

global.fetch = vi.fn();
global.confirm = vi.fn().mockReturnValue(true);

const folder = { id: "folder-1", name: "Sypialnia", pinned: false, archived: false };

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(global.fetch).mockResolvedValue({ ok: true, json: async () => ({}) } as Response);
});

describe("FolderMenu", () => {
  it("renderuje trigger menu", () => {
    render(<FolderMenu folder={folder} projectId="project-1" currentRoomId="room-1" />);
    expect(screen.getByTestId("dropdown-trigger")).toBeInTheDocument();
  });

  it("wyświetla opcję Archiwizuj", () => {
    render(<FolderMenu folder={folder} projectId="project-1" currentRoomId="room-1" />);
    expect(screen.getByText(/Archiwizuj/)).toBeInTheDocument();
  });

  it("wyświetla opcję Przypnij gdy folder nie jest przypięty", () => {
    render(<FolderMenu folder={{ ...folder, pinned: false }} projectId="project-1" currentRoomId="room-1" />);
    expect(screen.getByText(/Przypnij/)).toBeInTheDocument();
  });

  it("wyświetla opcję Odepnij gdy folder jest przypięty", () => {
    render(<FolderMenu folder={{ ...folder, pinned: true }} projectId="project-1" currentRoomId="room-1" />);
    expect(screen.getByText(/Odepnij/)).toBeInTheDocument();
  });

  it("kliknięcie Archiwizuj wywołuje PATCH z archived: true", async () => {
    render(<FolderMenu folder={folder} projectId="project-1" currentRoomId="room-1" />);
    const items = screen.getAllByTestId("dropdown-item");
    const archiveBtn = items.find((el) => el.textContent?.includes("Archiwizuj"));
    expect(archiveBtn).toBeTruthy();
    fireEvent.click(archiveBtn!);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/folders/folder-1",
        expect.objectContaining({
          method: "PATCH",
          body: expect.stringContaining('"archived":true'),
        })
      );
    });
  });

  it("kliknięcie Припnij wywołuje PATCH z pinned: true", async () => {
    render(<FolderMenu folder={{ ...folder, pinned: false }} projectId="project-1" currentRoomId="room-1" />);
    const items = screen.getAllByTestId("dropdown-item");
    const pinBtn = items.find((el) => el.textContent?.includes("Przypnij"));
    fireEvent.click(pinBtn!);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/folders/folder-1",
        expect.objectContaining({
          body: expect.stringContaining('"pinned":true'),
        })
      );
    });
  });

  it("kliknięcie Usuń wywołuje DELETE po potwierdzeniu", async () => {
    render(<FolderMenu folder={folder} projectId="project-1" currentRoomId="room-1" />);
    const items = screen.getAllByTestId("dropdown-item");
    const deleteBtn = items.find((el) => el.textContent?.includes("Usuń"));
    fireEvent.click(deleteBtn!);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/folders/folder-1",
        expect.objectContaining({ method: "DELETE" })
      );
    });
  });

  it("kliknięcie Zmień nazwę otwiera dialog", async () => {
    render(<FolderMenu folder={folder} projectId="project-1" currentRoomId="room-1" />);
    const items = screen.getAllByTestId("dropdown-item");
    const renameBtn = items.find((el) => el.textContent?.includes("Zmień nazwę"));
    fireEvent.click(renameBtn!);

    await waitFor(() => {
      expect(screen.getByTestId("dialog")).toBeInTheDocument();
      expect(screen.getByText("Zmień nazwę folderu")).toBeInTheDocument();
    });
  });
});
