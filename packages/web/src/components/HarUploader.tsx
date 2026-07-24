import { useRef, useState } from "react";
import { Upload } from "lucide-react";
import { Button, Card } from "./ui";
import { cn } from "@/lib/utils";

type Props = {
  label?: string;
  onFileLoaded: (payload: { fileName: string; text: string }) => void;
  onError: (message: string) => void;
  disabled?: boolean;
};

export function HarUploader({
  label = "측정 파일 올리기",
  onFileLoaded,
  onError,
  disabled,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  async function readFile(file: File) {
    if (!file.name.toLowerCase().endsWith(".har") && file.type !== "application/json") {
      onError("`.har` 파일만 올릴 수 있습니다.");
      return;
    }
    try {
      const text = await file.text();
      JSON.parse(text);
      onFileLoaded({ fileName: file.name, text });
    } catch {
      onError("올바른 HAR(JSON) 파일인지 확인해 주세요.");
    }
  }

  return (
    <Card>
      <h2 className="mb-1 text-base font-semibold">{label}</h2>
      <p className="mb-3 text-sm text-[var(--muted)]">
        컴퓨터에서만 분석합니다. 파일은 인터넷으로 보내지 않습니다.
      </p>
      <div
        className={cn(
          "flex flex-col items-center gap-3 rounded-xl border border-dashed px-6 py-8 text-center",
          dragOver ? "border-[var(--accent)] bg-teal-50" : "border-[var(--border)]",
        )}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          const file = e.dataTransfer.files?.[0];
          if (file) void readFile(file);
        }}
      >
        <Upload className="size-7 text-[var(--muted)]" />
        <Button type="button" disabled={disabled} onClick={() => inputRef.current?.click()}>
          파일 선택
        </Button>
        <input
          ref={inputRef}
          type="file"
          accept=".har,application/json"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void readFile(file);
            e.target.value = "";
          }}
        />
      </div>
    </Card>
  );
}
