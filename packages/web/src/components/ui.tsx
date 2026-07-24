import { cn } from "@/lib/utils";
import type { ButtonHTMLAttributes, PropsWithChildren } from "react";

export function Button({
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center rounded-md bg-[var(--accent)] px-3 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}

export function Card({
  className,
  children,
}: PropsWithChildren<{ className?: string }>) {
  return (
    <div
      className={cn(
        "rounded-xl border border-[var(--border)] bg-[var(--card)] p-4 shadow-sm",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function Alert({
  title,
  children,
}: PropsWithChildren<{ title: string }>) {
  return (
    <div className="rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-[var(--danger)]">
      <div className="font-semibold">{title}</div>
      <div>{children}</div>
    </div>
  );
}
