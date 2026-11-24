import type { ReactNode } from "react";

interface Props {
  name: string;
  children: ReactNode;
  onClick: () => void;
  disabled?: boolean;
}
export function IconButton({
  name,
  children,
  onClick,
  disabled = false,
}: Props) {
  return (
    <button
      type="button"
      className="iconbtn"
      title={name}
      aria-label={name}
      disabled={disabled}
      onClick={onClick}
    >
      {children}
    </button>
  );
}
