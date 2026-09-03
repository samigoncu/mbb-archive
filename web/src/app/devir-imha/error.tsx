"use client";

import { ApiErrorState } from "@/components/layout/api-error-state";

export default function Error(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <ApiErrorState {...props} />;
}
