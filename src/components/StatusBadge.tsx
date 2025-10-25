import { Badge } from "@/components/ui/badge";

interface StatusBadgeProps {
  status: string;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const getVariant = (status: string) => {
    switch (status.toLowerCase()) {
      case "completed":
      case "success":
        return "default";
      case "pending":
      case "processing":
        return "secondary";
      case "failed":
      case "error":
        return "destructive";
      default:
        return "outline";
    }
  };

  return (
    <Badge variant={getVariant(status)} className="capitalize">
      {status}
    </Badge>
  );
}
